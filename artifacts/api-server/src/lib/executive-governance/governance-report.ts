// ─── Build 014: Governance Report Engine ─────────────────────────────────────
//
// Assembles the immutable Governance Report from cycle data.
// Pure: no DB access.

import { randomUUID } from "crypto";
import type {
  AdaptationPlan,
  BehaviorProfile,
  GovernanceReport,
} from "./types";
import type { ConflictReport } from "./types";

export function makeReportId(): string {
  return `gr_${randomUUID().replace(/-/g, "").slice(0, 22)}`;
}

// ── Confidence computation ────────────────────────────────────────────────────

function computeGovernanceConfidence(
  approvedCount: number,
  rejectedCount: number,
  deferredCount: number,
  conflictCount: number,
): number {
  const totalEvaluated = approvedCount + rejectedCount + deferredCount;
  if (totalEvaluated === 0) return 0.5;
  const approvalRate = approvedCount / totalEvaluated;
  const conflictPenalty = Math.min(0.3, conflictCount * 0.05);
  return Math.max(0.1, Math.min(0.99, 0.3 + approvalRate * 0.6 - conflictPenalty));
}

// ── Executive summary ─────────────────────────────────────────────────────────

function buildExecutiveSummary(opts: {
  evaluatedCount: number;
  approvedCount: number;
  rejectedCount: number;
  deferredCount: number;
  conflictReport: ConflictReport;
  activeProfile: BehaviorProfile | null;
  plan: AdaptationPlan | null;
}): string {
  const { evaluatedCount, approvedCount, rejectedCount, deferredCount, conflictReport, activeProfile, plan } = opts;
  const parts: string[] = [
    `Governance cycle evaluated ${evaluatedCount} principle${evaluatedCount !== 1 ? "s" : ""}: ${approvedCount} approved, ${rejectedCount} rejected, ${deferredCount} deferred.`,
  ];

  if (conflictReport.totalConflicts > 0) {
    parts.push(`${conflictReport.totalConflicts} conflict${conflictReport.totalConflicts !== 1 ? "s" : ""} detected (${conflictReport.highSeverityCount} high-severity${conflictReport.hasCycle ? ", including a cycle" : ""}).`);
  } else {
    parts.push("No policy conflicts detected.");
  }

  if (plan && plan.policiesToActivate.length + plan.policiesToRetire.length > 0) {
    parts.push(`Adaptation applied: ${plan.policiesToActivate.length} polic${plan.policiesToActivate.length !== 1 ? "ies" : "y"} activated, ${plan.policiesToRetire.length} retired.`);
  }

  if (activeProfile) {
    parts.push(`Active profile: ${activeProfile.name} (${activeProfile.profileType}, ${activeProfile.policyCount} policies).`);
  } else {
    parts.push("No behavior profile is currently active.");
  }

  return parts.join(" ");
}

// ── Behavior changes list ─────────────────────────────────────────────────────

function buildBehaviorChanges(plan: AdaptationPlan | null): string[] {
  if (!plan) return [];
  const changes: string[] = [];
  if (plan.policiesToActivate.length > 0) {
    changes.push(`Activated ${plan.policiesToActivate.length} polic${plan.policiesToActivate.length !== 1 ? "ies" : "y"} in ${plan.affectedCognitiveSystems.join(", ")}.`);
  }
  if (plan.policiesToRetire.length > 0) {
    changes.push(`Retired ${plan.policiesToRetire.length} obsolete polic${plan.policiesToRetire.length !== 1 ? "ies" : "y"}.`);
  }
  return changes;
}

// ── Assemble the report ───────────────────────────────────────────────────────

export function assembleGovernanceReport(opts: {
  userId: number | null;
  evaluatedPrincipleIds: string[];
  approvedPolicyIds: string[];
  rejectedPolicyIds: string[];
  deferredPrincipleIds: string[];
  conflictReport: ConflictReport;
  plan: AdaptationPlan | null;
  activeProfile: BehaviorProfile | null;
  snapshotIds: string[];
  cycleVersion: number;
}): GovernanceReport {
  const {
    userId, evaluatedPrincipleIds, approvedPolicyIds, rejectedPolicyIds,
    deferredPrincipleIds, conflictReport, plan, activeProfile, snapshotIds, cycleVersion,
  } = opts;

  return {
    id: makeReportId(),
    userId,
    evaluatedPrincipleIds,
    approvedPolicyIds,
    rejectedPolicyIds,
    deferredPrincipleIds,
    conflictsFound: conflictReport.totalConflicts,
    behaviorChanges: buildBehaviorChanges(plan),
    rollbackPoints: snapshotIds,
    executiveSummary: buildExecutiveSummary({
      evaluatedCount: evaluatedPrincipleIds.length,
      approvedCount: approvedPolicyIds.length,
      rejectedCount: rejectedPolicyIds.length,
      deferredCount: deferredPrincipleIds.length,
      conflictReport,
      activeProfile,
      plan,
    }),
    governanceConfidence: computeGovernanceConfidence(
      approvedPolicyIds.length,
      rejectedPolicyIds.length,
      deferredPrincipleIds.length,
      conflictReport.totalConflicts,
    ),
    adaptationPlanId: plan?.id ?? null,
    activeProfileId: activeProfile?.id ?? null,
    activeProfileType: activeProfile?.profileType ?? null,
    cycleVersion,
    producedAt: new Date(),
    metadata: {
      conflictsByType: conflictReport.byType,
      affectedSystems: plan?.affectedCognitiveSystems ?? [],
      domainsCovered: [...new Set(evaluatedPrincipleIds)],
    },
  };
}
