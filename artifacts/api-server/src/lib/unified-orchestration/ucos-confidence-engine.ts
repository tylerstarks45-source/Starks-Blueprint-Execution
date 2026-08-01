// ── Build 040: Unified Cognitive Orchestration Engine — Confidence Propagation ─
// Carries confidence through the complete cognitive pipeline so final
// recommendations reflect cumulative certainty.
// Confidence attenuates as it propagates through dependency chains.
// Pure — no DB access, no side effects.

import type { EngineDiagnostic, ConfidenceFlowRecord } from "./types";
import { COGNITIVE_ENGINE_REGISTRY } from "./types";

// ── Attenuation model ─────────────────────────────────────────────────────
// Each hop through a dependency chain reduces confidence by a small factor.
// This prevents deep chains from overclaiming certainty.
const ATTENUATION_PER_HOP = 0.05; // 5% reduction per dependency hop
const MIN_CONFIDENCE      = 0.10;  // floor: even failed engines contribute a little

// ── Extract confidence from diagnostic ────────────────────────────────────

function engineConfidence(diag: EngineDiagnostic): number {
  if (!diag.succeeded) return MIN_CONFIDENCE;
  if (diag.confidenceValue !== null && diag.confidenceValue >= 0) return diag.confidenceValue;
  if (diag.hasSummary) return 0.70; // default if engine has result but no explicit confidence
  return MIN_CONFIDENCE;
}

// ── Compute propagated confidence for all engines ─────────────────────────

export function propagateConfidence(
  diagnostics: EngineDiagnostic[],
): ConfidenceFlowRecord[] {
  const diagMap = new Map(diagnostics.map(d => [d.engineId, d]));
  const flows:   ConfidenceFlowRecord[] = [];

  for (const engine of COGNITIVE_ENGINE_REGISTRY) {
    if (engine.dependencies.length === 0) continue;

    const targetDiag = diagMap.get(engine.engineId);
    const targetConf = targetDiag ? engineConfidence(targetDiag) : MIN_CONFIDENCE;

    for (const depId of engine.dependencies) {
      const sourceDiag = diagMap.get(depId);
      const sourceConf = sourceDiag ? engineConfidence(sourceDiag) : MIN_CONFIDENCE;
      const attenuation = ATTENUATION_PER_HOP;
      const propagated  = Math.max(MIN_CONFIDENCE, sourceConf - attenuation);

      flows.push({
        sourceEngineId:   depId,
        targetEngineId:   engine.engineId,
        sourceConfidence: sourceConf,
        propagatedValue:  Math.min(propagated, targetConf), // cannot exceed target's own confidence
        attenuation,
      });
    }
  }

  return flows;
}

// ── Composite cycle confidence score ──────────────────────────────────────

export function computeCycleConfidence(diagnostics: EngineDiagnostic[]): number {
  if (diagnostics.length === 0) return 0;

  const scores     = diagnostics.map(engineConfidence);
  const mean       = scores.reduce((a, b) => a + b, 0) / scores.length;
  const successRate= diagnostics.filter(d => d.succeeded).length / diagnostics.length;

  // Composite: 70% mean confidence + 30% success rate
  return mean * 0.70 + successRate * 0.30;
}
