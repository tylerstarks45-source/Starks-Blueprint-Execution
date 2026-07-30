// ─── Build 014: Executive Governance Extension Points ────────────────────────

import { declareExtensionPoint } from "../cognitive-foundation/index";
import { GOVERNANCE_EXTENSION_POINT_IDS } from "./types";

export function declareGovernanceExtensionPoints(): void {
  declareExtensionPoint({
    id: GOVERNANCE_EXTENSION_POINT_IDS.POLICY_PROPOSED,
    description: "A new Executive Policy has been proposed from a validated principle.",
    declaredBy: "executive-governance-engine",
  });

  declareExtensionPoint({
    id: GOVERNANCE_EXTENSION_POINT_IDS.POLICY_APPROVED,
    description: "An Executive Policy has been approved and entered the active policy set.",
    declaredBy: "executive-governance-engine",
  });

  declareExtensionPoint({
    id: GOVERNANCE_EXTENSION_POINT_IDS.POLICY_REJECTED,
    description: "An Executive Policy has been rejected by the governance engine.",
    declaredBy: "executive-governance-engine",
  });

  declareExtensionPoint({
    id: GOVERNANCE_EXTENSION_POINT_IDS.POLICY_CONFLICT_DETECTED,
    description: "A conflict has been detected between two Executive Policies.",
    declaredBy: "executive-governance-engine",
  });

  declareExtensionPoint({
    id: GOVERNANCE_EXTENSION_POINT_IDS.BEHAVIOR_PROFILE_ACTIVATED,
    description: "A Behavior Profile has been activated, changing the active executive stance.",
    declaredBy: "executive-governance-engine",
  });

  declareExtensionPoint({
    id: GOVERNANCE_EXTENSION_POINT_IDS.ADAPTATION_PLAN_EXECUTED,
    description: "An Adaptation Plan has been executed, applying policy changes to the active profile.",
    declaredBy: "executive-governance-engine",
  });

  declareExtensionPoint({
    id: GOVERNANCE_EXTENSION_POINT_IDS.BEHAVIOR_SNAPSHOT_CREATED,
    description: "A Behavior Snapshot (rollback point) has been created before an adaptation.",
    declaredBy: "executive-governance-engine",
  });

  declareExtensionPoint({
    id: GOVERNANCE_EXTENSION_POINT_IDS.GOVERNANCE_REPORT_PRODUCED,
    description: "A Governance Report summarizing the cycle has been persisted.",
    declaredBy: "executive-governance-engine",
  });
}
