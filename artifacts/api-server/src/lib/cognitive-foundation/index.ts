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
import { declareStrategyExtensionPoints } from "../executive-strategy/strategy-extension-points";
import { declarePlanningExtensionPoints } from "../strategic-planning/planning-extension-points";
import { declareCapabilityExtensionPoints } from "../capability-planning/capability-extension-points";
import { declareOperationalExtensionPoints } from "../operational-planning/operational-extension-points";
import { declareExecutionOrchestrationExtensionPoints } from "../execution-orchestration/execution-extension-points";
import { declareAuthorityResolutionExtensionPoints } from "../authority-resolution/authority-extension-points";
import { declareExecutionRiskExtensionPoints } from "../execution-risk/risk-extension-points";
import { declareExecutionSimulationExtensionPoints } from "../execution-simulation/simulation-extension-points";
import { declareWorkflowExecutionExtensionPoints } from "../workflow-execution/workflow-extension-points";
import { declareUniversalExecutionExtensionPoints } from "../universal-execution/execution-extension-points";
import { declareAdapterFrameworkExtensionPoints } from "../adapter-framework/adapter-extension-points";
import { declareCapabilityIntelligenceExtensionPoints } from "../capability-intelligence/ci-extension-points";
import { declarePlatformInfrastructureExtensionPoints } from "../platform-infrastructure/pii-extension-points";
import { declareGlobalTechnologyExtensionPoints } from "../global-technology/gti-extension-points";
import { declareTechnologyRelationshipExtensionPoints } from "../technology-relationships/tri-extension-points";
import { declareTechnologyEvolutionExtensionPoints } from "../technology-evolution/tei-extension-points";
import { declareSystemsDynamicsExtensionPoints } from "../systems-dynamics/sdi-extension-points";
import { declareTradeoffIntelligenceExtensionPoints } from "../tradeoff-intelligence/eti-extension-points";
import { declarePortfolioIntelligenceExtensionPoints } from "../portfolio-intelligence/epi-extension-points";
import { declarePriorityIntelligenceExtensionPoints } from "../priority-intelligence/epri-extension-points";
import { declareUnifiedOrchestrationExtensionPoints } from "../unified-orchestration/ucos-extension-points";
import { declareKnowledgeGraphExtensionPoints } from "../knowledge-graph/kg-extension-points";
import { declareDigitalOperatingLayerExtensionPoints } from "../digital-operating-layer/dol-extension-points";
import { declareConnectionsHubExtensionPoints } from "../connections-hub/hub-extension-points";
import { declareCertificationExtensionPoints }   from "../certification/cert-extension-points";
import { declareLaunchHardeningExtensionPoints } from "../launch-hardening/lh-extension-points";
import { declareUPOSExtensionPoints }            from "../unified-platform/upos-extension-points";
import { declareUWPSExtensionPoints }            from "../unified-workspace/uwps-extension-points";
import { declareUBAFExtensionPoints }            from "../unified-asset/ubaf-extension-points";
import { declareUBREExtensionPoints }            from "../unified-builder-runtime/ubre-extension-points";

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
      declareStrategyExtensionPoints();          // Build 020: eight executive strategy seams
      declarePlanningExtensionPoints();          // Build 021: eight strategic planning seams
      declareCapabilityExtensionPoints();        // Build 022: eight capability planning seams
      declareOperationalExtensionPoints();       // Build 023: eight operational planning seams
      declareExecutionOrchestrationExtensionPoints(); // Build 024: eight execution orchestration seams
      declareAuthorityResolutionExtensionPoints();   // Build 025: eight authority resolution seams
      declareExecutionRiskExtensionPoints();         // Build 026: eight execution risk assessment seams
      declareExecutionSimulationExtensionPoints();   // Build 027: eight execution simulation seams
      declareWorkflowExecutionExtensionPoints();     // Build 028: eight workflow construction seams
      declareUniversalExecutionExtensionPoints();    // Build 029: eight universal execution seams
      declareAdapterFrameworkExtensionPoints();      // Build 030: eight adapter framework seams
      declareCapabilityIntelligenceExtensionPoints(); // Build 031: eight capability intelligence seams
      declarePlatformInfrastructureExtensionPoints(); // Build 032: eight platform infrastructure seams
      declareGlobalTechnologyExtensionPoints();       // Build 033: eight global technology intelligence seams
      declareTechnologyRelationshipExtensionPoints(); // Build 034: eight technology relationship intelligence seams
      declareTechnologyEvolutionExtensionPoints(); // Build 035: eight technology evolution intelligence seams
      declareSystemsDynamicsExtensionPoints(); // Build 036: eight systems dynamics intelligence seams
      declareTradeoffIntelligenceExtensionPoints(); // Build 037: eight executive trade-off intelligence seams
      declarePortfolioIntelligenceExtensionPoints(); // Build 038: eight executive portfolio intelligence seams
      declarePriorityIntelligenceExtensionPoints();  // Build 039: eight executive priority intelligence seams
      declareUnifiedOrchestrationExtensionPoints();  // Build 040: eight unified cognitive orchestration seams
      declareKnowledgeGraphExtensionPoints();        // Build 041: eight unified knowledge graph seams
      declareDigitalOperatingLayerExtensionPoints(); // Build 043: eight unified digital operating layer seams
      declareConnectionsHubExtensionPoints();        // Build 044: eight unified connections & integration hub seams
      declareCertificationExtensionPoints();         // Build 045:  eight cognitive certification & launch readiness seams
      declareLaunchHardeningExtensionPoints();       // Build 045A: eight launch hardening framework seams
      declareUPOSExtensionPoints();                  // Build 046: eight unified platform OS seams
      declareUWPSExtensionPoints();                  // Build 047: eight unified workspace & project seams
      declareUBAFExtensionPoints();                  // Build 048: eight unified business asset framework seams
      declareUBREExtensionPoints();                  // Build 049: eight unified builder runtime seams
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
