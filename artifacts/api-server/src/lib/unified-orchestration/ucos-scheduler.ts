// ── Build 040: Unified Cognitive Orchestration Engine — Execution Scheduler ─
// Creates deterministic execution waves.
// Each wave is a parallel execution group. Waves execute sequentially.
// The scheduler does NOT execute engines — it produces the execution plan.
// Pure — no DB access, no side effects.

import type { CognitiveEngineDescriptor } from "./types";
import { COGNITIVE_ENGINE_REGISTRY } from "./types";
import { resolveExecutionWaves } from "./ucos-dependency-engine";

// ── Scheduled wave plan ───────────────────────────────────────────────────

export interface ScheduledWave {
  waveNumber:   number;
  engineIds:    string[];
  engineTitles: string[];
  estimatedMs:  number;  // rough estimate based on engine count
}

export interface CycleSchedule {
  totalWaves:   number;
  totalEngines: number;
  waves:        ScheduledWave[];
  estimatedMs:  number;
}

// ── Estimated execution time ───────────────────────────────────────────────
// Very rough: assume each engine takes ~20ms on average (DB reads only).
const MS_PER_ENGINE = 20;

// ── Build schedule ────────────────────────────────────────────────────────

export function buildCycleSchedule(): CycleSchedule {
  const wavePlans = resolveExecutionWaves();
  const titleMap  = new Map<string, string>(
    COGNITIVE_ENGINE_REGISTRY.map(e => [e.engineId, e.engineTitle]),
  );

  const waves: ScheduledWave[] = wavePlans.map(plan => ({
    waveNumber:   plan.waveNumber,
    engineIds:    plan.engineIds,
    engineTitles: plan.engineIds.map(id => titleMap.get(id) ?? id),
    estimatedMs:  MS_PER_ENGINE, // parallel → one engine's time
  }));

  const totalEngines  = wavePlans.reduce((s, w) => s + w.engineIds.length, 0);
  const estimatedMs   = waves.length * MS_PER_ENGINE; // sequential waves

  return { totalWaves: waves.length, totalEngines, waves, estimatedMs };
}

// ── Validate schedule (no orphaned engines) ───────────────────────────────

export function validateSchedule(schedule: CycleSchedule): string[] {
  const warnings: string[] = [];
  const registered = new Set(COGNITIVE_ENGINE_REGISTRY.map(e => e.engineId));
  const scheduled  = new Set(schedule.waves.flatMap(w => w.engineIds));

  for (const id of registered) {
    if (!scheduled.has(id)) warnings.push(`Engine "${id}" is registered but not scheduled.`);
  }

  // Check no engine appears in two waves
  const seen = new Set<string>();
  for (const wave of schedule.waves) {
    for (const id of wave.engineIds) {
      if (seen.has(id)) warnings.push(`Engine "${id}" scheduled in multiple waves.`);
      seen.add(id);
    }
  }

  return warnings;
}
