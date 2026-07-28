import { logger } from "../../logger";
import { ALL_VALIDATION_RULES } from "./rules";
import type { ValidationContext, ValidationResult } from "./types";

export type { ValidationContext, ValidationIssue, ValidationResult, ValidationRule, ValidationIssueKind } from "./types";
export { ALL_VALIDATION_RULES } from "./rules";
export { detectRisks, highestRiskLevel, RISK_CATEGORIES } from "./risk-detector";

// ─── Validation Engine core (Phase 1.4) ────────────────────────────────────
// The core knows nothing about credentials, files, APIs, tools, approvals,
// or integrations — it just runs every registered rule against the same
// context and merges the issues. All domain knowledge lives in rules/*.ts.
export async function runValidationEngine(ctx: ValidationContext): Promise<ValidationResult> {
  const results = await Promise.all(
    ALL_VALIDATION_RULES.map(async (rule) => {
      try {
        return await rule.evaluate(ctx);
      } catch (err) {
        logger.warn({ err, ruleId: rule.id, taskId: ctx.task.id }, "Validation Engine: rule failed, skipping it for this task");
        return [];
      }
    }),
  );

  const issues = results.flat();
  return { ok: issues.length === 0, issues };
}
