// ─── Build 015: Business Operating System — Business Graph Engine ─────────────
//
// 8 new tables (builds on the existing `businesses` table):
//   business_nodes         — graph nodes (departments, products, customers, etc.)
//   business_edges         — typed directed relationships between nodes
//   business_kpis          — KPI objects (revenue, MRR, ARR, etc.)
//   business_metrics       — KPI measurement history (append-only)
//   business_health        — 7-dimension deterministic health scores
//   business_dependencies  — critical paths, SPOFs, blocked initiatives
//   business_snapshots     — point-in-time graph state snapshots
//   business_registry      — per-business roll-up catalog

import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { businessesTable } from "./businesses";

// ── business_nodes ────────────────────────────────────────────────────────────

export const businessNodesTable = pgTable("business_nodes", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  nodeType: text("node_type").notNull(),
  // company | department | project | product | service | offer | funnel | campaign |
  // customer | lead | partner | supplier | employee | agent | asset | process |
  // automation | knowledge_asset | revenue_stream | expense | kpi_node | objective | risk
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  lifecycle: text("lifecycle").notNull().default("active"),
  // planning | active | paused | deprecated | archived
  health: text("health").notNull().default("unknown"),
  // healthy | warning | critical | unknown
  status: text("status").notNull().default("active"),
  // active | inactive | pending | blocked | completed
  ownerName: text("owner_name"),
  priority: integer("priority").notNull().default(5),          // 1 (highest) – 10 (lowest)
  risk: text("risk").notNull().default("medium"),
  // low | medium | high | critical
  confidence: real("confidence").notNull().default(0.5),        // 0-1
  businessValue: real("business_value").notNull().default(0.5), // 0-1
  strategicImportance: real("strategic_importance").notNull().default(0.5), // 0-1
  isActive: boolean("is_active").notNull().default(true),
  tags: jsonb("tags").notNull().default([]),                    // string[]
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── business_edges ────────────────────────────────────────────────────────────

export const businessEdgesTable = pgTable("business_edges", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  fromNodeId: text("from_node_id").notNull().references(() => businessNodesTable.id, { onDelete: "cascade" }),
  toNodeId: text("to_node_id").notNull().references(() => businessNodesTable.id, { onDelete: "cascade" }),
  edgeType: text("edge_type").notNull(),
  // owns | depends_on | supports | blocks | generates | markets | sells |
  // contains | uses | belongs_to | managed_by | created_from | optimized_by | measures
  label: text("label"),
  weight: real("weight").notNull().default(1.0),   // 0-1, relationship strength
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── business_kpis ─────────────────────────────────────────────────────────────

export const businessKpisTable = pgTable("business_kpis", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  nodeId: text("node_id").references(() => businessNodesTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  kpiType: text("kpi_type").notNull(),
  // revenue | mrr | arr | conversion_rate | cac | ltv | profit | traffic |
  // lead_velocity | retention | churn | pipeline_value | growth_rate | custom
  currentValue: real("current_value"),
  targetValue: real("target_value"),
  previousValue: real("previous_value"),
  unit: text("unit").notNull().default(""),          // "USD", "%", "count", etc.
  trend: text("trend").notNull().default("stable"),  // up | down | stable | volatile
  period: text("period").notNull().default("monthly"),
  // daily | weekly | monthly | quarterly | annual
  isHealthy: boolean("is_healthy").notNull().default(true),
  metadata: jsonb("metadata").notNull().default({}),
  measuredAt: timestamp("measured_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── business_metrics (KPI history, append-only) ───────────────────────────────

export const businessMetricsTable = pgTable("business_metrics", {
  id: text("id").primaryKey(),
  kpiId: text("kpi_id").notNull().references(() => businessKpisTable.id, { onDelete: "cascade" }),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  value: real("value").notNull(),
  label: text("label"),
  period: text("period"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── business_health ───────────────────────────────────────────────────────────
// Deterministic 7-dimension health scores for the Business Graph.
// Distinct from business_health_scores (AI-driven narrative analysis)
// and business_health_metrics (scheduler-driven operational monitoring).

export const businessHealthTable = pgTable("business_health", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  overallHealth: real("overall_health").notNull().default(0.5),
  financialHealth: real("financial_health").notNull().default(0.5),
  marketingHealth: real("marketing_health").notNull().default(0.5),
  salesHealth: real("sales_health").notNull().default(0.5),
  operationalHealth: real("operational_health").notNull().default(0.5),
  productHealth: real("product_health").notNull().default(0.5),
  growthHealth: real("growth_health").notNull().default(0.5),
  executiveHealth: real("executive_health").notNull().default(0.5),
  issues: jsonb("issues").notNull().default([]),            // HealthIssue[]
  recommendations: jsonb("recommendations").notNull().default([]), // string[]
  nodeCount: integer("node_count").notNull().default(0),
  kpiCount: integer("kpi_count").notNull().default(0),
  dependencyCount: integer("dependency_count").notNull().default(0),
  criticalDependencies: integer("critical_dependencies").notNull().default(0),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── business_dependencies ─────────────────────────────────────────────────────

export const businessDependenciesTable = pgTable("business_dependencies", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  fromNodeId: text("from_node_id").references(() => businessNodesTable.id, { onDelete: "cascade" }),
  toNodeId: text("to_node_id").references(() => businessNodesTable.id, { onDelete: "cascade" }),
  dependencyType: text("dependency_type").notNull(),
  // critical_path | single_point_of_failure | blocked | missing_asset |
  // broken_workflow | risk_propagation
  severity: real("severity").notNull().default(0.5),
  description: text("description").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  metadata: jsonb("metadata").notNull().default({}),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── business_snapshots ────────────────────────────────────────────────────────

export const businessSnapshotsTable = pgTable("business_snapshots", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  nodeCount: integer("node_count").notNull().default(0),
  edgeCount: integer("edge_count").notNull().default(0),
  kpiCount: integer("kpi_count").notNull().default(0),
  healthScore: real("health_score"),
  reason: text("reason").notNull().default("periodic"),
  graphState: jsonb("graph_state").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── business_registry ─────────────────────────────────────────────────────────
// Per-business roll-up catalog — one row per business.

export const businessRegistryTable = pgTable("business_registry", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().unique().references(() => businessesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  nodeCount: integer("node_count").notNull().default(0),
  edgeCount: integer("edge_count").notNull().default(0),
  kpiCount: integer("kpi_count").notNull().default(0),
  overallHealth: real("overall_health"),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
  registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
