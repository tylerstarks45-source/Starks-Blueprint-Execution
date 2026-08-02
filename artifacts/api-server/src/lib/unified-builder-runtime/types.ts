// ── Build 049: UBRE domain types ──────────────────────────────────────────────

export const UBRE_THROTTLE_CYCLES = 350;

export const UBRE_EP_IDS = {
  SESSION:     "ubre.runtime_session",
  DRAFT:       "ubre.draft_management",
  HISTORY:     "ubre.change_history",
  VALIDATION:  "ubre.validation_pipeline",
  EVENTS:      "ubre.runtime_events",
  RECOVERY:    "ubre.session_recovery",
  DIAGNOSTICS: "ubre.runtime_diagnostics",
  ADVISORY:    "ubre.ash_advisory",
} as const;

// ── Supported builders ────────────────────────────────────────────────────────
export const SUPPORTED_BUILDERS = [
  "website_builder",
  "application_builder",
  "workflow_builder",
  "automation_builder",
  "crm_builder",
  "dashboard_builder",
  "database_builder",
  "ai_agent_builder",
  "knowledge_builder",
  "documentation_builder",
  "future_builder",
] as const;

export type BuilderType = typeof SUPPORTED_BUILDERS[number];

// ── Session states ────────────────────────────────────────────────────────────
export const SESSION_STATES = ["active", "idle", "paused", "ended", "crashed"] as const;
export type SessionState = typeof SESSION_STATES[number];

// ── Draft states ──────────────────────────────────────────────────────────────
export const DRAFT_STATES = ["draft", "autosaved", "previewing", "publishing", "published", "discarded"] as const;
export type DraftState = typeof DRAFT_STATES[number];

// ── Validation types ──────────────────────────────────────────────────────────
export const VALIDATION_TYPES = ["pre_publish", "on_save", "manual", "autosave"] as const;

// ── Operation types (history) ─────────────────────────────────────────────────
export const OPERATION_TYPES = ["add", "remove", "update", "move", "style", "config", "publish"] as const;

// ── Builder event types ───────────────────────────────────────────────────────
export const BUILDER_EVENT_TYPES = [
  "session_started", "session_ended", "draft_saved", "autosaved",
  "validated", "published", "undo", "redo", "lock_acquired", "lock_released",
  "crash_detected", "recovered", "preview_started", "preview_ended",
] as const;

// ── Built-in validation rules ─────────────────────────────────────────────────
export interface ValidationRule {
  ruleId:      string;
  ruleName:    string;
  severity:    "error" | "warning" | "info";
  builderTypes: BuilderType[] | "all";
  check:       (content: Record<string, unknown>) => { pass: boolean; message?: string; path?: string };
}

// ── Summary DTO for EB ────────────────────────────────────────────────────────
export interface UBRESummary {
  activeSessions:       number;
  sessionsWithUnsaved:  number;
  totalDrafts:          number;
  totalHistoryOps:      number;
  activeLocks:          number;
  pendingRecoveries:    number;
  builderBreakdown:     Record<string, number>;
  recentErrors:         number;
  publishReadySessions: number;
  validationPassRate:   number;  // 0-100
  computedAt:           string;
}
