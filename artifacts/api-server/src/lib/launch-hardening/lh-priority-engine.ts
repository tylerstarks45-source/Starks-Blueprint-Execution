// ── Priority Engine ────────────────────────────────────────────────────────
// Automatically classifies findings into:
//   BLOCKER      — must be resolved before any production traffic
//   PRE_LAUNCH   — must be resolved before public launch (but not a hard blocker)
//   POST_LAUNCH  — can be deferred to a post-launch sprint
//   OBSERVATION  — architectural notes; no immediate action required
// ────────────────────────────────────────────────────────────────────────────

import { db } from "@workspace/db";
import { launchHardeningRegistry } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { FindingSeverity, FindingPriority } from "./types";
import { AUDIT_FINDINGS } from "./types";
import { logger } from "../logger";

// Deterministic priority assignment from severity + fixBeforeLaunch.
// Critical + fixBeforeLaunch → BLOCKER (must clear before launch)
// Critical + !fixBeforeLaunch → PRE_LAUNCH (critical but timing negotiable)
// High     + fixBeforeLaunch → PRE_LAUNCH
// High     + !fixBeforeLaunch → POST_LAUNCH
// Medium   + fixBeforeLaunch → PRE_LAUNCH
// Medium   + !fixBeforeLaunch → POST_LAUNCH
// Low      + fixBeforeLaunch → POST_LAUNCH
// Low      + !fixBeforeLaunch → OBSERVATION
export function calculatePriority(
  severity: FindingSeverity,
  fixBeforeLaunch: boolean,
): FindingPriority {
  switch (severity) {
    case "critical":
      return fixBeforeLaunch ? "BLOCKER" : "PRE_LAUNCH";
    case "high":
      return fixBeforeLaunch ? "PRE_LAUNCH" : "POST_LAUNCH";
    case "medium":
      return fixBeforeLaunch ? "PRE_LAUNCH" : "POST_LAUNCH";
    case "low":
      return fixBeforeLaunch ? "POST_LAUNCH" : "OBSERVATION";
    default:
      return "POST_LAUNCH";
  }
}

// Returns the full priority distribution across all findings.
export function computePriorityDistribution(): Record<FindingPriority, number> {
  const dist: Record<FindingPriority, number> = {
    BLOCKER:      0,
    PRE_LAUNCH:   0,
    POST_LAUNCH:  0,
    OBSERVATION:  0,
  };
  for (const f of AUDIT_FINDINGS) {
    dist[calculatePriority(f.severity, f.fixBeforeLaunch)]++;
  }
  return dist;
}

// Recalculates and persists priorities for all open findings.
// Should be called if the priority algorithm changes.
export async function recalculateAllPriorities(): Promise<{ updated: number }> {
  const registry = await db.select().from(launchHardeningRegistry);
  let updated = 0;

  for (const reg of registry) {
    const finding = AUDIT_FINDINGS.find(f => f.code === reg.findingCode);
    if (!finding) continue;

    const newPriority = calculatePriority(finding.severity, finding.fixBeforeLaunch);
    if (newPriority !== reg.priority) {
      await db
        .update(launchHardeningRegistry)
        .set({ priority: newPriority, updatedAt: new Date() })
        .where(eq(launchHardeningRegistry.id, reg.id));
      updated++;
    }
  }

  logger.info({ updated }, "Launch Hardening: priorities recalculated");
  return { updated };
}

// Returns a breakdown useful for the EB advisory.
export function summarisePriorities() {
  const dist = computePriorityDistribution();
  return {
    blockers:    dist.BLOCKER,
    prelaunch:   dist.PRE_LAUNCH,
    postlaunch:  dist.POST_LAUNCH,
    observation: dist.OBSERVATION,
    total:       AUDIT_FINDINGS.length,
  };
}
