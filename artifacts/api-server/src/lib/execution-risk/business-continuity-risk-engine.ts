// ─────────────────────────────────────────────────────────────────────────────
// Build 026: Execution Risk Assessment Engine — Business Continuity Risk Engine
// Evaluates risk to service availability, uptime, recovery, and resilience.
// ─────────────────────────────────────────────────────────────────────────────
import type { RiskCategoryAssessment, RiskFactor, RiskLevel } from "./types";

interface AssignmentInput {
  ownerType: string;
  executionClass: string;
  complexityLevel: string;
  businessCriticality: string;
  packageTitle?: string;
}

const OWNER_CONTINUITY_BASE: Record<string, number> = {
  human: 0.15,
  department: 0.18,
  ai_agent: 0.35,
  automation: 0.30,
  integration: 0.40,     // External dependency failure propagates downstream
  external_system: 0.50,
  future_capability: 0.65, // Non-existent capability = total continuity gap
};

const CLASS_CONTINUITY: Record<string, number> = {
  automated: 0.12,
  semi_automated: 0.07,
  manual: 0.03,
  external: 0.16,
  deferred: 0.05,
};

const CRITICALITY_CONTINUITY: Record<string, number> = {
  low: 0.00,
  medium: 0.06,
  high: 0.13,
  critical: 0.22,
};

const CONTINUITY_KEYWORDS = [
  "service", "availability", "uptime", "failover", "disaster", "recovery",
  "resilience", "redundancy", "backup", "restore", "continuity", "critical",
  "production", "live", "outage", "downtime",
];

function continuityKeywordBonus(title?: string): number {
  if (!title) return 0;
  const lower = title.toLowerCase();
  const hits = CONTINUITY_KEYWORDS.filter((k) => lower.includes(k)).length;
  return Math.min(0.15, hits * 0.04);
}

function scoreToLevel(score: number): RiskLevel {
  if (score < 0.15) return "negligible";
  if (score < 0.30) return "low";
  if (score < 0.50) return "medium";
  if (score < 0.70) return "high";
  return "critical";
}

export function assessBusinessContinuityRisk(input: AssignmentInput): RiskCategoryAssessment {
  const base = OWNER_CONTINUITY_BASE[input.ownerType] ?? 0.30;
  const classAdder = CLASS_CONTINUITY[input.executionClass] ?? 0.07;
  const critAdder = CRITICALITY_CONTINUITY[input.businessCriticality] ?? 0.06;
  const kwBonus = continuityKeywordBonus(input.packageTitle);

  const riskScore = Math.min(1, Math.round((base + classAdder + critAdder + kwBonus) * 1000) / 1000);

  const factors: RiskFactor[] = [
    { factor: `Continuity dependency on "${input.ownerType}"`, contribution: base, rationale: "Owner type determines service dependency and recovery complexity." },
    { factor: `Execution class availability profile "${input.executionClass}"`, contribution: classAdder, rationale: "Automated and external classes can create systemic outage on failure." },
    { factor: `Business criticality "${input.businessCriticality}" outage impact`, contribution: critAdder, rationale: "Critical business functions have higher outage cost and recovery urgency." },
    ...(kwBonus > 0 ? [{ factor: "Continuity/resilience keywords in package title", contribution: kwBonus, rationale: "Package directly involves service availability or disaster recovery." }] : []),
  ].filter((f) => f.contribution > 0);

  return {
    category: "business_continuity",
    riskLevel: scoreToLevel(riskScore),
    riskScore,
    factors,
    rationale: `Business continuity risk ${Math.round(riskScore * 100)}% for "${input.ownerType}" (${input.executionClass}). ` +
      `Evaluates: service availability, uptime risk, recovery capability, and resilience.`,
  };
}
