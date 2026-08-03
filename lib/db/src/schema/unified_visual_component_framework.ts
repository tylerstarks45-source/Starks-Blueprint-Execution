// ─────────────────────────────────────────────────────────────────────────────
// Build 051 — Unified Visual Component Framework (UVCF)
// 10 tables: append-only except component_registry (mutable)
// ─────────────────────────────────────────────────────────────────────────────
import {
  pgTable, serial, text, boolean, integer, jsonb, timestamp, index, unique,
} from "drizzle-orm/pg-core";

// ── 1. component_families ─────────────────────────────────────────────────────
export const componentFamilies = pgTable("component_families", {
  id:          serial("id").primaryKey(),
  familyKey:   text("family_key").notNull(),
  title:       text("title").notNull(),
  description: text("description").notNull().default(""),
  category:    text("category").notNull().default("general"),
  sortOrder:   integer("sort_order").notNull().default(0),
  metadata:    jsonb("metadata").notNull().default("{}"),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("uq_component_family_key").on(t.familyKey),
  index("idx_comp_families_category").on(t.category),
]);

// ── 2. visual_components ──────────────────────────────────────────────────────
export const visualComponents = pgTable("visual_components", {
  id:                   serial("id").primaryKey(),
  familyId:             integer("family_id").notNull(),
  componentKey:         text("component_key").notNull(),
  title:                text("title").notNull(),
  description:          text("description").notNull().default(""),
  category:             text("category").notNull().default("display"),
  propsSchema:          jsonb("props_schema").notNull().default("{}"),
  defaultProps:         jsonb("default_props").notNull().default("{}"),
  accessibilityRole:    text("accessibility_role"),
  ariaLabelTemplate:    text("aria_label_template"),
  keyboardInteractions: jsonb("keyboard_interactions").notNull().default("[]"),
  semanticMeaning:      text("semantic_meaning"),
  semanticIntent:       text("semantic_intent"),
  responsiveBreakpoints:jsonb("responsive_breakpoints").notNull().default("[]"),
  supportedThemes:      jsonb("supported_themes").notNull().default("[]"),
  isPlatformComponent:  boolean("is_platform_component").notNull().default(true),
  isPublic:             boolean("is_public").notNull().default(true),
  ashSemanticTag:       text("ash_semantic_tag"),
  version:              text("version").notNull().default("1.0.0"),
  deprecatedAt:         timestamp("deprecated_at", { withTimezone: true }),
  metadata:             jsonb("metadata").notNull().default("{}"),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("uq_visual_component_key").on(t.componentKey),
  index("idx_visual_components_family").on(t.familyId),
  index("idx_visual_components_category").on(t.category),
  index("idx_visual_components_ash_tag").on(t.ashSemanticTag),
  index("idx_visual_components_created").on(t.createdAt),
]);

// ── 3. component_variants ─────────────────────────────────────────────────────
export const componentVariants = pgTable("component_variants", {
  id:             serial("id").primaryKey(),
  componentId:    integer("component_id").notNull(),
  componentKey:   text("component_key").notNull(),
  variantKey:     text("variant_key").notNull(),
  title:          text("title").notNull(),
  description:    text("description").notNull().default(""),
  propsOverrides: jsonb("props_overrides").notNull().default("{}"),
  tokenOverrides: jsonb("token_overrides").notNull().default("{}"),
  isDefault:      boolean("is_default").notNull().default(false),
  metadata:       jsonb("metadata").notNull().default("{}"),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_comp_variants_component").on(t.componentId),
  index("idx_comp_variants_key").on(t.componentKey),
]);

