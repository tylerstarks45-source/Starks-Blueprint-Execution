// ─── Cognitive Foundation — shared types (Build 001) ───────────────────────
//
// The Cognitive Foundation is the platform-level registry layer that every
// ASH Brain registers itself into. It is the single source of truth for
// which Brains exist, what they are responsible for, what capabilities they
// expose, how healthy they are, and where future intelligence layers plug in.
//
// Design constraints (per the approved Master Architecture Specification):
// - Purely additive: no existing subsystem changes behavior by being listed
//   here. Registration is descriptive metadata + an optional health probe.
// - In-process: Brains are code-level subsystems of the API server, so the
//   registry lives in memory and is rebuilt at boot from code — the same
//   pattern as the Validation Engine's rule registry (ALL_VALIDATION_RULES).
// - Fail-open: a broken health probe can mark a Brain offline, but can never
//   throw into a caller's request path.

/** Health states a Brain can report. Ordered from best to worst in
 *  HEALTH_SEVERITY (brain-registry.ts) for worst-of aggregation. */
export const BRAIN_HEALTH_STATES = ["healthy", "unknown", "warning", "degraded", "offline"] as const;
export type BrainHealthState = (typeof BRAIN_HEALTH_STATES)[number];

/** Lifecycle status of a registered Brain. */
export const BRAIN_STATUSES = ["active", "planned", "deprecated"] as const;
export type BrainStatus = (typeof BRAIN_STATUSES)[number];

/** Implementation status of a single capability, mirroring the Capability
 *  Contract annotations used across the Master Architecture Specification:
 *  - "implemented": exists in code today (contract has no annotation)
 *  - "partial":     partially exists (contract annotated "partial capability")
 *  - "target":      designed but not built (contract annotated "target capability")
 *  - "deferred":    deliberately absent pending an explicit scope decision
 *                   (contract annotated "not currently authorized")           */
export const CAPABILITY_STATUSES = ["implemented", "partial", "target", "deferred"] as const;
export type CapabilityStatus = (typeof CAPABILITY_STATUSES)[number];

/** A single capability a Brain exposes. Maturity values use the spec's own
 *  notation verbatim (L0–L5, compound forms like "L2/L3" allowed), so the
 *  registry never drifts from the approved chapter text. */
export interface BrainCapability {
  /** Unique within the owning Brain, kebab-case (e.g. "goal-management"). */
  id: string;
  name: string;
  description: string;
  /** Section reference into the owning Brain's architecture chapter (e.g. "§3.4.2"). */
  specSection: string;
  /** Current maturity in spec notation (e.g. "L2", "L2/L3"). */
  currentMaturity: string;
  /** Target maturity in spec notation. */
  targetMaturity: string;
  status: CapabilityStatus;
}

/** Result an individual Brain health probe returns. */
export interface BrainHealthCheckResult {
  state: BrainHealthState;
  message: string;
  details?: Record<string, unknown>;
}

/** A completed health observation for one Brain. */
export interface BrainHealthSnapshot extends BrainHealthCheckResult {
  brainName: string;
  checkedAt: string; // ISO timestamp
  latencyMs: number;
}

/** Standardized Brain metadata. Every Brain in ASH registers exactly this
 *  shape — future Brains (Volume 2+) add themselves without any change to
 *  the registry itself. */
export interface BrainDefinition {
  /** Unique kebab-case registry name (e.g. "executive-brain"). */
  name: string;
  displayName: string;
  purpose: string;
  responsibilities: string[];
  status: BrainStatus;
  /** Semver-style version of the Brain's implementation. */
  version: string;
  /** Owning team/party (platform-owned today; supports future ownership models). */
  owner: string;
  priority: "critical" | "high" | "medium" | "low";
  /** How battle-tested the Brain is in production terms. */
  confidence: "high" | "medium" | "low";
  /** What the Brain consumes (human-readable, from its chapter's Inputs aggregate). */
  inputs: string[];
  /** What the Brain produces (human-readable, from its chapter's Outputs aggregate). */
  outputs: string[];
  /** Names of other Brains and/or external dependencies this Brain relies on. */
  dependencies: string[];
  capabilities: BrainCapability[];
  /** Extension point ids this Brain exposes or expects to consume later. */
  extensionPoints: string[];
  /** Path to the approved architecture chapter governing this Brain. */
  specReference?: string;
  /** Optional cheap health probe (DB reachability, config presence, registry
   *  non-emptiness…). Must resolve quickly; the registry enforces a timeout. */
  checkHealth?: () => Promise<BrainHealthCheckResult>;
}

/** A Brain as stored in the registry. */
export interface RegisteredBrain extends BrainDefinition {
  registeredAt: string; // ISO timestamp
  lastHealth?: BrainHealthSnapshot;
}

/** JSON-safe projection of a RegisteredBrain (probe function stripped). */
export type SerializedBrain = Omit<RegisteredBrain, "checkHealth">;

/** Aggregated health report across every registered Brain — the Executive
 *  Brain's "observe the health of every registered Brain" surface. */
export interface CognitiveHealthReport {
  generatedAt: string;
  /** Worst state observed across all Brains. */
  overall: BrainHealthState;
  counts: Record<BrainHealthState, number>;
  brains: BrainHealthSnapshot[];
}

/** A declared extension point — a named seam future intelligence layers plug
 *  into without modifying existing architecture. */
export interface ExtensionPointDefinition {
  id: string;
  description: string;
  /** Which Brain (or "cognitive-foundation") declared the seam. */
  declaredBy: string;
}

/** A provider registered against an extension point. */
export interface ExtensionRegistration {
  extensionPointId: string;
  /** Registry name of the Brain providing the extension. */
  providerBrain: string;
  description: string;
  /** Optional behavior hook. Untyped by design: the contract between a
   *  future intelligence layer and its consumers is defined by that layer's
   *  own approved chapter, not prematurely here. */
  handler?: (...args: unknown[]) => unknown;
}

/** A capability as stored in the platform-wide capability registry. */
export interface RegisteredCapability extends BrainCapability {
  brainName: string;
  registeredAt: string;
}
