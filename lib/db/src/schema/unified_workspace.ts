import { pgTable, serial, integer, text, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";

// ── Build 047: Unified Workspace & Project System ────────────────────────────
// Everything users build belongs here. Every asset lives in a project.
// Every project lives in a business. Every business belongs to an organization.
// Append-only except project_registry.

/** Top-level workspace container scoped to a business */
export const businessWorkspaces = pgTable("business_workspaces", {
  id:            serial("id").primaryKey(),
  userId:        integer("user_id").notNull(),
  businessId:    integer("business_id"),
  orgId:         integer("org_id"),
  workspaceName: text("workspace_name").notNull(),
  workspaceType: text("workspace_type").notNull().default("business"), // business | personal | team
  status:        text("status").notNull().default("active"),           // active | archived | suspended
  configuration: jsonb("configuration").notNull().default({}),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Project inside a business workspace */
export const businessProjects = pgTable("business_projects", {
  id:           serial("id").primaryKey(),
  userId:       integer("user_id").notNull(),
  workspaceId:  integer("workspace_id"),
  businessId:   integer("business_id"),
  projectName:  text("project_name").notNull(),
  projectType:  text("project_type").notNull(),   // website | crm | automation | dashboard | custom
  description:  text("description").notNull().default(""),
  status:       text("status").notNull().default("active"),  // active | archived | completed | suspended
  phase:        text("phase").notNull().default("planning"), // planning | building | testing | launched
  tags:         jsonb("tags").notNull().default([]),          // string[]
  templateId:   integer("template_id"),
  metadata:     jsonb("metadata").notNull().default({}),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Every platform asset — registered deterministically on creation */
export const projectAssets = pgTable("project_assets", {
  id:             serial("id").primaryKey(),
  userId:         integer("user_id").notNull(),
  projectId:      integer("project_id").notNull(),
  businessId:     integer("business_id"),
  workspaceId:    integer("workspace_id"),
  assetName:      text("asset_name").notNull(),
  assetType:      text("asset_type").notNull(),   // website | landing_page | saas | workflow | automation | knowledge_base | crm | api | database | dashboard | ai_agent | prompt_library | documentation | marketing_campaign | brand_kit | logo | image | video | document | source_code
  assetStatus:    text("asset_status").notNull().default("draft"),  // draft | active | deprecated | archived
  currentVersion: text("current_version").notNull().default("1.0.0"),
  deploymentStatus: text("deployment_status").notNull().default("undeployed"), // undeployed | deployed | staging | failed
  externalRef:    text("external_ref"),           // reference to the actual asset (URL, ID, etc.)
  checksum:       text("checksum"),               // optional content hash for change detection
  sizeBytes:      integer("size_bytes"),
  metadata:       jsonb("metadata").notNull().default({}),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Directed dependency/relationship graph between assets — ASH can traverse */
export const assetRelationships = pgTable("asset_relationships", {
  id:               serial("id").primaryKey(),
  sourceAssetId:    integer("source_asset_id").notNull(),
  targetAssetId:    integer("target_asset_id").notNull(),
  relationshipType: text("relationship_type").notNull(), // depends_on | uses | extends | replaces | references | generates | deploys_to | documents
  strength:         text("strength").notNull().default("required"), // required | optional | informational
  metadata:         jsonb("metadata").notNull().default({}),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Version history for every asset — append-only lineage */
export const assetVersions = pgTable("asset_versions", {
  id:          serial("id").primaryKey(),
  assetId:     integer("asset_id").notNull(),
  userId:      integer("user_id").notNull(),
  version:     text("version").notNull(),
  changeType:  text("change_type").notNull(),  // create | update | deploy | rollback | archive
  changeSummary: text("change_summary").notNull().default(""),
  checksum:    text("checksum"),
  snapshotData: jsonb("snapshot_data").notNull().default({}),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Append-only activity timeline for workspace events */
export const projectActivity = pgTable("project_activity", {
  id:           serial("id").primaryKey(),
  userId:       integer("user_id").notNull(),
  workspaceId:  integer("workspace_id"),
  projectId:    integer("project_id"),
  assetId:      integer("asset_id"),
  businessId:   integer("business_id"),
  activityType: text("activity_type").notNull(), // project_created | asset_added | asset_updated | asset_deployed | asset_deleted | project_archived | template_applied | health_computed
  actor:        text("actor").notNull().default("user"),  // user | ash | system
  summary:      text("summary").notNull().default(""),
  details:      jsonb("details").notNull().default({}),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Project health score — append-only snapshot per computation */
export const projectHealth = pgTable("project_health", {
  id:                   serial("id").primaryKey(),
  projectId:            integer("project_id").notNull(),
  userId:               integer("user_id").notNull(),
  overallScore:         integer("overall_score").notNull().default(0),    // 0–100
  completenessScore:    integer("completeness_score").notNull().default(0),
  activityScore:        integer("activity_score").notNull().default(0),
  dependencyScore:      integer("dependency_score").notNull().default(0),
  deploymentScore:      integer("deployment_score").notNull().default(0),
  documentationScore:   integer("documentation_score").notNull().default(0),
  automationScore:      integer("automation_score").notNull().default(0),
  missingAssets:        jsonb("missing_assets").notNull().default([]),    // string[] — asset types missing
  healthWarnings:       jsonb("health_warnings").notNull().default([]),   // string[] — human-readable warnings
  recommendations:      jsonb("recommendations").notNull().default([]),   // string[]
  computedAt:           timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Mutable per-project aggregate — upserted on every health recompute */
export const projectRegistry = pgTable("project_registry", {
  id:            serial("id").primaryKey(),
  projectId:     integer("project_id").notNull().unique(),
  userId:        integer("user_id").notNull(),
  businessId:    integer("business_id"),
  workspaceId:   integer("workspace_id"),
  projectName:   text("project_name").notNull(),
  projectType:   text("project_type").notNull(),
  status:        text("status").notNull().default("active"),
  assetCount:    integer("asset_count").notNull().default(0),
  healthScore:   integer("health_score").notNull().default(0),
  lastActivity:  timestamp("last_activity", { withTimezone: true }),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Append-only workspace-level runtime snapshots */
export const workspaceSnapshots = pgTable("workspace_snapshots", {
  id:                  serial("id").primaryKey(),
  userId:              integer("user_id"),
  totalBusinesses:     integer("total_businesses").notNull().default(0),
  totalWorkspaces:     integer("total_workspaces").notNull().default(0),
  totalProjects:       integer("total_projects").notNull().default(0),
  totalAssets:         integer("total_assets").notNull().default(0),
  activeProjects:      integer("active_projects").notNull().default(0),
  deployedAssets:      integer("deployed_assets").notNull().default(0),
  avgHealthScore:      integer("avg_health_score").notNull().default(0),
  lawApplied:          boolean("law_applied").notNull().default(true),
  snapshotData:        jsonb("snapshot_data").notNull().default({}),
  createdAt:           timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Reusable project templates — seed with built-in scaffolds */
export const projectTemplates = pgTable("project_templates", {
  id:           serial("id").primaryKey(),
  templateName: text("template_name").notNull(),
  templateType: text("template_type").notNull(),  // website | crm | automation | dashboard | saas | custom
  description:  text("description").notNull().default(""),
  requiredAssets: jsonb("required_assets").notNull().default([]),   // AssetType[]
  optionalAssets: jsonb("optional_assets").notNull().default([]),   // AssetType[]
  defaultPhase:   text("default_phase").notNull().default("planning"),
  isBuiltin:      boolean("is_builtin").notNull().default(false),
  metadata:       jsonb("metadata").notNull().default({}),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
