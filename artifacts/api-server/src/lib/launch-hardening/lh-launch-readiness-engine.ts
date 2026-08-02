// ── Launch Readiness Engine ────────────────────────────────────────────────
// Calculates remaining launch blockers after each completed hardening build
// and derives an overall launch confidence score and status.
//
// Launch Status ladder:
//   NOT_READY         — 1+ BLOCKER findings are open/in_progress
//   CONDITIONAL       — No blockers but PRE_LAUNCH findings remain
//   READY             — All PRE_LAUNCH resolved; only POST_LAUNCH/OBSERVATION remain
//   LAUNCH_AUTHORIZED — All pre-launch findings verified + admin sign-off present
// ────────────────────────────────────────────────────────────────────────────

import { db } from "@workspace/db";
import { launchHardeningRegistry, launchFindings, launchVerification, launchSnapshots, launchRegression } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type { LaunchStatus, LaunchReadinessResult } from "./types";
import { getUnverifiedFixed } from "./lh-verification-engine";
import { getHighRegressionRisk } from "./lh-regression-engine";
import { logger } from "../logger";

// Terminal statuses — a finding in these states is no longer "open"
const RESOLVED_STATUSES = new Set(["verified", "deferred", "accepted_risk"]);
// Active work statuses
const OPEN_STATUSES = new Set(["open", "in_progress", "fixed"]);

export async function computeLaunchReadiness(): Promise<LaunchReadinessResult> {
  const registry  = await db.select().from(launchHardeningRegistry);
  const allFindings = await db.select().from(launchFindings);
  const byCode    = new Map(allFindings.map(f => [f.findingCode, f]));

  // Tally open counts by severity
  let criticalOpen = 0, highOpen = 0, mediumOpen = 0, lowOpen = 0;
  let blockersRemaining = 0, prelaunchRemaining = 0;
  let verifiedFixed = 0, deferredCount = 0, acceptedRiskCount = 0;
  const blockerDetails: LaunchReadinessResult["blockerDetails"] = [];

  for (const reg of registry) {
    const finding = byCode.get(reg.findingCode);
    if (!finding) continue;
    const isOpen = OPEN_STATUSES.has(reg.status);

    if (reg.status === "verified") verifiedFixed++;
    if (reg.status === "deferred") deferredCount++;
    if (reg.status === "accepted_risk") acceptedRiskCount++;

    if (!isOpen) continue;

    // Count open by severity
    switch (finding.severity) {
      case "critical": criticalOpen++;    break;
      case "high":     highOpen++;        break;
      case "medium":   mediumOpen++;      break;
      case "low":      lowOpen++;         break;
    }

    if (reg.priority === "BLOCKER") {
      blockersRemaining++;
      blockerDetails.push({
        code:               finding.findingCode,
        severity:           finding.severity as any,
        title:              finding.title,
        whyItMatters:       finding.whyItMatters,
        buildIntroduced:    finding.buildIntroduced,
        affectedFiles:      finding.affectedFiles as string[],
        recommendedSolution: finding.recommendedSolution,
        complexity:         finding.complexity as any,
        fixBeforeLaunch:    finding.fixBeforeLaunch,
        category:           finding.category as any,
        auditSection:       finding.auditSection,
        priority:           reg.priority as any,
        status:             reg.status as any,
        dependsOn:          (reg.dependsOn as string[]) ?? [],
      });
    }
    if (reg.priority === "PRE_LAUNCH") prelaunchRemaining++;
  }

  // Compute launch confidence: fraction of launch-blocking findings resolved
  const launchBlockingTotal = registry.filter(r =>
    r.priority === "BLOCKER" || r.priority === "PRE_LAUNCH"
  ).length;
  const launchBlockingResolved = registry.filter(r =>
    (r.priority === "BLOCKER" || r.priority === "PRE_LAUNCH") && RESOLVED_STATUSES.has(r.status)
  ).length;
  const launchConfidence = launchBlockingTotal > 0
    ? Math.round((launchBlockingResolved / launchBlockingTotal) * 100)
    : 0;

  // Determine launch status
  let launchStatus: LaunchStatus;
  if (blockersRemaining > 0) {
    launchStatus = "NOT_READY";
  } else if (prelaunchRemaining > 0) {
    launchStatus = "CONDITIONAL";
  } else if (launchConfidence >= 100) {
    launchStatus = "LAUNCH_AUTHORIZED";
  } else {
    launchStatus = "READY";
  }

  const unverifiedFixed    = await getUnverifiedFixed();
  const highRegressionItems = (await getHighRegressionRisk()).map(r => ({
    id:                 r.id,
    remediationId:      r.remediationId,
    findingCode:        r.findingCode,
    impactedSubsystems: (r.impactedSubsystems as string[]) ?? [],
    regressionRisk:     r.regressionRisk as any,
    regressionNotes:    r.regressionNotes ?? null,
    reviewedBy:         r.reviewedBy ?? null,
    approved:           r.approved,
  }));

  return {
    totalFindings: registry.length,
    criticalOpen,
    highOpen,
    mediumOpen,
    lowOpen,
    blockersRemaining,
    prelaunchRemaining,
    verifiedFixed,
    deferredCount,
    acceptedRiskCount,
    launchConfidence,
    launchStatus,
    blockerDetails,
    highRegressionItems,
    unverifiedFixed,
  };
}

// Persist a launch readiness snapshot for historical tracking.
export async function createLaunchSnapshot(triggerBuild?: string): Promise<number> {
  const readiness = await computeLaunchReadiness();

  const [snap] = await db.insert(launchSnapshots).values({
    totalFindings:      readiness.totalFindings,
    criticalOpen:       readiness.criticalOpen,
    highOpen:           readiness.highOpen,
    mediumOpen:         readiness.mediumOpen,
    lowOpen:            readiness.lowOpen,
    blockersRemaining:  readiness.blockersRemaining,
    prelaunchRemaining: readiness.prelaunchRemaining,
    verifiedFixed:      readiness.verifiedFixed,
    deferredCount:      readiness.deferredCount,
    acceptedRiskCount:  readiness.acceptedRiskCount,
    launchConfidence:   readiness.launchConfidence,
    launchStatus:       readiness.launchStatus,
    triggerBuild:       triggerBuild ?? null,
    snapshotData:       readiness as any,
  }).returning({ id: launchSnapshots.id });

  logger.info({
    snapshotId:        snap.id,
    launchStatus:      readiness.launchStatus,
    blockersRemaining: readiness.blockersRemaining,
    launchConfidence:  readiness.launchConfidence,
  }, "Launch Hardening: snapshot created");

  return snap.id;
}

// Fetch the latest snapshot (lightweight EB read).
export async function fetchLatestSnapshot() {
  const rows = await db
    .select()
    .from(launchSnapshots)
    .orderBy(desc(launchSnapshots.createdAt))
    .limit(1);
  return rows[0] ?? null;
}
