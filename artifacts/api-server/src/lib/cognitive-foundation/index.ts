// ─── Cognitive Foundation (Build 001 + Build 002) ────────────────────────────
//
// Public surface of the Cognitive Foundation: Brain Registry, Capability
// Registry, Extension Points, Runtime State, Cognitive Orchestration Engine,
// and the boot-time initializer. See types.ts for the design constraints and
// the Master Architecture Specification (Volume 1) for the governing
// architecture.

export * from "./types";
export * from "./brain-registry";
export * from "./capability-registry";
export * from "./extension-points";
export * from "./runtime-state";
export * from "./orchestration";
export * from "./reasoning";
export * from "./cognitive-memory";
export * from "./artifact-graph";
export { registerCoreBrains } from "./register-core-brains";

import { logger } from "../logger";
import { countBrains, getCognitiveHealthReport } from "./brain-registry";
import { countCapabilities } from "./capability-registry";
import { declareFutureIntelligenceExtensionPoints, listExtensionPoints } from "./extension-points";
import { declareOrchestrationExtensionPoints } from "./orchestration";
import { declareReflectionExtensionPoints } from "./reasoning";
import { registerCoreBrains } from "./register-core-brains";
import { declareContextExtensionPoints } from "../executive-context/context-extension-points";
import { declareJudgmentExtensionPoints } from "../executive-judgment/judgment-extension-points";
import { declareGoalExtensionPoints } from "../executive-goal/goal-extension-points";
import { declarePlanExtensionPoints } from "../executive-plan/plan-extension-points";
import { declareExecutionExtensionPoints } from "../executive-execution/execution-extension-points";
import { declareObservationExtensionPoints } from "../executive-observation/observation-extension-points";
import { declareReflectionEngineExtensionPoints } from "../executive-reflection/reflection-extension-points";
import { declareLearningExtensionPoints } from "../executive-learning/learning-extension-points";
import { declareGovernanceExtensionPoints } from "../executive-governance/governance-extension-points";
import { declareBusinessGraphExtensionPoints } from "../business-graph/business-extension-points";
import { declareAnalysisExtensionPoints } from "../business-analysis/analysis-extension-points";
import { declareOpportunityExtensionPoints } from "../opportunity-discovery/opportunity-extension-points";
import { declareSimulationExtensionPoints } from "../future-simulation/simulation-extension-points";
import { declareDecisionExtensionPoints } from "../decision-intelligence/decision-extension-points";

let initialized = false;

export interface CognitiveFoundationSummary {
  brains: number;
  capabilities: number;
  extensionPoints: number;
}

/** Boot-time initializer, called once from the server entry point.
 *  Synchronous registration; health-cache warm-up runs in the background so
 *  startup latency is unaffected. Never throws — a cognitive-foundation
 *  failure must not prevent the API server from starting. */
export function initializeCognitiveFoundation(): CognitiveFoundationSummary {
  if (!initialized) {
    try {
      declareFutureIntelligenceExtensionPoints();
      declareOrchestrationExtensionPoints();  // Build 002: eight orchestration seams
      declareReflectionExtensionPoints();     // Build 003: four reflection hooks
      declareContextExtensionPoints();        // Build 006: six context engine seams
      declareJudgmentExtensionPoints();       // Build 007: five judgment engine seams
      declareGoalExtensionPoints();           // Build 008: six goal engine seams
      declarePlanExtensionPoints();           // Build 009: six planning engine seams
      declareExecutionExtensionPoints();       // Build 010: ten execution engine seams
      declareObservationExtensionPoints();        // Build 011: eight observation engine seams
      declareReflectionEngineExtensionPoints();  // Build 012: eight reflection engine seams
      declareLearningExtensionPoints();          // Build 013: eight principle learning seams
      declareGovernanceExtensionPoints();        // Build 014: eight governance & adaptation seams
      declareBusinessGraphExtensionPoints();     // Build 015: eight business graph seams
      declareAnalysisExtensionPoints();          // Build 016: eight business analysis seams
      declareOpportunityExtensionPoints();       // Build 017: eight opportunity discovery seams
      declareSimulationExtensionPoints();        // Build 018: eight future state simulation seams
      declareDecisionExtensionPoints();          // Build 019: eight decision intelligence seams
      registerCoreBrains();
      initialized = true;

      // Warm the health cache so the Executive Brain's zero-I/O advisory
      // (getCachedHealthConcerns) has data soon after boot.
      void getCognitiveHealthReport()
        .then((report) => {
          logger.info(
            { overall: report.overall, counts: report.counts },
            "Cognitive foundation health cache warmed",
          );
        })
        .catch((err) => {
          logger.warn({ err }, "Cognitive foundation health warm-up failed (non-fatal)");
        });
    } catch (err) {
      logger.error({ err }, "Cognitive foundation initialization failed (non-fatal, registry may be partial)");
    }
  }

  const summary: CognitiveFoundationSummary = {
    brains: countBrains(),
    capabilities: countCapabilities(),
    extensionPoints: listExtensionPoints().length,
  };
  logger.info(summary, "Cognitive foundation initialized");
  return summary;
}
