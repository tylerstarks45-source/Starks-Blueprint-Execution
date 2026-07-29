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

// ─── Brain Runtime State (Build 002) ─────────────────────────────────────────

/** Unified runtime state model. Operational states (idle/busy/waiting/
 *  blocked/recovering/learning) are driven by the orchestration layer.
 *  Infrastructure health states (healthy/warning/degraded/offline) are
 *  driven by the Build 001 health probe system and take precedence when
 *  the orchestration layer has not explicitly set an operational state. */
export const BRAIN_RUNTIME_STATES = [
  "idle",       // Registered and available, not currently processing
  "busy",       // Actively processing a request or task
  "waiting",    // Blocked on input from another Brain or external resource
  "blocked",    // Cannot proceed due to an unresolved dependency
  "recovering", // Returning to health after a degraded/offline episode
  "healthy",    // Infrastructure confirmed healthy (mirrors health probe)
  "warning",    // Infrastructure warning (mirrors health probe)
  "degraded",   // Infrastructure degraded (mirrors health probe)
  "offline",    // Unreachable or failed health probe (mirrors health probe)
  "learning",   // Actively incorporating new knowledge or lessons
] as const;
export type BrainRuntimeState = (typeof BRAIN_RUNTIME_STATES)[number];

/** A point-in-time operational status snapshot for one Brain. */
export interface BrainRuntimeStatus {
  brainName: string;
  runtimeState: BrainRuntimeState;
  /** ISO timestamp when the current state began. */
  since: string;
  /** Optional free-form context note for the current state. */
  note?: string;
}

// ─── Collaboration Plan (Build 002) ──────────────────────────────────────────

/** Orchestration metadata describing how multiple Brains collaborate to
 *  address an objective. Describes execution order, dependencies, required
 *  capabilities, and expected outputs.
 *  NOT an execution plan — actual execution flows through existing subsystems
 *  unchanged. This is reasoning about cognitive resources only. */
export interface CollaborationPlan {
  /** The objective this plan addresses. */
  objective: string;
  /** Registry names of the Brains selected for this objective. */
  participatingBrains: string[];
  /** Topologically-sorted execution order (dependencies before dependents). */
  executionOrder: string[];
  /** Brain dependency graph, restricted to the participating Brains. */
  dependencies: Record<string, string[]>;
  /** Capability ids from participating Brains relevant to the objective. */
  requiredCapabilities: string[];
  /** Human-readable expected outputs from participating Brains. */
  expectedOutputs: string[];
  /** ISO timestamp when this plan was built. */
  builtAt: string;

  // ── Extension-point stubs (declared; NOT implemented) ────────────────────
  // These fields reserve schema space for future orchestration capabilities.
  // Callers MUST treat absent fields as equivalent to the noted defaults.

  /** FUTURE (parallel-reasoning extension point): Groups of Brains that
   *  can execute concurrently. Absent until the seam is implemented. */
  parallelGroups?: string[][];
  /** FUTURE (conflict-resolution extension point): Strategy for resolving
   *  contradictions between Brain outputs. Absent until implemented. */
  conflictResolution?: "last-wins" | "first-wins" | "vote";
  /** FUTURE (confidence-aggregation extension point): Minimum aggregate
   *  confidence threshold for routing. Absent until implemented. */
  confidenceThreshold?: number;
  /** FUTURE (reasoning-chains extension point): Ordered steps linking
   *  Brain outputs into a reasoned conclusion. Absent until implemented. */
  reasoningChain?: Array<{ step: number; brain: string; produces: string }>;
}

// ─── Orchestration Request / Result (Build 002) ───────────────────────────────

export interface OrchestrationRequest {
  /** The objective to orchestrate around (natural-language description). */
  objective: string;
  /** Optional capability id hints to bias selection toward specific Brains. */
  hints?: string[];
  /** Brain names to exclude from selection (e.g. explicitly unavailable). */
  excludeBrains?: string[];
  /** Brain names that must be included regardless of score. */
  requireBrains?: string[];
}

