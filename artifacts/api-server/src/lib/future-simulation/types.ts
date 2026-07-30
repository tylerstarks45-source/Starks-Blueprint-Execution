// ─── Build 018: Future State Simulation — Types ───────────────────────────────

// ── Extension Point IDs ───────────────────────────────────────────────────────

export const EP_SIMULATION_SCENARIO_GENERATED = "simulation-scenario-generated";
export const EP_SIMULATION_IMPACT_ESTIMATED = "simulation-impact-estimated";
export const EP_SIMULATION_KPI_PROJECTED = "simulation-kpi-projected";
export const EP_SIMULATION_HEALTH_PROJECTED = "simulation-health-projected";
export const EP_SIMULATION_RISK_PROJECTED = "simulation-risk-projected";
export const EP_SIMULATION_OUTCOME_COMPUTED = "simulation-outcome-computed";
export const EP_SIMULATION_REPORT_GENERATED = "simulation-report-generated";
export const EP_SIMULATION_SCENARIO_SELECTED = "simulation-scenario-selected";

// ── Enumerations ──────────────────────────────────────────────────────────────

export type ScenarioType =
  | "revenue_growth"
  | "cost_reduction"
  | "automation"
  | "marketing"
  | "sales"
  | "operations"
  | "product"
  | "infrastructure"
  | "finance"
  | "risk_reduction"
  | "customer_success"
  | "knowledge";

export type ScenarioStatus = "generated" | "validated" | "available" | "selected" | "archived";

export type BranchType = "best_case" | "expected_case" | "worst_case" | "most_likely";

export type OutcomeType = "best_case" | "expected_case" | "worst_case" | "most_likely";

export type AssumptionType =
  | "marketing"
  | "staffing"
  | "seasonality"
  | "pricing"
  | "traffic"
  | "competitor"
  | "technology"
  | "financial";

export type RiskType =
  | "execution"
  | "financial"
  | "operational"
  | "strategic"
  | "technology"
  | "market";

export type EvidenceType =
  | "opportunity"
  | "analysis_finding"
  | "kpi"
  | "health"
  | "graph_node"
  | "dependency";

// ── Business impact on 9 dimensions ──────────────────────────────────────────

export interface BusinessImpact {
  revenue: number;               // delta −1..+1
  profit: number;
  cashFlow: number;
  customerGrowth: number;
  customerRetention: number;
  operationalCapacity: number;
  automation: number;
  employeeWorkload: number;      // positive = more workload
  risk: number;                  // positive = more risk
}

// ── KPI projection ────────────────────────────────────────────────────────────

export interface KpiProjection {
  category: string;              // revenue/marketing/sales/customer/operations/financial
  expectedChange: number;        // −1..+1
  direction: "up" | "down" | "flat";
  confidence: number;            // 0..1
  supportingEvidence: string[];
}

// ── Health projection ─────────────────────────────────────────────────────────

export interface HealthProjection {
  dimension: string;             // financial/operational/marketing/sales/customer/technology/knowledge/governance
  currentEstimate: number | null;
  projectedDelta: number;        // −1..+1
  confidence: number;
}

// ── Risk projection ───────────────────────────────────────────────────────────

export interface RiskProjection {
  riskType: RiskType;
  level: number;                 // 0..1
  description: string;
  confidence: number;
  mitigationHint: string;
}

export interface RiskSummary {
  risks: RiskProjection[];
  overallRisk: number;           // 0..1 composite
  confidence: number;
  knownUnknowns: string[];
}

// ── Assumption ────────────────────────────────────────────────────────────────

export interface SimulationAssumption {
  id: string;
  scenarioId: string;
  businessId: number;
  assumptionType: AssumptionType;
  title: string;
  description: string;
  confidence: number;
  createdAt: Date;
}

// ── Evidence ──────────────────────────────────────────────────────────────────

export interface SimulationEvidence {
  id: string;
  scenarioId: string;
  businessId: number;
  evidenceType: EvidenceType;
  referenceId: string;
  referenceType: string;
  description: string;
  weight: number;
  createdAt: Date;
}

// ── Outcome ───────────────────────────────────────────────────────────────────

