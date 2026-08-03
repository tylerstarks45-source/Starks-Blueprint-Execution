// ─────────────────────────────────────────────────────────────────────────────
// Build 052 — Universal Canvas Engine (UCE) — DB Schema
// 10 tables; canvas_registry is the only mutable table (UNIQUE on canvas_id)
// All others are append-only / insert-only
// ─────────────────────────────────────────────────────────────────────────────
import {
  pgTable, serial, text, integer, boolean, jsonb, timestamp,
} from "drizzle-orm/pg-core";

// 1. canvas_registry — mutable, UNIQUE on canvas_id
export const canvasRegistry = pgTable("canvas_registry", {
  id:              serial("id").primaryKey(),
  canvasId:        text("canvas_id").notNull().unique(),
  title:           text("title").notNull(),
  canvasMode:      text("canvas_mode").notNull().default("website_layout"),
  ownerType:       text("owner_type").notNull().default("system"),
  ownerId:         text("owner_id"),
  isActive:        boolean("is_active").notNull().default(true),
  isPublic:        boolean("is_public").notNull().default(false),
  nodeCount:       integer("node_count").notNull().default(0),
  layerCount:      integer("layer_count").notNull().default(0),
  lastEditedAt:    timestamp("last_edited_at"),
  lastSessionAt:   timestamp("last_session_at"),
  metadata:        jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});

