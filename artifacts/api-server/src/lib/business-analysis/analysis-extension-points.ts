// ─── Build 016: Business Analysis Extension Points ────────────────────────────

import { declareExtensionPoint } from "../cognitive-foundation/index";
import { ANALYSIS_EXTENSION_POINT_IDS } from "./types";

export function declareAnalysisExtensionPoints(): void {
  declareExtensionPoint({
    id: ANALYSIS_EXTENSION_POINT_IDS.OPPORTUNITY_DETECTION,
    description: "Build 017: Opportunity Discovery reads Business Analysis findings to generate actionable opportunities.",
    declaredBy: "business-analysis-engine",
  });

  declareExtensionPoint({
    id: ANALYSIS_EXTENSION_POINT_IDS.SCENARIO_ANALYSIS,
    description: "Simulate business outcomes by modifying graph state and re-running analysis.",
    declaredBy: "business-analysis-engine",
  });

  declareExtensionPoint({
    id: ANALYSIS_EXTENSION_POINT_IDS.FORECASTING,
    description: "Project KPI trajectories and health scores into future time periods.",
    declaredBy: "business-analysis-engine",
  });

  declareExtensionPoint({
    id: ANALYSIS_EXTENSION_POINT_IDS.BUSINESS_BENCHMARKING,
    description: "Compare business analysis scores against industry or portfolio benchmarks.",
    declaredBy: "business-analysis-engine",
  });

  declareExtensionPoint({
    id: ANALYSIS_EXTENSION_POINT_IDS.MARKET_COMPARISON,
    description: "Contextualize business analysis findings against market data.",
    declaredBy: "business-analysis-engine",
  });

  declareExtensionPoint({
    id: ANALYSIS_EXTENSION_POINT_IDS.INDUSTRY_ANALYSIS,
    description: "Apply industry-specific analysis norms and benchmarks to executive findings.",
    declaredBy: "business-analysis-engine",
  });

  declareExtensionPoint({
    id: ANALYSIS_EXTENSION_POINT_IDS.COMPETITIVE_INTELLIGENCE,
    description: "Augment business analysis with competitive landscape data.",
    declaredBy: "business-analysis-engine",
  });

  declareExtensionPoint({
    id: ANALYSIS_EXTENSION_POINT_IDS.STRATEGIC_RECOMMENDATIONS,
    description: "Build 017+: Convert executive findings into strategic recommendations (never in Analysis layer).",
    declaredBy: "business-analysis-engine",
  });
}
