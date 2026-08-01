// ── Build 040: Unified Cognitive Orchestration Engine — EB Integration ────
// Provides runUnifiedCognitiveCycle() to the Executive Brain and re-exports
// all advisory builders from Builds 015–039 so the EB's buildContextNote
// can import from a single location.

import { runUnifiedCognitiveCycle, runOrchestrationPlatformRebuild, buildUnifiedOrchestrationSummary } from "../unified-orchestration/ucos-orchestrator";
import type { UnifiedOrchestrationSummary } from "../unified-orchestration/types";

export { runUnifiedCognitiveCycle };
export type { CognitiveCycleResult } from "../unified-orchestration/ucos-orchestrator";

// ── EB throttle state ─────────────────────────────────────────────────────
let ucosCycleCount = 0;
const UCOS_THROTTLE_CYCLES = 280;

// ── Throttled platform snapshot rebuild ───────────────────────────────────
export function triggerOrchestrationSnapshot(): void {
  ucosCycleCount++;
  if (ucosCycleCount % UCOS_THROTTLE_CYCLES !== 0) return;
  runOrchestrationPlatformRebuild().catch(() => {/* fail-open */});
}

// ── Advisory for buildContextNote ─────────────────────────────────────────
export async function fetchOrchestrationSummary(_userId: number): Promise<UnifiedOrchestrationSummary | null> {
  try {
    return await buildUnifiedOrchestrationSummary();
  } catch {
    return null;
  }
}

export function buildOrchestrationAdvisory(summary: UnifiedOrchestrationSummary | null): string | null {
  if (!summary) return null;

  const parts: string[] = [
    `[UnifiedCognition] ${summary.totalEngines} engines, ${summary.wavesExecuted} waves. Avg confidence: ${(summary.avgConfidence * 100).toFixed(0)}%. Success rate: ${(summary.avgSuccessRate * 100).toFixed(0)}%. Law compliance: ${(summary.lawComplianceRate * 100).toFixed(0)}%.`,
  ];

  if (summary.failureCount > 0) {
    parts.push(`${summary.failureCount} engine(s) failed this cycle (fail-open applied).`);
  }
  if (summary.avgDurationMs > 0) {
    parts.push(`Avg cycle: ${summary.avgDurationMs}ms.`);
  }
  if (summary.topEngineId) {
    parts.push(`Highest-confidence engine: ${summary.topEngineId}.`);
  }
  if (summary.recentCycles > 0) {
    parts.push(`${summary.recentCycles} recent cycle(s) recorded.`);
  }
  parts.push("Unified Cognition Law: no engine executes in isolation if its output depends on evidence from another registered engine.");

  const advisory = parts.join(" ");
  return advisory.length > 600 ? advisory.slice(0, 599) + "…" : advisory;
}

// ── Re-exported advisory builders (Builds 015–039) ────────────────────────
// The EB's buildContextNote imports these from here rather than from 25 separate files.
export { buildBusinessAdvisory } from "./business-integration";
export { buildAnalysisAdvisory } from "./analysis-integration";
export { buildOpportunityAdvisory } from "./opportunity-integration";
export { buildSimulationAdvisory } from "./simulation-integration";
export { buildDecisionAdvisory } from "./decision-integration";
export { buildStrategyAdvisory } from "./strategy-integration";
export { buildPlanningAdvisory } from "./planning-integration";
export { buildCapabilityAdvisory } from "./capability-integration";
export { buildOperationalAdvisory } from "./operational-integration";
export { buildExecutionOrchestrationAdvisory } from "./execution-orchestration-integration";
export { buildAuthorityAdvisory } from "./authority-resolution-integration";
export { buildRiskAdvisory } from "./execution-risk-integration";
export { buildExecutionSimulationAdvisory } from "./execution-simulation-integration";
export { buildWorkflowExecutionAdvisory } from "./workflow-execution-integration";
export { buildUniversalExecutionAdvisory } from "./universal-execution-integration";
export { buildAdapterFrameworkAdvisory } from "./adapter-framework-integration";
export { buildCapabilityIntelligenceAdvisory } from "./capability-intelligence-integration";
export { buildPlatformInfrastructureAdvisory } from "./platform-infrastructure-integration";
export { buildGlobalTechnologyAdvisory } from "./global-technology-integration";
export { buildTechnologyRelationshipAdvisory } from "./technology-relationships-integration";
export { buildTechnologyEvolutionAdvisory } from "./technology-evolution-integration";
export { buildSystemsDynamicsAdvisory } from "./systems-dynamics-integration";
export { buildTradeoffIntelligenceAdvisory } from "./tradeoff-intelligence-integration";
export { buildPortfolioIntelligenceAdvisory } from "./portfolio-intelligence-integration";
export { buildPriorityIntelligenceAdvisory } from "./priority-intelligence-integration";
