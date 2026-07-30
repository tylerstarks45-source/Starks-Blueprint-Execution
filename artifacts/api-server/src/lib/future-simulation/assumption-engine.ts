// ─── Build 018: Assumption Engine ────────────────────────────────────────────
//
// Declares immutable assumptions per scenario type.
// Every simulation must declare assumptions — they are never modified post-creation.
// Pure function — no DB I/O.

import type { AssumptionType, ScenarioInput, ScenarioType, SimulationAssumption } from "./types";
import { randomUUID } from "crypto";

const uid = () => `asmp_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

// ── Base assumptions applicable to all scenarios ──────────────────────────────

const UNIVERSAL_ASSUMPTIONS: Array<{ assumptionType: AssumptionType; title: string; description: string; confidence: number }> = [
  {
    assumptionType: "competitor",
    title: "Competitor behavior unchanged",
    description: "Competitors maintain current pricing, product, and market strategy throughout this scenario.",
    confidence: 0.70,
  },
  {
    assumptionType: "seasonality",
    title: "Seasonality constant",
    description: "Seasonal demand patterns remain consistent with historical norms during this simulation period.",
    confidence: 0.75,
  },
  {
    assumptionType: "staffing",
    title: "Current staffing maintained",
    description: "Team size, structure, and capability remain stable unless the scenario explicitly targets workforce changes.",
    confidence: 0.80,
  },
];

// ── Scenario-type specific assumptions ───────────────────────────────────────

const TYPE_ASSUMPTIONS: Record<ScenarioType, Array<{ assumptionType: AssumptionType; title: string; description: string; confidence: number }>> = {
  revenue_growth: [
    { assumptionType: "pricing", title: "Pricing unchanged", description: "Product pricing remains constant; revenue growth driven by volume, not price increases.", confidence: 0.80 },
    { assumptionType: "marketing", title: "Marketing budget maintained or increased", description: "Marketing spend is maintained or modestly increased to support growth.", confidence: 0.72 },
    { assumptionType: "financial", title: "Working capital sufficient", description: "Business has adequate working capital to fund growth activities.", confidence: 0.70 },
  ],
  cost_reduction: [
    { assumptionType: "staffing", title: "Headcount reductions are optional", description: "Cost reductions are targeted at process and vendor costs, not mandatory headcount cuts.", confidence: 0.75 },
    { assumptionType: "financial", title: "No debt restructuring required", description: "Cost reduction is operational, not a financial distress response.", confidence: 0.80 },
    { assumptionType: "technology", title: "Technology stack unchanged", description: "Infrastructure costs estimated against current technology footprint.", confidence: 0.75 },
  ],
  automation: [
    { assumptionType: "technology", title: "Integration feasible with current stack", description: "Automation tooling integrates with existing systems without complete re-platform.", confidence: 0.70 },
    { assumptionType: "staffing", title: "Staff retraining supported", description: "Affected employees receive retraining; natural attrition absorbs remainder.", confidence: 0.68 },
    { assumptionType: "financial", title: "Automation ROI within 18 months", description: "Projected automation savings justify upfront investment within 18 months.", confidence: 0.65 },
  ],
  marketing: [
    { assumptionType: "marketing", title: "Budget allocation flexible", description: "Marketing budget can be rebalanced across channels without total increase.", confidence: 0.75 },
    { assumptionType: "traffic", title: "Traffic trend continues", description: "Organic traffic trend continues at current trajectory baseline.", confidence: 0.70 },
    { assumptionType: "competitor", title: "No major competitor campaign launched", description: "Competitors do not launch a major counter-campaign during this period.", confidence: 0.65 },
  ],
  sales: [
    { assumptionType: "pricing", title: "Pricing competitive", description: "Current pricing remains competitive in the market throughout the scenario.", confidence: 0.75 },
    { assumptionType: "staffing", title: "Sales team capacity available", description: "Sales team capacity is sufficient to handle increased lead volume.", confidence: 0.72 },
    { assumptionType: "marketing", title: "Lead quality maintained", description: "Lead quality remains consistent with historical conversion rates.", confidence: 0.70 },
  ],
  customer_success: [
    { assumptionType: "staffing", title: "Support capacity adequate", description: "Customer success team has capacity to handle increased engagement volume.", confidence: 0.75 },
    { assumptionType: "technology", title: "Support tooling in place", description: "CRM and support tools are operational and not being replaced during this scenario.", confidence: 0.80 },
    { assumptionType: "pricing", title: "Churn not pricing-driven", description: "Customer retention improvements are achievable without pricing changes.", confidence: 0.70 },
  ],
  operations: [
    { assumptionType: "staffing", title: "Process ownership assigned", description: "Each operational improvement has a clear owner with authority to implement.", confidence: 0.78 },
    { assumptionType: "technology", title: "Tools and systems available", description: "Required operational tools are already licensed or within procurement reach.", confidence: 0.72 },
    { assumptionType: "financial", title: "Improvement costs below savings", description: "Operational improvement costs are below the projected efficiency savings.", confidence: 0.68 },
  ],
  product: [
    { assumptionType: "staffing", title: "Engineering capacity available", description: "Product engineering team has capacity for new development within existing headcount.", confidence: 0.65 },
    { assumptionType: "technology", title: "Technical debt manageable", description: "Technical debt does not block the projected product development timeline.", confidence: 0.62 },
    { assumptionType: "marketing", title: "Go-to-market capability in place", description: "Sales and marketing capacity exists to support product launch.", confidence: 0.68 },
  ],
  infrastructure: [
    { assumptionType: "technology", title: "Migration non-disruptive", description: "Infrastructure changes can be executed without prolonged customer-facing downtime.", confidence: 0.68 },
    { assumptionType: "financial", title: "Cost estimated correctly", description: "Infrastructure cost estimates reflect current vendor pricing and scope.", confidence: 0.70 },
    { assumptionType: "staffing", title: "Technical expertise available", description: "Required infrastructure engineering expertise is available internally or contractable.", confidence: 0.65 },
  ],
  finance: [
    { assumptionType: "financial", title: "No adverse regulatory changes", description: "Regulatory or tax environment remains stable throughout the scenario.", confidence: 0.75 },
    { assumptionType: "financial", title: "Credit conditions stable", description: "Interest rates and credit availability remain at current levels.", confidence: 0.65 },
    { assumptionType: "competitor", title: "Market pricing stable", description: "No market-wide pricing pressure disrupts financial projections.", confidence: 0.70 },
  ],
  risk_reduction: [
    { assumptionType: "financial", title: "No external shock during implementation", description: "No major external risk event occurs during the risk reduction implementation period.", confidence: 0.70 },
    { assumptionType: "staffing", title: "Risk owners accountable", description: "Clear ownership is assigned for each risk mitigation action.", confidence: 0.80 },
    { assumptionType: "technology", title: "Monitoring tooling deployable", description: "Risk monitoring tooling can be deployed within current infrastructure.", confidence: 0.75 },
  ],
  knowledge: [
    { assumptionType: "staffing", title: "Knowledge capture time allocated", description: "Team members allocate time to knowledge capture without impacting primary output.", confidence: 0.68 },
    { assumptionType: "technology", title: "Knowledge tooling in place", description: "Documentation and knowledge management tools are available.", confidence: 0.78 },
    { assumptionType: "financial", title: "Knowledge investment within budget", description: "Knowledge infrastructure costs are within the operational budget.", confidence: 0.72 },
  ],
};

export function generateAssumptions(
  input: ScenarioInput,
  scenarioId: string,
  businessId: number,
  now: Date,
): SimulationAssumption[] {
  const typeSpecific = TYPE_ASSUMPTIONS[input.category] ?? [];
  return [...UNIVERSAL_ASSUMPTIONS, ...typeSpecific].map((a) => ({
    id: uid(),
    scenarioId,
    businessId,
    assumptionType: a.assumptionType,
    title: a.title,
    description: a.description,
    confidence: parseFloat((a.confidence * input.confidence).toFixed(4)),
    createdAt: now,
  }));
}
