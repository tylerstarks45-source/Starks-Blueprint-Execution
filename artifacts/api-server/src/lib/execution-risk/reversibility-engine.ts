// ─────────────────────────────────────────────────────────────────────────────
// Build 026: Execution Risk Assessment Engine — Reversibility Engine
// Determines: fully_reversible | partially_reversible | irreversible | rollback_available
// Also determines rollback complexity: none | simple | moderate | complex | not_possible
// ─────────────────────────────────────────────────────────────────────────────
import type { ReversibilityLevel, RollbackComplexity } from "./types";

interface AssignmentInput {
  ownerType: string;
  executionClass: string;
  complexityLevel: string;
  businessCriticality: string;
  packageTitle?: string;
}

// ── Reversibility by owner type ────────────────────────────────────────────────
// Most reversible → least reversible
const OWNER_REVERSIBILITY: Record<string, ReversibilityLevel> = {
  human: "fully_reversible",
  department: "fully_reversible",
  ai_agent: "partially_reversible",      // AI may have written data, sent messages, etc.
  automation: "rollback_available",       // Typically scripted; backup/snapshot feasible
  integration: "partially_reversible",   // Third-party side effects may not be reversible
  external_system: "irreversible",        // External actions (emails, payments) cannot be undone
  future_capability: "fully_reversible", // Nothing executed yet
};

// ── Override toward "irreversible" by execution class ─────────────────────────
const IRREVERSIBLE_CLASSES = new Set(["external"]);
const COMPLEX_CLASSES = new Set(["automated"]);

// ── Rollback complexity by owner type ─────────────────────────────────────────
const OWNER_ROLLBACK_COMPLEXITY: Record<string, RollbackComplexity> = {
  human: "simple",
  department: "simple",
  ai_agent: "moderate",
  automation: "moderate",
  integration: "complex",
  external_system: "not_possible",
  future_capability: "none",
};

// ── Rollback complexity upgrade by execution class ────────────────────────────
function upgradeComplexity(base: RollbackComplexity, executionClass: string, complexityLevel: string): RollbackComplexity {
  const order: RollbackComplexity[] = ["none", "simple", "moderate", "complex", "not_possible"];
  let idx = order.indexOf(base);

  if (COMPLEX_CLASSES.has(executionClass)) idx = Math.min(order.length - 1, idx + 1);
  if (complexityLevel === "high") idx = Math.min(order.length - 1, idx + 1);
  if (complexityLevel === "critical") idx = Math.min(order.length - 1, idx + 2);

  return order[idx] ?? "complex";
}

function buildRollbackNote(
  reversibility: ReversibilityLevel,
  rollbackComplexity: RollbackComplexity,
  input: AssignmentInput
): string {
  switch (reversibility) {
    case "fully_reversible":
      return `Assignment is fully reversible. No rollback mechanism needed; simply undo the action.`;
    case "partially_reversible":
      return `Assignment is partially reversible. Some side effects (e.g., external API calls or AI-generated outputs) may persist. Rollback complexity: ${rollbackComplexity}.`;
    case "rollback_available":
      return `Assignment is not inherently reversible but a rollback mechanism (snapshot/backup) should be prepared before execution. Rollback complexity: ${rollbackComplexity}.`;
    case "irreversible":
      return `Assignment is irreversible. External system actions (payments, emails, API mutations) cannot be undone. Ensure all approvals are in place before execution.`;
  }
}

export interface ReversibilityAssessment {
  reversibilityLevel: ReversibilityLevel;
  rollbackComplexity: RollbackComplexity;
  rollbackNote: string;
  rollbackReadinessScore: number; // 0–1; higher = easier to roll back
}

export function assessReversibility(input: AssignmentInput): ReversibilityAssessment {
  let reversibilityLevel = OWNER_REVERSIBILITY[input.ownerType] ?? "partially_reversible";

  // External execution class always forces irreversible
  if (IRREVERSIBLE_CLASSES.has(input.executionClass)) {
    reversibilityLevel = "irreversible";
  }

  const baseComplexity = OWNER_ROLLBACK_COMPLEXITY[input.ownerType] ?? "complex";
  const rollbackComplexity = upgradeComplexity(baseComplexity, input.executionClass, input.complexityLevel);

  const rollbackNote = buildRollbackNote(reversibilityLevel, rollbackComplexity, input);

  // Rollback readiness score: higher = more reversible and simpler rollback
  const complexityOrder: Record<RollbackComplexity, number> = {
    none: 1.0,
    simple: 0.85,
    moderate: 0.60,
    complex: 0.35,
    not_possible: 0.05,
  };
  const reversibilityBonus: Record<ReversibilityLevel, number> = {
    fully_reversible: 0.15,
    rollback_available: 0.05,
    partially_reversible: -0.05,
    irreversible: -0.15,
  };

  const rollbackReadinessScore = Math.min(1, Math.max(0,
    (complexityOrder[rollbackComplexity] ?? 0.35) + (reversibilityBonus[reversibilityLevel] ?? 0)
  ));

  return {
    reversibilityLevel,
    rollbackComplexity,
    rollbackNote,
    rollbackReadinessScore: Math.round(rollbackReadinessScore * 1000) / 1000,
  };
}
