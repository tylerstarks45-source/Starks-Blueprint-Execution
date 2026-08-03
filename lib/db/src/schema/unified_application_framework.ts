// ─────────────────────────────────────────────────────────────────────────────
// Build 050 — Unified Application Framework (UAF)
// 10 tables: append-only except application_registry (mutable)
// ─────────────────────────────────────────────────────────────────────────────
import {
  pgTable, serial, text, boolean, integer, jsonb, timestamp, index, unique,
} from "drizzle-orm/pg-core";

// ── 1. platform_app_manifests ─────────────────────────────────────────────────
export const platformAppManifests = pgTable("platform_app_manifests", {
  id:                    serial("id").primaryKey(),
  appId:                 text("app_id").notNull(),
  version:               text("version").notNull().default("1.0.0"),
  title:                 text("title").notNull(),
  description:           text("description").notNull().default(""),
  icon:                  text("icon"),
  category:              text("category").notNull().default("general"),
  developer:             text("developer").notNull().default("platform"),
  homepageUrl:           text("homepage_url"),
  supportedPermissions:  jsonb("supported_permissions").notNull().default("[]"),
  minPlatformVersion:    text("min_platform_version").notNull().default("1.0.0"),
  compatibleAssetClasses:jsonb("compatible_asset_classes").notNull().default("[]"),
  compatibleBuilderTypes:jsonb("compatible_builder_types").notNull().default("[]"),
  manifestHash:          text("manifest_hash"),
  metadata:              jsonb("metadata").notNull().default("{}"),
  createdAt:             timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_app_manifests_app_id").on(t.appId),
  index("idx_app_manifests_version").on(t.version),
  index("idx_app_manifests_created").on(t.createdAt),
]);

// ── 2. platform_pages ─────────────────────────────────────────────────────────
export const platformPages = pgTable("platform_pages", {
  id:                 serial("id").primaryKey(),
  appId:              text("app_id").notNull(),
  pageKey:            text("page_key").notNull(),
  title:              text("title").notNull(),
  description:        text("description").notNull().default(""),
  route:              text("route").notNull().default("/"),
  icon:               text("icon"),
  isDefault:          boolean("is_default").notNull().default(false),
  requiresPermissions:jsonb("requires_permissions").notNull().default("[]"),
  menuPlacement:      text("menu_placement").notNull().default("sidebar"),
  menuGroup:          text("menu_group").notNull().default("main"),
  sortOrder:          integer("sort_order").notNull().default(0),
  metadata:           jsonb("metadata").notNull().default("{}"),
  createdAt:          timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_platform_pages_app_id").on(t.appId),
  index("idx_platform_pages_route").on(t.route),
  index("idx_platform_pages_created").on(t.createdAt),
]);

// ── 3. platform_views ─────────────────────────────────────────────────────────
export const platformViews = pgTable("platform_views", {
  id:          serial("id").primaryKey(),
  appId:       text("app_id").notNull(),
  pageId:      integer("page_id").notNull(),
  viewKey:     text("view_key").notNull(),
  title:       text("title").notNull(),
  description: text("description").notNull().default(""),
  viewType:    text("view_type").notNull().default("list"),
  isDefault:   boolean("is_default").notNull().default(false),
  metadata:    jsonb("metadata").notNull().default("{}"),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_platform_views_app_id").on(t.appId),
  index("idx_platform_views_page_id").on(t.pageId),
  index("idx_platform_views_created").on(t.createdAt),
]);

// ── 4. platform_panels ────────────────────────────────────────────────────────
export const platformPanels = pgTable("platform_panels", {
  id:            serial("id").primaryKey(),
  appId:         text("app_id").notNull(),
  pageId:        integer("page_id"),
  panelKey:      text("panel_key").notNull(),
  title:         text("title").notNull(),
  panelType:     text("panel_type").notNull().default("sidebar"),
  position:      text("position").notNull().default("right"),
  isDefaultOpen: boolean("is_default_open").notNull().default(false),
  widthPx:       integer("width_px").notNull().default(320),
  metadata:      jsonb("metadata").notNull().default("{}"),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_platform_panels_app_id").on(t.appId),
  index("idx_platform_panels_page_id").on(t.pageId),
]);

// ── 5. platform_widgets ───────────────────────────────────────────────────────
export const platformWidgets = pgTable("platform_widgets", {
  id:               serial("id").primaryKey(),
  appId:            text("app_id").notNull(),
  widgetKey:        text("widget_key").notNull(),
  title:            text("title").notNull(),
  description:      text("description").notNull().default(""),
  widgetType:       text("widget_type").notNull().default("display"),
  isPlatformWidget: boolean("is_platform_widget").notNull().default(false),
  isPublic:         boolean("is_public").notNull().default(true),
  supportedPages:   jsonb("supported_pages").notNull().default("[]"),
  propsSchema:      jsonb("props_schema").notNull().default("{}"),
  defaultProps:     jsonb("default_props").notNull().default("{}"),
  metadata:         jsonb("metadata").notNull().default("{}"),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_platform_widgets_app_id").on(t.appId),
  index("idx_platform_widgets_type").on(t.widgetType),
  index("idx_platform_widgets_public").on(t.isPublic),
]);

