import {
  db,
  businessesTable,
  businessConnectionsTable,
  businessHealthMetricsTable,
  businessHealthScoresTable,
  businessDnaClaimsTable,
  businessDnaConflictsTable,
  businessReviewQueueTable,
  businessRecommendationsTable,
  scheduledTasksTable,
  scheduledPostsTable,
  systemRevenueProvidersTable,
  systemActivityEventsTable,
  publishedContentTable,
  ashProjectsTable,
  ashGoalsTable,
  ashTasksTable,
  type BusinessDnaTrustLevel,
} from "@workspace/db";
import { and, desc, eq, gte, inArray, isNotNull } from "drizzle-orm";
import {
  LIFECYCLE_STAGES,
  type BusinessCapability,
  type BusinessContextPackage,
  type BusinessState,
  type LifecycleStage,
  type CrossBusinessSummary,
} from "./types";
import { initializeBusinessDna } from "./dna";

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asIssueMessages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is { message?: unknown } => typeof item === "object" && item !== null)
    .map((item) => typeof item.message === "string" ? item.message : "")
    .filter(Boolean);
}

function resolveLifecycleStage(projectPhase: string | null, businessStatus: string): LifecycleStage {
  const normalized = (projectPhase ?? businessStatus).toLowerCase().replaceAll(" ", "_");
  return (LIFECYCLE_STAGES as readonly string[]).includes(normalized) ? normalized as LifecycleStage : businessStatus === "active" ? "planning" : "maintenance";
}

// ─── Business Context Isolation — shared scope filter (Phase 1.5A) ────────
// Single source of truth for "is this business-scoped record allowed to
// surface right now", reused by both Long-Term Memory and Knowledge Memory
// (memory-engine). Only `business`-scoped rows are ever restricted — global/
// user-level and industry/reusable-style rows are, by design, meant to be
// visible everywhere (see MEMORY_SCOPES / KNOWLEDGE_SCOPES doc comments).
// Cross-business mode is the ONLY way restriction is lifted, and it is never
// turned on implicitly by this function — callers decide that explicitly.
// A discriminated union (not a plain `{ restrictToBusiness: boolean;
// allowedBusinessId: number | null }`) so callers get real type narrowing —
// `if (filter.restrictToBusiness)` narrows `allowedBusinessId` to `number`,
// letting it flow straight into drizzle's `eq()` without a cast. `eq()` has
// no overload for a `null` right-hand value (SQL `= NULL` is always false;
// `IS NULL` is a different operator), so keeping the loose type invited a
// real bug, not just an annoyance.
export type BusinessScopeFilter =
  | { restrictToBusiness: true; allowedBusinessId: number }
  | { restrictToBusiness: false; allowedBusinessId: null };

export function resolveRelevantKnowledgeScopes(params: { businessId?: number | null; crossBusinessMode?: boolean }): BusinessScopeFilter {
  if (params.businessId && !params.crossBusinessMode) {
    return { restrictToBusiness: true, allowedBusinessId: params.businessId };
  }
  return { restrictToBusiness: false, allowedBusinessId: null };
}

// ─── Cross-Business Analysis intent (explicit-only trigger) ───────────────
// Mirrors the existing detectResearchIntent-style convention: parsing an
// explicit natural-language ask ("compare all my businesses") is not
// "automatic" aggregation — it's responding to a request the user just
// typed in their own words, the same way a chat UI checkbox would. This is
// the ONLY heuristic trigger; it is always OR'd with an explicit request
// flag, and the default is always OFF.
const CROSS_BUSINESS_INTENT_PATTERN = /\b(all|across|between|compare).{0,20}\b(my )?businesses\b|\bportfolio[- ]wide\b|\bevery business\b/i;
export function detectCrossBusinessIntent(message: string): boolean {
  return CROSS_BUSINESS_INTENT_PATTERN.test(message);
}

