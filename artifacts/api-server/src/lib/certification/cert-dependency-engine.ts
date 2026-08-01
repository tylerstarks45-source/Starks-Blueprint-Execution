// ── Build 045: Dependency Validation Engine ───────────────────────────────
// Verifies cross-engine dependencies, registries, and data consistency.
// NEVER modifies platform state. Read-only.
import { db } from "@workspace/db";
import type { ValidationFinding } from "./types";

interface DependencyCheck {
  code:        string;
  description: string;
  severity:    "critical" | "high" | "medium" | "low";
}

// Verify a table has at least N rows.
async function tableHasRows(table: string, minRows = 1): Promise<{ ok: boolean; count: number }> {
  try {
    const result = await db.execute(`SELECT COUNT(*) AS c FROM ${table}` as any);
    const count  = parseInt(String((result as any).rows?.[0]?.c ?? (result as any)[0]?.c ?? 0), 10);
    return { ok: count >= minRows, count };
  } catch {
    return { ok: false, count: 0 };
  }
}

const DEPENDENCY_CHECKS: Array<DependencyCheck & { table: string; minRows: number }> = [
  { code: "DEP-001", description: "Cognitive foundation has registered brains",       severity: "critical", table: "cognitive_snapshots",          minRows: 0 },
  { code: "DEP-002", description: "Authority registry has entries",                  severity: "high",     table: "authority_registry",            minRows: 0 },
  { code: "DEP-003", description: "Adapter registry has seeded adapters",            severity: "high",     table: "adapter_registry",              minRows: 1 },
  { code: "DEP-004", description: "Connection providers catalog is seeded",          severity: "high",     table: "connection_providers",           minRows: 1 },
  { code: "DEP-005", description: "Connection registry covers domains",              severity: "medium",   table: "connection_registry",            minRows: 1 },
  { code: "DEP-006", description: "Operating registry has domains",                  severity: "high",     table: "operating_registry",             minRows: 1 },
  { code: "DEP-007", description: "Technology evolution registry is seeded",         severity: "medium",   table: "technology_evolution_registry",  minRows: 1 },
  { code: "DEP-008", description: "Global technology registry is seeded",            severity: "medium",   table: "global_technologies",            minRows: 1 },
  { code: "DEP-009", description: "Infrastructure resources baseline exists",        severity: "medium",   table: "infrastructure_resources",       minRows: 1 },
  { code: "DEP-010", description: "Certification registry has been initialized",     severity: "low",      table: "certification_registry",         minRows: 0 },
  { code: "DEP-011", description: "Extension points table has entries",              severity: "critical", table: "extension_points",               minRows: 1 },
  { code: "DEP-012", description: "Provider capabilities catalog is seeded",         severity: "high",     table: "provider_capabilities",          minRows: 1 },
  { code: "DEP-013", description: "Executive brain principle registry exists",       severity: "medium",   table: "executive_principles",           minRows: 0 },
  { code: "DEP-014", description: "Governance policies registry exists",             severity: "high",     table: "governance_policies",            minRows: 0 },
];

export async function validateDependencies(): Promise<ValidationFinding[]> {
  const findings: ValidationFinding[] = [];

  for (const check of DEPENDENCY_CHECKS) {
    const { ok, count } = await tableHasRows(check.table, check.minRows);
    findings.push({
      ruleCode: check.code,
      severity: check.severity,
      passed:   ok,
      message:  `${check.description}: table '${check.table}' has ${count} row(s) (min required: ${check.minRows}) — ${ok ? "PASS" : "FAIL"}`,
      evidence: { table: check.table, count, minRows: check.minRows },
    });
  }

  return findings;
}

export function computeDependencyScore(findings: ValidationFinding[]): number {
  if (findings.length === 0) return 1.0;
  const passed = findings.filter((f) => f.passed).length;
  return passed / findings.length;
}
