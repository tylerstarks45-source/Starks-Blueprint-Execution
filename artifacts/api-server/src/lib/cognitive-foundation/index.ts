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
export { registerCoreBrains } from "./register-core-brains";

import { logger } from "../logger";
import { countBrains, getCognitiveHealthReport } from "./brain-registry";
import { countCapabilities } from "./capability-registry";
import { declareFutureIntelligenceExtensionPoints, listExtensionPoints } from "./extension-points";
import { declareOrchestrationExtensionPoints } from "./orchestration";
import { declareReflectionExtensionPoints } from "./reasoning";
import { registerCoreBrains } from "./register-core-brains";

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
