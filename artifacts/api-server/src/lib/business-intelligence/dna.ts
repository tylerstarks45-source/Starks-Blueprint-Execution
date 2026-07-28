import {
  db,
  businessesTable,
  businessMemoryTable,
  businessConnectionsTable,
  landingPagesTable,
  ashProjectsTable,
  ashGoalsTable,
  ashTasksTable,
  businessDnaClaimsTable,
  businessDnaVersionsTable,
  businessDnaConflictsTable,
  businessReviewQueueTable,
  type BusinessDnaClaim,
  type BusinessDnaTrustLevel,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { publishBusinessEventTx, processBusinessEvent, registerBusinessEventSubscriber, type DbExecutor } from "./events";
import { complete } from "../openrouter";
import { chainFor } from "../models";
import { logger } from "../logger";
import { DNA_FIELD_CATALOG, type IncomingDnaEvidence, type TruthResolutionResult, type RecommendedConflictDecision } from "./types";
import type { BusinessDnaConflict } from "@workspace/db";

const TRUST_RANK: Record<BusinessDnaTrustLevel, number> = {
  user_confirmed: 4,
  verified_system_data: 3,
  high_confidence_inference: 2,
  low_confidence_inference: 1,
};
const ESCALATION_THRESHOLD = 70;
const HIGH_IMPACT_FIELDS = new Set(["website_url", "revenue_model", "revenue_goals", "connected_apis", "connected_platforms"]);

function normalize(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function impactFor(fieldKey: string): { score: number; reason: string } {
  if (HIGH_IMPACT_FIELDS.has(fieldKey)) return { score: 80, reason: `${fieldKey.replaceAll("_", " ")} can materially affect active execution, revenue, or launch readiness.` };
  return { score: 30, reason: `This ${fieldKey.replaceAll("_", " ")} conflict should be reviewed but does not block current work.` };
}

// ─── Transaction helper ─────────────────────────────────────────────────────
// Every DNA write (claim create/update, version log, conflict, review-queue
// item) happens atomically inside one db.transaction() — a crash or error
// partway through can never leave a claim promoted without its version
// history, or a conflict recorded without its review-queue entry. Domain
// events are inserted inside the same transaction (publishBusinessEventTx),
// but their subscriber/timeline side effects only run AFTER the transaction
// commits, so a subscriber never observes a write that later rolled back.
async function runTransactional<T>(work: (tx: DbExecutor) => Promise<{ result: T; eventIds: number[] }>): Promise<T> {
  const { result, eventIds } = await db.transaction((tx) => work(tx));
  for (const eventId of eventIds) {
    await processBusinessEvent(eventId).catch((err) => logger.warn({ err, eventId }, "Business Intelligence: post-commit event processing failed"));
  }
  return result;
}

export async function reconcileDnaEvidence(businessId: number, incoming: IncomingDnaEvidence): Promise<TruthResolutionResult> {
  return runTransactional((tx) => reconcileDnaEvidenceTx(tx, businessId, incoming));
}

async function reconcileDnaEvidenceTx(
  tx: DbExecutor,
  businessId: number,
  incoming: IncomingDnaEvidence,
): Promise<{ result: TruthResolutionResult; eventIds: number[] }> {
  const evidence = { ...incoming, confidenceScore: clampConfidence(incoming.confidenceScore) };
  const [existing] = await tx
    .select()
    .from(businessDnaClaimsTable)
    .where(and(eq(businessDnaClaimsTable.businessId, businessId), eq(businessDnaClaimsTable.fieldKey, evidence.fieldKey)));

  if (!existing) return createClaimTx(tx, businessId, evidence);

  const equivalent = normalize(existing.currentValue) === normalize(evidence.value);
  const existingRank = TRUST_RANK[existing.trustLevel as BusinessDnaTrustLevel] ?? 0;
  const incomingRank = TRUST_RANK[evidence.trustLevel];

  if (equivalent) {
    const shouldStrengthen = incomingRank > existingRank || (incomingRank === existingRank && evidence.confidenceScore > existing.confidenceScore);
    if (!shouldStrengthen) {
      // True idempotency: evidence that says the same thing the claim
      // already says, and doesn't even strengthen it, writes NOTHING — no
      // version row, no event. Without this, hourly reconciliation replaying
      // identical verified_system_data evidence would grow an unbounded
      // version history and fire a "reinforced" event every single run.
      return { result: { action: "preserved", claim: existing, conflictId: null }, eventIds: [] };
    }
    const [claim] = await tx.update(businessDnaClaimsTable).set({
      confidenceScore: Math.max(existing.confidenceScore, evidence.confidenceScore),
      trustLevel: incomingRank >= existingRank ? evidence.trustLevel : existing.trustLevel,
      source: incomingRank >= existingRank ? evidence.source : existing.source,
      reasoning: incomingRank >= existingRank ? evidence.reasoning ?? existing.reasoning : existing.reasoning,
      lastUpdatedAt: new Date(),
    }).where(eq(businessDnaClaimsTable.id, existing.id)).returning();
    await writeVersion(tx, claim, evidence, "reinforced");
    return { result: { action: "reinforced", claim, conflictId: null }, eventIds: [] };
  }

  // User-confirmed values are permanent until a user explicitly changes them.
  if (existing.trustLevel === "user_confirmed") {
    return preserveWithConflictTx(tx, businessId, existing, evidence);
  }

  const newerVerified = existing.trustLevel === "verified_system_data"
    && evidence.trustLevel === "verified_system_data"
    && (evidence.observedAt?.getTime() ?? 0) > existing.lastUpdatedAt.getTime();
  const inferredUpgrade = existingRank <= TRUST_RANK.high_confidence_inference
    && (incomingRank > existingRank || (incomingRank === existingRank && evidence.confidenceScore > existing.confidenceScore));

  if (newerVerified || inferredUpgrade) {
    const [claim] = await tx.update(businessDnaClaimsTable).set({
      currentValue: evidence.value,
      confidenceScore: evidence.confidenceScore,
      trustLevel: evidence.trustLevel,
      source: evidence.source,
      reasoning: evidence.reasoning ?? null,
      version: existing.version + 1,
      lastUpdatedAt: evidence.observedAt ?? new Date(),
    }).where(eq(businessDnaClaimsTable.id, existing.id)).returning();
    await writeVersion(tx, claim, evidence, "promoted");
    const eventId = await publishBusinessEventTx(tx, {
      businessId,
      eventType: "dna.changed",
      source: "business_intelligence",
      payload: { description: `Business DNA field "${evidence.fieldKey}" was updated with stronger evidence.`, relatedObjects: { claimId: claim.id, fieldKey: evidence.fieldKey } },
      dedupeKey: `dna.changed:${claim.id}:${claim.version}`,
    });
    return { result: { action: "promoted", claim, conflictId: null }, eventIds: eventId != null ? [eventId] : [] };
  }

  return preserveWithConflictTx(tx, businessId, existing, evidence);
}

// This is deliberately separate from generic reconciliation. It is only used
// after the route has authenticated the owning business user, allowing an owner
// to revise a previous confirmation without weakening the normal truth policy.
export async function applyUserConfirmedDnaValue(businessId: number, incoming: IncomingDnaEvidence): Promise<TruthResolutionResult> {
  return runTransactional((tx) => applyUserConfirmedDnaValueTx(tx, businessId, incoming));
}

async function applyUserConfirmedDnaValueTx(
  tx: DbExecutor,
  businessId: number,
  incoming: IncomingDnaEvidence,
): Promise<{ result: TruthResolutionResult; eventIds: number[] }> {
  const evidence: IncomingDnaEvidence = {
    ...incoming,
    confidenceScore: 100,
    trustLevel: "user_confirmed",
    observedAt: incoming.observedAt ?? new Date(),
  };
  const [existing] = await tx
    .select()
    .from(businessDnaClaimsTable)
    .where(and(eq(businessDnaClaimsTable.businessId, businessId), eq(businessDnaClaimsTable.fieldKey, evidence.fieldKey)));

  if (!existing) {
    const created = await createClaimTx(tx, businessId, evidence);
    const eventId = await publishBusinessEventTx(tx, {
      businessId,
      eventType: "dna.user_confirmed",
      source: "business_intelligence",
      payload: { description: `Business owner confirmed "${evidence.fieldKey}".`, relatedObjects: { claimId: created.result.claim.id, fieldKey: evidence.fieldKey } },
      dedupeKey: `dna.user_confirmed:${created.result.claim.id}:${created.result.claim.version}`,
    });
    return { result: created.result, eventIds: [...created.eventIds, ...(eventId != null ? [eventId] : [])] };
  }

  const [claim] = await tx
    .update(businessDnaClaimsTable)
    .set({
      currentValue: evidence.value,
      confidenceScore: 100,
      trustLevel: "user_confirmed",
      source: evidence.source,
      reasoning: evidence.reasoning ?? null,
      version: existing.version + 1,
      lastUpdatedAt: evidence.observedAt,
    })
    .where(eq(businessDnaClaimsTable.id, existing.id))
    .returning();
  await writeVersion(tx, claim, evidence, "user_decision");
  const eventId = await publishBusinessEventTx(tx, {
    businessId,
    eventType: "dna.user_confirmed",
    source: "business_intelligence",
    payload: { description: `Business owner confirmed "${evidence.fieldKey}".`, relatedObjects: { claimId: claim.id, fieldKey: evidence.fieldKey } },
    dedupeKey: `dna.user_confirmed:${claim.id}:${claim.version}`,
  });
  return { result: { action: "promoted", claim, conflictId: null }, eventIds: eventId != null ? [eventId] : [] };
}

async function createClaimTx(
  tx: DbExecutor,
  businessId: number,
  evidence: IncomingDnaEvidence,
): Promise<{ result: TruthResolutionResult; eventIds: number[] }> {
  const [claim] = await tx.insert(businessDnaClaimsTable).values({
    businessId,
    fieldKey: evidence.fieldKey,
    currentValue: evidence.value,
    confidenceScore: evidence.confidenceScore,
    trustLevel: evidence.trustLevel,
    source: evidence.source,
    reasoning: evidence.reasoning ?? null,
    lastUpdatedAt: evidence.observedAt ?? new Date(),
  }).returning();
  await writeVersion(tx, claim, evidence, "initialized");
  const eventId = await publishBusinessEventTx(tx, {
    businessId,
    eventType: "dna.initialized",
    source: "business_intelligence",
    payload: { description: `Business DNA field "${evidence.fieldKey}" was initialized.`, relatedObjects: { claimId: claim.id, fieldKey: evidence.fieldKey } },
    dedupeKey: `dna.initialized:${claim.id}`,
  });
  return { result: { action: "created", claim, conflictId: null }, eventIds: eventId != null ? [eventId] : [] };
}

async function preserveWithConflictTx(
  tx: DbExecutor,
  businessId: number,
  existing: BusinessDnaClaim,
  evidence: IncomingDnaEvidence,
): Promise<{ result: TruthResolutionResult; eventIds: number[] }> {
  const normalizedIncoming = normalize(evidence.value);

  // Dedupe: an already-open conflict recording this exact incoming value for
  // this claim is not a NEW conflict — surface the existing one instead of
  // piling up duplicates every time the same stale source resubmits the same
  // evidence (e.g. hourly reconciliation replaying an unconfirmed field).
  const openConflicts = await tx
    .select()
    .from(businessDnaConflictsTable)
    .where(and(
      eq(businessDnaConflictsTable.businessId, businessId),
      eq(businessDnaConflictsTable.claimId, existing.id),
      eq(businessDnaConflictsTable.fieldKey, existing.fieldKey),
      eq(businessDnaConflictsTable.status, "open"),
    ));
  const duplicate = openConflicts.find((c) => normalize(c.incomingValue) === normalizedIncoming);
  if (duplicate) {
    return { result: { action: "conflict", claim: existing, conflictId: duplicate.id }, eventIds: [] };
  }

  const impact = impactFor(existing.fieldKey);
  const [conflict] = await tx.insert(businessDnaConflictsTable).values({
    businessId,
    claimId: existing.id,
    fieldKey: existing.fieldKey,
    currentValue: existing.currentValue,
    incomingValue: evidence.value,
    currentTrustLevel: existing.trustLevel,
    incomingTrustLevel: evidence.trustLevel,
    incomingConfidenceScore: evidence.confidenceScore,
    incomingSource: evidence.source,
    incomingReasoning: evidence.reasoning ?? null,
    impactScore: impact.score,
    impactReason: impact.reason,
  }).returning();
  await writeVersion(tx, existing, evidence, "conflict_observed");

  // Lower-impact conflicts become review items; high-impact conflicts are
  // exposed in the Executive Brain context immediately and also timeline'd.
  if (impact.score < ESCALATION_THRESHOLD) {
    await tx.insert(businessReviewQueueTable).values({
      businessId,
      conflictId: conflict.id,
      kind: "conflict",
      priority: impact.score,
      title: `Review ${existing.fieldKey.replaceAll("_", " ")}`,
      description: impact.reason,
      payload: { currentValue: existing.currentValue, incomingValue: evidence.value, currentTrustLevel: existing.trustLevel, incomingTrustLevel: evidence.trustLevel },
    });
  }
  const eventId = await publishBusinessEventTx(tx, {
    businessId,
    eventType: impact.score >= ESCALATION_THRESHOLD ? "conflict.high_impact" : "conflict.queued_for_review",
    source: "business_intelligence",
    payload: { description: `A conflict was recorded for "${existing.fieldKey}". ${impact.reason}`, relatedObjects: { conflictId: conflict.id, claimId: existing.id, fieldKey: existing.fieldKey } },
    dedupeKey: `dna.conflict:${conflict.id}`,
  });
  return { result: { action: "conflict", claim: existing, conflictId: conflict.id }, eventIds: eventId != null ? [eventId] : [] };
}

async function writeVersion(tx: DbExecutor, claim: BusinessDnaClaim, evidence: IncomingDnaEvidence, changeType: string): Promise<void> {
  await tx.insert(businessDnaVersionsTable).values({
    claimId: claim.id,
    businessId: claim.businessId,
    version: claim.version,
    value: evidence.value,
    confidenceScore: evidence.confidenceScore,
    trustLevel: evidence.trustLevel,
    source: evidence.source,
    reasoning: evidence.reasoning ?? null,
    changeType,
  });
}

// ─── Recommended conflict resolution (review UX support) ───────────────────
// Pure, config-driven off TRUST_RANK — no schema change, computed on read.
// Surfaced by GET /businesses/:id/conflicts so the frontend can show a
// default recommendation alongside the raw current/incoming comparison.
export function computeRecommendedAction(conflict: Pick<BusinessDnaConflict, "currentTrustLevel" | "incomingTrustLevel" | "incomingConfidenceScore" | "impactScore">): RecommendedConflictDecision {
  const currentRank = TRUST_RANK[conflict.currentTrustLevel as BusinessDnaTrustLevel] ?? 0;
  const incomingRank = TRUST_RANK[conflict.incomingTrustLevel as BusinessDnaTrustLevel] ?? 0;

  if (conflict.currentTrustLevel === "user_confirmed") {
    return { action: "keep_current", reason: "The current value was explicitly confirmed by the business owner and should only change if they say so." };
  }
  if (incomingRank > currentRank) {
    return { action: "accept_new", reason: `The new value comes from a more reliable source (${conflict.incomingTrustLevel.replaceAll("_", " ")} vs ${conflict.currentTrustLevel.replaceAll("_", " ")}).` };
  }
  if (incomingRank === currentRank && conflict.incomingConfidenceScore >= 75) {
    return { action: "accept_new", reason: "The new value has the same trust level but noticeably higher confidence." };
  }
  if (conflict.impactScore >= ESCALATION_THRESHOLD) {
    return { action: "defer", reason: "This affects active execution or revenue — worth a deliberate look rather than a default pick." };
  }
  return { action: "keep_current", reason: "The current value is at least as reliable as the new one; no reason to switch yet." };
}

// ─── DNA inference (missing-field completion) ──────────────────────────────
// Process-local throttle: at most one inference pass per business per
// window. Mirrors the existing scheduler.ts pattern (a module-level
// timestamp, not a persisted marker) — deliberately not written to the DNA
// claims table, so it can never leak into GET /dna, capability derivation,
// or the confirmation registry. Resets on process restart, which only means
// one extra inference pass right after a deploy — an acceptable, cheap cost.
const lastInferenceRunAt = new Map<number, number>();
const INFERENCE_THROTTLE_MS = 6 * 60 * 60 * 1000; // 6 hours

// Runs after import-based initialization. Only considers catalog fields
// marked `inferable: true` that have NO claim yet at all — inference never
// overwrites or contests an existing claim of any trust level, including its
// own prior low-confidence inferences (those are only revised if a later,
// stronger reconcileDnaEvidence call comes in through the normal truth
// policy). Fails open: any error here is logged and swallowed, never thrown,
// so a flaky AI call can't break DNA initialization or Executive Brain context.
export async function inferMissingDnaFields(businessId: number): Promise<void> {
  const last = lastInferenceRunAt.get(businessId);
  if (last !== undefined && Date.now() - last < INFERENCE_THROTTLE_MS) return;
  lastInferenceRunAt.set(businessId, Date.now()); // set before the call so a slow/failed run can't cause overlapping retries on the next request

  try {
    const claims = await db.select().from(businessDnaClaimsTable).where(eq(businessDnaClaimsTable.businessId, businessId));
    const known = new Map(claims.map((c) => [c.fieldKey, c]));
    const missing = DNA_FIELD_CATALOG.filter((f) => f.inferable && !known.has(f.key));
    if (missing.length === 0) return;

    const knownSummary = claims.length
      ? claims.map((c) => `${c.fieldKey}: ${JSON.stringify(c.currentValue)}`).join("\n")
      : "(no confirmed facts yet)";

    const result = await complete({
      systemPrompt:
        "You infer likely business facts from what's already known about a business, for an AI business-operations assistant. " +
        "Only infer a field when the given evidence or well-established patterns for this kind of business reasonably support it — " +
        "never invent specific numbers, names, or claims the evidence doesn't imply. Skip any field you have no reasonable basis for. " +
        'Reply with ONLY a JSON array (empty if nothing can be inferred), no markdown, no prose: ' +
        '[{"fieldKey": string, "value": <string | string[]>, "confidenceScore": number, "reasoning": string}]. ' +
        "confidenceScore is 0-100 — use 75 or higher ONLY when the evidence strongly implies the value; otherwise stay below 75.",
      prompt: `Known facts about this business:\n${knownSummary}\n\nInfer values for these missing fields: ${missing.map((f) => `${f.key} (${f.label})`).join(", ")}`,
      models: chainFor("utility"),
    });

    const match = result.content.match(/\[[\s\S]*\]/);
    if (!match) return;
    const parsed: unknown = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return;

    const missingKeys = new Set(missing.map((f) => f.key));
    const inferences = parsed.filter(
      (raw): raw is { fieldKey: string; value: unknown; confidenceScore: number; reasoning?: string } =>
        !!raw && typeof raw === "object" && missingKeys.has((raw as { fieldKey?: unknown }).fieldKey as string)
        && (raw as { value?: unknown }).value !== undefined && (raw as { value?: unknown }).value !== null,
    );

    await Promise.all(inferences.map((raw) => {
      const confidence = clampConfidence(Number(raw.confidenceScore) || 0);
      return reconcileDnaEvidence(businessId, {
        fieldKey: raw.fieldKey,
        value: raw.value,
        confidenceScore: confidence,
        trustLevel: confidence >= 75 ? "high_confidence_inference" : "low_confidence_inference",
        source: "ai_inference",
        reasoning: typeof raw.reasoning === "string" ? raw.reasoning.slice(0, 500) : "AI-inferred from existing business evidence.",
      });
    }));
  } catch (err) {
    logger.warn({ err, businessId }, "Business Intelligence: DNA inference failed (non-fatal)");
  }
}

// Import existing business-owned data first. It intentionally makes no AI
// calls: missing information may be inferred later, but existing facts always
// take priority and never trigger a redundant user prompt.
export async function initializeBusinessDna(businessId: number): Promise<void> {
  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, businessId));
  if (!business) throw new Error(`Business ${businessId} not found`);
  const [[memory], connections, projects, landingPages] = await Promise.all([
    db.select().from(businessMemoryTable).where(eq(businessMemoryTable.businessId, businessId)).limit(1),
    db.select().from(businessConnectionsTable).where(eq(businessConnectionsTable.businessId, businessId)),
    business.systemInstanceId == null
      ? Promise.resolve([])
      : db.select().from(ashProjectsTable).where(eq(ashProjectsTable.systemInstanceId, business.systemInstanceId)),
    business.systemInstanceId == null
      ? Promise.resolve([])
      : db.select().from(landingPagesTable).where(and(eq(landingPagesTable.userId, business.ownerId), eq(landingPagesTable.systemInstanceId, business.systemInstanceId))),
  ]);
  const projectIds = projects.map((project) => project.id);
  const [goals, tasks] = projectIds.length
    ? await Promise.all([
      db.select().from(ashGoalsTable).where(inArray(ashGoalsTable.projectId, projectIds)),
      db.select().from(ashTasksTable).where(inArray(ashTasksTable.projectId, projectIds)),
    ])
    : [[], []];

  const system = (fieldKey: string, value: unknown, reasoning: string) =>
    reconcileDnaEvidence(businessId, { fieldKey, value, confidenceScore: 100, trustLevel: "verified_system_data", source: "existing_business_records", reasoning });
  const imports: Promise<unknown>[] = [
    system("business_name", business.name, "Imported from the primary business record."),
    system("business_type", business.businessType, "Imported from the primary business record."),
    ...(business.revenueModel ? [system("revenue_model", business.revenueModel, "Imported from the primary business record.")] : []),
    ...(business.websiteUrl ? [system("website_url", business.websiteUrl, "Imported from the primary business record.")] : []),
    system("connected_platforms", connections.filter((c) => c.status === "connected").map((c) => c.platformName), "Derived from connected business platforms."),
    system("connected_apis", connections.filter((c) => c.userCredentialId != null).map((c) => c.platformName), "Derived from credential-backed business connections."),
    ...(projects.length ? [system("primary_goals", projects.map((project) => project.objective ?? project.name).filter(Boolean), "Imported from ASH projects linked to this business.")] : []),
    ...(goals.length ? [system("primary_goals", goals.filter((goal) => goal.status !== "completed").map((goal) => goal.goalText), "Imported from active ASH goals linked to this business.")] : []),
    ...(tasks.length ? [system("execution_priorities", tasks.filter((task) => task.status === "pending" || task.status === "in_progress").sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 5).map((task) => task.description), "Derived from active ASH tasks linked to this business.")] : []),
    ...(landingPages.length ? [system("landing_pages", landingPages.map((page) => ({ title: page.title, publicUrl: page.publicUrl, published: page.isPublished })), "Imported from landing pages linked to this business system.")] : []),
  ];
  if (memory) {
    if (memory.businessModel) imports.push(reconcileDnaEvidence(businessId, { fieldKey: "business_model", value: memory.businessModel, confidenceScore: memory.confidenceScore, trustLevel: "verified_system_data", source: "business_memory", reasoning: "Imported from existing business memory." }));
    if (Array.isArray(memory.products) && memory.products.length) imports.push(reconcileDnaEvidence(businessId, { fieldKey: "products", value: memory.products, confidenceScore: memory.confidenceScore, trustLevel: "verified_system_data", source: "business_memory", reasoning: "Imported from existing business memory." }));
    if (Array.isArray(memory.services) && memory.services.length) imports.push(reconcileDnaEvidence(businessId, { fieldKey: "services", value: memory.services, confidenceScore: memory.confidenceScore, trustLevel: "verified_system_data", source: "business_memory", reasoning: "Imported from existing business memory." }));
    if (Array.isArray(memory.customers) && memory.customers.length) imports.push(reconcileDnaEvidence(businessId, { fieldKey: "target_audience", value: memory.customers, confidenceScore: memory.confidenceScore, trustLevel: "verified_system_data", source: "business_memory", reasoning: "Imported from existing business memory." }));
    if (memory.revenueGoals) imports.push(reconcileDnaEvidence(businessId, { fieldKey: "revenue_goals", value: memory.revenueGoals, confidenceScore: memory.confidenceScore, trustLevel: "verified_system_data", source: "business_memory", reasoning: "Imported from existing business memory." }));
  }
  await Promise.all(imports);
  await inferMissingDnaFields(businessId);
  await ensureSingleMaterialConfirmation(businessId);
}

