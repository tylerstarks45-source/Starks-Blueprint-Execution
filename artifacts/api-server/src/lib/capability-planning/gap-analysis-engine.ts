// ─────────────────────────────────────────────────────────────────────────────
// Build 022: Capability Planning Engine — Gap Analysis Engine
// Identifies: existing capability, required capability, deficit, surplus, missing.
// Computes gap severity from required vs current maturity level delta.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { CapabilityGap, GapType, GapSeverity, MaturityLevel } from "./types";

const MATURITY_RANK: Record<MaturityLevel, number> = {
  none: 0,
  basic: 1,
  defined: 2,
  managed: 3,
  optimising: 4,
};

function computeGapSeverity(required: MaturityLevel, current: MaturityLevel): GapSeverity {
  const delta = MATURITY_RANK[required] - MATURITY_RANK[current];
  if (delta <= 0) return "none";
  if (delta === 1) return "low";
  if (delta === 2) return "medium";
  if (delta === 3) return "high";
  return "critical";
}

function computeGapType(required: MaturityLevel, current: MaturityLevel): GapType {
  const delta = MATURITY_RANK[required] - MATURITY_RANK[current];
  if (current === "none") return "missing";
  if (delta > 0) return "deficit";
  if (delta < 0) return "surplus";
  return "existing";
}

// Estimate current maturity for a capability based on domain type + programme context
// In a real deployment, this would read from a business capability register.
// Here we use a deterministic heuristic: established domains start higher.
const DOMAIN_BASE_MATURITY: Record<string, MaturityLevel> = {
  leadership: "basic",
  people: "basic",
  technology: "basic",
  infrastructure: "basic",
  finance: "defined",
  operations: "basic",
  marketing: "basic",
  sales: "basic",
  customer: "basic",
  knowledge: "none",
  security: "basic",
  governance: "basic",
  compliance: "basic",
  integrations: "none",
  automation: "none",
  ai: "none",
};

export function estimateCurrentMaturity(domainType: string, requiredLevel: MaturityLevel): MaturityLevel {
  const base = DOMAIN_BASE_MATURITY[domainType] ?? "none";
  // If required is already below or equal to base, current is close
  const req = MATURITY_RANK[requiredLevel];
  const b = MATURITY_RANK[base];
  if (b >= req) return base; // capability likely exists at required level
  return base; // current = base (below required)
}

export interface GapAnalysisResult {
  requirements: {
    requirementId: string;
    currentLevel: MaturityLevel;
    gapSeverity: GapSeverity;
    isMissing: boolean;
    gaps: CapabilityGap[];
  }[];
  totalGaps: number;
  criticalGapCount: number;
  missingCapabilityCount: number;
}

export function analyseGaps(params: {
  requirements: {
    id: string;
    domainId: string;
    planId: string;
    reportId: string;
    businessId: number;
    domainType: string;
    capabilityName: string;
    requiredLevel: MaturityLevel;
    businessCriticality: string;
  }[];
}): GapAnalysisResult {
  const { requirements } = params;

  let totalGaps = 0;
  let criticalGapCount = 0;
  let missingCapabilityCount = 0;

  const analysedRequirements = requirements.map((req) => {
    const currentLevel = estimateCurrentMaturity(req.domainType, req.requiredLevel);
    const gapType = computeGapType(req.requiredLevel, currentLevel);
    const gapSeverity = computeGapSeverity(req.requiredLevel, currentLevel);
    const isMissing = currentLevel === "none";

    const gaps: CapabilityGap[] = [];

    if (gapType !== "existing" && gapType !== "surplus") {
      const gap: CapabilityGap = {
        id: randomUUID(),
        requirementId: req.id,
        domainId: req.domainId,
        planId: req.planId,
        reportId: req.reportId,
        businessId: req.businessId,
        gapType,
        gapTitle: `${req.capabilityName} — ${gapType === "missing" ? "Missing Capability" : "Capability Deficit"}`,
        gapDescription:
          gapType === "missing"
            ? `The capability "${req.capabilityName}" does not currently exist. It must be built from scratch before it can support strategic delivery.`
            : `The capability "${req.capabilityName}" exists at '${currentLevel}' level but '${req.requiredLevel}' level is required. A gap of ${MATURITY_RANK[req.requiredLevel] - MATURITY_RANK[currentLevel]} maturity level(s) exists.`,
        currentState: `Current maturity: ${currentLevel === "none" ? "absent" : currentLevel}`,
        requiredState: `Required maturity: ${req.requiredLevel}`,
        severity: gapSeverity,
        closureNote:
          gapType === "missing"
            ? `Build ${req.capabilityName} as a new capability. Prioritise foundation-level delivery first.`
            : `Advance ${req.capabilityName} from '${currentLevel}' to '${req.requiredLevel}' through targeted development.`,
      };
      gaps.push(gap);
      totalGaps++;
      if (gapSeverity === "critical" || gapSeverity === "high") criticalGapCount++;
      if (isMissing) missingCapabilityCount++;
    }

    return {
      requirementId: req.id,
      currentLevel,
      gapSeverity,
      isMissing,
      gaps,
    };
  });

  return {
    requirements: analysedRequirements,
    totalGaps,
    criticalGapCount,
    missingCapabilityCount,
  };
}
