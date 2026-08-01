// ─────────────────────────────────────────────────────────────────────────────
// Build 029: Universal Execution Engine — Database Schema (8 tables)
// Append-only except execution_registry (upserted).
// ─────────────────────────────────────────────────────────────────────────────
import {
  pgTable, text, integer, boolean, timestamp, numeric, jsonb,
} from "drizzle-orm/pg-core";

// Root immutable execution session record.
export const executionSessions = pgTable("execution_sessions", {
  id:                    text("id").primaryKey(),
  businessId:            integer("business_id").notNull(),
  userId:                integer("user_id"),
  workflowId:            text("workflow_id"),
  isWorkflowReady:       boolean("is_workflow_ready").notNull().default(false),
  nodeCount:             integer("node_count").notNull().default(0),
  startedNodeCount:      integer("started_node_count").notNull().default(0),
  completedNodeCount:    integer("completed_node_count").notNull().default(0),
  failedNodeCount:       integer("failed_node_count").notNull().default(0),
  rolledBackNodeCount:   integer("rolled_back_node_count").notNull().default(0),
  status:                text("status").notNull().default("pending"),   // pending|ready|running|waiting|paused|succeeded|failed|rolled_back|cancelled
  durationMs:            integer("duration_ms").notNull().default(0),
  executiveSummary:      text("executive_summary").notNull().default(""),
  createdAt:             timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per workflow node, tracking per-node execution state.
export const executionNodes = pgTable("execution_nodes", {
  id:                       text("id").primaryKey(),
  sessionId:                text("session_id").notNull().references(() => executionSessions.id),
  businessId:               integer("business_id").notNull(),
  workflowId:               text("workflow_id"),
  workflowNodeId:           text("workflow_node_id"),
  nodeTitle:                text("node_title").notNull().default(""),
  nodeType:                 text("node_type").notNull().default("task"),          // task|gate|checkpoint|merge|fork|start|end
  phase:                    text("phase").notNull().default("preparation"),       // preparation|configuration|validation|deployment|verification|completion
  executionClass:           text("execution_class").notNull().default("automated"), // automated|ai_driven|human|external|hybrid
  ownerType:                text("owner_type").notNull().default("automation"),
  sequencePosition:         integer("sequence_position").notNull().default(0),
  isCritical:               boolean("is_critical").notNull().default(false),
  status:                   text("status").notNull().default("pending"),          // pending|ready|running|waiting|paused|succeeded|failed|rolled_back|cancelled
  checkpointPreValidated:   boolean("checkpoint_pre_validated").notNull().default(false),
  checkpointPostValidated:  boolean("checkpoint_post_validated").notNull().default(false),
  durationMs:               integer("duration_ms").notNull().default(0),
  createdAt:                timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Append-only execution event stream — every observable event.
export const executionEvents = pgTable("execution_events", {
  id:               text("id").primaryKey(),
  sessionId:        text("session_id").notNull().references(() => executionSessions.id),
  nodeId:           text("node_id"),   // nullable — session-level events have no node
  businessId:       integer("business_id").notNull(),
  eventType:        text("event_type").notNull(),   // session_started|node_started|node_completed|...
  eventDescription: text("event_description").notNull().default(""),
  eventData:        jsonb("event_data").notNull().default("{}"),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Immutable per-node evidence records.
export const executionEvidence = pgTable("execution_evidence", {
  id:            text("id").primaryKey(),
  sessionId:     text("session_id").notNull().references(() => executionSessions.id),
  nodeId:        text("node_id").notNull().references(() => executionNodes.id),
  businessId:    integer("business_id").notNull(),
  evidenceType:  text("evidence_type").notNull(),   // inputs|outputs|logs|errors|validation_results|execution_metadata
  evidenceData:  jsonb("evidence_data").notNull().default("{}"),
  isError:       boolean("is_error").notNull().default(false),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Execution timeline snapshot — progress at a point in time.
export const executionTimelines = pgTable("execution_timelines", {
  id:                   text("id").primaryKey(),
  sessionId:            text("session_id").notNull().references(() => executionSessions.id),
  businessId:           integer("business_id").notNull(),
  nodeCount:            integer("node_count").notNull().default(0),
  completedCount:       integer("completed_count").notNull().default(0),
  failedCount:          integer("failed_count").notNull().default(0),
  rolledBackCount:      integer("rolled_back_count").notNull().default(0),
  totalDurationMs:      integer("total_duration_ms").notNull().default(0),
  estimatedRemainingMs: integer("estimated_remaining_ms").notNull().default(0),
  progressPct:          numeric("progress_pct", { precision: 5, scale: 4 }).notNull().default("0"),
  timelineData:         jsonb("timeline_data").notNull().default("{}"),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Immutable execution report produced at session completion.
export const ueExecutionReports = pgTable("ue_execution_reports", {
  id:               text("id").primaryKey(),
  sessionId:        text("session_id").notNull().references(() => executionSessions.id),
  businessId:       integer("business_id").notNull(),
  nodeCount:        integer("node_count").notNull().default(0),
  completedCount:   integer("completed_count").notNull().default(0),
  failedCount:      integer("failed_count").notNull().default(0),
  rolledBackCount:  integer("rolled_back_count").notNull().default(0),
  successRate:      numeric("success_rate", { precision: 5, scale: 4 }).notNull().default("0"),
  executionHealth:  text("execution_health").notNull().default("unknown"),   // healthy|degraded|failed|unknown
  durationMs:       integer("duration_ms").notNull().default(0),
  executiveSummary: text("executive_summary").notNull().default(""),
  reportData:       jsonb("report_data").notNull().default("{}"),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per business — upserted at end of each session.
export const executionRegistry = pgTable("execution_registry", {
  id:                   text("id").primaryKey(),
  businessId:           integer("business_id").notNull().unique(),
  latestSessionId:      text("latest_session_id"),
  totalSessions:        integer("total_sessions").notNull().default(0),
  totalNodesExecuted:   integer("total_nodes_executed").notNull().default(0),
  totalNodesFailed:     integer("total_nodes_failed").notNull().default(0),
  totalNodesRolledBack: integer("total_nodes_rolled_back").notNull().default(0),
  successRate:          numeric("success_rate", { precision: 5, scale: 4 }).notNull().default("0"),
  executionHealth:      text("execution_health").notNull().default("unknown"),
  lastExecutionAt:      timestamp("last_execution_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:            timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Point-in-time JSONB snapshot of an execution session.
export const executionSnapshots = pgTable("execution_snapshots", {
  id:           text("id").primaryKey(),
  sessionId:    text("session_id").notNull().references(() => executionSessions.id),
  businessId:   integer("business_id").notNull(),
  userId:       integer("user_id"),
  snapshotData: jsonb("snapshot_data").notNull().default("{}"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
