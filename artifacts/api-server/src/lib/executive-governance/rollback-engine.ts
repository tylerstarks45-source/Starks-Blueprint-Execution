// ─── Build 014: Rollback Engine ───────────────────────────────────────────────
//
// Creates Behavior Snapshots before every adaptation (rollback points).
// Rollback restores the previous snapshot state WITHOUT modifying history.
// Pure: no DB access. Snapshot creation and restoration are in governance-registry.

import { randomUUID } from "crypto";
import type { AdaptationPlan, BehaviorProfile, BehaviorSnapshot } from "./types";

// ── Build a pre-adaptation snapshot ──────────────────────────────────────────

export function buildSnapshot(opts: {
  userId: number | null;
  currentProfile: BehaviorProfile | null;
  adaptationPlan: AdaptationPlan | null;
  reason?: string;
}): Omit<BehaviorSnapshot, "id" | "createdAt"> {
  const { userId, currentProfile, adaptationPlan } = opts;

  return {
    userId,
    profileId: currentProfile?.id ?? null,
    profileType: currentProfile?.profileType ?? "balanced",
    activePolicyIds: currentProfile?.activePolicyIds ?? [],
    adaptationPlanId: adaptationPlan?.id ?? null,
    reason: opts.reason ?? "pre-adaptation",
    isRollbackPoint: true,
    rolledBackAt: null,
    payload: {
      profileName: currentProfile?.name ?? null,
      policyCount: currentProfile?.policyCount ?? 0,
      profileVersion: currentProfile?.version ?? 0,
    },
  };
}

// ── Rollback summary text ─────────────────────────────────────────────────────

export function buildRollbackSummary(
  snapshot: BehaviorSnapshot,
  restoredProfile: BehaviorProfile | null,
): string {
  const parts: string[] = [
    `Rolled back to snapshot created ${snapshot.createdAt.toISOString()}.`,
  ];
  if (restoredProfile) {
    parts.push(`Restored profile: "${restoredProfile.name}" (${restoredProfile.profileType}, ${restoredProfile.policyCount} policies).`);
  } else {
    parts.push(`Restored to no active profile (${snapshot.activePolicyIds.length} policy IDs archived).`);
  }
  parts.push("History preserved — rollback does not delete any prior records.");
  return parts.join(" ");
}
