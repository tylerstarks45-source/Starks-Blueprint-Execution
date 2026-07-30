// ─── Build 018: Risk Projection Engine ───────────────────────────────────────
//
// Estimates 6 risk types, overall composite risk, confidence, and known unknowns
// for a given scenario. Pure function — no DB I/O.

import type { RiskProjection, RiskSummary, RiskType, ScenarioInput, ScenarioType } from "./types";

// ── Base risk levels by scenario type and risk category ──────────────────────

type RiskRow = Record<RiskType, { level: number; description: string; mitigation: string }>;

const RISK_PROFILES: Record<ScenarioType, RiskRow> = {
  revenue_growth: {
    execution: { level: 0.35, description: "Revenue growth requires sustained cross-functional execution.", mitigation: "Establish clear ownership and weekly tracking cadence." },
    financial: { level: 0.28, description: "Growth spending may strain cash flow before revenue materialises.", mitigation: "Stage investment tranches against revenue milestones." },
    operational: { level: 0.22, description: "Increased volume may stress existing operational capacity.", mitigation: "Pre-build capacity buffers before growth campaigns." },
    strategic: { level: 0.20, description: "Growth path may attract competitive response.", mitigation: "Maintain defensible positioning and speed of execution." },
    technology: { level: 0.15, description: "Scaling may expose technology bottlenecks.", mitigation: "Conduct capacity review before scaling." },
    market: { level: 0.30, description: "Market conditions may shift during growth period.", mitigation: "Monitor leading indicators monthly." },
  },
  cost_reduction: {
    execution: { level: 0.28, description: "Cost reduction requires disciplined change management.", mitigation: "Assign dedicated program manager with executive sponsorship." },
    financial: { level: 0.15, description: "Cuts may reduce capacity for future investment.", mitigation: "Maintain ring-fenced growth budget." },
    operational: { level: 0.32, description: "Service quality may degrade if cuts are too deep.", mitigation: "Measure operational KPIs before and after cuts." },
    strategic: { level: 0.22, description: "Competitor may invest while business is reducing costs.", mitigation: "Monitor competitor activity closely." },
    technology: { level: 0.12, description: "Technology tool consolidation may cause temporary disruption.", mitigation: "Maintain parallel systems during transition." },
    market: { level: 0.15, description: "Market conditions are a driver of cost reduction urgency.", mitigation: "Review cost baseline against market benchmarks quarterly." },
  },
  automation: {
    execution: { level: 0.38, description: "Automation projects frequently exceed scope and timeline.", mitigation: "Limit to one automation initiative per quarter; ensure clear acceptance criteria." },
    financial: { level: 0.25, description: "Upfront automation costs are high before savings materialise.", mitigation: "Sequence high-ROI automations first." },
    operational: { level: 0.20, description: "Transition period creates temporary process instability.", mitigation: "Run parallel processes during cutover." },
    strategic: { level: 0.12, description: "Automation may reduce team flexibility for novel tasks.", mitigation: "Automate only well-defined, stable processes." },
    technology: { level: 0.35, description: "Integration complexity is the primary failure mode for automation.", mitigation: "Conduct technical feasibility review before committing." },
    market: { level: 0.10, description: "Market changes are less relevant to internal automation programmes.", mitigation: "Ensure automation outputs remain flexible to market inputs." },
  },
  marketing: {
    execution: { level: 0.30, description: "Multi-channel marketing execution requires strong coordination.", mitigation: "Use a unified content calendar and weekly review." },
    financial: { level: 0.32, description: "Marketing spend is often the first budget cut under pressure.", mitigation: "Establish minimum effective spend thresholds." },
    operational: { level: 0.15, description: "Increased leads may stress sales capacity.", mitigation: "Synchronise marketing ramp with sales hiring plan." },
    strategic: { level: 0.25, description: "Brand positioning risk if messaging is inconsistent.", mitigation: "Create a message hierarchy and enforce it across channels." },
    technology: { level: 0.18, description: "Marketing automation and analytics tools can fail silently.", mitigation: "Audit tool accuracy monthly." },
    market: { level: 0.38, description: "Market receptivity is the primary unknown in marketing scenarios.", mitigation: "Run small pilots before full-scale campaigns." },
  },
  sales: {
    execution: { level: 0.32, description: "Sales execution depends heavily on rep performance and coaching.", mitigation: "Establish performance coaching cadence." },
    financial: { level: 0.22, description: "Sales compensation costs rise before revenue closes.", mitigation: "Model comp costs against pipeline coverage ratio." },
    operational: { level: 0.20, description: "Deal velocity may expose CRM and process gaps.", mitigation: "Audit CRM hygiene before scaling outbound." },
    strategic: { level: 0.18, description: "Competitor may undercut pricing during sales drive.", mitigation: "Build value-based selling capability." },
    technology: { level: 0.15, description: "Sales tooling failures can disrupt pipeline at critical moments.", mitigation: "Ensure CRM and dialer redundancy." },
    market: { level: 0.30, description: "Economic conditions directly affect buyer decision timelines.", mitigation: "Segment pipeline by economic sensitivity." },
  },
  customer_success: {
    execution: { level: 0.25, description: "Customer success programmes require consistent proactive outreach.", mitigation: "Build health score triggers and automated touch points." },
    financial: { level: 0.15, description: "Customer success investment precedes retention improvement.", mitigation: "Track NRR as the lagging indicator of success investment." },
    operational: { level: 0.20, description: "CS team may become bottleneck at scale.", mitigation: "Build self-service resources to complement human touchpoints." },
    strategic: { level: 0.12, description: "Retention improvements may mask acquisition issues.", mitigation: "Track acquisition and retention metrics independently." },
    technology: { level: 0.18, description: "Customer health scoring requires clean data.", mitigation: "Audit data quality before relying on automated health scores." },
    market: { level: 0.15, description: "Market conditions affect customer churn regardless of success programmes.", mitigation: "Segment churn by economic sensitivity." },
  },
  operations: {
    execution: { level: 0.28, description: "Process change requires sustained management attention.", mitigation: "Assign process owners and track implementation milestones." },
    financial: { level: 0.15, description: "Operational investments have long payback periods.", mitigation: "Prioritise quick-win operational improvements first." },
    operational: { level: 0.30, description: "Process changes can cause temporary throughput reduction.", mitigation: "Implement changes in off-peak periods." },
    strategic: { level: 0.10, description: "Operations improvements rarely have strategic risk.", mitigation: "Document process rationale to avoid reverting under pressure." },
    technology: { level: 0.22, description: "Process automation tools may not integrate cleanly.", mitigation: "Run proof-of-concept before full rollout." },
    market: { level: 0.12, description: "Market changes have indirect effects on operational efficiency.", mitigation: "Build flexible processes that adapt to volume changes." },
  },
  product: {
    execution: { level: 0.42, description: "Product development is inherently complex and scope-creep-prone.", mitigation: "Enforce strict MVP scope and build in post-launch iteration cycles." },
    financial: { level: 0.30, description: "Product development costs are high and frequently exceed estimates.", mitigation: "Use time-boxing and fixed-cost development contracts where possible." },
    operational: { level: 0.20, description: "New products generate support load before tooling catches up.", mitigation: "Pre-build support documentation and FAQs." },
    strategic: { level: 0.28, description: "Product may not achieve product-market fit.", mitigation: "Validate with target users before full build." },
    technology: { level: 0.35, description: "Technical complexity is the leading cause of product delays.", mitigation: "Conduct architecture review before sprint planning." },
    market: { level: 0.32, description: "Market needs may shift during product development cycle.", mitigation: "Ship MVPs quickly and iterate based on user feedback." },
  },
  infrastructure: {
    execution: { level: 0.35, description: "Infrastructure migrations often uncover hidden dependencies.", mitigation: "Run dependency mapping before migration planning." },
    financial: { level: 0.25, description: "Infrastructure costs are hard to estimate without detailed scoping.", mitigation: "Commission a detailed infrastructure assessment before budgeting." },
    operational: { level: 0.38, description: "Downtime risk is highest during infrastructure transitions.", mitigation: "Use blue-green deployments and rollback procedures." },
    strategic: { level: 0.10, description: "Infrastructure decisions are rarely strategic risks.", mitigation: "Ensure flexibility to change vendors in future." },
    technology: { level: 0.40, description: "Infrastructure complexity is the primary risk in this scenario.", mitigation: "Engage specialist expertise and use proven migration patterns." },
    market: { level: 0.08, description: "Market changes rarely affect infrastructure scenarios directly.", mitigation: "Ensure infrastructure can scale to support growth scenarios." },
  },
  finance: {
    execution: { level: 0.22, description: "Financial process changes require careful compliance review.", mitigation: "Engage finance and legal review before implementation." },
    financial: { level: 0.20, description: "Financial restructuring may surface hidden liabilities.", mitigation: "Conduct financial due diligence before changes." },
    operational: { level: 0.15, description: "Finance system changes can disrupt accounting workflows.", mitigation: "Run parallel systems during transition period." },
    strategic: { level: 0.18, description: "Financial decisions signal business health to investors and partners.", mitigation: "Communicate financial changes proactively to key stakeholders." },
    technology: { level: 0.20, description: "Finance systems are complex and integration errors are costly.", mitigation: "Test all integrations in staging before live cutover." },
    market: { level: 0.25, description: "Market conditions directly affect financial scenario assumptions.", mitigation: "Run sensitivity analysis against market downside scenarios." },
  },
  risk_reduction: {
    execution: { level: 0.20, description: "Risk reduction requires sustained discipline, not one-time action.", mitigation: "Build risk monitoring into regular management cadence." },
    financial: { level: 0.15, description: "Risk mitigation has upfront cost before savings materialise.", mitigation: "Model risk reduction ROI against expected loss reduction." },
    operational: { level: 0.18, description: "Risk processes can create operational overhead.", mitigation: "Integrate risk checks into existing workflows, not separate ones." },
    strategic: { level: 0.12, description: "Over-engineering risk processes may slow execution.", mitigation: "Focus on highest-probability, highest-impact risks only." },
    technology: { level: 0.15, description: "Risk monitoring tooling may not cover all exposure areas.", mitigation: "Audit coverage gaps in risk monitoring quarterly." },
    market: { level: 0.20, description: "New market risks may emerge faster than risk processes adapt.", mitigation: "Run quarterly risk horizon scanning." },
  },
  knowledge: {
    execution: { level: 0.25, description: "Knowledge capture requires time from busy operators.", mitigation: "Build knowledge capture into project close-out rituals." },
    financial: { level: 0.12, description: "Knowledge investment has the lowest financial risk of any scenario.", mitigation: "Budget knowledge tooling as a fixed operational expense." },
    operational: { level: 0.15, description: "Poor knowledge management leads to repeat mistakes.", mitigation: "Measure time-to-resolution as a proxy for knowledge effectiveness." },
    strategic: { level: 0.10, description: "Knowledge programmes rarely create strategic risk.", mitigation: "Ensure knowledge does not create single points of dependency." },
    technology: { level: 0.18, description: "Knowledge tooling fragmentation reduces adoption.", mitigation: "Consolidate knowledge into one system of record." },
    market: { level: 0.08, description: "Market conditions have minimal direct impact on knowledge programmes.", mitigation: "Prioritise knowledge capture for highest-churn business areas." },
  },
};

