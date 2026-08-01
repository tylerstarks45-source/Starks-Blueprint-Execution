// ─────────────────────────────────────────────────────────────────────────────
// Build 027: Execution Simulation Engine — Rollback Simulation Engine
// Validates rollback paths: rollback confidence, recovery complexity, duration.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { RollbackSimulationRecord, RecoveryComplexity } from "./types";

interface RollbackInput {
  reportId:            string;
  simulationId:        string;
  businessId:          number;
  ownerType:           string;
  executionClass:      string;
  complexityLevel:     string;
  reversibilityLevel?: string; // from risk assessment
  rollbackComplexity?: string; // from risk assessment
}

const CLASS_ROLLBACK_CONFIDENCE: Record<string, number> = {
  automated: 0.85, ai_driven: 0.65, human: 0.75, external: 0.35, hybrid: 0.70,
};

const REVERSIBILITY_CONFIDENCE_BONUS: Record<string, number> = {
  fully_reversible: 0.15, rollback_available: 0.10, partially_reversible: 0, irreversible: -0.30,
};

const COMPLEXITY_RECOVERY_MAP: Record<string, RecoveryComplexity> = {
  low: "simple", medium: "moderate", high: "complex", very_high: "complex", extreme: "not_possible",
};

const OWNER_FEASIBILITY: Record<string, boolean> = {
  ai_agent: true, automation: true, human: true, department: true,
  integration: true, external_system: false, future_capability: true,
};

const RECOVERY_HOURS: Record<RecoveryComplexity, number> = {
  none: 0, simple: 0.5, moderate: 2, complex: 8, not_possible: 0,
};

function buildRollbackSteps(
  ownerType: string,
  executionClass: string,
  complexity: RecoveryComplexity
): string[] {
  const steps: string[] = [
    "1. Halt all in-progress execution tasks",
    "2. Capture current state snapshot",
  ];
  if (complexity !== "not_possible") {
    steps.push("3. Restore last known-good checkpoint");
    steps.push(`4. Verify '${ownerType}' resources returned to pre-execution state`);
    steps.push(`5. Re-run validation suite for '${executionClass}' class dependencies`);
    if (complexity === "complex") {
      steps.push("6. Manual verification by designated owner required");
      steps.push("7. Post-rollback incident report filed");
    }
    steps.push(`${steps.length + 1}. Confirm system health metrics restored`);
  } else {
    steps.push("3. Escalate to incident management — automatic rollback not possible");
    steps.push("4. Manual remediation plan required");
  }
  return steps;
}

export function simulateRollback(input: RollbackInput): RollbackSimulationRecord {
  const baseConfidence   = CLASS_ROLLBACK_CONFIDENCE[input.executionClass]   ?? 0.65;
  const revBonus         = REVERSIBILITY_CONFIDENCE_BONUS[input.reversibilityLevel ?? "partially_reversible"] ?? 0;
  const rollbackConfidence = Math.min(0.98, Math.max(0.05, baseConfidence + revBonus));

  const recoveryComplexity: RecoveryComplexity =
    (input.rollbackComplexity as RecoveryComplexity) ??
    COMPLEXITY_RECOVERY_MAP[input.complexityLevel] ??
    "moderate";

  const isFeasible = OWNER_FEASIBILITY[input.ownerType] ?? true;
  const estimatedHours = isFeasible ? (RECOVERY_HOURS[recoveryComplexity] ?? 2) : 0;

  const steps = buildRollbackSteps(input.ownerType, input.executionClass, recoveryComplexity);

  const notes =
    isFeasible
      ? `Rollback is ${recoveryComplexity} for '${input.executionClass}' class. Estimated recovery: ${estimatedHours}h.`
      : `Rollback not feasible for external_system owner type. Manual remediation required.`;

  return {
    id:                             randomUUID(),
    simulationId:                   input.simulationId,
    reportId:                       input.reportId,
    businessId:                     input.businessId,
    rollbackConfidence:             Math.round(rollbackConfidence * 1000) / 1000,
    recoveryComplexity,
    estimatedRecoveryDurationHours: estimatedHours,
    rollbackSteps:                  steps,
    rollbackNotes:                  notes,
    isRollbackFeasible:             isFeasible,
  };
}
