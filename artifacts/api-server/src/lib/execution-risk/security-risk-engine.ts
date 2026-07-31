// ─────────────────────────────────────────────────────────────────────────────
// Build 026: Execution Risk Assessment Engine — Security Risk Engine
// Evaluates privilege level, sensitive systems, credential exposure,
// and infrastructure impact.
// ─────────────────────────────────────────────────────────────────────────────
import type { RiskCategoryAssessment, RiskFactor, RiskLevel } from "./types";

interface AssignmentInput {
  ownerType: string;
  executionClass: string;
  complexityLevel: string;
  businessCriticality: string;
  packageTitle?: string;
}

// ── Security risk bases by owner type ─────────────────────────────────────────
const OWNER_SECURITY_BASE: Record<string, number> = {
  human: 0.20,         // User error, social engineering exposure
  department: 0.15,
  ai_agent: 0.45,      // Autonomous agents with broad system access
  automation: 0.35,    // Credential usage, scripted access
  integration: 0.40,   // OAuth tokens, API keys, third-party data flows
  external_system: 0.55, // Least-trusted, highest credential exposure
  future_capability: 0.10,
};

const CLASS_SECURITY_ADDER: Record<string, number> = {
  automated: 0.12,
  semi_automated: 0.06,
  manual: 0.00,
  external: 0.18,
  deferred: 0.00,
};

const COMPLEXITY_SECURITY: Record<string, number> = {
  low: 0.00,
  medium: 0.06,
  high: 0.13,
  critical: 0.20,
};

// Sensitive keywords in package title that elevate security risk
const SENSITIVE_KEYWORDS = [
  "credential", "password", "auth", "token", "key", "secret", "payment", "billing",
  "database", "admin", "root", "deploy", "infrastructure", "network", "firewall",
];

function keywordBonus(title?: string): number {
  if (!title) return 0;
  const lower = title.toLowerCase();
  const hits = SENSITIVE_KEYWORDS.filter((k) => lower.includes(k)).length;
  return Math.min(0.20, hits * 0.05);
}

function scoreToLevel(score: number): RiskLevel {
  if (score < 0.15) return "negligible";
  if (score < 0.30) return "low";
  if (score < 0.50) return "medium";
  if (score < 0.70) return "high";
  return "critical";
}

export function assessSecurityRisk(input: AssignmentInput): RiskCategoryAssessment {
  const base = OWNER_SECURITY_BASE[input.ownerType] ?? 0.30;
  const classAdder = CLASS_SECURITY_ADDER[input.executionClass] ?? 0.06;
  const complexityAdder = COMPLEXITY_SECURITY[input.complexityLevel] ?? 0.06;
  const kwBonus = keywordBonus(input.packageTitle);

  const riskScore = Math.min(1, Math.round((base + classAdder + complexityAdder + kwBonus) * 1000) / 1000);

  const factors: RiskFactor[] = [
    { factor: `Privilege level for "${input.ownerType}"`, contribution: base, rationale: "Owner type determines default privilege scope and credential exposure." },
    { factor: `Execution class access pattern "${input.executionClass}"`, contribution: classAdder, rationale: "Automated and external classes use persistent credentials with broader access." },
    { factor: `Attack surface from complexity "${input.complexityLevel}"`, contribution: complexityAdder, rationale: "Higher complexity increases attack surface and failure modes." },
    ...(kwBonus > 0 ? [{ factor: "Sensitive system/credential keywords detected in package title", contribution: kwBonus, rationale: "Package title suggests sensitive infrastructure or credential operations." }] : []),
  ].filter((f) => f.contribution > 0);

  return {
    category: "security",
    riskLevel: scoreToLevel(riskScore),
    riskScore,
    factors,
    rationale: `Security risk ${Math.round(riskScore * 100)}% for "${input.ownerType}" (${input.executionClass}). ` +
      `Evaluates: privilege level, sensitive systems, credential exposure, infrastructure impact.`,
  };
}