// Small, reusable note builder for when BI context assembly fails or is
// unavailable — callers (Executive Brain) must never silently omit BI
// context without saying so; this keeps the wording consistent everywhere.
export function buildBusinessIntelligenceUnavailableNote(reason: string): string {
  return `\n\n=== BUSINESS INTELLIGENCE (unavailable) ===\nBusiness context could not be assembled this turn (${reason}). Proceeding without it — treat any business-specific claims as unverified this turn.`;
}

// Small helper so each Promise.all branch below infers its real row type
// (T[]) instead of collapsing to `never[]` the way an inline
// `cond ? Promise.resolve([]) : db.select()...` ternary does when unioned
// with a real query result inside Promise.all.
async function selectIfSystemLinked<T>(systemInstanceId: number | null, query: () => Promise<T[]>): Promise<T[]> {
  return systemInstanceId == null ? [] : query();
}

export async function getBusinessState(businessId: number, userId: number): Promise<BusinessState | null> {
  const [business] = await db.select().from(businessesTable).where(and(eq(businessesTable.id, businessId), eq(businessesTable.ownerId, userId)));
  if (!business) return null;

  const projects = await db
    .select()
    .from(ashProjectsTable)
    .where(and(eq(ashProjectsTable.userId, userId), business.systemInstanceId != null ? eq(ashProjectsTable.systemInstanceId, business.systemInstanceId) : eq(ashProjectsTable.systemInstanceId, -1)));
  const projectIds = projects.map((p) => p.id);
  const [connections, latestMetric, latestAnalysis, scheduledTasks, scheduledPosts, revenueProviders] = await Promise.all([
    db.select().from(businessConnectionsTable).where(eq(businessConnectionsTable.businessId, businessId)),
    db.select().from(businessHealthMetricsTable).where(eq(businessHealthMetricsTable.businessId, businessId)).orderBy(desc(businessHealthMetricsTable.computedAt)).limit(1),
    db.select().from(businessHealthScoresTable).where(eq(businessHealthScoresTable.businessId, businessId)).orderBy(desc(businessHealthScoresTable.createdAt)).limit(1),
    selectIfSystemLinked(business.systemInstanceId, () => db.select().from(scheduledTasksTable).where(and(eq(scheduledTasksTable.systemInstanceId, business.systemInstanceId!), eq(scheduledTasksTable.enabled, true)))),
    selectIfSystemLinked(business.systemInstanceId, () => db.select().from(scheduledPostsTable).where(and(eq(scheduledPostsTable.systemInstanceId, business.systemInstanceId!), eq(scheduledPostsTable.status, "scheduled")))),
    selectIfSystemLinked(business.systemInstanceId, () => db.select().from(systemRevenueProvidersTable).where(eq(systemRevenueProvidersTable.systemInstanceId, business.systemInstanceId!))),
  ]);
  const goals = projectIds.length ? await db.select().from(ashGoalsTable).where(inArray(ashGoalsTable.projectId, projectIds)) : [];
  const tasks = projectIds.length ? await db.select().from(ashTasksTable).where(inArray(ashTasksTable.projectId, projectIds)) : [];
  const activeProject = projects.find((p) => p.status === "active") ?? projects[0] ?? null;
  const risks = [
    ...asStringArray(latestAnalysis[0]?.operationalRisks),
    ...asIssueMessages(latestMetric[0]?.issues),
  ].slice(0, 8);
  const opportunities = asStringArray(latestAnalysis[0]?.revenueOpportunities).slice(0, 8);
  const priorities = tasks.filter((task) => task.status === "pending" || task.status === "in_progress").sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 4).map((task) => task.description);

  // Two distinct health systems, kept visually/architecturally separate per
  // existing convention (heuristic monitoring vs AI narrative scoring) —
  // each labeled with its own source and freshness so a consumer never
  // confuses one for the other.
  const operational = latestMetric[0]
    ? { overallScore: latestMetric[0].overallScore, status: latestMetric[0].status, freshness: latestMetric[0].computedAt, source: "business_health_metrics" as const }
    : null;
  const narrative = latestAnalysis[0]
    ? { overallScore: latestAnalysis[0].overallHealth, status: null, summary: latestAnalysis[0].summary ?? null, freshness: latestAnalysis[0].createdAt, source: "business_health_scores" as const }
    : null;

  let revenueContext: BusinessState["revenueContext"] = null;
  if (business.systemInstanceId != null) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const revenueEvents = await db
      .select({ amountCents: systemActivityEventsTable.amountCents, createdAt: systemActivityEventsTable.createdAt })
      .from(systemActivityEventsTable)
      .where(and(eq(systemActivityEventsTable.systemInstanceId, business.systemInstanceId), gte(systemActivityEventsTable.createdAt, since), isNotNull(systemActivityEventsTable.amountCents)));
    const freshest = revenueEvents.reduce<Date | null>((latest, e) => (!latest || e.createdAt > latest ? e.createdAt : latest), null);
    revenueContext = {
      last30DaysCents: revenueEvents.length ? revenueEvents.reduce((sum, e) => sum + (e.amountCents ?? 0), 0) : null,
      currency: "usd",
      connectedProviders: revenueProviders.filter((p) => p.enabled).length,
      freshness: freshest ?? revenueProviders[0]?.lastSyncAt ?? null,
    };
  }

  return {
    lifecycleStage: resolveLifecycleStage(activeProject?.currentPhase ?? null, business.status),
    currentObjective: activeProject?.objective ?? null,
    currentMilestone: activeProject?.currentPhase ?? null,
    currentSprint: activeProject?.currentPhase ?? null,
    launchStatus: business.status,
    activeProjects: projects.filter((p) => p.status === "active").length,
    activeGoals: goals.filter((g) => g.status === "active" || g.status === "pending").length,
    openTasks: tasks.filter((t) => t.status === "pending" || t.status === "in_progress" || t.status === "blocked").length,
    completedTasks: tasks.filter((t) => t.status === "completed").length,
    failedTasks: tasks.filter((t) => t.status === "failed").length,
    connectedServices: connections.filter((c) => c.status === "connected").length,
    websiteStatus: business.websiteUrl ? "present" : "missing",
    health: {
      // Top-level fields kept for backward compatibility with existing
      // consumers reading state.health.overallScore/.status/.freshness directly.
      overallScore: operational?.overallScore ?? narrative?.overallScore ?? null,
      status: operational?.status ?? null,
      freshness: operational?.freshness ?? narrative?.freshness ?? null,
      operational,
      narrative,
    },
    revenueContext,
    activeCampaigns: scheduledPosts.length,
    activeAutomations: scheduledTasks.length,
    risks,
    opportunities,
    priorities,
  };
}

