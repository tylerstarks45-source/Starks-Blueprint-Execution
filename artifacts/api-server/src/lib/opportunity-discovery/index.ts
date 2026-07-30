// ─── Build 017: Opportunity Discovery Engine — Public Barrel ──────────────────

export * from "./types";
export * from "./opportunity-registry";
export * from "./opportunity-orchestrator";
export { detectOpportunities } from "./detection-engine";
export { scoreOpportunities, computeCompositeScore, SCORING_VERSION } from "./scoring-engine";
export { rankOpportunities, topN, toPriorityGroups, categoryDistribution, priorityDistribution, sourceDistribution } from "./ranking-engine";
