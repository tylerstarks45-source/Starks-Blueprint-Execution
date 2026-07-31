// ─────────────────────────────────────────────────────────────────────────────
// Build 026: Execution Risk Assessment Engine — Privacy Risk Engine
// Evaluates exposure to personal data, customer data, business data,
// and confidential assets.
// ─────────────────────────────────────────────────────────────────────────────
import type { RiskCategoryAssessment, RiskFactor, RiskLevel } from "./types";

interface AssignmentInput {
  ownerType: string;
  executionClass: string;
  complexityLevel: string;
  businessCriticality: string;
  packageTitle?: string;
}

const OWNER_PRIVACY_BASE: Record<string, number> = {
  human: 0.25,
  department: 0.20,
  ai_agent: 0.40,       // LLM may process personal data without adequate controls
  automation: 0.30,
  integration: 0.35,    // Data shared with third-party APIs
  external_system: 0.50,
  future_capability: 0.10,
};

const CLASS_PRIVACY_ADDER: Record<string, number> = {
  automated: 0.10,
  semi_automated: 0.05,
  manual: 0.02,
  external: 0.15,
  deferred: 0.00,
};

const PRIVACY_KEYWORDS = [
  "customer", "user", "personal", "pii", "gdpr", "ccpa", "email", "phone",
  "address", "profile", "identity", "data", "record", "privacy", "confidential",
  "sensitive", "health", "medical", "financial", "payment", "contact",
];

function privacyKeywordBonus(title?: string): number {
  if (!title) return 0;
  const lower = title.toLowerCase();
  const hits = PRIVACY_KEYWORDS.filter((k) => lower.includes(k)).length;
  return Math.min(0.25, hits * 0.05);
}

function scoreToLevel(score: number): RiskLevel {
  if (score < 0.12) return "negligible";
  if (score < 0.28) return "low";
  if (score < 0.48) return "medium";
  if (score < 0.68) return "high";
  return "critical";
}

export function assessPrivacyRisk(input: AssignmentInput): RiskCategoryAssessment {
  const base = OWNER_PRIVACY_BASE[input.ownerType] ?? 0.25;
  const classAdder = CLASS_PRIVACY_ADDER[input.executionClass] ?? 0.05;
  const kwBonus = privacyKeywordBonus(input.packageTitle);
  const critAdder = input.businessCriticality === "critical" ? 0.10 : input.businessCriticality === "high" ? 0.05 : 0;

  const riskScore = Math.min(1, Math.round((base + classAdder + kwBonus + critAdder) * 1000) / 1000);

  const factors: RiskFactor[] = [
    { factor: `Data access baseline for "${input.ownerType}"`, contribution: base, rationale: "Owner type determines default exposure to personal and confidential data." },
    { factor: `Data flow risk for "${input.executionClass}"`, contribution: classAdder, rationale: "Automated and external classes move data through pipelines with less oversight." },
    ...(kwBonus > 0 ? [{ factor: "Privacy-sensitive keywords in package title", contribution: kwBonus, rationale: "Package involves personal, customer, or confidential data assets." }] : []),
    ...(critAdder > 0 ? [{ factor: `Business criticality "${input.businessCriticality}" amplifies breach impact`, contribution: critAdder, rationale: "Critical business functions hold more sensitive data." }] : []),
  ].filter((f) => f.contribution > 0);

  return {
    category: "privacy",
    riskLevel: scoreToLevel(riskScore),
    riskScore,
    factors,
    rationale: `Privacy risk ${Math.round(riskScore * 100)}% for "${input.ownerType}" (${input.executionClass}). ` +
      `Evaluates: personal data, customer data, business data, and confidential asset exposure.`,
  };
}
