import { findPlatformMentions } from "../../../platform-registry";
import type { ValidationContext, ValidationIssue, ValidationRule } from "../types";

// ─── Integration requirement rule ──────────────────────────────────────────
// Distinct from credential-rule: this flags a platform the task wants to use
// that ASH doesn't support as a connector AT ALL, vs. one that's supported
// but not yet connected. The unsupported-platform list itself lives in the
// Platform Registry (../../../platform-registry) — config-driven, reusable
// by any future engine — not hardcoded here.
export const integrationRule: ValidationRule = {
  id: "integration",
  description: "Flags a task that names a platform ASH has no connector for yet.",
  async evaluate(ctx: ValidationContext): Promise<ValidationIssue[]> {
    const unsupported = findPlatformMentions(ctx.task.description).filter((p) => !p.supported);
    return unsupported.map((platform): ValidationIssue => ({
      kind: "missing_integration",
      ruleId: "integration",
      reason: `ASH doesn't have a ${platform.displayName} integration yet — this step needs to be done manually.`,
    }));
  },
};