interface CapabilityMatchInput {
  websiteUrl: string | null;
  businessType: string;
  systemInstanceId: number | null;
  connections: Array<{ connectionType: string; platformName: string; status: string }>;
  claims: Map<string, unknown>;
  hasPublishedContent: boolean;
}

interface CapabilityDefinition {
  key: string;
  label: string;
  // Static explanation shown only when unavailable — satisfies the "detected
  // gaps" requirement without needing a schema change (capabilities are
  // derived on read, never persisted).
  gapHint: string;
  matches: (input: CapabilityMatchInput) => { available: boolean; evidence: string[] };
}

function matchConnections(connections: Array<{ connectionType: string; platformName: string; status: string }>, types: string[], name?: RegExp) {
  const matches = connections.filter((connection) => connection.status === "connected" && (types.includes(connection.connectionType) || Boolean(name?.test(connection.platformName))));
  return { available: matches.length > 0, evidence: matches.map((connection) => `Connected ${connection.platformName}`) };
}

const CAPABILITY_CATALOG: readonly CapabilityDefinition[] = [
  { key: "website", label: "Has Website", gapHint: "No website URL is on file for this business yet.", matches: ({ websiteUrl }) => ({ available: Boolean(websiteUrl), evidence: websiteUrl ? ["Business website URL"] : [] }) },
  { key: "landing_pages", label: "Has Landing Pages", gapHint: "No landing pages have been created or imported for this business yet.", matches: ({ claims }) => ({ available: claims.has("landing_pages"), evidence: claims.has("landing_pages") ? ["Business DNA: landing pages"] : [] }) },
  { key: "products", label: "Has Products", gapHint: "No products are recorded for this business yet.", matches: ({ claims }) => ({ available: asStringArray(claims.get("products")).length > 0, evidence: asStringArray(claims.get("products")).length ? ["Business DNA: products"] : [] }) },
  { key: "services", label: "Has Services", gapHint: "No services are recorded for this business yet.", matches: ({ claims }) => ({ available: asStringArray(claims.get("services")).length > 0, evidence: asStringArray(claims.get("services")).length ? ["Business DNA: services"] : [] }) },
  { key: "analytics", label: "Has Analytics", gapHint: "No analytics platform is connected for this business.", matches: ({ connections }) => matchConnections(connections, ["analytics"]) },
  { key: "crm", label: "Has CRM", gapHint: "No CRM is connected for this business.", matches: ({ connections }) => matchConnections(connections, ["crm"]) },
  { key: "email_marketing", label: "Has Email Marketing", gapHint: "No email marketing platform is connected for this business.", matches: ({ connections }) => matchConnections(connections, ["email_provider"]) },
  { key: "payment_processing", label: "Has Payment Processing", gapHint: "No payment processor or ecommerce platform is connected for this business.", matches: ({ connections }) => matchConnections(connections, ["payment_processor", "ecommerce_platform"]) },
  { key: "automations", label: "Has Automations", gapHint: "No automation/workflow tool is connected for this business.", matches: ({ connections }) => matchConnections(connections, ["other"], /zapier|make|n8n|automation/i) },
  { key: "seo", label: "Has SEO", gapHint: "No SEO strategy has been recorded for this business yet.", matches: ({ claims }) => ({ available: claims.has("seo_strategy"), evidence: claims.has("seo_strategy") ? ["Business DNA: SEO strategy"] : [] }) },
  {
    key: "funnel", label: "Has Sales Funnel", gapHint: "A sales funnel needs both a landing page and a way to take payment — at least one is missing.",
    matches: ({ claims, connections }) => {
      const hasLanding = claims.has("landing_pages") || claims.has("website_url");
      const payment = matchConnections(connections, ["payment_processor", "ecommerce_platform"]);
      const available = hasLanding && payment.available;
      return { available, evidence: available ? ["Business DNA: landing page/website", ...payment.evidence] : [] };
    },
  },
  {
    key: "blog", label: "Has Blog / Content", gapHint: "No published content has been recorded for this business yet.",
    matches: ({ hasPublishedContent }) => ({ available: hasPublishedContent, evidence: hasPublishedContent ? ["Published content records"] : [] }),
  },
  {
    key: "ai_agents", label: "Has AI Agents", gapHint: "This business isn't linked to a built, running AI system instance yet.",
    matches: ({ systemInstanceId }) => ({ available: systemInstanceId != null, evidence: systemInstanceId != null ? ["Linked system instance"] : [] }),
  },
  {
    key: "memberships", label: "Has Memberships", gapHint: "No membership business model or membership platform connection was detected.",
    matches: ({ businessType, connections }) => {
      const byType = businessType === "membership";
      const byConnection = matchConnections(connections, [], /membership|patreon/i);
      const available = byType || byConnection.available;
      return { available, evidence: available ? [byType ? "Business type: membership" : "", ...byConnection.evidence].filter(Boolean) : [] };
    },
  },
  {
    key: "affiliate_program", label: "Has Affiliate Program", gapHint: "No affiliate business model or affiliate platform connection was detected.",
    matches: ({ businessType, connections }) => {
      const byType = businessType === "affiliate";
      const byConnection = matchConnections(connections, [], /affiliate|refersion|impact\.com|partnerstack/i);
      const available = byType || byConnection.available;
      return { available, evidence: available ? [byType ? "Business type: affiliate" : "", ...byConnection.evidence].filter(Boolean) : [] };
    },
  },
] as const;

