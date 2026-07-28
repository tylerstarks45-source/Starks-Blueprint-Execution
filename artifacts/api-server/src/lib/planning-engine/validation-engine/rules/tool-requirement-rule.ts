import type { ValidationContext, ValidationIssue, ValidationRule } from "../types";

// ─── Tool requirement rule ──────────────────────────────────────────────────
// Structural (not keyword-driven): every task carries an `assignedEngine`
// set by the Executive Brain. This rule is the sanity check that the engine
// named actually exists in this platform before the task is allowed to run —
// it protects against a hallucinated/typo'd assignedEngine value silently
// reaching execution un-validated.
const KNOWN_ENGINES = new Set([
  "ai_orchestrator",
  "build_engine",
  "browser_agent",
  "media_gen",
  "research",
  "social_scheduler",
  "runtime_job",
  "connector",
  "manual",
]);

export const toolRequirementRule: ValidationRule = {
  id: "tool_requirement",
  description: "Flags a task assigned to an engine/tool this platform doesn't recognize.",
  async evaluate(ctx: ValidationContext): Promise<ValidationIssue[]> {
    if (KNOWN_ENGINES.has(ctx.task.assignedEngine)) return [];
    return [{
      kind: "missing_tool",
      ruleId: "tool_requirement",
      reason: `This task is assigned to "${ctx.task.assignedEngine}", which isn't a tool ASH currently has — it needs to be re-planned.`,
    }];
  },
};
