import type { ValidationContext, ValidationIssue, ValidationRule } from "../types";

// ─── API requirement rule ──────────────────────────────────────────────────
// Distinct from credential-rule: platform-level APIs the whole system relies
// on (not a per-user connected credential). Structural, not keyword-driven —
// keyed off assignedEngine, which every task already has.
const PLATFORM_ENV_REQUIREMENTS: Partial<Record<string, string[]>> = {
  media_gen: ["OPENROUTER_API_KEY"],
  research: ["OPENROUTER_API_KEY"],
  ai_orchestrator: ["OPENROUTER_API_KEY"],
};

export const apiRequirementRule: ValidationRule = {
  id: "api_requirement",
  description: "Flags a task whose assigned engine needs a platform-level API key that isn't configured at all.",
  async evaluate(ctx: ValidationContext): Promise<ValidationIssue[]> {
    const required = PLATFORM_ENV_REQUIREMENTS[ctx.task.assignedEngine];
    if (!required) return [];

    const missing = required.filter((key) => !process.env[key]);
    if (missing.length === 0) return [];

    return [{
      kind: "missing_api",
      ruleId: "api_requirement",
      reason: `The platform is missing a required API key (${missing.join(", ")}) for this to run — this is a system configuration issue, not something the user can fix from the app.`,
    }];
  },
};
