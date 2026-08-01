// ── Build 040: Unified Cognitive Orchestration Engine — Synchronization ───
// Coordinates all engine outputs before Executive Brain synthesis.
// A synchronization barrier ensures all wave outputs are stable before the
// next wave or final synthesis begins.
// Pure — no DB access, no side effects.

import type { EngineDiagnostic } from "./types";

// ── Synchronization barrier ───────────────────────────────────────────────
// Returns true when all engines in the wave have completed (success or failure).
// Fail-open: a wave is considered "synced" even if some engines failed.

export interface SyncBarrierResult {
  waveNumber:    number;
  synced:        boolean;
  enginesPassed: number;
  enginesFailed: number;
  waitedForIds:  string[];
}

export function checkSyncBarrier(
  waveNumber:   number,
  waveEngineIds:string[],
  diagnostics:  EngineDiagnostic[],
): SyncBarrierResult {
  const waveDiags = diagnostics.filter(d => waveEngineIds.includes(d.engineId));
  const completed = new Set(waveDiags.map(d => d.engineId));
  const pending   = waveEngineIds.filter(id => !completed.has(id));

  return {
    waveNumber,
    synced:        pending.length === 0, // all engines have a diagnostic record
    enginesPassed: waveDiags.filter(d => d.succeeded).length,
    enginesFailed: waveDiags.filter(d => !d.succeeded).length,
    waitedForIds:  pending, // engines that haven't reported yet
  };
}

// ── Final synthesis gate ───────────────────────────────────────────────────
// Called before EB synthesis to confirm all waves are complete.

export function canProceedToSynthesis(
  syncResults: SyncBarrierResult[],
): { canProceed: boolean; reason: string } {
  const incomplete = syncResults.filter(r => !r.synced);
  if (incomplete.length === 0) {
    return { canProceed: true, reason: "All synchronization barriers passed." };
  }
  const pendingWaves = incomplete.map(r => `Wave ${r.waveNumber}`).join(", ");
  // Fail-open: we still proceed even if some barriers are incomplete
  return {
    canProceed: true, // always proceed — fail-open
    reason:     `Proceeding with incomplete barriers: ${pendingWaves}. Unified Cognition Law: partial evidence is better than no evidence.`,
  };
}
