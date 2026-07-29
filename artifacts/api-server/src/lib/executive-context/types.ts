// ─── Executive Context Engine — Types (Build 006) ───────────────────────────
//
// All shared types for the Executive Context Engine. Self-contained: defines
// constants and interfaces directly rather than re-exporting from the DB
// schema, so the application type layer remains decoupled from the persistence
// layer.

// ─── Context type constants ───────────────────────────────────────────────────

export const EXECUTIVE_CONTEXT_TYPES = [
  "operational",   // Day-to-day running context
  "strategic",     // Long-horizon direction-setting context
  "tactical",      // Short-horizon execution context
  "exploratory",   // Discovery / research context
  "investigative", // Problem diagnosis context
] as const;
export type ExecutiveContextType = (typeof EXECUTIVE_CONTEXT_TYPES)[number];

export const EXECUTIVE_CONTEXT_STATUSES = [
  "draft",    // Being built, not yet active
  "active",   // Currently governing reasoning
  "inactive", // Paused, can be reactivated
  "archived", // Closed, preserved for history
] as const;
export type ExecutiveContextStatus = (typeof EXECUTIVE_CONTEXT_STATUSES)[number];

export const CONTEXT_TIMELINE_EVENT_TYPES = [
  "created",
  "updated",
  "priority_changed",
  "constraint_changed",
  "objective_changed",
  "relationship_changed",
  "activated",
  "deactivated",
  "version_changed",
  "archived",
] as const;
export type ContextTimelineEventType = (typeof CONTEXT_TIMELINE_EVENT_TYPES)[number];

export const CONTEXT_ENTITY_TYPES = [
  "project",
  "goal",
  "artifact",
  "cluster",
  "brain",
  "capability",
  "plan",
  "strategy",
  "decision",
  "execution",
] as const;
export type ContextEntityType = (typeof CONTEXT_ENTITY_TYPES)[number];

// ─── Application-layer shapes ─────────────────────────────────────────────────

/** The full Executive Context model as returned by the Context Registry. */
export interface ExecutiveContextModel {
  id: string;
  userId: number | null;
  name: string;
  contextType: string;
  description: string | null;
  purpose: string | null;
  mission: string | null;
  scope: string | null;
  objectives: string[];
  constraints: string[];
  assumptions: string[];
  priorities: string[];
  risks: string[];
  dependencies: string[];
  stakeholders: string[];
  successCriteria: string[];
  failureConditions: string[];
  status: string;
  confidence: string;
  version: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/** Input for creating a new Executive Context. */
export interface CreateContextInput {
  id?: string;
  name: string;
  contextType?: string;
  description?: string;
  purpose?: string;
  mission?: string;
  scope?: string;
  objectives?: string[];
  constraints?: string[];
  assumptions?: string[];
  priorities?: string[];
  risks?: string[];
  dependencies?: string[];
  stakeholders?: string[];
  successCriteria?: string[];
  failureConditions?: string[];
  status?: string;
  confidence?: string;
  metadata?: Record<string, unknown>;
  userId?: number;
}

/** Patch for updating an existing Executive Context. All fields optional. */
export type UpdateContextInput = Partial<Omit<CreateContextInput, "id" | "userId">>;

/** A single entry in the Context Timeline — records one change to a Context. */
export interface ContextTimelineEvent {
  id: string;
  contextId: string;
  eventType: string;
  changedField: string | null;
  oldValue: unknown;
  newValue: unknown;
  reason: string | null;
  triggeredBy: string;
  createdAt: Date;
}

/** A polymorphic link from a Context to an external entity. */
export interface ContextEntityLink {
  id: string;
  contextId: string;
  entityType: string;
  entityId: string;
  relationshipDescription: string | null;
  addedBy: string;
  createdAt: Date;
}

// ─── Context Resolution ───────────────────────────────────────────────────────

/** The immutable snapshot produced by the Context Resolution Engine before
 *  each Executive Brain reasoning cycle. */
export interface ExecutiveContextSnapshot {
  id: string;
  userId: number | null;
  contextIds: string[];
  objectiveText: string | null;
  activeObjectives: string[];
  activeConstraints: string[];
  activePriorities: string[];
  activeRisks: string[];
  relatedArtifactIds: string[];
  relatedClusterIds: string[];
  relatedBrainNames: string[];
  relatedCapabilityIds: string[];
  environmentalMetadata: Record<string, unknown>;
  conflictFlags: string[];
  resolutionStrategy: string | null;
  createdAt: Date;
}

/** The intermediate result produced by the Context Resolution Engine before
 *  it freezes into a snapshot. Used internally only. */
export interface ContextResolutionResult {
  activeContexts: ExecutiveContextModel[];
  relevantContexts: ExecutiveContextModel[];
  conflictingContexts: Array<{ contextA: string; contextB: string; reason: string }>;
  priorityOrder: string[];
  parentContextIds: string[];
  childContextIds: string[];
  snapshot: ExecutiveContextSnapshot;
}

// ─── Context Health / Diagnostics ─────────────────────────────────────────────

/** Per-context diagnostic scores. All values 0–100. */
export interface ContextHealthScore {
  contextId: string;
  name: string;
  completeness: number;
  freshness: number;
  relationshipCoverage: number;
  objectiveCoverage: number;
  constraintCoverage: number;
  versionIntegrity: number;
  overallHealth: number;
}

/** Aggregate diagnostics for a user's full context system. */
export interface ContextDiagnosticsReport {
  userId: number;
  totalContexts: number;
  activeContexts: number;
  draftContexts: number;
  archivedContexts: number;
  snapshotCount: number;
  averageHealth: number;
  contextScores: ContextHealthScore[];
  issues: string[];
  assessedAt: Date;
}

/** Validation result from the Context Registry's validate function. */
export interface ContextValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ─── Context Summary ─────────────────────────────────────────────────────────

/** Rich summary of a context, with counts and preview strings. */
export interface ContextSummary {
  id: string;
  name: string;
  contextType: string;
  status: string;
  confidence: string;
  version: number;
  objectiveCount: number;
  constraintCount: number;
  priorityCount: number;
  riskCount: number;
  entityLinkCount: number;
  snapshotCount: number;
  topObjectives: string[];
  topPriorities: string[];
  topConstraints: string[];
  lastChangedAt: Date;
}

// ─── Extension point types ────────────────────────────────────────────────────

/** A context extension hook handler. */
export type ContextHookHandler<T = unknown> = (payload: T) => Promise<T>;

/** Extension point IDs for the Context Engine. */
export const CONTEXT_EXTENSION_POINT_IDS = {
  PRE_RESOLVE: "context-pre-resolve",
  POST_RESOLVE: "context-post-resolve",
  SNAPSHOT_FROZEN: "context-snapshot-frozen",
  HEALTH_CHECK: "context-health-check",
  CONTEXT_REGISTERED: "context-registered",
  CONTEXT_ARCHIVED: "context-archived",
} as const;
export type ContextExtensionPointId =
  (typeof CONTEXT_EXTENSION_POINT_IDS)[keyof typeof CONTEXT_EXTENSION_POINT_IDS];