export async function getBusinessCapabilities(businessId: number, userId: number): Promise<BusinessCapability[] | null> {
  const [business] = await db.select().from(businessesTable).where(and(eq(businessesTable.id, businessId), eq(businessesTable.ownerId, userId)));
  if (!business) return null;
  const [connections, claims, publishedContent] = await Promise.all([
    db.select({ connectionType: businessConnectionsTable.connectionType, platformName: businessConnectionsTable.platformName, status: businessConnectionsTable.status }).from(businessConnectionsTable).where(eq(businessConnectionsTable.businessId, businessId)),
    db.select().from(businessDnaClaimsTable).where(eq(businessDnaClaimsTable.businessId, businessId)),
    business.systemInstanceId == null ? Promise.resolve([]) : db.select({ id: publishedContentTable.id }).from(publishedContentTable).where(eq(publishedContentTable.systemInstanceId, business.systemInstanceId)).limit(1),
  ]);
  const claimValues = new Map(claims.map((claim) => [claim.fieldKey, claim.currentValue]));
  const input: CapabilityMatchInput = {
    websiteUrl: business.websiteUrl,
    businessType: business.businessType,
    systemInstanceId: business.systemInstanceId,
    connections,
    claims: claimValues,
    hasPublishedContent: publishedContent.length > 0,
  };
  return CAPABILITY_CATALOG.map((definition) => {
    const match = definition.matches(input);
    return {
      key: definition.key,
      label: definition.label,
      available: match.available,
      trustLevel: "verified_system_data" as BusinessDnaTrustLevel,
      confidenceScore: match.available ? 100 : 0,
      evidence: match.evidence,
      relatedObjects: {},
      gap: match.available ? null : definition.gapHint,
    };
  });
}

