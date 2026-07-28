import { listConnectors, isKnownConnector } from "../../../connectors/registry";
import type { ValidationContext, ValidationIssue, ValidationRule } from "../types";

// ─── Integration requirement rule ──────────────────────────────────────────
// Distinct from credential-rule: this flags a platform the task wants to use
// that ASH doesn't support as a connector AT ALL, vs. one that's supported
// but not yet connected. Keeps a short, explicitly-curated list of
// commonly-requested-but-unsupported platforms so the user gets an honest
// "not available yet" instead of ASH silently pretending it can integrate.
const KNOWN_UNSUPPORTED_PLATFORMS = [
  "etsy",
  "amazon seller",
  "tiktok shop",
  "pinterest",
  "whatsapp business",
  "salesforce",
  "hubspot",
  "quickbooks",
  "square",
  "instagram shopping",
];

export const integrationRule: ValidationRule = {
  id: "integration",
  description: "Flags a task that names a platform ASH has no connector for yet.",
  async evaluate(ctx: ValidationContext): Promise<ValidationIssue[]> {
    const lower = ctx.task.description.toLowerCase();
    const issues: ValidationIssue[] = [];

    for (const platform of KNOWN_UNSUPPORTED_PLATFORMS) {
      if (lower.includes(platform) && !isKnownConnector(platform.replace(/ /g, "_"))) {
        issues.push({
          kind: "missing_integration",
          ruleId: "integration",
          reason: `ASH doesn't have a ${platform} integration yet — this step needs to be done manually.`,
        });
      }
    }

    return issues;
  },
};

// Exposed for other rules/engines that need the same "does ASH support X"
// check without duplicating the registry lookup.
export function supportedConnectorNames(): string[] {
  return listConnectors().map((c) => c.displayName);
}