// ── 4. design_tokens ──────────────────────────────────────────────────────────
export const designTokens = pgTable("design_tokens", {
  id:           serial("id").primaryKey(),
  tokenKey:     text("token_key").notNull(),
  tokenName:    text("token_name").notNull(),
  category:     text("category").notNull().default("color"),
  valueLight:   text("value_light").notNull(),
  valueDark:    text("value_dark"),
  description:  text("description").notNull().default(""),
  isSemantic:   boolean("is_semantic").notNull().default(false),
  semanticRole: text("semantic_role"),
  metadata:     jsonb("metadata").notNull().default("{}"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("uq_design_token_key").on(t.tokenKey),
  index("idx_design_tokens_category").on(t.category),
  index("idx_design_tokens_semantic").on(t.isSemantic),
]);

// ── 5. component_manifests ────────────────────────────────────────────────────
export const componentManifests = pgTable("component_manifests", {
  id:                    serial("id").primaryKey(),
  componentId:           integer("component_id").notNull(),
  componentKey:          text("component_key").notNull(),
  version:               text("version").notNull().default("1.0.0"),
  propsSchema:           jsonb("props_schema").notNull().default("{}"),
  dependencies:          jsonb("dependencies").notNull().default("[]"),
  accessibilityContract: jsonb("accessibility_contract").notNull().default("{}"),
  semanticContract:      jsonb("semantic_contract").notNull().default("{}"),
  manifestHash:          text("manifest_hash"),
  metadata:              jsonb("metadata").notNull().default("{}"),
  createdAt:             timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_comp_manifests_component").on(t.componentId),
  index("idx_comp_manifests_version").on(t.version),
  index("idx_comp_manifests_created").on(t.createdAt),
]);

// ── 6. component_capabilities ─────────────────────────────────────────────────
// Note: differs from application_capabilities (Build 050) — component-level, not app-level
export const componentCapabilities = pgTable("component_capabilities", {
  id:             serial("id").primaryKey(),
  componentId:    integer("component_id").notNull(),
  componentKey:   text("component_key").notNull(),
  capabilityKey:  text("capability_key").notNull(),
  title:          text("title").notNull(),
  capabilityType: text("capability_type").notNull().default("render"),
  ashCanReason:   boolean("ash_can_reason").notNull().default(true),
  metadata:       jsonb("metadata").notNull().default("{}"),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_comp_capabilities_component").on(t.componentId),
  index("idx_comp_capabilities_type").on(t.capabilityType),
  index("idx_comp_capabilities_ash").on(t.ashCanReason),
]);

// ── 7. component_registry (MUTABLE) ──────────────────────────────────────────
export const componentRegistry = pgTable("component_registry", {
  id:                  serial("id").primaryKey(),
  componentKey:        text("component_key").notNull(),
  title:               text("title").notNull(),
  familyId:            integer("family_id"),
  currentVersion:      text("current_version").notNull().default("1.0.0"),
  isEnabled:           boolean("is_enabled").notNull().default(true),
  isPlatformComponent: boolean("is_platform_component").notNull().default(true),
  usageCount:          integer("usage_count").notNull().default(0),
  lastUsedAt:          timestamp("last_used_at", { withTimezone: true }),
  healthStatus:        text("health_status").notNull().default("healthy"),
  deprecated:          boolean("deprecated").notNull().default(false),
  updatedAt:           timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("uq_component_registry_key").on(t.componentKey),
  index("idx_comp_registry_enabled").on(t.isEnabled),
  index("idx_comp_registry_health").on(t.healthStatus),
  index("idx_comp_registry_deprecated").on(t.deprecated),
]);

// ── 8. component_snapshots ────────────────────────────────────────────────────
export const componentSnapshots = pgTable("component_snapshots", {
  id:                    serial("id").primaryKey(),
  totalComponents:       integer("total_components").notNull().default(0),
  enabledComponents:     integer("enabled_components").notNull().default(0),
  totalFamilies:         integer("total_families").notNull().default(0),
  totalTokens:           integer("total_tokens").notNull().default(0),
  totalVariants:         integer("total_variants").notNull().default(0),
  totalCapabilities:     integer("total_capabilities").notNull().default(0),
  ashSemanticCoverage:   integer("ash_semantic_coverage").notNull().default(0),
  accessibilityCoverage: integer("accessibility_coverage").notNull().default(0),
  healthBreakdown:       jsonb("health_breakdown").notNull().default("{}"),
  categoryBreakdown:     jsonb("category_breakdown").notNull().default("{}"),
  lawApplied:            boolean("law_applied").notNull().default(true),
  snapshotData:          jsonb("snapshot_data").notNull().default("{}"),
  createdAt:             timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 9. component_usage ────────────────────────────────────────────────────────
export const componentUsage = pgTable("component_usage", {
  id:           serial("id").primaryKey(),
  componentKey: text("component_key").notNull(),
  appId:        text("app_id"),
  context:      text("context").notNull().default(""),
  usageCount:   integer("usage_count").notNull().default(1),
  lastUsedAt:   timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
  metadata:     jsonb("metadata").notNull().default("{}"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_comp_usage_key").on(t.componentKey),
  index("idx_comp_usage_app").on(t.appId),
  index("idx_comp_usage_last").on(t.lastUsedAt),
]);

// ── 10. component_diagnostics ─────────────────────────────────────────────────
export const componentDiagnostics = pgTable("component_diagnostics", {
  id:             serial("id").primaryKey(),
  componentKey:   text("component_key"),
  diagnosticType: text("diagnostic_type").notNull(),
  severity:       text("severity").notNull().default("info"),
  title:          text("title").notNull(),
  details:        jsonb("details").notNull().default("{}"),
  resolvedAt:     timestamp("resolved_at", { withTimezone: true }),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_comp_diagnostics_key").on(t.componentKey),
  index("idx_comp_diagnostics_type").on(t.diagnosticType),
  index("idx_comp_diagnostics_severity").on(t.severity),
  index("idx_comp_diagnostics_created").on(t.createdAt),
]);