export async function assembleBusinessContextPackage(params: { businessId: number; userId: number }): Promise<BusinessContextPackage | null> {
  const [business] = await db.select().from(businessesTable).where(and(eq(businessesTable.id, params.businessId), eq(businessesTable.ownerId, params.userId)));
  if (!business) return null;
  // Context is an import-first boundary as well as a read boundary. This keeps
  // older businesses useful without a mandatory setup migration.
  await initializeBusinessDna(params.businessId);
  const [claims, state, capabilities, conflicts, reviews, recommendations] = await Promise.all([
    db.select().from(businessDnaClaimsTable).where(eq(businessDnaClaimsTable.businessId, params.businessId)),
    getBusinessState(params.businessId, params.userId),
    getBusinessCapabilities(params.businessId, params.userId),
    db.select().from(businessDnaConflictsTable).where(and(eq(businessDnaConflictsTable.businessId, params.businessId), eq(businessDnaConflictsTable.status, "open"))).orderBy(desc(businessDnaConflictsTable.impactScore)).limit(5),
    db.select({ id: businessReviewQueueTable.id }).from(businessReviewQueueTable).where(and(eq(businessReviewQueueTable.businessId, params.businessId), eq(businessReviewQueueTable.status, "open"))),
    db.select().from(businessRecommendationsTable).where(and(eq(businessRecommendationsTable.businessId, params.businessId), eq(businessRecommendationsTable.status, "new"))).orderBy(desc(businessRecommendationsTable.confidence)).limit(5),
  ]);
  if (!state || !capabilities) return null;
  const publicState = state;
  const criticalConflicts = conflicts.filter((conflict) => conflict.impactScore >= 70);
  const topDna = claims.filter((c) => !c.fieldKey.startsWith("_meta")).sort((a, b) => b.confidenceScore - a.confidenceScore).slice(0, 12);
  const lines = [
    "\n\n=== BUSINESS INTELLIGENCE (internal — use for business decisions, do not repeat verbatim) ===",
    `Business: ${business.name} | Lifecycle: ${publicState.lifecycleStage} | Health: ${publicState.health.overallScore ?? "unknown"}/100 (${publicState.health.status ?? "unavailable"})`,
    `Capabilities: ${capabilities.filter((c) => c.available).map((c) => c.label).join(", ") || "none verified"}`,
  ];
  if (publicState.currentObjective) lines.push(`Current objective: ${publicState.currentObjective}`);
  if (publicState.priorities.length) lines.push(`Current priorities: ${publicState.priorities.join("; ")}`);
  if (publicState.risks.length) lines.push(`Known risks: ${publicState.risks.join("; ")}`);
  if (criticalConflicts.length) lines.push(`ACTION REQUIRED — high-impact DNA conflicts: ${criticalConflicts.map((c) => `${c.fieldKey} (${c.impactReason})`).join("; ")}`);
  if (reviews.length) lines.push(`Business review queue: ${reviews.length} non-urgent item(s).`);
  if (recommendations.length) lines.push(`Open recommendations: ${recommendations.map((r) => r.title).join("; ")}`);

  return {
    businessId: business.id,
    businessName: business.name,
    generatedAt: new Date(),
    dna: topDna.map((claim) => ({
      fieldKey: claim.fieldKey,
      currentValue: claim.currentValue,
      confidenceScore: claim.confidenceScore,
      trustLevel: claim.trustLevel,
      source: claim.source,
      lastUpdatedAt: claim.lastUpdatedAt,
    })),
    state: publicState,
    capabilities,
    unresolvedConflicts: conflicts.map((conflict) => ({ id: conflict.id, fieldKey: conflict.fieldKey, impactScore: conflict.impactScore, impactReason: conflict.impactReason })),
    reviewCount: reviews.length,
    recommendations: recommendations.map((r) => ({ id: r.id, title: r.title, category: r.category, confidence: r.confidence, status: r.status })),
    contextNote: lines.join("\n"),
  };
}

