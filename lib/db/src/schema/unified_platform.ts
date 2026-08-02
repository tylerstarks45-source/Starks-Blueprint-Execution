// ── Build 046: Unified Platform Operating System (UPOS) — Schema ─────────────
// Append-only except platform_registry (upserted) and platform_context (upserted per user).
import { pgTable, serial, integer, text, real, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

// ── platform_workspaces ───────────────────────────────────────────────────────
// A managed environment container scoped to a user — the top-level grouping object.
export const platformWorkspaces = pgTable("platform_workspaces", {
  id:            serial("id").primaryKey(),
  userId:        integer("user_id").notNull(),
  workspaceName: text("workspace_name").notNull(),
  workspaceType: text("workspace_type").notNull().default("personal"),   // personal/team/organization
  status:        text("status").notNull().default("active"),             // active/archived/suspended
  configuration: jsonb("configuration").notNull().default({}),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
});

// ── platform_projects ─────────────────────────────────────────────────────────
// A unit of work inside a workspace — scoped to a user + workspace + application.
export const platformProjects = pgTable("platform_projects", {
  id:          serial("id").primaryKey(),
  userId:      integer("user_id").notNull(),
  workspaceId: integer("workspace_id").notNull(),
  appId:       text("app_id"),                          // the application this project lives in
  projectName: text("project_name").notNull(),
  projectType: text("project_type").notNull(),           // website/crm/automation/dashboard/custom
  status:      text("status").notNull().default("active"), // active/archived/completed/suspended
  metadata:    jsonb("metadata").notNull().default({}),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

// ── platform_applications ─────────────────────────────────────────────────────
// Canonical registry of every application capable of running inside UPOS.
// One row per application — Unified Platform Law.
export const platformApplications = pgTable("platform_applications", {
  id:               serial("id").primaryKey(),
  appId:            text("app_id").notNull().unique(),
  appName:          text("app_name").notNull(),
  appDomain:        text("app_domain").notNull(),        // the functional domain (builder/crm/analytics/automation)
  version:          text("version").notNull().default("1.0.0"),
  status:           text("status").notNull().default("active"), // active/inactive/deprecated/maintenance
  description:      text("description").notNull().default(""),
  capabilities:     jsonb("capabilities").notNull().default([]),     // string[] of capability IDs
  commands:         jsonb("commands").notNull().default([]),         // CommandDescriptor[]
  permissions:      jsonb("permissions").notNull().default([]),      // string[] of required permissions
  projectTypes:     jsonb("project_types").notNull().default([]),    // string[] of supported project types
  assetTypes:       jsonb("asset_types").notNull().default([]),      // string[] of supported asset types
  manifest:         jsonb("manifest").notNull().default({}),         // full capability manifest
  isBuiltin:        boolean("is_builtin").notNull().default(false),
  registeredAt:     timestamp("registered_at").notNull().defaultNow(),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

// ── platform_sessions ─────────────────────────────────────────────────────────
// Active UPOS session for an authenticated user.
export const platformSessions = pgTable("platform_sessions", {
  id:          serial("id").primaryKey(),
  userId:      integer("user_id").notNull(),
  workspaceId: integer("workspace_id"),
  projectId:   integer("project_id"),
  appId:       text("app_id"),
  status:      text("status").notNull().default("active"), // active/suspended/expired/closed
  startedAt:   timestamp("started_at").notNull().defaultNow(),
  expiresAt:   timestamp("expires_at"),
  lastActiveAt:timestamp("last_active_at").notNull().defaultNow(),
  metadata:    jsonb("metadata").notNull().default({}),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ── platform_context ──────────────────────────────────────────────────────────
// Mutable. One row per user — continuously updated as the user navigates.
// This is the context made available to ASH at all times.
export const platformContext = pgTable("platform_context", {
  id:               serial("id").primaryKey(),
  userId:           integer("user_id").notNull().unique(),   // one row per user
  currentPage:      text("current_page"),
  currentAppId:     text("current_app_id"),
  currentProjectId: integer("current_project_id"),
  currentWorkspaceId: integer("current_workspace_id"),
  currentOrgId:     integer("current_org_id"),
  permissions:      jsonb("permissions").notNull().default([]),  // string[] of active permissions
  availableCommands:jsonb("available_commands").notNull().default([]), // CommandDescriptor[] for current context
  breadcrumb:       jsonb("breadcrumb").notNull().default([]),   // NavigationNode[]
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

// ── platform_commands ─────────────────────────────────────────────────────────
// Every command exposed by every registered application.
// ASH invokes commands through this registry after authority validation.
export const platformCommands = pgTable("platform_commands", {
  id:                 serial("id").primaryKey(),
  commandId:          text("command_id").notNull().unique(),    // app:domain:action
  appId:              text("app_id").notNull(),
  commandName:        text("command_name").notNull(),
  description:        text("description").notNull().default(""),
  requiredPermissions:jsonb("required_permissions").notNull().default([]),
  route:              text("route"),                            // API route to invoke
  method:             text("method").notNull().default("POST"), // HTTP method
  parameters:         jsonb("parameters").notNull().default({}), // JSON schema for params
  active:             boolean("active").notNull().default(true),
  createdAt:          timestamp("created_at").notNull().defaultNow(),
});

// ── platform_notifications ────────────────────────────────────────────────────
// Append-only notification feed per user.
export const platformNotifications = pgTable("platform_notifications", {
  id:         serial("id").primaryKey(),
  userId:     integer("user_id").notNull(),
  type:       text("type").notNull(),        // info/warning/error/success/action_required
  title:      text("title").notNull(),
  body:       text("body").notNull().default(""),
  appId:      text("app_id"),
  projectId:  integer("project_id"),
  read:       boolean("read").notNull().default(false),
  priority:   text("priority").notNull().default("normal"), // low/normal/high/urgent
  actionUrl:  text("action_url"),
  metadata:   jsonb("metadata").notNull().default({}),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
});

// ── platform_activity ─────────────────────────────────────────────────────────
// Append-only activity timeline — every meaningful platform event.
export const platformActivity = pgTable("platform_activity", {
  id:           serial("id").primaryKey(),
  userId:       integer("user_id").notNull(),
  activityType: text("activity_type").notNull(),
  // workspace_created/project_created/app_launched/command_executed/session_started/context_changed/search_performed
  appId:        text("app_id"),
  projectId:    integer("project_id"),
  workspaceId:  integer("workspace_id"),
  actor:        text("actor").notNull().default("user"), // user/system/ash
  summary:      text("summary").notNull().default(""),
  details:      jsonb("details").notNull().default({}),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

// ── platform_registry ─────────────────────────────────────────────────────────
// Mutable aggregate view of every registered application — one row per app.
export const platformRegistry = pgTable("platform_registry", {
  id:               serial("id").primaryKey(),
  appId:            text("app_id").notNull().unique(),
  appName:          text("app_name").notNull(),
  domain:           text("domain").notNull(),
  version:          text("version").notNull().default("1.0.0"),
  status:           text("status").notNull().default("active"),
  capabilityCount:  integer("capability_count").notNull().default(0),
  commandCount:     integer("command_count").notNull().default(0),
  projectTypeCount: integer("project_type_count").notNull().default(0),
  runtimeHealth:    text("runtime_health").notNull().default("unknown"), // healthy/degraded/offline/unknown
  lastHealthCheckAt:timestamp("last_health_check_at"),
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

// ── platform_snapshots ────────────────────────────────────────────────────────
// Append-only point-in-time snapshots of the full UPOS state.
export const platformSnapshots = pgTable("platform_snapshots", {
  id:                   serial("id").primaryKey(),
  userId:               integer("user_id"),
  totalApps:            integer("total_apps").notNull().default(0),
  activeApps:           integer("active_apps").notNull().default(0),
  totalWorkspaces:      integer("total_workspaces").notNull().default(0),
  totalProjects:        integer("total_projects").notNull().default(0),
  activeSessions:       integer("active_sessions").notNull().default(0),
  commandsAvailable:    integer("commands_available").notNull().default(0),
  notificationsPending: integer("notifications_pending").notNull().default(0),
  runtimeHealth:        text("runtime_health").notNull().default("unknown"),
  lawApplied:           boolean("law_applied").notNull().default(true),
  snapshotData:         jsonb("snapshot_data").notNull().default({}),
  createdAt:            timestamp("created_at").notNull().defaultNow(),
});
