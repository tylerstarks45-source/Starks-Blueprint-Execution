// ─────────────────────────────────────────────────────────────────────────────
// Build 022: Capability Planning Engine — Readiness Engine
// Evaluates per-domain: maturity, availability, scalability, reliability,
// maintainability, governance. All deterministic.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { CapabilityDomainReadiness, MaturityLevel, ReadinessLevel, CapabilityDomainType } from "./types";

const MATURITY_RANK: Record<MaturityLevel, number> = { none: 0, basic: 1, defined: 2, managed: 3, optimising: 4 };
const MATURITY_SCORE: Record<MaturityLevel, number> = { none: 0, basic: 0.25, defined: 0.5, managed: 0.75, optimising: 1.0 };

function readinessLevel(score: number): ReadinessLevel {
  if (score >= 0.80) return "optimising";
  if (score >= 0.60) return "managed";
  if (score >= 0.40) return "defined";
  if (score >= 0.20) return "developing";
  return "not_ready";
}

// Domain-specific availability/scalability/reliability/maintainability/governance base scores
const DOMAIN_READINESS_BASES: Record<string, { availability: number; scalability: number; reliability: number; maintainability: number; governance: number }> = {
  leadership: { availability: 0.70, scalability: 0.55, reliability: 0.70, maintainability: 0.60, governance: 0.65 },
  people: { availability: 0.60, scalability: 0.50, reliability: 0.65, maintainability: 0.55, governance: 0.55 },
  technology: { availability: 0.55, scalability: 0.50, reliability: 0.60, maintainability: 0.50, governance: 0.50 },
  infrastructure: { availability: 0.65, scalability: 0.55, reliability: 0.65, maintainability: 0.55, governance: 0.55 },
  finance: { availability: 0.70, scalability: 0.60, reliability: 0.70, maintainability: 0.65, governance: 0.70 },
  operations: { availability: 0.65, scalability: 0.50, reliability: 0.65, maintainability: 0.55, governance: 0.55 },
  marketing: { availability: 0.60, scalability: 0.55, reliability: 0.60, maintainability: 0.50, governance: 0.50 },
  sales: { availability: 0.65, scalability: 0.50, reliability: 0.60, maintainability: 0.55, governance: 0.50 },
  customer: { availability: 0.60, scalability: 0.50, reliability: 0.60, maintainability: 0.50, governance: 0.50 },
  knowledge: { availability: 0.40, scalability: 0.40, reliability: 0.45, maintainability: 0.40, governance: 0.40 },
  security: { availability: 0.55, scalability: 0.50, reliability: 0.60, maintainability: 0.50, governance: 0.60 },
  governance: { availability: 0.65, scalability: 0.55, reliability: 0.65, maintainability: 0.60, governance: 0.70 },
  compliance: { availability: 0.60, scalability: 0.50, reliability: 0.60, maintainability: 0.55, governance: 0.65 },
  integrations: { availability: 0.40, scalability: 0.40, reliability: 0.45, maintainability: 0.40, governance: 0.40 },
  automation: { availability: 0.35, scalability: 0.45, reliability: 0.40, maintainability: 0.40, governance: 0.35 },
  ai: { availability: 0.30, scalability: 0.40, reliability: 0.35, maintainability: 0.35, governance: 0.30 },
};

const DOMAIN_KEY_GAPS: Record<string, string> = {
  knowledge: "Knowledge management infrastructure is typically underdeveloped; structured capture and retrieval must be built.",
  integrations: "Integration architecture is often absent; API standards and integration patterns must be established.",
  automation: "Process automation capability is typically nascent; foundation tooling and process candidates must be identified.",
  ai: "AI/ML capability requires data infrastructure and model governance to be established before meaningful deployment.",
  security: "Security programme requires comprehensive threat modelling and control baseline before incident response is meaningful.",
};

const DOMAIN_RECOMMENDATIONS: Record<string, string> = {
  leadership: "Invest in leadership assessment and targeted development to build strategic capability.",
  people: "Develop talent acquisition and performance management as foundational capabilities before scaling.",
  technology: "Focus on architecture documentation and engineering practice maturity before platform expansion.",
  infrastructure: "Establish infrastructure-as-code and capacity management before scaling cloud footprint.",
  finance: "Prioritise FP&A maturity and capital allocation discipline as strategic capability prerequisites.",
  operations: "Map and document core processes before optimisation initiatives begin.",
  marketing: "Build demand generation measurement infrastructure before scaling spend.",
  sales: "Invest in CRM discipline and pipeline measurement before scaling the sales team.",
  customer: "Define customer journey maps and measure satisfaction systematically before redesigning experiences.",
  knowledge: "Build a knowledge management platform and organisational learning habit before scaling programmes.",
  security: "Establish a security baseline programme and conduct threat assessments as immediate priorities.",
  governance: "Formalise governance structures and risk registers before strategic programmes commit capital.",
  compliance: "Conduct a regulatory mapping exercise and build a compliance calendar as immediate actions.",
  integrations: "Define an integration architecture standard and deploy an API gateway before building integrations.",
  automation: "Identify and prioritise process automation candidates; deploy foundational RPA or workflow tooling.",
  ai: "Build data infrastructure and establish AI governance before deploying production AI capabilities.",
};

export function evaluateDomainReadiness(params: {
  domainId: string;
  planId: string;
  reportId: string;
  businessId: number;
  domainType: CapabilityDomainType;
  avgRequiredMaturity: MaturityLevel;
  avgCurrentMaturity: MaturityLevel;
  gapSeverityPenalty: number; // 0-0.3
}): CapabilityDomainReadiness {
  const { domainId, planId, reportId, businessId, domainType, avgCurrentMaturity, gapSeverityPenalty } = params;

  const base = DOMAIN_READINESS_BASES[domainType] ?? DOMAIN_READINESS_BASES.operations;
  const maturityScore = Math.round((MATURITY_SCORE[avgCurrentMaturity] - gapSeverityPenalty * 0.5) * 100) / 100;
  const clamp = (v: number) => Math.max(0.05, Math.min(0.95, v));

  const availabilityScore = clamp(base.availability - gapSeverityPenalty * 0.4);
  const scalabilityScore = clamp(base.scalability - gapSeverityPenalty * 0.3);
  const reliabilityScore = clamp(base.reliability - gapSeverityPenalty * 0.3);
  const maintainabilityScore = clamp(base.maintainability - gapSeverityPenalty * 0.2);
  const governanceScore = clamp(base.governance - gapSeverityPenalty * 0.2);

  const overallReadinessScore = Math.round(
    (maturityScore * 0.30 + availabilityScore * 0.18 + scalabilityScore * 0.18 +
      reliabilityScore * 0.14 + maintainabilityScore * 0.10 + governanceScore * 0.10) * 100,
  ) / 100;

  return {
    id: randomUUID(),
    domainId,
    planId,
    reportId,
    businessId,
    domainType,
    maturityScore: Math.round(Math.max(0.05, maturityScore) * 100) / 100,
    maturityLevel: avgCurrentMaturity,
    availabilityScore: Math.round(availabilityScore * 100) / 100,
    scalabilityScore: Math.round(scalabilityScore * 100) / 100,
    reliabilityScore: Math.round(reliabilityScore * 100) / 100,
    maintainabilityScore: Math.round(maintainabilityScore * 100) / 100,
    governanceScore: Math.round(governanceScore * 100) / 100,
    overallReadinessScore,
    readinessLevel: readinessLevel(overallReadinessScore),
    keyGap: DOMAIN_KEY_GAPS[domainType],
    recommendation: DOMAIN_RECOMMENDATIONS[domainType],
  };
}