// Data-driven confirmation ranking over DNA_FIELD_CATALOG (generalized from a
// hardcoded website_url-only check). Ranks missing non-inferable fields
// first (nothing to lose by asking directly), then inferable fields that are
// still missing or only weakly inferred — highest importance first. Only
// ever one open confirmation at a time.
async function ensureSingleMaterialConfirmation(businessId: number): Promise<void> {
  const [existingOpen] = await db
    .select({ id: businessReviewQueueTable.id })
    .from(businessReviewQueueTable)
    .where(and(
      eq(businessReviewQueueTable.businessId, businessId),
      eq(businessReviewQueueTable.kind, "confirmation"),
      eq(businessReviewQueueTable.status, "open"),
    ))
    .limit(1);
  if (existingOpen) return;

  const claims = await db.select().from(businessDnaClaimsTable).where(eq(businessDnaClaimsTable.businessId, businessId));
  const claimByKey = new Map(claims.map((c) => [c.fieldKey, c]));
  const importanceRank: Record<string, number> = { critical: 3, high: 2, normal: 1 };

  const candidates = DNA_FIELD_CATALOG
    .filter((field) => field.promptText)
    .map((field) => {
      const claim = claimByKey.get(field.key);
      const missing = !claim;
      const lowConfidence = Boolean(claim) && (claim!.trustLevel === "low_confidence_inference" || claim!.confidenceScore < 60);
      const eligible = missing || (field.inferable && lowConfidence);
      // Non-inferable missing fields (nothing else will ever fill them) rank
      // above inferable ones (which may still resolve on their own), then by
      // importance within each group.
      const priority = (field.inferable ? 0 : 100) + (importanceRank[field.importance] ?? 1) * 10;
      return { field, eligible, priority };
    })
    .filter((c) => c.eligible)
    .sort((a, b) => b.priority - a.priority);

  const top = candidates[0];
  if (!top) return;

  await db.insert(businessReviewQueueTable).values({
    businessId,
    kind: "confirmation",
    priority: (importanceRank[top.field.importance] ?? 1) * 25,
    title: top.field.promptText!.title,
    description: top.field.promptText!.description,
    payload: { fieldKey: top.field.key, inputType: top.field.promptText!.inputType ?? "text" },
  });
}

// ─── Self-registered event subscriber ──────────────────────────────────────
// Replaces the old hardcoded if-chain + dynamic import in events.ts: this
// module owns its own reaction to the events it cares about. Registration
// runs once, as a side effect of this module being imported by the barrel
// (index.ts), which every BI entry point already imports — so the subscriber
// is guaranteed to be registered before any event can be published.
registerBusinessEventSubscriber(["integration.connected", "business.updated"], async (event) => {
  await initializeBusinessDna(event.businessId);
});
