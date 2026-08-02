// ── Finding Classification Engine ─────────────────────────────────────────
// Imports the 43 canonical audit findings into the DB and creates registry
// entries for each. Idempotent — safe to call multiple times.
// The audit is immutable: existing launch_findings rows are never updated.
// ────────────────────────────────────────────────────────────────────────────

import { db } from "@workspace/db";
import { launchFindings, launchHardeningRegistry } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { AUDIT_FINDINGS, DEPENDENCY_MAP } from "./types";
import { calculatePriority } from "./lh-priority-engine";
import { logger } from "../logger";

export interface ImportResult {
  imported:  number;
  skipped:   number;
  total:     number;
  findings:  Array<{ code: string; priority: string; status: string }>;
}

// Idempotent: inserts a finding only if its code does not already exist.
export async function importAuditFindings(): Promise<ImportResult> {
  let imported = 0;
  let skipped  = 0;
  const summary: ImportResult["findings"] = [];

  for (const f of AUDIT_FINDINGS) {
    // Check if already imported
    const existing = await db
      .select({ id: launchFindings.id })
      .from(launchFindings)
      .where(eq(launchFindings.findingCode, f.code))
      .limit(1);

    let findingId: number;

    if (existing.length > 0) {
      findingId = existing[0].id;
      skipped++;
    } else {
      const [inserted] = await db.insert(launchFindings).values({
        findingCode:         f.code,
        severity:            f.severity,
        title:               f.title,
        whyItMatters:        f.whyItMatters,
        buildIntroduced:     f.buildIntroduced,
        affectedFiles:       f.affectedFiles,
        recommendedSolution: f.recommendedSolution,
        complexity:          f.complexity,
        fixBeforeLaunch:     f.fixBeforeLaunch,
        category:            f.category,
        auditSection:        f.auditSection,
      }).returning({ id: launchFindings.id });
      findingId = inserted.id;
      imported++;
    }

    // Upsert registry entry (mutable side)
    const regExisting = await db
      .select({ id: launchHardeningRegistry.id })
      .from(launchHardeningRegistry)
      .where(eq(launchHardeningRegistry.findingCode, f.code))
      .limit(1);

    const priority  = calculatePriority(f.severity, f.fixBeforeLaunch);
    const dependsOn = DEPENDENCY_MAP[f.code] ?? [];

    if (regExisting.length === 0) {
      await db.insert(launchHardeningRegistry).values({
        findingId,
        findingCode: f.code,
        priority,
        status:    "open",
        dependsOn,
        updatedAt: new Date(),
      });
    }

    summary.push({ code: f.code, priority, status: "open" });
  }

  logger.info({ imported, skipped, total: AUDIT_FINDINGS.length }, "Launch Hardening: audit findings import complete");
  return { imported, skipped, total: AUDIT_FINDINGS.length, findings: summary };
}

// Returns all findings joined with their registry entry.
export async function getClassifiedFindings() {
  const findings  = await db.select().from(launchFindings);
  const registry  = await db.select().from(launchHardeningRegistry);
  const regByCode = new Map(registry.map(r => [r.findingCode, r]));

  return findings.map(f => ({
    ...f,
    priority:  regByCode.get(f.findingCode)?.priority  ?? "PRE_LAUNCH",
    status:    regByCode.get(f.findingCode)?.status    ?? "open",
    dependsOn: (regByCode.get(f.findingCode)?.dependsOn as string[]) ?? [],
  }));
}

// Returns all BLOCKER-priority findings that are not yet verified/deferred/accepted.
export async function getRemainingBlockers() {
  const registry = await db
    .select()
    .from(launchHardeningRegistry)
    .where(eq(launchHardeningRegistry.priority, "BLOCKER"));

  const open = registry.filter(r =>
    r.status !== "verified" && r.status !== "deferred" && r.status !== "accepted_risk"
  );

  // Enrich with finding data
  const allFindings = await db.select().from(launchFindings);
  const byCode      = new Map(allFindings.map(f => [f.findingCode, f]));

  return open.map(r => ({
    ...r,
    finding: byCode.get(r.findingCode),
  }));
}
