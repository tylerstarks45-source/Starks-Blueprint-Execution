// ── Build 049: Unified Builder Runtime Engine (UBRE) ─────────────────────────
import {
  pgTable, serial, integer, text, boolean, timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

// ── 1. builder_sessions ───────────────────────────────────────────────────────
// One row per active editing session. Mutable status; append-only otherwise.
export const builderSessions = pgTable("builder_sessions", {
  id:              serial("id").primaryKey(),
  userId:          integer("user_id").notNull(),
  builderType:     text("builder_type").notNull(),           // website_builder|crm_builder|…
  assetId:         integer("asset_id"),                      // FK → canonical_assets.id (UBAF)
  projectId:       integer("project_id"),                    // FK → business_projects.id (UWPS)
  businessId:      integer("business_id"),
  sessionState:    text("session_state").notNull().default("active"), // active|idle|paused|ended|crashed
  draftId:         integer("draft_id"),                      // current working draft
  hasUnsavedWork:  boolean("has_unsaved_work").notNull().default(false),
  autosaveEnabled: boolean("autosave_enabled").notNull().default(true),
  autosaveIntervalMs: integer("autosave_interval_ms").notNull().default(30000),
  lastAutosaveAt:  timestamp("last_autosave_at"),
  lastActivityAt:  timestamp("last_activity_at").notNull().defaultNow(),
  metadata:        jsonb("metadata").notNull().default("{}"),
  startedAt:       timestamp("started_at").notNull().defaultNow(),
  endedAt:         timestamp("ended_at"),
}, (t) => [
  index("idx_builder_sessions_user").on(t.userId),
  index("idx_builder_sessions_type").on(t.builderType),
  index("idx_builder_sessions_state").on(t.sessionState),
  index("idx_builder_sessions_asset").on(t.assetId),
  index("idx_builder_sessions_started").on(t.startedAt),
]);

// ── 2. builder_drafts ─────────────────────────────────────────────────────────
// Append-only immutable draft revisions.
export const builderDrafts = pgTable("builder_drafts", {
  id:              serial("id").primaryKey(),
  sessionId:       integer("session_id").notNull(),
  userId:          integer("user_id").notNull(),
  builderType:     text("builder_type").notNull(),
  assetId:         integer("asset_id"),
  draftVersion:    integer("draft_version").notNull().default(1),
  draftState:      text("draft_state").notNull().default("draft"), // draft|autosaved|previewing|publishing|published|discarded
  content:         jsonb("content").notNull().default("{}"),        // full builder content snapshot
  contentChecksum: text("content_checksum"),
  changesSummary:  text("changes_summary"),                        // human-readable description
  isAutosave:      boolean("is_autosave").notNull().default(false),
  isPublished:     boolean("is_published").notNull().default(false),
  publishedAt:     timestamp("published_at"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("idx_builder_drafts_session").on(t.sessionId),
  index("idx_builder_drafts_user").on(t.userId),
  index("idx_builder_drafts_asset").on(t.assetId),
  index("idx_builder_drafts_state").on(t.draftState),
  index("idx_builder_drafts_created").on(t.createdAt),
]);

// ── 3. builder_history ────────────────────────────────────────────────────────
// Append-only undo/redo operation chain.
export const builderHistory = pgTable("builder_history", {
  id:              serial("id").primaryKey(),
  sessionId:       integer("session_id").notNull(),
  userId:          integer("user_id").notNull(),
  builderType:     text("builder_type").notNull(),
  sequenceNumber:  integer("sequence_number").notNull(),             // monotonic per session
  operationType:   text("operation_type").notNull(),                 // add|remove|update|move|style|config|publish
  operationLabel:  text("operation_label").notNull(),               // human-readable "Changed headline text"
  targetPath:      text("target_path"),                             // JSON path of the modified element
  beforeState:     jsonb("before_state").notNull().default("{}"),   // full before snapshot (for undo)
  afterState:      jsonb("after_state").notNull().default("{}"),    // full after snapshot (for redo)
  isUndone:        boolean("is_undone").notNull().default(false),
  isRedone:        boolean("is_redone").notNull().default(false),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("idx_builder_history_session").on(t.sessionId),
  index("idx_builder_history_user").on(t.userId),
  index("idx_builder_history_seq").on(t.sessionId, t.sequenceNumber),
  index("idx_builder_history_created").on(t.createdAt),
]);

// ── 4. builder_events ─────────────────────────────────────────────────────────
// Append-only builder lifecycle events.
export const builderEvents = pgTable("builder_events", {
  id:              serial("id").primaryKey(),
  sessionId:       integer("session_id").notNull(),
  userId:          integer("user_id").notNull(),
  builderType:     text("builder_type").notNull(),
  eventType:       text("event_type").notNull(),     // session_started|session_ended|draft_saved|autosaved|validated|published|undo|redo|lock_acquired|lock_released|crash_detected|recovered
  severity:        text("severity").notNull().default("info"), // info|warn|error|critical
  summary:         text("summary").notNull(),
  details:         jsonb("details").notNull().default("{}"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("idx_builder_events_session").on(t.sessionId),
  index("idx_builder_events_user").on(t.userId),
  index("idx_builder_events_type").on(t.eventType),
  index("idx_builder_events_severity").on(t.severity),
  index("idx_builder_events_created").on(t.createdAt),
]);

// ── 5. builder_validation ─────────────────────────────────────────────────────
// Append-only validation results per draft/publish attempt.
export const builderValidation = pgTable("builder_validation", {
  id:              serial("id").primaryKey(),
  sessionId:       integer("session_id").notNull(),
  userId:          integer("user_id").notNull(),
  builderType:     text("builder_type").notNull(),
  draftId:         integer("draft_id"),
  validationType:  text("validation_type").notNull(), // pre_publish|on_save|manual|autosave
  overallStatus:   text("overall_status").notNull(),  // pass|warn|fail
  errorCount:      integer("error_count").notNull().default(0),
  warningCount:    integer("warning_count").notNull().default(0),
  results:         jsonb("results").notNull().default("[]"), // [{ rule, status, message, path, severity }]
  isPublishBlocked: boolean("is_publish_blocked").notNull().default(false),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("idx_builder_validation_session").on(t.sessionId),
  index("idx_builder_validation_user").on(t.userId),
  index("idx_builder_validation_type").on(t.validationType),
  index("idx_builder_validation_status").on(t.overallStatus),
]);

// ── 6. builder_locks ──────────────────────────────────────────────────────────
// Collaborative editing locks — append-only (new row = new lock).
export const builderLocks = pgTable("builder_locks", {
  id:              serial("id").primaryKey(),
  userId:          integer("user_id").notNull(),
  builderType:     text("builder_type").notNull(),
  assetId:         integer("asset_id"),
  elementPath:     text("element_path"),                    // JSON path of locked element (null = whole asset)
  lockType:        text("lock_type").notNull().default("exclusive"), // exclusive|shared
  sessionId:       integer("session_id").notNull(),
  isActive:        boolean("is_active").notNull().default(true),
  expiresAt:       timestamp("expires_at"),
  acquiredAt:      timestamp("acquired_at").notNull().defaultNow(),
  releasedAt:      timestamp("released_at"),
}, (t) => [
  index("idx_builder_locks_user").on(t.userId),
  index("idx_builder_locks_asset").on(t.assetId),
  index("idx_builder_locks_session").on(t.sessionId),
  index("idx_builder_locks_active").on(t.isActive),
]);

// ── 7. runtime_registry (mutable) ────────────────────────────────────────────
// One mutable aggregate row per builder session. Upserted on every state change.
export const runtimeRegistry = pgTable("runtime_registry", {
  id:              serial("id").primaryKey(),
  sessionId:       integer("session_id").notNull().unique(),
  userId:          integer("user_id").notNull(),
  builderType:     text("builder_type").notNull(),
  assetId:         integer("asset_id"),
  sessionState:    text("session_state").notNull().default("active"),
  currentDraftId:  integer("current_draft_id"),
  currentDraftVersion: integer("current_draft_version").notNull().default(1),
  historyLength:   integer("history_length").notNull().default(0),
  undoPointer:     integer("undo_pointer").notNull().default(0), // current position in history chain
  hasUnsavedWork:  boolean("has_unsaved_work").notNull().default(false),
  isPublishReady:  boolean("is_publish_ready").notNull().default(false),
  lastValidationStatus: text("last_validation_status"),
  lastValidatedAt: timestamp("last_validated_at"),
  lastAutosaveAt:  timestamp("last_autosave_at"),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("idx_runtime_registry_user").on(t.userId),
  index("idx_runtime_registry_type").on(t.builderType),
  index("idx_runtime_registry_state").on(t.sessionState),
]);

// ── 8. runtime_snapshots ──────────────────────────────────────────────────────
// Platform-wide runtime state snapshots (append-only).
export const runtimeSnapshots = pgTable("runtime_snapshots", {
  id:                   serial("id").primaryKey(),
  activeSessions:       integer("active_sessions").notNull().default(0),
  totalSessions:        integer("total_sessions").notNull().default(0),
  totalDrafts:          integer("total_drafts").notNull().default(0),
  totalHistoryOps:      integer("total_history_ops").notNull().default(0),
  totalEvents:          integer("total_events").notNull().default(0),
  activeLocks:          integer("active_locks").notNull().default(0),
  builderBreakdown:     jsonb("builder_breakdown").notNull().default("{}"),  // { builderType: count }
  validationPassRate:   integer("validation_pass_rate").notNull().default(100), // 0-100
  recoveryCount:        integer("recovery_count").notNull().default(0),
  crashCount:           integer("crash_count").notNull().default(0),
  lawApplied:           boolean("law_applied").notNull().default(true),
  snapshotData:         jsonb("snapshot_data").notNull().default("{}"),
  createdAt:            timestamp("created_at").notNull().defaultNow(),
});

// ── 9. ubre_diagnostics ───────────────────────────────────────────────────
// Diagnostic entries for builder health monitoring (append-only).
export const ubreDiagnostics = pgTable("ubre_diagnostics", {
  id:              serial("id").primaryKey(),
  sessionId:       integer("session_id"),
  userId:          integer("user_id"),
  builderType:     text("builder_type"),
  diagnosticType:  text("diagnostic_type").notNull(), // health_check|performance|error|crash|memory|latency
  severity:        text("severity").notNull().default("info"), // info|warn|error|critical
  title:           text("title").notNull(),
  details:         jsonb("details").notNull().default("{}"),
  resolvedAt:      timestamp("resolved_at"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("idx_ubre_diagnostics_session").on(t.sessionId),
  index("idx_ubre_diagnostics_type").on(t.diagnosticType),
  index("idx_ubre_diagnostics_severity").on(t.severity),
  index("idx_ubre_diagnostics_created").on(t.createdAt),
]);

// ── 10. builder_recovery ──────────────────────────────────────────────────────
// Recovery state for interrupted or crashed builder sessions (append-only).
export const builderRecovery = pgTable("builder_recovery", {
  id:              serial("id").primaryKey(),
  originalSessionId: integer("original_session_id").notNull(),
  userId:          integer("user_id").notNull(),
  builderType:     text("builder_type").notNull(),
  assetId:         integer("asset_id"),
  recoveryState:   text("recovery_state").notNull().default("pending"), // pending|in_progress|completed|failed|dismissed
  lastGoodDraftId: integer("last_good_draft_id"),
  recoveredContent: jsonb("recovered_content").notNull().default("{}"),
  crashReason:     text("crash_reason"),
  recoveryNotes:   text("recovery_notes"),
  recoveredAt:     timestamp("recovered_at"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("idx_builder_recovery_user").on(t.userId),
  index("idx_builder_recovery_session").on(t.originalSessionId),
  index("idx_builder_recovery_state").on(t.recoveryState),
]);