// ─── Cross-Business Analysis (opt-in only) ─────────────────────────────────
// Deliberately its own function, its own return type, and its own call
// sites (see executive-brain.ts) — never invoked as a side effect of the
// normal single-business path, so cross-business aggregation can never
// happen by accident.
export async function assembleCrossBusinessSummary(userId: number): Promise<CrossBusinessSummary> {
  const businesses = await db.select().from(businessesTable).where(eq(businessesTable.ownerId, userId));
  const entries = await Promise.all(businesses.map(async (business) => {
    const [state, [latestMetric]] = await Promise.all([
      getBusinessState(business.id, userId),
      db.select().from(businessHealthMetricsTable).where(eq(businessHealthMetricsTable.businessId, business.id)).orderBy(desc(businessHealthMetricsTable.computedAt)).limit(1),
    ]);
    return {
      businessId: business.id,
      businessName: business.name,
      lifecycleStage: state?.lifecycleStage ?? "idea",
      healthScore: latestMetric?.overallScore ?? null,
      openTasks: state?.openTasks ?? 0,
      activeGoals: state?.activeGoals ?? 0,
    };
  }));

  const lines = [
    "\n\n=== CROSS-BUSINESS ANALYSIS (explicit, opt-in — the user asked to compare across businesses) ===",
    `Comparing ${entries.length} business(es) owned by this user:`,
    ...entries.map((e) => `- ${e.businessName}: ${e.lifecycleStage}, health ${e.healthScore ?? "unknown"}/100, ${e.openTasks} open task(s), ${e.activeGoals} active goal(s)`),
  ];

  return {
    userId,
    generatedAt: new Date(),
    businessCount: entries.length,
    businesses: entries,
    contextNote: lines.join("\n"),
  };
}
