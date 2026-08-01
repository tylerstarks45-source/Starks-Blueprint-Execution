// ─────────────────────────────────────────────────────────────────────────────
// Build 027: Execution Simulation Engine — Resource Consumption Engine
// Predicts compute, storage, bandwidth, API usage, financial cost,
// and human oversight requirements.
// ─────────────────────────────────────────────────────────────────────────────
import type { ResourceConsumptionEstimate } from "./types";

type Level = "negligible" | "low" | "medium" | "high" | "very_high";

interface ResourceInput {
  ownerType:           string;
  executionClass:      string;
  complexityLevel:     string;
  businessCriticality: string;
  estimatedHours:      number;
}

// Compute intensity by class
const COMPUTE_MAP: Record<string, Level> = {
  automated: "medium", ai_driven: "high", human: "low", external: "low", hybrid: "medium",
};

// Storage impact by class
const STORAGE_MAP: Record<string, Level> = {
  automated: "low", ai_driven: "medium", human: "low", external: "negligible", hybrid: "low",
};

// Bandwidth impact by class
const BANDWIDTH_MAP: Record<string, Level> = {
  automated: "low", ai_driven: "medium", human: "negligible", external: "high", hybrid: "medium",
};

// API call intensity by class
const API_MAP: Record<string, Level> = {
  automated: "medium", ai_driven: "high", human: "low", external: "medium", hybrid: "medium",
};

// Human oversight by owner type
const OVERSIGHT_MAP: Record<string, string> = {
  ai_agent:          "light",
  automation:        "none",
  human:             "full",
  department:        "full",
  integration:       "light",
  external_system:   "moderate",
  future_capability: "moderate",
};

// Financial cost bucket by hours × criticality
function estimateFinancialCost(hours: number, criticality: string): string {
  const base = hours * (criticality === "critical" ? 50 : criticality === "high" ? 20 : 5);
  if (base < 5)   return "$0–5";
  if (base < 25)  return "$5–25";
  if (base < 100) return "$25–100";
  if (base < 500) return "$100–500";
  return "$500+";
}

export function estimateResources(input: ResourceInput): ResourceConsumptionEstimate {
  const compute      = COMPUTE_MAP[input.executionClass]   ?? "medium";
  const storage      = STORAGE_MAP[input.executionClass]   ?? "low";
  const bandwidth    = BANDWIDTH_MAP[input.executionClass] ?? "low";
  const apiUsage     = API_MAP[input.executionClass]       ?? "medium";
  const humanOversight = OVERSIGHT_MAP[input.ownerType]    ?? "moderate";
  const financialCost  = estimateFinancialCost(input.estimatedHours, input.businessCriticality);

  const narrative =
    `Execution class '${input.executionClass}' at '${input.complexityLevel}' complexity ` +
    `owned by '${input.ownerType}' (${input.estimatedHours}h estimated). ` +
    `Compute: ${compute}, storage: ${storage}, bandwidth: ${bandwidth}, ` +
    `API: ${apiUsage}, cost: ${financialCost}, oversight: ${humanOversight}.`;

  return { compute, storage, bandwidth, apiUsage, financialCost: financialCost, humanOversight, estimateNarrative: narrative };
}
