// ─────────────────────────────────────────────────────────────────────────────
// Build 030: Universal Execution Adapter Framework — Database Schema (9 tables)
// Append-only except adapter_registry (upserted).
// ─────────────────────────────────────────────────────────────────────────────
import {
  pgTable, text, integer, boolean, timestamp, numeric, jsonb,
} from "drizzle-orm/pg-core";

// Core adapter definition — one row per installed adapter.
export const executionAdapters = pgTable("execution_adapters", {
  id:             text("id").primaryKey(),
  name:           text("name").notNull(),
  adapterType:    text("adapter_type").notNull(),   // browser|desktop|filesystem|terminal|api|rest|graphql|database|git|github|gitlab|cloud|aws|azure|google_cloud|cloudflare|docker|kubernetes|cicd|stripe|paypal|quickbooks|shopify|woocommerce|wordpress|notion|slack|discord|email|sms|llms|search|calendar|crm|marketing|analytics|storage|identity|custom
  version:        text("version").notNull().default("1.0.0"),
  description:    text("description").notNull().default(""),
  status:         text("status").notNull().default("pending"),   // pending|enabled|disabled|deprecated|retired
  sandboxEnabled: boolean("sandbox_enabled").notNull().default(true),
  isBuiltin:      boolean("is_builtin").notNull().default(false),
  manifest:       jsonb("manifest").notNull().default("{}"),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per adapter_type — upserted after each install/update.
export const adapterRegistry = pgTable("adapter_registry", {
  id:                text("id").primaryKey(),
  adapterType:       text("adapter_type").notNull().unique(),
  adapterId:         text("adapter_id"),          // latest adapter id for this type
  totalInstalled:    integer("total_installed").notNull().default(0),
  totalEnabled:      integer("total_enabled").notNull().default(0),
  health:            text("health").notNull().default("unknown"),     // healthy|degraded|failed|unknown
  capabilityCount:   integer("capability_count").notNull().default(0),
  lastHealthCheckAt: timestamp("last_health_check_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt:         timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:         timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Declared capabilities per adapter — what actions/resources/APIs the adapter supports.
export const adapterCapabilities = pgTable("adapter_capabilities", {
  id:           text("id").primaryKey(),
  adapterId:    text("adapter_id").notNull().references(() => executionAdapters.id),
  capabilityKey: text("capability_key").notNull(),
  actionType:   text("action_type").notNull().default(""),    // read|write|execute|create|update|delete|search|notify
  resourceType: text("resource_type").notNull().default(""),
  platform:     text("platform").notNull().default(""),
  api:          text("api").notNull().default(""),
  description:  text("description").notNull().default(""),
  isEnabled:    boolean("is_enabled").notNull().default(true),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Required permissions declared by each adapter.
export const adapterPermissions = pgTable("adapter_permissions", {
  id:              text("id").primaryKey(),
  adapterId:       text("adapter_id").notNull().references(() => executionAdapters.id),
  permissionKey:   text("permission_key").notNull(),
  permissionLevel: text("permission_level").notNull().default("read"),  // read|write|execute|admin
  resourceType:    text("resource_type").notNull().default(""),
  isRequired:      boolean("is_required").notNull().default(true),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Health check records — append-only per adapter.
export const adapterHealth = pgTable("adapter_health", {
  id:           text("id").primaryKey(),
  adapterId:    text("adapter_id").notNull().references(() => executionAdapters.id),
  healthStatus: text("health_status").notNull().default("unknown"),  // healthy|degraded|failed|unknown
  latencyMs:    integer("latency_ms").notNull().default(0),
  errorMessage: text("error_message").notNull().default(""),
  checkData:    jsonb("check_data").notNull().default("{}"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Version history — append-only.
export const adapterVersions = pgTable("adapter_versions", {
  id:              text("id").primaryKey(),
  adapterId:       text("adapter_id").notNull().references(() => executionAdapters.id),
  version:         text("version").notNull(),
  previousVersion: text("previous_version").notNull().default(""),
  changelog:       text("changelog").notNull().default(""),
  isCurrent:       boolean("is_current").notNull().default(true),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Typed execution contracts — input/output/error schemas per adapter.
export const adapterContracts = pgTable("adapter_contracts", {
  id:           text("id").primaryKey(),
  adapterId:    text("adapter_id").notNull().references(() => executionAdapters.id),
  contractType: text("contract_type").notNull().default("execution"),  // execution|rollback|health_check|capability_discovery
  inputSchema:  jsonb("input_schema").notNull().default("{}"),
  outputSchema: jsonb("output_schema").notNull().default("{}"),
  errorSchema:  jsonb("error_schema").notNull().default("{}"),
  isActive:     boolean("is_active").notNull().default(true),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Per-execution telemetry — append-only.
export const adapterTelemetry = pgTable("adapter_telemetry", {
  id:              text("id").primaryKey(),
  adapterId:       text("adapter_id").notNull().references(() => executionAdapters.id),
  sessionId:       text("session_id"),           // nullable — telemetry can be unlinked to a session
  executionClass:  text("execution_class").notNull().default("automated"),
  actionType:      text("action_type").notNull().default(""),
  latencyMs:       integer("latency_ms").notNull().default(0),
  success:         boolean("success").notNull().default(true),
  retryCount:      integer("retry_count").notNull().default(0),
  errorType:       text("error_type").notNull().default(""),
  capabilityKey:   text("capability_key").notNull().default(""),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Adapter execution sessions — one per adapter invocation.
export const adapterSessions = pgTable("adapter_sessions", {
  id:                 text("id").primaryKey(),
  adapterId:          text("adapter_id").notNull().references(() => executionAdapters.id),
  executionSessionId: text("execution_session_id"),   // nullable — links to universal execution session
  status:             text("status").notNull().default("pending"),  // pending|running|succeeded|failed|cancelled
  durationMs:         integer("duration_ms").notNull().default(0),
  resultSummary:      text("result_summary").notNull().default(""),
  createdAt:          timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
