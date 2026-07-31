// ─────────────────────────────────────────────────────────────────────────────
// Build 026: Execution Risk Assessment Engine — Compliance Risk Engine
// Evaluates policy violations, governance impact, regulatory exposure,
// and audit implications.
// ─────────────────────────────────────────────────────────────────────────────
import type { RiskCategoryAssessment, RiskFactor, RiskLevel } from "./types";

interface AssignmentInput {
  ownerType: string;
  executionClass: string;
  complexityLevel: string;
  businessCriticality: string;
  packageTitle?: string;
}

const OWNER_COMPLIANCE_BASE: Record<string, number> = {
  human: 0.20,
  department: 0.18,
  ai_agent: 0.38,       // Autonomous AI decisions may violate policies inadvertently
  automation: 0.25,
  integration: 0.32,    // Third-party integrations may fall outside policy scope
  external_system: 0.45,
  future_capability: 0.15,
};

const COMPLIANCE_KEYWORDS = [
  "compliance", "regulation", "gdpr", "hipaa", "pci", "sox", "audit", "policy",
  "governance", "legal", "contract", "license", "permission", "regulatory",
  "certification", "accreditation", "reporting", "disclosure",
];

function complianceKeywordBonus(title?: string): number {
  if (!title) return 0;
  const lower = title.toLowerCase();
  const hits = COMPLIANCE_KEYWORDS.filter((k) => lower.includes(k)).length;
  return Math.min(0.20, hits * 0.05);
}

const CLASS_COMPLIANCE_ADDER: Record<string, number> = {
  automated: 0.08,
  semi_automated: 0.04,
  manual: 0.02,
  external: 0.14,
  deferred: 0.00,
};

function scoreToLevel(score: number): RiskLevel {
  if (score < 0.12) return "negligible";
  if (score < 0.28) return "low";
  if (score < 0.47) return "medium";
  if (score < 0.67) return "high";
  return "critical";
}

export function assessComplianceRisk(input: AssignmentInput): RiskCategoryAssessment {
  const base = OWNER_COMPLIANCE_BASE[input.ownerType] ?? 0.25;
  const classAdder = CLASS_COMPLIANCE_ADDER[input.executionClass] ?? 0.04;
  const kwBonus = complianceKeywordBonus(input.packageTitle);
  const critAdder = input.businessCriticality === "critical" ? 0.10 : input.businessCriticality === "high" ? 0.05 : 0;
  const complexityAdder = input.complexityLevel === "critical" ? 0.08 : input.complexityLevel === "high" ? 0.04 : 0;

  const riskScore = Math.min(1, Math.round((base + classAdder + kwBonus + critAdder + complexityAdder) * 1000) / 1000);

  const factors: RiskFactor[] = [
    { factor: `Governance exposure for "${input.ownerType}"`, contribution: base, rationale: "Owner type determines default compliance and policy compliance exposure." },
    { factor: `Regulatory footprint for "${input.executionClass}"`, contribution: classAdder, rationale: "Automated and external execution classes have broader regulatory footprint." },
    ...(kwBonus > 0 ? [{ factor: "Compliance/regulatory keywords in package title", contribution: kwBonus, rationale: "Package involves regulatory, audit, or governance obligations." }] : []),
    ...(critAdder > 0 ? [{ factor: `Critical business function "${input.businessCriticality}" audit exposure`, contribution: critAdder, rationale: "Critical functions are scrutinised more heavily by regulators and auditors." }] : []),
    ...(complexityAdder > 0 ? [{ factor: `High complexity "${input.complexityLevel}" audit trail burden`, contribution: complexityAdder, rationale: "Complex operations require more extensive audit trails and documentation." }] : []),
  ].filter((f) => f.contribution > 0);

  return {
    category: "compliance",
    riskLevel: scoreToLevel(riskScore),
    riskScore,
    factors,
    rationale: `Compliance risk ${Math.round(riskScore * 100)}% for "${input.ownerType}" (${input.executionClass}). ` +
      `Evaluates: policy violations, governance impact, regulatory exposure, and audit implications.`,
  };
}
