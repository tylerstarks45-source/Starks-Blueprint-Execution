// ─── Brain Runtime State (Build 002) ─────────────────────────────────────────
//
// Tracks the operational runtime state for every registered Brain. Runtime
// state is distinct from, but informed by, health state:
//
//   Health state (Build 001): driven by infrastructure probes — is the Brain's
//   backing store reachable? Is required configuration present?
//
//   Runtime state (Build 002): driven by the orchestration layer — is the Brain
//   idle, busy, waiting on a dependency, recovering, etc.?
//
// Integration rule:
//   - Operational states (idle/busy/waiting/blocked/recovering/learning) are
//     the orchestration layer's domain and are set explicitly via
//     setBrainRuntimeState().
//   - Health-derived states (healthy/warning/degraded/offline) are derived
//     from the Build 001 health snapshot cache and take over whenever no
//     explicit operational state is active.
//   - State transitions: busy → idle (explicit clear), degraded health →
//     recovering (explicit set by orchestration), recovering → healthy
//     (next health probe confirms health).
//
// This module is zero-I/O and safe on hot request paths.

import type { BrainHealthState, BrainRuntimeState, BrainRuntimeStatus } from "./types";
import { getCachedBrainHealth } from "./brain-registry";

// In-process per-Brain runtime state. Set explicitly by the orchestration layer.
const runtimeStates = new Map<string, BrainRuntimeStatus>();

/** The operational states that the orchestration layer owns. Health-derived
 *  states are read from the Build 001 health cache, not set here. */
const OPERATIONAL_STATES: ReadonlySet<BrainRuntimeState> = new Set([
  "idle",
  "busy",
  "waiting",
  "blocked",
  "recovering",
  "learning",
]);

/** Map from Build 001 health state → equivalent runtime state.
 *  Used when no explicit operational state is set. */
const HEALTH_TO_RUNTIME: Record<BrainHealthState, BrainRuntimeState> = {
  healthy: "healthy",
  unknown:  "idle",    // No probe yet — assume idle, not a failure state
  warning:  "warning",
  degraded: "degraded",
  offline:  "offline",
};

// ─── Public API ───────────────────────────────────────────────────────────────

/** Return the current runtime state for a Brain.
 *
 *  Resolution order:
 *  1. An explicit operational state set by the orchestration layer (busy,
 *     waiting, blocked, recovering, learning, idle) — highest precedence.
 *  2. The latest cached health snapshot derived state (healthy/warning/
 *     degraded/offline).
 *  3. Falls back to "idle" when no health data is available yet. */
export function getBrainRuntimeState(brainName: string): BrainRuntimeStatus {
  const explicit = runtimeStates.get(brainName);

  // Explicit operational states take precedence over health-derived states.
  if (explicit && OPERATIONAL_STATES.has(explicit.runtimeState)) {
    return explicit;
  }

  // Derive from the latest cached health snapshot.
  const snapshots = getCachedBrainHealth();
  const snapshot = snapshots.find((s) => s.brainName === brainName);
  if (snapshot) {
    const derived = HEALTH_TO_RUNTIME[snapshot.state];
    const status: BrainRuntimeStatus = {
      brainName,
      runtimeState: derived,
      since: snapshot.checkedAt,
    };
    // Carry the health message forward as a note, except for the trivial case.
    const trivialMessages = new Set(["Brain is healthy", "No health probe registered for this brain"]);
    if (snapshot.message && !trivialMessages.has(snapshot.message)) {
      status.note = snapshot.message;
    }
    return status;
  }

  // No health data yet (immediately post-boot, before warm-up completes).
  return {
    brainName,
    runtimeState: "idle",
    since: new Date().toISOString(),
    note: "No health snapshot available yet",
  };
}

/** Explicitly set a Brain's operational runtime state.
 *
 *  Intended for the orchestration layer to mark a Brain as busy, waiting,
 *  blocked, recovering, or learning. Health-derived states (healthy/warning/
 *  degraded/offline) are managed by the Build 001 health monitoring system
 *  and must not be set here — they are ignored if passed. */
export function setBrainRuntimeState(
  brainName: string,
  state: BrainRuntimeState,
  note?: string,
): void {
  if (!OPERATIONAL_STATES.has(state)) {
    // Health-derived states are read-only from the orchestration layer's
    // perspective. Silently ignore to keep the API fail-open.
    return;
  }
  const status: BrainRuntimeStatus = {
    brainName,
    runtimeState: state,
    since: new Date().toISOString(),
  };
  if (note !== undefined) status.note = note;
  runtimeStates.set(brainName, status);
}

/** Clear the explicit operational runtime state for a Brain.
 *  After clearing, the Brain's state reverts to the health-derived value.
 *  Typically called when a busy/waiting/blocked operation completes. */
export function clearBrainRuntimeState(brainName: string): void {
  runtimeStates.delete(brainName);
}

/** Return runtime status for a list of Brain names, one entry per name.
 *  Safe to call with names that are not yet registered. */
export function getRuntimeStates(brainNames: string[]): BrainRuntimeStatus[] {
  return brainNames.map(getBrainRuntimeState);
}

/** Test-only/maintenance helper: clear all explicitly-set runtime states. */
export function clearAllRuntimeStates(): void {
  runtimeStates.clear();
}
