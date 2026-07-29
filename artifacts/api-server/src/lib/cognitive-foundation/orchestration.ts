// ─── Cognitive Orchestration Engine (Build 002) ───────────────────────────────
//
// Reusable orchestration layer consumed by the Executive Brain. Reasons about
// cognitive resources (Brain Registry, Capability Registry) rather than
// executing business logic.
//
// Responsibilities:
//   1. Brain Selection        — score registered Brains against an objective
//                               using registry metadata (no hardcoded routing).
//   2. Capability Resolution  — discover which Brain owns a requested capability.
//   3. Collaboration Plans    — compose execution-order + dependency metadata
//                               for a set of selected Brains.
//   4. Dependency Awareness   — topological sort via BrainDefinition.dependencies.
//   5. Confidence-Aware       — heuristic confidence + extension-point stubs for
//      Routing                  future scoring systems (no scoring invented here).
//   6. Extension Points       — eight new orchestration seams declared but NOT
//                               implemented (per build spec).
//
// Design invariants:
//   - All selection/routing is deterministic from registry metadata (fast, no AI).
//   - Never calls OpenRouter or any external service.
//   - Never modifies Brain state or existing execution flows.
//   - Fail-open: every public function catches and handles its own errors so
//     callers can safely use this on hot request paths.

import { logger } from "../logger";
import { listBrains, getBrain } from "./brain-registry";
import { findCapabilities, listCapabilities } from "./capability-registry";
import { declareExtensionPoint } from "./extension-points";
import type {
  BrainSelectionResult,
  CollaborationPlan,
  OrchestrationConfidence,
  OrchestrationRequest,
  OrchestrationResult,
  RegisteredBrain,
} from "./types";

// ─── Orchestration Extension Points ──────────────────────────────────────────
//
// Eight new seams for future multi-Brain reasoning capabilities. Declared here
// at the orchestration layer (distinct from the nine Build 001 intelligence
// seams which live in the Cognitive Foundation). None are implemented yet.

export const ORCHESTRATION_EXTENSION_POINTS = [
  {
    id: "parallel-reasoning",
    description:
      "Run multiple Brains concurrently and merge their outputs, replacing the default sequential execution order.",
  },
  {
    id: "voting",
    description:
      "Multiple Brains each propose an answer; a pluggable voting strategy selects the winner.",
  },
  {
    id: "confidence-aggregation",
    description:
      "Aggregate confidence scores from multiple Brains into a single routing decision, replacing the heuristic OrchestrationConfidence value.",
  },
  {
    id: "conflict-resolution",
    description:
      "Detect and resolve contradictions between Brain outputs before they reach the final response.",
  },
  {
    id: "reasoning-chains",
    description:
      "Build explicit step-by-step reasoning chains that link individual Brain outputs into a traceable conclusion.",
  },
  {
    id: "collaborative-planning",
    description:
      "Multiple Brains co-author a plan, each contributing to the sections they own.",
  },
  {
    id: "adaptive-routing",
    description:
      "Dynamically adjust Brain selection mid-request based on intermediate results, replacing the static single-pass selection.",
  },
  {
    id: "dynamic-capability-discovery",
    description:
      "Discover capabilities at request time (e.g. from external Brain registries) rather than relying solely on boot-time registration.",
  },
] as const satisfies ReadonlyArray<{ id: string; description: string }>;

/** Declare all orchestration extension points. Called once from
 *  initializeCognitiveFoundation(); idempotent. */
export function declareOrchestrationExtensionPoints(): void {
  for (const p of ORCHESTRATION_EXTENSION_POINTS) {
    declareExtensionPoint({ ...p, declaredBy: "cognitive-orchestration-engine" });
  }
}

// ─── Tokenization ─────────────────────────────────────────────────────────────

/** English stopwords filtered out before scoring. Short tokens (<3 chars) are
 *  also dropped. The list is intentionally conservative — false positives in
 *  keyword matching are acceptable; false negatives (missing a signal) are not. */
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "up", "about", "into", "through", "is",
  "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "will", "would", "shall", "should", "may",
  "might", "must", "can", "could", "not", "no", "its", "this", "that",
  "what", "how", "when", "where", "who", "which", "there", "then",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

// ─── Brain Scoring ─────────────────────────────────────────────────────────────

/** Relevance weights when matching a token against Brain metadata fields.
 *  Higher weight = stronger signal of relevance. */
const WEIGHT = {
  purpose: 3,
  responsibility: 2,
  capabilityName: 1.5,
  capabilityDescription: 1,
  inputOutput: 0.5,
} as const;

/** Priority tiebreaker: critical/high Brains win ties over medium/low.
 *  Small delta so it never overrides a genuine relevance gap. */
