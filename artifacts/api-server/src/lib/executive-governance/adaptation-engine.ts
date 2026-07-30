// ─── Build 014: Adaptation Engine ────────────────────────────────────────────
//
// Generates Adaptation Plans from governance decisions.
// Plans describe: policies to activate, policies to retire, expected impact,
//                 affected cognitive systems, rollback strategy.
// Plans are executable only after approval.
// Pure: no DB access.

import { randomUUID } from "crypto";
import type { AdaptationPlan, BehaviorProfile, ExecutivePolicy, ProfileType } from "./types";

// ── Cognitive systems affected by policy type ─────────────────────────────────

const POLICY_TYPE_TO_SYSTEMS: Record<string, string[]> = {
  planning_guidance: ["planning", "executive_brain"],
  execution_guidance: ["execution", "executive_brain"],
  judgment_guidance: ["judgment", "executive_brain"],
  goal_prioritization: ["goal_management", "executive_brain"],
  execution_strategy: ["execution", "planning", "executive_brain"],
  context_weighting: ["context", "executive_brain"],
  general: ["executive_brain"],
};

function getAffectedSystems(policies: ExecutivePolicy[]): string[] {
  const systems = new Set<string>();
  for (const p of policies) {
    for (const s of POLICY_TYPE_TO_SYSTEMS[p.policyType] ?? ["executive_brain"]) {
      systems.add(s);
    }
  }
  return [...systems];
}

// ── Build rollback strategy ───────────────────────────────────────────────────

function buildRollbackStrategy(
  currentProfile: BehaviorProfile | null,
  policiesToRetire: ExecutivePolicy[],
): string {
  if (!currentProfile) {
    return "No previous profile exists. Rollback will restore system to default balanced profile with no active policies.";
  }
  const retireCount = policiesToRetire.length;
  return `Rollback restores behavior snapshot created before this adaptation. ${retireCount > 0 ? `${retireCount} retired polic${retireCount === 1 ? "y" : "ies"} will be re-activated. ` : ""}Previous profile type: ${currentProfile.profileType}. Snapshot is immutable and preserved in the rollback history.`;
}

// ── Build expected impact ─────────────────────────────────────────────────────

function buildExpectedImpact(
  policiesToActivate: ExecutivePolicy[],
  policiesToRetire: ExecutivePolicy[],
  targetProfileType: ProfileType,
): string {
  const parts: string[] = [];
  if (policiesToActivate.length > 0) {
    const domains = [...new Set(policiesToActivate.flatMap((p) => p.businessDomains))].slice(0, 3);
    parts.push(`${policiesToActivate.length} new polic${policiesToActivate.length === 1 ? "y" : "ies"} activated in: ${domains.join(", ")}.`);
  }
  if (policiesToRetire.length > 0) {
    parts.push(`${policiesToRetire.length} outdated polic${policiesToRetire.length === 1 ? "y" : "ies"} retired.`);
  }
  parts.push(`Target profile: ${targetProfileType} stance.`);
  return parts.join(" ");
}

// ── Generate an adaptation plan ───────────────────────────────────────────────

export function generateAdaptationPlan(opts: {
  userId: number | null;
  policiesToActivate: ExecutivePolicy[];
  policiesToRetire: ExecutivePolicy[];
  currentProfile: BehaviorProfile | null;
  targetProfileType: ProfileType;
}): Omit<AdaptationPlan, "id" | "createdAt" | "updatedAt" | "snapshotId" | "executedAt" | "rolledBackAt" | "governanceReportId"> {
  const { userId, policiesToActivate, policiesToRetire, currentProfile, targetProfileType } = opts;

  return {
    userId,
    title: `Adaptation: ${policiesToActivate.length} activate, ${policiesToRetire.length} retire → ${targetProfileType}`,
    description: `Governance cycle adaptation plan. Activating ${policiesToActivate.length} newly approved polic${policiesToActivate.length === 1 ? "y" : "ies"} and retiring ${policiesToRetire.length} obsolete polic${policiesToRetire.length === 1 ? "y" : "ies"}.`,
    policiesToActivate: policiesToActivate.map((p) => p.id),
    policiesToRetire: policiesToRetire.map((p) => p.id),
    targetProfileType,
    expectedImpact: buildExpectedImpact(policiesToActivate, policiesToRetire, targetProfileType),
    affectedCognitiveSystems: getAffectedSystems([...policiesToActivate, ...policiesToRetire]),
    rollbackStrategy: buildRollbackStrategy(currentProfile, policiesToRetire),
    status: "approved",    // plans produced by governance are auto-approved
    metadata: {
      policyTypesActivating: [...new Set(policiesToActivate.map((p) => p.policyType))],
      policyTypesRetiring: [...new Set(policiesToRetire.map((p) => p.policyType))],
      domainsAffected: [...new Set([...policiesToActivate, ...policiesToRetire].flatMap((p) => p.businessDomains))],
    },
  };
}

// ── Nothing to adapt ─────────────────────────────────────────────────────────

export function isAdaptationNeeded(
  policiesToActivate: ExecutivePolicy[],
  policiesToRetire: ExecutivePolicy[],
): boolean {
  return policiesToActivate.length > 0 || policiesToRetire.length > 0;
}