// 2. canvas_sessions — append-only
export const canvasSessions = pgTable("canvas_sessions", {
  id:              serial("id").primaryKey(),
  canvasId:        text("canvas_id").notNull(),
  userId:          integer("user_id"),
  sessionType:     text("session_type").notNull().default("edit"),
  viewportX:       integer("viewport_x").notNull().default(0),
  viewportY:       integer("viewport_y").notNull().default(0),
  zoomLevel:       integer("zoom_level").notNull().default(100),
  selectedNodeIds: jsonb("selected_node_ids").$type<string[]>().notNull().default([]),
  clipboardData:   jsonb("clipboard_data").$type<Record<string, unknown>>().notNull().default({}),
  sessionData:     jsonb("session_data").$type<Record<string, unknown>>().notNull().default({}),
  endedAt:         timestamp("ended_at"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});

// 3. canvas_views — append-only saved viewport positions
export const canvasViews = pgTable("canvas_views", {
  id:              serial("id").primaryKey(),
  canvasId:        text("canvas_id").notNull(),
  viewKey:         text("view_key").notNull(),
  title:           text("title").notNull(),
  viewportX:       integer("viewport_x").notNull().default(0),
  viewportY:       integer("viewport_y").notNull().default(0),
  zoomLevel:       integer("zoom_level").notNull().default(100),
  isDefault:       boolean("is_default").notNull().default(false),
  metadata:        jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});

// 4. canvas_history — append-only operation log
export const canvasHistory = pgTable("canvas_history", {
  id:              serial("id").primaryKey(),
  canvasId:        text("canvas_id").notNull(),
  sessionId:       integer("session_id"),
  operationType:   text("operation_type").notNull(),
  operationTitle:  text("operation_title").notNull(),
  affectedNodeIds: jsonb("affected_node_ids").$type<string[]>().notNull().default([]),
  beforeState:     jsonb("before_state").$type<Record<string, unknown>>().notNull().default({}),
  afterState:      jsonb("after_state").$type<Record<string, unknown>>().notNull().default({}),
  isUndone:        boolean("is_undone").notNull().default(false),
  sequenceNumber:  integer("sequence_number").notNull().default(0),
  metadata:        jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});

// 5. canvas_layers — append-only layer definitions
export const canvasLayers = pgTable("canvas_layers", {
  id:              serial("id").primaryKey(),
  canvasId:        text("canvas_id").notNull(),
  layerKey:        text("layer_key").notNull(),
  title:           text("title").notNull(),
  layerType:       text("layer_type").notNull().default("content"),
  sortOrder:       integer("sort_order").notNull().default(0),
  isVisible:       boolean("is_visible").notNull().default(true),
  isLocked:        boolean("is_locked").notNull().default(false),
  nodeIds:         jsonb("node_ids").$type<string[]>().notNull().default([]),
  styles:          jsonb("styles").$type<Record<string, unknown>>().notNull().default({}),
  metadata:        jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});

// 6. canvas_guides — append-only alignment guides
export const canvasGuides = pgTable("canvas_guides", {
  id:              serial("id").primaryKey(),
  canvasId:        text("canvas_id").notNull(),
  guideType:       text("guide_type").notNull().default("horizontal"),
  position:        integer("position").notNull().default(0),
  color:           text("color").notNull().default("#3366ff"),
  isVisible:       boolean("is_visible").notNull().default(true),
  isSticky:        boolean("is_sticky").notNull().default(false),
  metadata:        jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});

// 7. canvas_snapshots — append-only full canvas state captures
export const canvasSnapshots = pgTable("canvas_snapshots", {
  id:              serial("id").primaryKey(),
  canvasId:        text("canvas_id"),
  totalCanvases:   integer("total_canvases").notNull().default(0),
  activeSessions:  integer("active_sessions").notNull().default(0),
  totalLayers:     integer("total_layers").notNull().default(0),
  totalRenderers:  integer("total_renderers").notNull().default(0),
  totalHistory:    integer("total_history").notNull().default(0),
  canvasModes:     jsonb("canvas_modes").$type<Record<string, number>>().notNull().default({}),
  rendererBreakdown:jsonb("renderer_breakdown").$type<Record<string, number>>().notNull().default({}),
  lawApplied:      boolean("law_applied").notNull().default(true),
  snapshotData:    jsonb("snapshot_data").$type<Record<string, unknown>>().notNull().default({}),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});

// 8. canvas_preferences — append-only user preferences
export const canvasPreferences = pgTable("canvas_preferences", {
  id:              serial("id").primaryKey(),
  userId:          integer("user_id"),
  prefKey:         text("pref_key").notNull(),
  gridEnabled:     boolean("grid_enabled").notNull().default(true),
  gridSize:        integer("grid_size").notNull().default(8),
  snapEnabled:     boolean("snap_enabled").notNull().default(true),
  snapThreshold:   integer("snap_threshold").notNull().default(8),
  guidesEnabled:   boolean("guides_enabled").notNull().default(true),
  rulerEnabled:    boolean("ruler_enabled").notNull().default(true),
  minimapEnabled:  boolean("minimap_enabled").notNull().default(true),
  theme:           text("theme").notNull().default("light"),
  preferences:     jsonb("preferences").$type<Record<string, unknown>>().notNull().default({}),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});

// 9. canvas_diagnostics — append-only health diagnostics
export const canvasDiagnostics = pgTable("canvas_diagnostics", {
  id:              serial("id").primaryKey(),
  canvasId:        text("canvas_id"),
  diagnosticType:  text("diagnostic_type").notNull(),
  severity:        text("severity").notNull().default("info"),
  title:           text("title").notNull(),
  details:         jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  resolvedAt:      timestamp("resolved_at"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});

// 10. canvas_renderers — append-only renderer registrations
export const canvasRenderers = pgTable("canvas_renderers", {
  id:              serial("id").primaryKey(),
  rendererKey:     text("renderer_key").notNull(),
  title:           text("title").notNull(),
  rendererType:    text("renderer_type").notNull().default("dom"),
  canvasModes:     jsonb("canvas_modes").$type<string[]>().notNull().default([]),
  capabilities:    jsonb("capabilities").$type<string[]>().notNull().default([]),
  version:         text("version").notNull().default("1.0.0"),
  isActive:        boolean("is_active").notNull().default(true),
  isPlatform:      boolean("is_platform").notNull().default(true),
  priority:        integer("priority").notNull().default(0),
  metadata:        jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});