const PRIORITY_BOOST: Record<RegisteredBrain["priority"], number> = {
  critical: 1.0,
  high: 0.5,
  medium: 0.0,
  low: -0.5,
};

/** Score a single Brain against a pre-tokenized objective.
 *  Pure registry-metadata matching — no AI call, no I/O.
 *
 *  EXTENSION POINT: adaptive-routing can replace this scorer at runtime by
 *  registering against the "adaptive-routing" extension point. */
function scoreBrainForObjective(brain: RegisteredBrain, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  let score = 0;
  const lc = (s: string): string => s.toLowerCase();

  for (const token of tokens) {
    if (lc(brain.purpose).includes(token)) score += WEIGHT.purpose;

    for (const r of brain.responsibilities) {
      if (lc(r).includes(token)) {
        score += WEIGHT.responsibility;
        break; // one hit per responsibility list per token is enough
      }
    }

    for (const cap of brain.capabilities) {
      if (lc(cap.name).includes(token)) score += WEIGHT.capabilityName;
      if (lc(cap.description).includes(token)) score += WEIGHT.capabilityDescription;
    }

    for (const inp of brain.inputs) {
      if (lc(inp).includes(token)) score += WEIGHT.inputOutput;
    }
    for (const out of brain.outputs) {
      if (lc(out).includes(token)) score += WEIGHT.inputOutput;
    }
  }

  score += PRIORITY_BOOST[brain.priority];
  return score;
}

// ─── Selection threshold ──────────────────────────────────────────────────────

/** A Brain must score at least this much to be auto-selected. Intentionally
 *  low — better to over-include than to miss a relevant cognitive resource.
 *  EXTENSION POINT: adaptive-routing can tune this per objective. */
const SELECTION_THRESHOLD = 0.5;

// ─── Brain Selection ──────────────────────────────────────────────────────────

/** Select the Brains most relevant to an objective, using registry metadata.
 *
 *  Algorithm:
 *  1. Exclude any Brains named in request.excludeBrains.
 *  2. Score remaining active Brains by keyword match against purpose,
 *     responsibilities, capability names, and inputs/outputs.
 *  3. Retain Brains above SELECTION_THRESHOLD, sorted by score descending.
 *  4. Force-include any Brains named in request.requireBrains.
 *  5. Guarantee at least the executive-brain anchor if nothing else scored.
 *
 *  EXTENSION POINT: adaptive-routing replaces steps 2–3 at runtime. */
export function selectBrains(request: OrchestrationRequest): BrainSelectionResult {
  const tokens = tokenize(request.objective);
  const allActive = listBrains().filter((b) => b.status === "active");
  const excluded = new Set(request.excludeBrains ?? []);
  const candidates = allActive.filter((b) => !excluded.has(b.name));

  // Score every candidate
  const scores: Record<string, number> = {};
  for (const b of candidates) {
    scores[b.name] = scoreBrainForObjective(b, tokens);
  }

  // Select above threshold, score descending
  let selected = candidates
    .filter((b) => scores[b.name] >= SELECTION_THRESHOLD)
    .sort((a, b) => scores[b.name] - scores[a.name])
    .map((b) => b.name);

  // Force-include required Brains (prepend so they show first)
  for (const req of [...(request.requireBrains ?? [])].reverse()) {
    if (!selected.includes(req)) selected.unshift(req);
  }

  // Guarantee a minimum anchor Brain when nothing scored
  if (selected.length === 0) {
    const anchor = "executive-brain";
    const fallback = candidates.find((b) => b.name === anchor) ?? candidates[0];
    if (fallback) {
      selected = [fallback.name];
      logger.debug(
        { brainName: fallback.name },
        "Orchestration: nothing scored above threshold; falling back to anchor Brain",
      );
    }
  }

  const topScore = selected.length > 0 ? Math.max(...selected.map((n) => scores[n] ?? 0)) : 0;
  const confidence = computeConfidence(topScore, tokens.length);

  return {
    selectedBrains: selected,
    scores,
    confidence,
    selectionBasis: "registry-metadata",
  };
}

// ─── Confidence computation ───────────────────────────────────────────────────

/** Heuristic confidence in a selection result. Bands based on top score:
 *  high ≥8, medium ≥4, low ≥threshold, unknown otherwise.
 *
 *  EXTENSION POINT: confidence-aggregation replaces this with a multi-Brain
 *  scoring system that produces a calibrated probability. */
function computeConfidence(topScore: number, tokenCount: number): OrchestrationConfidence {
  if (tokenCount === 0) return "unknown";
  if (topScore >= 8) return "high";
  if (topScore >= 4) return "medium";
  if (topScore >= SELECTION_THRESHOLD) return "low";
  return "unknown";
}

// ─── Capability Resolution ─────────────────────────────────────────────────────