// ── 6. platform_services ──────────────────────────────────────────────────────
export const platformServices = pgTable("platform_services", {
  id:               serial("id").primaryKey(),
  appId:            text("app_id").notNull(),
  serviceKey:       text("service_key").notNull(),
  title:            text("title").notNull(),
  description:      text("description").notNull().default(""),
  serviceType:      text("service_type").notNull().default("api"),
  endpointPrefix:   text("endpoint_prefix"),
  authRequired:     boolean("auth_required").notNull().default(true),
  rateLimitPerMin:  integer("rate_limit_per_min").notNull().default(60),
  metadata:         jsonb("metadata").notNull().default("{}"),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_platform_services_app_id").on(t.appId),
  index("idx_platform_services_type").on(t.serviceType),
]);

// ── 7. application_capabilities ───────────────────────────────────────────────
export const applicationCapabilities = pgTable("application_capabilities", {
  id:                   serial("id").primaryKey(),
  appId:                text("app_id").notNull(),
  capabilityKey:        text("capability_key").notNull(),
  title:                text("title").notNull(),
  description:          text("description").notNull().default(""),
  capabilityType:       text("capability_type").notNull().default("read"),
  requiresPermissions:  jsonb("requires_permissions").notNull().default("[]"),
  isPlatformCapability: boolean("is_platform_capability").notNull().default(false),
  ashCanInvoke:         boolean("ash_can_invoke").notNull().default(true),
  metadata:             jsonb("metadata").notNull().default("{}"),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_app_capabilities_app_id").on(t.appId),
  index("idx_app_capabilities_type").on(t.capabilityType),
  index("idx_app_capabilities_ash").on(t.ashCanInvoke),
]);

// ── 8. application_registry (MUTABLE) ─────────────────────────────────────────
export const applicationRegistry = pgTable("application_registry", {
  id:               serial("id").primaryKey(),
  appId:            text("app_id").notNull(),
  title:            text("title").notNull(),
  lifecycleState:   text("lifecycle_state").notNull().default("available"),
  currentVersion:   text("current_version").notNull().default("1.0.0"),
  manifestId:       integer("manifest_id"),
  isEnabled:        boolean("is_enabled").notNull().default(true),
  isPlatformApp:    boolean("is_platform_app").notNull().default(false),
  installContext:   text("install_context").notNull().default("platform"),
  installedAt:      timestamp("installed_at", { withTimezone: true }).notNull().defaultNow(),
  enabledAt:        timestamp("enabled_at", { withTimezone: true }),
  disabledAt:       timestamp("disabled_at", { withTimezone: true }),
  lastHealthCheckAt:timestamp("last_health_check_at", { withTimezone: true }),
  healthStatus:     text("health_status").notNull().default("healthy"),
  errorMessage:     text("error_message"),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("uq_application_registry_app_id").on(t.appId),
  index("idx_app_registry_lifecycle").on(t.lifecycleState),
  index("idx_app_registry_enabled").on(t.isEnabled),
  index("idx_app_registry_health").on(t.healthStatus),
]);

// ── 9. application_snapshots ──────────────────────────────────────────────────
export const applicationSnapshots = pgTable("application_snapshots", {
  id:                   serial("id").primaryKey(),
  totalApps:            integer("total_apps").notNull().default(0),
  enabledApps:          integer("enabled_apps").notNull().default(0),
  disabledApps:         integer("disabled_apps").notNull().default(0),
  platformApps:         integer("platform_apps").notNull().default(0),
  userApps:             integer("user_apps").notNull().default(0),
  availableCapabilities:integer("available_capabilities").notNull().default(0),
  availableWidgets:     integer("available_widgets").notNull().default(0),
  availableServices:    integer("available_services").notNull().default(0),
  lifecycleBreakdown:   jsonb("lifecycle_breakdown").notNull().default("{}"),
  healthBreakdown:      jsonb("health_breakdown").notNull().default("{}"),
  lawApplied:           boolean("law_applied").notNull().default(true),
  snapshotData:         jsonb("snapshot_data").notNull().default("{}"),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 10. application_diagnostics ───────────────────────────────────────────────
export const applicationDiagnostics = pgTable("application_diagnostics", {
  id:             serial("id").primaryKey(),
  appId:          text("app_id"),
  diagnosticType: text("diagnostic_type").notNull(),
  severity:       text("severity").notNull().default("info"),
  title:          text("title").notNull(),
  details:        jsonb("details").notNull().default("{}"),
  resolvedAt:     timestamp("resolved_at", { withTimezone: true }),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_app_diagnostics_app_id").on(t.appId),
  index("idx_app_diagnostics_type").on(t.diagnosticType),
  index("idx_app_diagnostics_severity").on(t.severity),
  index("idx_app_diagnostics_created").on(t.createdAt),
]);
