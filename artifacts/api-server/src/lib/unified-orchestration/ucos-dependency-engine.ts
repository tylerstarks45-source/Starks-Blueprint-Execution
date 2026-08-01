// ── Build 040: Unified Cognitive Orchestration Engine — Dependency Resolution ─
// Determines which engines must execute first based on declared dependencies.
// Produces a topologically-sorted wave plan from the static engine registry.
// Pure function — no DB access, no side effects.

import type { CognitiveEngineDescriptor } from "./types";
import { COGNITIVE_ENGINE_REGISTRY } from "./types";

// ── Topological sort into waves ───────────────────────────────────────────

export interface WavePlan {
  waveNumber: number;
  engineIds:  string[];
}

export function resolveExecutionWaves(): WavePlan[] {
  // Group by waveNumber (already declared in registry)
  const waveMap = new Map<number, string[]>();

  for (const engine of COGNITIVE_ENGINE_REGISTRY) {
    if (!waveMap.has(engine.waveNumber)) {
      waveMap.set(engine.waveNumber, []);
    }
    waveMap.get(engine.waveNumber)!.push(engine.engineId);
  }

  // Sort by wave number ascending
  return Array.from(waveMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([waveNumber, engineIds]) => ({ waveNumber, engineIds }));
}

// ── Dependency satisfaction check ─────────────────────────────────────────

export function areDependenciesSatisfied(
  engineId:      string,
  completedEngines: Set<string>,
): boolean {
  const descriptor = COGNITIVE_ENGINE_REGISTRY.find(e => e.engineId === engineId);
  if (!descriptor) return true; // unknown engine = no deps
  return descriptor.dependencies.every(dep => completedEngines.has(dep));
}

// ── Evidence dependency edges ─────────────────────────────────────────────

export interface DependencyEdge {
  engineId:    string;
  dependsOn:   string;
  dependencyType: "evidence" | "context" | "confidence";
  description: string;
}

export function getAllDependencyEdges(): DependencyEdge[] {
  const edges: DependencyEdge[] = [];

  for (const engine of COGNITIVE_ENGINE_REGISTRY) {
    for (const dep of engine.dependencies) {
      edges.push({
        engineId:       engine.engineId,
        dependsOn:      dep,
        dependencyType: "evidence",
        description:    `"${engine.engineTitle}" receives evidence from "${dep}"`,
      });
    }
  }

  return edges;
}

// ── Get engine descriptor ─────────────────────────────────────────────────

export function getEngineDescriptor(engineId: string): CognitiveEngineDescriptor | undefined {
  return COGNITIVE_ENGINE_REGISTRY.find(e => e.engineId === engineId);
}