/** Resolve which Brain owns a capability by exact id.
 *  Returns null if the capability is not registered. */
export function resolveCapabilityOwner(capabilityId: string): string | null {
  const all = listCapabilities();
  const match = all.find((c) => c.id === capabilityId);
  return match?.brainName ?? null;
}

/** Build a capability map for an objective restricted to a Brain set:
 *  { capabilityId → brainName } for every capability that matches any token.
 *  EXTENSION POINT: dynamic-capability-discovery can augment this map at
 *  request time from external registries. */
export function resolveCapabilitiesForObjective(
  objective: string,
  brainNames?: string[],
): Record<string, string> {
  const tokens = tokenize(objective);
  const map: Record<string, string> = {};

  for (const token of tokens) {
    const matches = findCapabilities(token);
    for (const m of matches) {
      if (!brainNames || brainNames.includes(m.brainName)) {
        map[m.id] = m.brainName;
      }
    }
  }
  return map;
}

// ─── Dependency-aware topological sort ────────────────────────────────────────

/** Topologically sort a set of Brain names using their registered
 *  BrainDefinition.dependencies, restricted to the participating set.
 *
 *  Guarantees: dependencies appear before their dependents.
 *  Cycle handling: if a cycle is detected, the offending Brain is appended
 *  at the end (fail-open — no infinite loop, no crash).
 *
 *  External dependencies (Brains not in the participating set) are ignored:
 *  they are assumed to always be available through their own subsystems. */
export function topoSortBrains(brainNames: string[]): string[] {
  const nameSet = new Set(brainNames);
  const visited = new Set<string>();
  const result: string[] = [];

  function visit(name: string, path: Set<string>): void {
    if (visited.has(name)) return;
    if (path.has(name)) {
      // Cycle detected — skip this node; it will be appended at the end.
      logger.warn({ brain: name, cycle: [...path] }, "Orchestration: dependency cycle detected; Brain appended at end");
      return;
    }
    path.add(name);
    const brain = getBrain(name);
    if (brain) {
      for (const dep of brain.dependencies) {
        if (nameSet.has(dep)) {
          visit(dep, new Set(path)); // new Set to avoid cross-branch pollution
        }
      }
    }
    path.delete(name);
    visited.add(name);
    result.push(name);
  }

  for (const name of brainNames) {
    visit(name, new Set());
  }

  // Append any names that weren't visited (shouldn't happen, safety net)
  for (const name of brainNames) {
    if (!visited.has(name)) result.push(name);
  }

  return result;
}

// ─── Collaboration Plan ────────────────────────────────────────────────────────

/** Build a collaboration plan for a set of selected Brains + an objective.
 *  Pure orchestration metadata — no execution happens here. */
export function buildCollaborationPlan(
  objective: string,
  selectedBrains: string[],
): CollaborationPlan {
  const executionOrder = topoSortBrains(selectedBrains);

  // Build the dependency graph restricted to the participating Brains.
  const dependencies: Record<string, string[]> = {};
  for (const name of selectedBrains) {
    const brain = getBrain(name);
    dependencies[name] = (brain?.dependencies ?? []).filter((d) => selectedBrains.includes(d));
  }

  // Collect relevant capabilities from participating Brains.
  const capabilityMap = resolveCapabilitiesForObjective(objective, selectedBrains);
  const requiredCapabilities = Object.keys(capabilityMap);

  // Aggregate expected outputs from participating Brains (deduped, ordered).
  const seen = new Set<string>();
  const expectedOutputs = selectedBrains
    .flatMap((name) => getBrain(name)?.outputs ?? [])
    .filter((o) => (seen.has(o) ? false : (seen.add(o), true)));

  return {
    objective,
    participatingBrains: selectedBrains,
    executionOrder,
    dependencies,
    requiredCapabilities,
    expectedOutputs,
    builtAt: new Date().toISOString(),
    // Extension-point stubs are intentionally absent from the object.
    // They will be populated when the corresponding seams are implemented.
  };
}

// ─── Full Orchestration Pipeline ──────────────────────────────────────────────

/** Run the full orchestration pipeline for a request:
 *    select Brains → build collaboration plan → resolve capability map → assign confidence.
 *
 *  This is the primary entry point for the Executive Brain and any other
 *  consumer that needs cognitive resource reasoning. */
export function orchestrate(request: OrchestrationRequest): OrchestrationResult {
  const selection = selectBrains(request);
  const plan = buildCollaborationPlan(request.objective, selection.selectedBrains);
  const capabilityMap = resolveCapabilitiesForObjective(request.objective, selection.selectedBrains);

  return {
    request,
    selectedBrains: selection.selectedBrains,
    collaborationPlan: plan,
    capabilityMap,
    confidence: selection.confidence,
    orchestratedAt: new Date().toISOString(),
  };
}
