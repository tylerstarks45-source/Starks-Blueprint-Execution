// ── Build 040: Unified Cognitive Orchestration Engine — Execution Diagnostics ─
// Records: execution time, engine participation, dependency satisfaction,
// health, confidence variance, pipeline completeness.
// Pure — no DB access, no side effects.

import type { EngineDiagnostic, ExecutionWave } from "./types";

// ── Pipeline completeness ──────────────────────────────────────────────────

export function computePipelineCompleteness(diagnostics: EngineDiagnostic[], totalEngines: number): boolean {
  if (totalEngines === 0) return false;
  const succeeded = diagnostics.filter(d => d.succeeded && d.hasSummary).length;
  // "Complete" if ≥70% of engines returned a valid summary
  return succeeded / totalEngines >= 0.70;
}

// ── Confidence variance ────────────────────────────────────────────────────

export function computeConfidenceVariance(diagnostics: EngineDiagnostic[]): number {
  const values = diagnostics
    .filter(d => d.confidenceValue !== null)
    .map(d => d.confidenceValue as number);
  if (values.length < 2) return 0;
  const mean     = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance); // standard deviation
}

// ── Top engine (highest confidence, succeeded) ─────────────────────────────

export function findTopEngine(diagnostics: EngineDiagnostic[]): string | null {
  const candidates = diagnostics
    .filter(d => d.succeeded && d.hasSummary && d.confidenceValue !== null)
    .sort((a, b) => (b.confidenceValue ?? 0) - (a.confidenceValue ?? 0));
  return candidates[0]?.engineId ?? null;
}

// ── Wave timing summary ────────────────────────────────────────────────────

export function summariseWaves(
  wavePlans:   { waveNumber: number; engineIds: string[] }[],
  diagnostics: EngineDiagnostic[],
  waveDurations: Map<number, number>,
): ExecutionWave[] {
  const diagMap = new Map(diagnostics.map(d => [d.engineId, d]));

  return wavePlans.map(wave => {
    const waveDiags     = wave.engineIds.map(id => diagMap.get(id)).filter(Boolean) as EngineDiagnostic[];
    const successCount  = waveDiags.filter(d => d.succeeded).length;
    const failureCount  = waveDiags.filter(d => !d.succeeded).length;
    const durationMs    = waveDurations.get(wave.waveNumber) ?? 0;

    return {
      waveNumber: wave.waveNumber,
      engineIds:  wave.engineIds,
      durationMs,
      successCount,
      failureCount,
    };
  });
}

// ── Full cycle health note ─────────────────────────────────────────────────

export function buildCycleHealthNote(
  diagnostics:       EngineDiagnostic[],
  confidenceScore:   number,
  pipelineComplete:  boolean,
): string {
  const total     = diagnostics.length;
  const succeeded = diagnostics.filter(d => d.succeeded).length;
  const failed    = total - succeeded;
  const hasSummary= diagnostics.filter(d => d.hasSummary).length;
  const variance  = computeConfidenceVariance(diagnostics).toFixed(2);

  const parts = [
    `${succeeded}/${total} engines succeeded`,
    `${hasSummary} with valid summaries`,
    `confidence: ${(confidenceScore * 100).toFixed(0)}% (σ=${variance})`,
    `pipeline: ${pipelineComplete ? "complete" : "partial"}`,
  ];
  if (failed > 0) parts.push(`${failed} engine(s) failed (fail-open applied)`);

  return parts.join("; ");
}
