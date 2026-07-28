import { db, userCredentialsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { listConnectors } from "../../../connectors/registry";
import type { ValidationContext, ValidationIssue, ValidationRule } from "../types";

// ─── Credential validation rule ────────────────────────────────────────────
// Driven by the connector registry (single source of truth already used by
// the Connections Hub) instead of a hand-maintained keyword→credential map.
// Registering a new connector automatically extends this rule with zero
// changes here — that's the "extensible without touching core logic" bar
// applied to the rule's own data source, not just the engine.

function connectorMatchTerms(id: string, displayName: string): string[] {
  const terms = new Set<string>([id.toLowerCase(), displayName.toLowerCase()]);
  terms.add(id.replace(/_/g, " "));
  return [...terms].filter((t) => t.length > 2);
}

export const credentialRule: ValidationRule = {
  id: "credential",
  description: "Flags a task that names a connected platform whose credential isn't connected yet.",
  async evaluate(ctx: ValidationContext): Promise<ValidationIssue[]> {
    const lower = ctx.task.description.toLowerCase();
    const connectors = listConnectors();

    const matched = connectors.filter((c) => connectorMatchTerms(c.id, c.displayName).some((term) => lower.includes(term)));
    if (matched.length === 0) return [];

    const rows = await db
      .select({ credentialKey: userCredentialsTable.credentialKey, status: userCredentialsTable.status })
      .from(userCredentialsTable)
      .where(eq(userCredentialsTable.userId, ctx.userId));
    const connected = new Set(rows.filter((r) => r.status === "connected").map((r) => r.credentialKey));

    const issues: ValidationIssue[] = [];
    for (const connector of matched) {
      const missing = connector.requiredCredentials.filter((key) => !connected.has(key));
      if (missing.length > 0) {
        issues.push({
          kind: "missing_credential",
          ruleId: "credential",
          reason: `Requires ${connector.displayName} to be connected (missing: ${missing.join(", ")}) — connect it in the Connections Hub.`,
        });
      }
    }
    return issues;
  },
};