const KNOWN_UNKNOWNS_BY_TYPE: Record<ScenarioType, string[]> = {
  revenue_growth:   ["True addressable market size", "Competitor response timeline", "Conversion rate at scale"],
  cost_reduction:   ["Hidden cost dependencies", "Service quality impact below cut threshold", "Vendor renegotiation outcome"],
  automation:       ["Full integration scope", "Exception handling edge cases", "Team adoption rate"],
  marketing:        ["Channel saturation point", "Message resonance with target segments", "Attribution accuracy"],
  sales:            ["Deal velocity at increased volume", "Rep ramp time", "Competitive win rate changes"],
  customer_success: ["True churn drivers", "Self-service adoption rate", "Health score accuracy"],
  operations:       ["Full process dependency map", "Change resistance level", "True process cycle time"],
  product:          ["Product-market fit confirmation", "User adoption rate post-launch", "Technical complexity surprises"],
  infrastructure:   ["Full dependency tree", "Data migration completeness", "Third-party SLA impacts"],
  finance:          ["Regulatory interpretation", "Tax treatment of changes", "Counterparty behaviour"],
  risk_reduction:   ["Unknown risk exposure areas", "Effectiveness of controls at scale", "New risk emergence rate"],
  knowledge:        ["Tacit knowledge capture completeness", "Knowledge decay rate", "Adoption across teams"],
};