/** Confidence in a Brain selection result.
 *  EXTENSION POINT: confidence-aggregation replaces the heuristic in future. */
export type OrchestrationConfidence = "high" | "medium" | "low" | "unknown";

export interface OrchestrationResult {
  request: OrchestrationRequest;
  selectedBrains: string[];
  collaborationPlan: CollaborationPlan;
  /** Map of relevant capability id → owning Brain name. */
  capabilityMap: Record<string, string>;
  /** Heuristic confidence in the selection result.
   *  EXTENSION POINT: future confidence-scoring layers replace this value. */
  confidence: OrchestrationConfidence;
  orchestratedAt: string;
}

/** Result of the Brain-selection step alone (without a full collaboration plan). */
export interface BrainSelectionResult {
  selectedBrains: string[];
  /** Raw scores per Brain name (higher = more relevant). */
  scores: Record<string, number>;
  confidence: OrchestrationConfidence;
  /** Which strategy produced the selection.
   *  EXTENSION POINT: adaptive-routing adds more strategies in future. */
  selectionBasis: "registry-metadata";
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── Executive Reasoning Pipeline (Build 003) ────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

/** The six structured reasoning stages the Executive Brain runs before
 *  making an orchestration decision. Each stage produces a typed output
 *  that feeds the next stage and ultimately shapes the Decision Record. */
export const REASONING_STAGE_IDS = [
  "goal-understanding",
  "context-analysis",
  "requirement-extraction",
  "constraint-identification",
  "risk-identification",
  "success-criteria",
] as const;
export type ReasoningStageId = (typeof REASONING_STAGE_IDS)[number];

/** Output of a single reasoning stage. The `output` field is typed per stage
 *  in reasoning.ts; typed as `unknown` here to keep types.ts free of stage
 *  internals and avoid deep coupling. */
export interface ReasoningStageResult {
  stageId: ReasoningStageId;
  /** Structured output for this stage (see reasoning.ts for the per-stage schema). */
  output: unknown;
  durationMs: number;
  confidence: OrchestrationConfidence;
}

// ─── Objective Analysis (Build 003) ──────────────────────────────────────────

/** Structured internal representation of an objective after the reasoning
 *  pipeline has processed it. Stored as reasoning metadata alongside the
 *  Decision Record for future learning layers. */
export interface ObjectiveAnalysis {
  primaryGoal: string;
  secondaryGoals: string[];
  knownConstraints: string[];
  unknownInformation: string[];
  requiredKnowledge: string[];
  expectedOutcome: string;
  priority: "critical" | "high" | "medium" | "low";
  complexity: "high" | "medium" | "low";
  /** Per-dimension confidence breakdown (Build 003 extended model). */
  confidence: ExtendedConfidence;
}

// ─── Extended Confidence Framework (Build 003) ───────────────────────────────

/** Four-dimensional confidence model. Separates confidence in the reasoning
 *  process itself from confidence in capability and Brain selection outcomes.
 *  Each dimension is computed by a transparent heuristic; none are AI scores.
 *  EXTENSION POINT: confidence-aggregation replaces individual dimensions. */
export interface ExtendedConfidence {
  /** How clearly the reasoning pipeline understood the objective. */
  reasoning: OrchestrationConfidence;
  /** How well the matched capabilities cover the objective's requirements. */
  capability: OrchestrationConfidence;
  /** How relevant the selected Brains are (from Build 002 selection score). */
  brainSelection: OrchestrationConfidence;
  /** Worst-of the three dimensions — the overall decision confidence. */
  overall: OrchestrationConfidence;
}

// ─── Decision Record (Build 003) ─────────────────────────────────────────────

/** An immutable record of a major Executive Brain decision. Designed for
 *  future learning: the reflection hooks use these records to evaluate
 *  decision quality after-the-fact. Stored in an in-process ring buffer;
 *  future builds can persist this to a database. */
export interface DecisionRecord {
  /** UUID-style id for deduplication and future cross-reference. */
  id: string;
  /** One-sentence description of the decision made. */
  decision: string;
  /** Why this decision was made (derived from reasoning stages, not hardcoded). */
  reason: string;
  /** Key context facts that supported the decision. */
  supportingContext: string[];
  brainsSelected: string[];
  capabilitiesUsed: string[];
  confidence: ExtendedConfidence;
  timestamp: string;
  /** The reasoning pipeline output this record was derived from. */
  objectiveAnalysis: ObjectiveAnalysis;
}

// ─── Cognitive Reasoning Graph (Build 003) ───────────────────────────────────

/** Node kinds in the reasoning graph. */
export type ReasoningNodeKind =
  | "objective"     // The input objective — always the root node
  | "reasoning-stage" // One node per pipeline stage
  | "brain"         // A selected Brain
  | "capability"    // A resolved capability
  | "constraint"    // An identified constraint or risk
  | "decision";     // The final decision — always the leaf node

export interface ReasoningNode {
  id: string;
  kind: ReasoningNodeKind;
  label: string;
  /** Arbitrary stage-specific data — callers treat as read-only metadata. */
  data?: Record<string, unknown>;
}

export interface ReasoningEdge {
  from: string;
  to: string;
  /** Human-readable relationship label (e.g. "informs", "selects", "resolves"). */
  relationship: string;
}

/** The internal reasoning graph built by the Executive Brain for each request.
 *  Designed to remain internal and be prepared for future visualization:
 *  nodes and edges are already in a format suitable for D3/Cytoscape rendering.
 *
 *  EXTENSION POINT: a future visualization layer consumes this graph via the
 *  `GET /executive-brain/reasoning/graph/:decisionId` endpoint. */
export interface CognitiveReasoningGraph {
  /** The input objective — also the label of the root node. */
  objective: string;
  nodes: ReasoningNode[];
  edges: ReasoningEdge[];
  /** Brain names in execution order. */
  selectedBrains: string[];
  /** Capability resolution map from Build 002 orchestration. */
  capabilityResolution: Record<string, string>;
  /** One-sentence final decision extracted from the Decision Record. */
  finalDecision: string;
  builtAt: string;
}

// ─── Reflection Hooks (Build 003) ────────────────────────────────────────────

/** The four reflection questions the architecture prepares for future
 *  self-reflection. Each maps to a declared extension point. */
export const REFLECTION_QUESTION_IDS = [
  "reflection-decision-success",
  "reflection-better-sequence",
  "reflection-confidence-accuracy",
  "reflection-objective-satisfaction",
] as const;
export type ReflectionQuestionId = (typeof REFLECTION_QUESTION_IDS)[number];

/** A reflection hook registration. Future self-reflection systems register a
 *  handler; the Executive Brain calls all registered handlers after a request
 *  completes and the outcome is known. NOT called synchronously on the request
 *  path — always fire-and-forget. */
export interface ReflectionHook {
  questionId: ReflectionQuestionId;
  /** Registry name of the Brain (or system) providing the reflection. */
  providerBrain: string;
  /** Free-text description of what this hook evaluates. */
  description: string;
  /** Optional async callback. Receives the Decision Record and may emit
   *  lessons to the Self-Improving Brain's lesson store. Never awaited
   *  on the hot path. */
  handler?: (record: DecisionRecord) => Promise<void>;
}

// ─── Executive Reasoning Result (Build 003) ──────────────────────────────────

/** The complete output of a full Executive Reasoning Pipeline pass.
 *  Produced per-request by runReasoningPipeline() and attached to the
 *  ExecutiveBrainResult so downstream consumers (context note, API endpoints)
 *  have full access to the structured reasoning data. */
export interface ExecutiveReasoningResult {
  objectiveAnalysis: ObjectiveAnalysis;
  decisionRecord: DecisionRecord;
  reasoningGraph: CognitiveReasoningGraph;
  /** Human-readable explanation derived from structured data — never hardcoded. */
  explanation: string;
  pipelineStages: ReasoningStageResult[];
  reasonedAt: string;
}
