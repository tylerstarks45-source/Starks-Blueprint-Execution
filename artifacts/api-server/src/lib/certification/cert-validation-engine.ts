// ── Build 045: Architecture Validation Engine ─────────────────────────────
// Verifies every foundational subsystem is present and correctly registered.
// NEVER modifies platform state. Read-only.
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { listBrains } from "../cognitive-foundation/brain-registry";
import { listExtensionPoints } from "../cognitive-foundation/extension-points";
import type { DomainResult, ValidationFinding, CertificationDomain } from "./types";
import { CERTIFICATION_DOMAINS, EXPECTED_EP_COUNT, EXPECTED_BRAIN_COUNT } from "./types";

interface TableCheckResult {
  table: string;
  exists: boolean;
}

// Verify a table exists by attempting a COUNT query.
// H-08 fix: use sql.identifier() so the table name is properly quoted.
async function tableExists(tableName: string): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1 FROM ${sql.identifier(tableName)} LIMIT 1`);
    return true;
  } catch {
    return false;
  }
}

// Core table manifest — representative table per major subsystem.
const SUBSYSTEM_TABLES: Array<{ domain: CertificationDomain; table: string; label: string }> = [
  { domain: "executive_brain",           table: "executive_goals",                label: "Executive Goal Engine" },
  { domain: "executive_brain",           table: "executive_plans",                label: "Executive Planning Engine" },
  { domain: "executive_brain",           table: "executive_reflections",          label: "Executive Reflection Engine" },
  { domain: "cognitive_orchestrator",    table: "cognitive_artifacts",            label: "Cognitive Memory" },
  { domain: "cognitive_orchestrator",    table: "orchestration_registry",         label: "Unified Cognitive Orchestrator" },
  { domain: "knowledge_graph",           table: "knowledge_entities",             label: "Unified Knowledge Graph" },
  { domain: "authority_framework",       table: "authority_registry",             label: "Authority Resolution Engine" },
  { domain: "digital_operating_layer",   table: "dol_execution_sessions",         label: "Digital Operating Layer" },
  { domain: "digital_operating_layer",   table: "operating_snapshots",            label: "DOL Snapshots" },
  { domain: "connections_hub",           table: "connection_providers",            label: "Connections Hub — Providers" },
  { domain: "connections_hub",           table: "connection_health",              label: "Connections Hub — Health" },
  { domain: "business_intelligence",     table: "business_analyses",              label: "Business Analysis Engine" },
  { domain: "business_intelligence",     table: "executive_opportunities",        label: "Opportunity Discovery Engine" },
  { domain: "technology_intelligence",   table: "systems_models",                 label: "Systems Dynamics Engine" },
  { domain: "technology_intelligence",   table: "technology_evolution_registry",  label: "Technology Evolution Engine" },
  { domain: "infrastructure_intelligence",table: "infrastructure_resources",      label: "Platform Infrastructure Engine" },
  { domain: "planning_systems",          table: "strategic_programmes",           label: "Strategic Planning Engine" },
  { domain: "planning_systems",          table: "capability_plans",               label: "Capability Planning Engine" },
  { domain: "planning_systems",          table: "operational_plans",              label: "Operational Planning Engine" },
  { domain: "execution_systems",         table: "execution_assignments",          label: "Execution Orchestration Engine" },
  { domain: "execution_systems",         table: "execution_risk_registry",        label: "Execution Risk Assessment Engine" },
  { domain: "execution_systems",         table: "workflow_definitions",           label: "Workflow Execution Engine" },
  { domain: "observation_systems",       table: "executive_observations",         label: "Executive Observation Engine" },
  { domain: "reflection_systems",        table: "executive_cases",                label: "Executive Reflection Engine" },
  { domain: "learning_systems",          table: "discovered_principles",          label: "Executive Learning Engine" },
  { domain: "governance",               table: "governance_policies",             label: "Executive Governance Engine" },
  { domain: "memory",                   table: "cognitive_artifacts",             label: "Cognitive Memory Architecture" },
  { domain: "extensibility",             table: "adapter_registry",               label: "Universal Adapter Framework" },
  { domain: "extensibility",             table: "certification_runs",             label: "Certification Framework" },
];

// Validate architecture: check brains, EPs, and subsystem tables.
export async function validateArchitecture(): Promise<DomainResult[]> {
  const results: DomainResult[] = [];

  // 1. Brain registration check
  const brains = listBrains();
  const brainFindings: ValidationFinding[] = [
    {
      ruleCode: "ARCH-001",
      severity: "critical",
      passed:   brains.length >= EXPECTED_BRAIN_COUNT,
      message:  `Expected ≥${EXPECTED_BRAIN_COUNT} brains registered. Found: ${brains.length}. Brains: ${brains.map((b) => b.name).join(", ")}`,
      evidence: { brainCount: brains.length, brainNames: brains.map((b) => b.name) },
    },
  ];

  // 2. Extension point count check
  const eps = listExtensionPoints();
  const epFindings: ValidationFinding[] = [
    {
      ruleCode: "ARCH-002",
      severity: "critical",
      passed:   eps.length >= EXPECTED_EP_COUNT,
      message:  `Expected ≥${EXPECTED_EP_COUNT} extension points registered. Found: ${eps.length}.`,
      evidence: { epCount: eps.length, expected: EXPECTED_EP_COUNT },
    },
  ];

  // 3. Subsystem table presence checks — grouped by domain
  const domainFindings = new Map<CertificationDomain, ValidationFinding[]>();
  const domainEvidence = new Map<CertificationDomain, Record<string, unknown>>();

  for (const check of SUBSYSTEM_TABLES) {
    const exists = await tableExists(check.table);
    const findings = domainFindings.get(check.domain) ?? [];
    findings.push({
      ruleCode: `ARCH-TABLE-${check.table.toUpperCase().replace(/_/g, "-")}`,
      severity: "critical",
      passed:   exists,
      message:  `Table '${check.table}' (${check.label}): ${exists ? "PRESENT" : "MISSING"}`,
      evidence: { table: check.table, exists },
    });
    domainFindings.set(check.domain, findings);

    const evidence = domainEvidence.get(check.domain) ?? {};
    (evidence as any)[check.table] = exists;
    domainEvidence.set(check.domain, evidence);
  }

  // Assemble domain results
  for (const domain of CERTIFICATION_DOMAINS) {
    const findings = [
      ...(domain === "executive_brain"    ? brainFindings : []),
      ...(domain === "extensibility"      ? epFindings   : []),
      ...(domainFindings.get(domain) ?? []),
    ];

    if (findings.length === 0) {
      results.push({
        domain,
        status:   "skipped",
        score:    1.0,
        findings: [],
        evidence: {},
      });
      continue;
    }

    const passed  = findings.filter((f) => f.passed).length;
    const total   = findings.length;
    const score   = total > 0 ? passed / total : 1.0;
    const hasFail = findings.some((f) => !f.passed && (f.severity === "critical" || f.severity === "high"));

    results.push({
      domain,
      status:   hasFail ? "fail" : score >= 0.8 ? "pass" : "warning",
      score,
      findings,
      evidence: domainEvidence.get(domain) ?? {},
    });
  }

  return results;
}
