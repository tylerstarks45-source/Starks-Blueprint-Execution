// ─── Build 014: Executive Brain ↔ Governance Integration ─────────────────────
//
// Provides three functions consumed by the Executive Brain pipeline:
//
//   fetchGovernanceSummary  — reads current profile + approved policies from DB
//   triggerGovernanceCycle  — fire-and-forget governance cycle (async, throttled)
//   buildGovernanceAdvisory — converts GovernanceSummary into context note fragment
//
// Executive reasoning reads ONLY through approved policies.
// It never reads raw principles.
// Draft and proposed policies are invisible here.

import { getGovernanceSummary } from "../executive-governance/governance-registry";
import { runGovernanceCycle } from "../executive-governance/governance-orchestrator";
import { buildProfileAdvisory } from "../executive-governance/behavior-profile";
import { getApprovedPolicies } from "../executive-governance/governance-registry";
import type { GovernanceSummary } from "../executive-governance/types";
import { logger } from "../logger";

// ── Fetch summary ─────────────────────────────────────────────────────────────

export async function fetchGovernanceSummary(userId: number): Promise<GovernanceSummary | null> {
  try {
    return await getGovernanceSummary(userId);
  } catch (err) {
    logger.warn({ err }, "Executive Brain: fetchGovernanceSummary failed (non-fatal)");
    return null;
  }
}

// ── Fire-and-forget governance cycle ─────────────────────────────────────────
// Throttled to every 25 brain cycles to avoid running on every request.

let brainCycleCount = 0;
const GOVERNANCE_CYCLE_EVERY = 25;

export function triggerGovernanceCycle(userId: number): void {
  brainCycleCount++;
  if (brainCycleCount % GOVERNANCE_CYCLE_EVERY !== 0) return;

  void runGovernanceCycle({ userId }).catch((err) => {
    logger.warn({ err }, "Executive Brain: background governance cycle failed (non-fatal)");
  });
}

// ── Advisory text ─────────────────────────────────────────────────────────────

export async function buildGovernanceAdvisory(
  summary: GovernanceSummary | null,
  userId: number,
): Promise<string | null> {
  if (!summary || summary.activePolicyCount === 0) return null;

  try {
    // Fetch the active policies for the profile advisory
    const activePolicies = await getApprovedPolicies(userId);
    if (activePolicies.length === 0) return null;

    const profileAdvisory = buildProfileAdvisory(
      summary.activeProfileId
        ? {
            id: summary.activeProfileId,
            profileType: summary.activeProfileType!,
            activePolicyIds: activePolicies.map((p) => p.id),
            // Minimal shape for buildProfileAdvisory
          } as any
        : null,
      activePolicies,
    );

    if (!profileAdvisory) return null;

    const lines: string[] = [profileAdvisory];
    if (summary.lastCycleAt) {
      const ago = Math.round((Date.now() - summary.lastCycleAt.getTime()) / 60000);
      lines.push(`Governance cycle: ${ago} min ago (${summary.cycleCount} total cycles).`);
    }
    return lines.join("\n");
  } catch (err) {
    logger.warn({ err }, "Executive Brain: buildGovernanceAdvisory failed (non-fatal)");
    return null;
  }
}