export interface SimulationOutcome {
  id: string;
  scenarioId: string;
  businessId: number;
  outcomeType: OutcomeType;
  probability: number;
  kpiImpact: Record<string, number>;
  healthImpact: Record<string, number>;
  financialImpact: Record<string, number>;
  operationalImpact: Record<string, number>;
  riskImpact: Record<string, number>;
  confidence: number;
  knownUnknowns: string[];
  valueScore: number;
  createdAt: Date;
}

// ── Scenario branch ───────────────────────────────────────────────────────────

export interface ScenarioBranch {
  id: string;
  scenarioId: string;
  businessId: number;
  branchType: BranchType;
  description: string;
  probability: number;
  valueScore: number;
  keyDrivers: string[];
  keyRisks: string[];
  kpiImpact: Record<string, number>;
  healthImpact: Record<string, number>;
  financialImpact: Record<string, number>;
  createdAt: Date;
}

// ── Future scenario ───────────────────────────────────────────────────────────

export interface FutureScenario {
  id: string;
  businessId: number;
  reportId: string;
  userId: number | null;
  opportunityId: string | null;
  scenarioName: string;
  scenarioDescription: string;
  scenarioType: ScenarioType;
  status: ScenarioStatus;
  businessImpactSummary: BusinessImpact;
  kpiProjectionSummary: KpiProjection[];
  healthProjectionSummary: HealthProjection[];
  outcomeSummary: Record<OutcomeType, number>;   // outcomeType → valueScore
  riskSummary: RiskSummary;
  overallConfidence: number;
  expectedValueScore: number;
  growthPotential: number;
  automationPotential: number;
  riskScore: number;
  executionComplexity: number;
  assumptionCount: number;
  evidenceCount: number;
  branches: ScenarioBranch[];
  assumptions: SimulationAssumption[];
  evidence: SimulationEvidence[];
  outcomes: SimulationOutcome[];
  analysisReportId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Simulation report ─────────────────────────────────────────────────────────

export interface SimulationReport {
  id: string;
  businessId: number;
  userId: number | null;
  scenarios: FutureScenario[];
  scenarioCount: number;
  highestConfidenceScenarioId: string | null;
  lowestRiskScenarioId: string | null;
  highestValueScenarioId: string | null;
  highestGrowthScenarioId: string | null;
  highestAutomationScenarioId: string | null;
  simulationDurationMs: number;
  executiveSummary: string;
  analysisReportId: string | null;
  opportunityReportId: string | null;
  avgConfidence: number | null;
  avgRisk: number | null;
  createdAt: Date;
}

// ── Registry ──────────────────────────────────────────────────────────────────

export interface SimulationRegistryEntry {
  id: string;
  businessId: number;
  userId: number | null;
  totalScenarios: number;
  totalReports: number;
  latestReportId: string | null;
  latestHighestValueScenarioId: string | null;
  latestConfidence: number | null;
  latestAvgRisk: number | null;
  lastSimulatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── EB-facing summary ─────────────────────────────────────────────────────────

export interface ScenarioSummary {
  id: string;
  scenarioName: string;
  scenarioType: ScenarioType;
  expectedValueScore: number;
  overallConfidence: number;
  riskScore: number;
  growthPotential: number;
  automationPotential: number;
  executionComplexity: number;
}

export interface SimulationSummary {
  businessId: number;
  scenarioCount: number;
  highestConfidenceScenario: ScenarioSummary | null;
  lowestRiskScenario: ScenarioSummary | null;
  highestExpectedValue: ScenarioSummary | null;
  highestGrowthScenario: ScenarioSummary | null;
  highestAutomationScenario: ScenarioSummary | null;
  avgConfidence: number | null;
  avgRisk: number | null;
  simulatedAt: Date;
}

// ── Internal generation input ─────────────────────────────────────────────────

export interface ScenarioInput {
  opportunityId: string;
  opportunityTitle: string;
  category: ScenarioType;
  compositeScore: number;
  businessImpact: number;
  confidence: number;
  risk: number;
  estimatedEffort: number;
  strategicValue: number;
  discoverySource: string;
}
