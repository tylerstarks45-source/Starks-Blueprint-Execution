// ─── Brain Registry (Build 001) ─────────────────────────────────────────────
//
// Single source of truth for every Brain in ASH. Brains register themselves
// at boot with standardized metadata (types.ts) and an optional cheap health
// probe. The Executive Brain observes the whole cognitive system through
// this registry's health surface.
//
// Health model:
// - Probes run with a hard timeout and full error capture — a hung or
//   throwing probe marks that Brain "offline"/"degraded" but never throws
//   into the caller.
// - Results are cached per Brain (lastHealth). Hot request paths must use
//   getCachedBrainHealth()/getCachedHealthConcerns() (zero I/O); report
//   endpoints use getCognitiveHealthReport() which refreshes stale entries.

import { logger } from "../logger";
import { registerCapability, removeCapabilitiesForBrain } from "./capability-registry";
import type {
  BrainDefinition,
  BrainHealthSnapshot,
  BrainHealthState,
  CognitiveHealthReport,
  RegisteredBrain,
  SerializedBrain,
} from "./types";
import { BRAIN_HEALTH_STATES } from "./types";

const brains = new Map<string, RegisteredBrain>();

/** Worst-of ordering for aggregation: higher = worse. */
const HEALTH_SEVERITY: Record<BrainHealthState, number> = {
  healthy: 0,
  unknown: 1,
  warning: 2,
  degraded: 3,
  offline: 4,
};

const DEFAULT_PROBE_TIMEOUT_MS = 2_500;
const DEFAULT_HEALTH_MAX_AGE_MS = 30_000;

/** Register a Brain. Idempotent: re-registering the same name replaces the
 *  definition (with a log line) but preserves the original registeredAt and
 *  last health snapshot, so hot-path callers never observe a gap. */
export function registerBrain(def: BrainDefinition): RegisteredBrain {
  const existing = brains.get(def.name);
  if (existing) {
    logger.warn({ brain: def.name }, "Brain re-registered; replacing existing definition");
  }
  const registered: RegisteredBrain = {
    ...def,
    registeredAt: existing?.registeredAt ?? new Date().toISOString(),
    ...(existing?.lastHealth ? { lastHealth: existing.lastHealth } : {}),
  };
  brains.set(def.name, registered);
  // Reconcile capabilities: drop anything from a previous registration of
  // this brain so removed capabilities never linger as stale entries.
  removeCapabilitiesForBrain(def.name);
  for (const cap of def.capabilities) {
    registerCapability(def.name, cap);
  }
  logger.info(
    { brain: def.name, version: def.version, capabilities: def.capabilities.length },
    "Brain registered in cognitive foundation",
  );
  return registered;
}

export function getBrain(name: string): RegisteredBrain | null {
  return brains.get(name) ?? null;
}

export function listBrains(): RegisteredBrain[] {
  return [...brains.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function countBrains(): number {
  return brains.size;
}

/** JSON-safe projection (strips the probe function). */
export function serializeBrain(brain: RegisteredBrain): SerializedBrain {
  const { checkHealth: _checkHealth, ...rest } = brain;
  return rest;
}

// ─── Health observation ─────────────────────────────────────────────────────

function timeoutAfter(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    const t = setTimeout(() => reject(new Error(`health probe timed out after ${ms}ms`)), ms);
    // Don't keep the process alive just for a probe timer.
    if (typeof t.unref === "function") t.unref();
  });
}

/** Run one Brain's health probe (with timeout), record and return the snapshot. */
export async function checkBrainHealth(
  name: string,
  opts: { timeoutMs?: number } = {},
): Promise<BrainHealthSnapshot> {
  const brain = brains.get(name);
  const checkedAt = new Date().toISOString();
  if (!brain) {
    return { brainName: name, state: "unknown", message: `No brain registered under "${name}"`, checkedAt, latencyMs: 0 };
  }

  if (!brain.checkHealth) {
    const snapshot: BrainHealthSnapshot = {
      brainName: name,
      state: "unknown",
      message: "No health probe registered for this brain",
      checkedAt,
      latencyMs: 0,
    };
    brain.lastHealth = snapshot;
    return snapshot;
  }

  const timeoutMs = opts.timeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS;
  const startedAt = Date.now();
  let snapshot: BrainHealthSnapshot;
  try {
    const result = await Promise.race([brain.checkHealth(), timeoutAfter(timeoutMs)]);
    snapshot = { brainName: name, ...result, checkedAt, latencyMs: Date.now() - startedAt };
  } catch (err) {
    snapshot = {
      brainName: name,
      state: "offline",
      message: `Health probe failed: ${err instanceof Error ? err.message : String(err)}`,
      checkedAt,
      latencyMs: Date.now() - startedAt,
    };
  }
  brain.lastHealth = snapshot;
  if (snapshot.state !== "healthy") {
    logger.warn({ brain: name, state: snapshot.state, message: snapshot.message }, "Brain health is not healthy");
  }
  return snapshot;
}

function isFresh(snapshot: BrainHealthSnapshot | undefined, maxAgeMs: number): snapshot is BrainHealthSnapshot {
  if (!snapshot) return false;
  const age = Date.now() - new Date(snapshot.checkedAt).getTime();
  return Number.isFinite(age) && age >= 0 && age <= maxAgeMs;
}

/** Aggregate health across every registered Brain. Reuses fresh cached
 *  snapshots; probes stale/missing ones in parallel. Never throws. */
export async function getCognitiveHealthReport(
  opts: { maxAgeMs?: number; timeoutMs?: number } = {},
): Promise<CognitiveHealthReport> {
  const maxAgeMs = opts.maxAgeMs ?? DEFAULT_HEALTH_MAX_AGE_MS;
  const all = listBrains();
  const timeoutParam = opts.timeoutMs !== undefined ? { timeoutMs: opts.timeoutMs } : {};
  const snapshots = await Promise.all(
    all.map((b) => (isFresh(b.lastHealth, maxAgeMs) ? Promise.resolve(b.lastHealth) : checkBrainHealth(b.name, timeoutParam))),
  );

  const counts = Object.fromEntries(BRAIN_HEALTH_STATES.map((s) => [s, 0])) as Record<BrainHealthState, number>;
  let overall: BrainHealthState = "healthy";
  for (const s of snapshots) {
    counts[s.state] += 1;
    if (HEALTH_SEVERITY[s.state] > HEALTH_SEVERITY[overall]) overall = s.state;
  }
  // An empty registry is a registration failure, not a healthy system.
  if (snapshots.length === 0) overall = "unknown";

  return { generatedAt: new Date().toISOString(), overall, counts, brains: snapshots };
}

/** Zero-I/O read of the latest known snapshots (may be empty right after boot
 *  until the background warm-up completes). Safe on hot request paths. */
export function getCachedBrainHealth(): BrainHealthSnapshot[] {
  return listBrains()
    .map((b) => b.lastHealth)
    .filter((s): s is BrainHealthSnapshot => s !== undefined);
}

/** Zero-I/O list of currently-concerning Brains (warning or worse), worst
 *  first. Used by the Executive Brain's context assembly advisory. */
export function getCachedHealthConcerns(): BrainHealthSnapshot[] {
  return getCachedBrainHealth()
    .filter((s) => HEALTH_SEVERITY[s.state] >= HEALTH_SEVERITY.warning)
    .sort((a, b) => HEALTH_SEVERITY[b.state] - HEALTH_SEVERITY[a.state]);
}

/** Test-only/maintenance helper: clear the registry. Not used in request paths. */
export function clearBrainRegistry(): void {
  brains.clear();
}