function compositeRisk(risks: RiskProjection[]): number {
  if (risks.length === 0) return 0.3;
  const weights: Record<RiskType, number> = { execution: 0.25, financial: 0.25, operational: 0.20, strategic: 0.15, technology: 0.10, market: 0.05 };
  return parseFloat(risks.reduce((sum, r) => sum + r.level * (weights[r.riskType] ?? 0.15), 0).toFixed(4));
}

export function projectRisks(input: ScenarioInput): RiskSummary {
  const profile = RISK_PROFILES[input.category];
  const riskScale = Math.max(0.5, input.risk + 0.3);

  const risks: RiskProjection[] = (Object.entries(profile) as [RiskType, { level: number; description: string; mitigation: string }][]).map(([type, row]) => ({
    riskType: type,
    level: parseFloat(Math.min(row.level * riskScale, 0.95).toFixed(4)),
    description: row.description,
    confidence: parseFloat(Math.min(0.65 * input.confidence, 0.90).toFixed(4)),
    mitigationHint: row.mitigation,
  }));

  return {
    risks,
    overallRisk: compositeRisk(risks),
    confidence: parseFloat(Math.min(0.68 * input.confidence, 0.90).toFixed(4)),
    knownUnknowns: KNOWN_UNKNOWNS_BY_TYPE[input.category] ?? [],
  };
}
