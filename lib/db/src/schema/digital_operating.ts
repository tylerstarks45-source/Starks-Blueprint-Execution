// ── Build 043: Unified Digital Operating Layer — Schema ───────────────────
import { pgTable, serial, integer, text, real, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

// ── digital_workspaces ────────────────────────────────────────────────────
// Managed operating environment containers — one per user/domain combination.
export const digitalWorkspaces = pgTable("digital_workspaces", {
  id:            serial("id").primaryKey(),
  userId:        integer("user_id"),
  workspaceName: text("workspace_name").notNull(),
  domain:        text("domain").notNull(),       // OperatingDomain
  status:        text("status").notNull().default("active"), // active/inactive/suspended
  configuration: jsonb("configuration").notNull().default({}),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

// ── dol_execution_sessions ────────────────────────────────────────────────
// Managed execution session — scoped to a workspace, tracks full lifecycle.
export const dolExecutionSessions = pgTable("dol_execution_sessions", {
  id:           serial("id").primaryKey(),
  workspaceId:  integer("workspace_id"),
  userId:       integer("user_id"),
  sessionType:  text("session_type").notNull(), // ExecutionChannelType
  status:       text("status").notNull().default("created"), // created/active/completed/expired/failed
  authorityRef: text("authority_ref"),           // reference into authority_resolution tables
  startedAt:    timestamp("started_at").notNull().defaultNow(),
  expiresAt:    timestamp("expires_at"),
  completedAt:  timestamp("completed_at"),
  metadata:     jsonb("metadata").notNull().default({}),
});

// ── environment_profiles ──────────────────────────────────────────────────
// Discovered operating environments — append-only, never escalates privileges.
export const environmentProfiles = pgTable("environment_profiles", {
  id:               serial("id").primaryKey(),
  domain:           text("domain").notNull(),
  environmentName:  text("environment_name").notNull(),
  environmentType:  text("environment_type").notNull(),
  discovered:       boolean("discovered").notNull().default(false),
  available:        boolean("available").notNull().default(false),
  configuration:    jsonb("configuration").notNull().default({}),
  lastDiscoveredAt: timestamp("last_discovered_at"),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

// ── capability_bindings ───────────────────────────────────────────────────
// Maps an approved capability to an authorized execution channel in a session.
export const capabilityBindings = pgTable("capability_bindings", {
  id:           serial("id").primaryKey(),
  sessionId:    integer("session_id").notNull(),
  capabilityId: text("capability_id").notNull(),
  channelType:  text("channel_type").notNull(),
  bound:        boolean("bound").notNull().default(false),
  authorizedAt: timestamp("authorized_at"),
  expiresAt:    timestamp("expires_at"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

// ── execution_channels ────────────────────────────────────────────────────
// Standardized runtime channels (desktop/browser/filesystem/terminal/cloud/api/database).
export const executionChannels = pgTable("execution_channels", {
  id:          serial("id").primaryKey(),
  channelType: text("channel_type").notNull(), // ExecutionChannelType
  domain:      text("domain").notNull(),
  status:      text("status").notNull().default("ready"), // ready/busy/error/closed
  sessionId:   integer("session_id"),
  metadata:    jsonb("metadata").notNull().default({}),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ── execution_receipts ────────────────────────────────────────────────────
// Immutable audit record for every external operation performed by ASH.
export const executionReceipts = pgTable("execution_receipts", {
  id:                  serial("id").primaryKey(),
  sessionId:           integer("session_id").notNull(),
  channelType:         text("channel_type").notNull(),
  requestedOperation:  text("requested_operation").notNull(),
  authorizedOperation: text("authorized_operation").notNull(),
  actualOperation:     text("actual_operation").notNull(),
  startedAt:           timestamp("started_at").notNull(),
  completedAt:         timestamp("completed_at"),
  durationMs:          integer("duration_ms"),
  result:              text("result").notNull().default("success"), // success/failure/partial
  evidence:            jsonb("evidence").notNull().default({}),
  rollbackRef:         text("rollback_ref"),
  authorityRef:        text("authority_ref").notNull(),
  createdAt:           timestamp("created_at").notNull().defaultNow(),
});

// ── runtime_diagnostics ───────────────────────────────────────────────────
// Per-session/channel health measurements — append-only.
export const runtimeDiagnostics = pgTable("runtime_diagnostics", {
  id:                  serial("id").primaryKey(),
  sessionId:           integer("session_id"),
  channelType:         text("channel_type").notNull(),
  availability:        real("availability").notNull().default(1.0),
  latencyMs:           integer("latency_ms").notNull().default(0),
  reliability:         real("reliability").notNull().default(1.0),
  sessionHealth:       text("session_health").notNull().default("healthy"),
  connectorHealth:     text("connector_health").notNull().default("healthy"),
  resourceUtilization: real("resource_utilization").notNull().default(0),
  throughput:          integer("throughput").notNull().default(0),
  measuredAt:          timestamp("measured_at").notNull().defaultNow(),
});

// ── operating_registry ────────────────────────────────────────────────────
// Mutable registry of operating domains contributing to the operating layer.
export const operatingRegistry = pgTable("operating_registry", {
  id:           serial("id").primaryKey(),
  domain:       text("domain").notNull().unique(),
  channelTypes: jsonb("channel_types").notNull().default([]),
  sessionCount: integer("session_count").notNull().default(0),
  lastActive:   timestamp("last_active"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

// ── operating_snapshots ───────────────────────────────────────────────────
// Point-in-time snapshot of the full operating layer state.
export const operatingSnapshots = pgTable("operating_snapshots", {
  id:               serial("id").primaryKey(),
  userId:           integer("user_id"),
  activeWorkspaces: integer("active_workspaces").notNull().default(0),
  activeSessions:   integer("active_sessions").notNull().default(0),
  totalChannels:    integer("total_channels").notNull().default(0),
  totalReceipts:    integer("total_receipts").notNull().default(0),
  avgLatencyMs:     integer("avg_latency_ms").notNull().default(0),
  overallHealth:    text("overall_health").notNull().default("healthy"),
  lawApplied:       boolean("law_applied").notNull().default(true),
  snapshotData:     jsonb("snapshot_data").notNull().default({}),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});
