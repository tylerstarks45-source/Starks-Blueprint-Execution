// ── Build 048: Unified Business Asset Framework (UBAF) ────────────────────────
import {
  pgTable, serial, integer, text, boolean, timestamp, jsonb, unique, index,
} from "drizzle-orm/pg-core";

// ── 1. asset_classes ──────────────────────────────────────────────────────────
// Seed: 30 canonical classes defined in spec. Never updated, only extended.
export const assetClasses = pgTable("asset_classes", {
  id:              serial("id").primaryKey(),
  classKey:        text("class_key").notNull().unique(),        // e.g. "website", "ai_agent"
  displayName:     text("display_name").notNull(),              // e.g. "Website", "AI Agent"
  category:        text("category").notNull(),                  // product|infrastructure|data|content|commerce|intelligence|process
  parentClassKey:  text("parent_class_key"),                    // optional hierarchy (e.g. "page" → "website")
  description:     text("description").notNull(),
  isBuiltin:       boolean("is_builtin").notNull().default(true),
  supportsVersioning: boolean("supports_versioning").notNull().default(true),
  supportsDeployment: boolean("supports_deployment").notNull().default(false),
  defaultCapabilities: jsonb("default_capabilities").notNull().default("[]"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("idx_asset_classes_key").on(t.classKey),
  index("idx_asset_classes_category").on(t.category),
]);

// ── 2. canonical_assets ───────────────────────────────────────────────────────
// The master record. One row per platform object, ever. Immutable identity.
export const canonicalAssets = pgTable("canonical_assets", {
  id:              serial("id").primaryKey(),
  userId:          integer("user_id").notNull(),
  businessId:      integer("business_id"),
  projectId:       integer("project_id"),
  workspaceId:     integer("workspace_id"),
  classKey:        text("class_key").notNull(),                 // FK → asset_classes.class_key
  canonicalName:   text("canonical_name").notNull(),
  canonicalSlug:   text("canonical_slug").notNull(),
  description:     text("description"),
  builderSource:   text("builder_source"),                     // "website-builder" | "crm" | "automation" | null
  builderObjectId: text("builder_object_id"),                  // native ID in the builder
  status:          text("status").notNull().default("active"), // active|archived|deprecated|deleted
  version:         text("version").notNull().default("1.0.0"),
  isPublic:        boolean("is_public").notNull().default(false),
  tags:            jsonb("tags").notNull().default("[]"),
  externalUrl:     text("external_url"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("idx_canonical_assets_user").on(t.userId),
  index("idx_canonical_assets_business").on(t.businessId),
  index("idx_canonical_assets_project").on(t.projectId),
  index("idx_canonical_assets_class").on(t.classKey),
  index("idx_canonical_assets_status").on(t.status),
  index("idx_canonical_assets_builder").on(t.builderSource, t.builderObjectId),
  index("idx_canonical_assets_created").on(t.createdAt),
]);

// ── 3. asset_metadata ─────────────────────────────────────────────────────────
// Append-only normalized metadata records.
export const assetMetadata = pgTable("asset_metadata", {
  id:              serial("id").primaryKey(),
  assetId:         integer("asset_id").notNull(),
  userId:          integer("user_id").notNull(),
  metadataType:    text("metadata_type").notNull(),             // semantic|operational|technical|business
  key:             text("key").notNull(),
  value:           text("value").notNull(),
  valueType:       text("value_type").notNull().default("string"), // string|number|boolean|json|url|date
  normalizedFrom:  text("normalized_from"),                    // original builder key before normalization
  confidence:      integer("confidence").notNull().default(100),  // 0–100
  source:          text("source").notNull().default("user"),   // user|ash|builder|system
  createdAt:       timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("idx_asset_metadata_asset").on(t.assetId),
  index("idx_asset_metadata_user").on(t.userId),
  index("idx_asset_metadata_type").on(t.metadataType),
  index("idx_asset_metadata_key").on(t.key),
]);

// ── 4. asset_manifests ────────────────────────────────────────────────────────
// Immutable point-in-time snapshot manifests (append-only).
export const assetManifests = pgTable("asset_manifests", {
  id:              serial("id").primaryKey(),
  assetId:         integer("asset_id").notNull(),
  userId:          integer("user_id").notNull(),
  manifestVersion: text("manifest_version").notNull(),         // semver
  classKey:        text("class_key").notNull(),
  canonicalName:   text("canonical_name").notNull(),
  capabilities:    jsonb("capabilities").notNull().default("[]"),
  relationships:   jsonb("relationships").notNull().default("[]"),
  metadata:        jsonb("metadata").notNull().default("{}"),
  lifecycleStage:  text("lifecycle_stage").notNull(),          // draft|active|deprecated|archived
  deploymentInfo:  jsonb("deployment_info").notNull().default("{}"),
  checksum:        text("checksum"),                           // sha256 of canonical JSON for verification
  isLatest:        boolean("is_latest").notNull().default(true),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("idx_asset_manifests_asset").on(t.assetId),
  index("idx_asset_manifests_user").on(t.userId),
  index("idx_asset_manifests_latest").on(t.assetId, t.isLatest),
]);

// ── 5. asset_capabilities ────────────────────────────────────────────────────
// Declares what each asset can do. Append-only (new row per update).
export const assetCapabilities = pgTable("asset_capabilities", {
  id:              serial("id").primaryKey(),
  assetId:         integer("asset_id").notNull(),
  userId:          integer("user_id").notNull(),
  capabilityId:    text("capability_id").notNull(),            // e.g. "can_collect_leads", "can_process_payments"
  capabilityName:  text("capability_name").notNull(),
  category:        text("category").notNull(),                 // revenue|data|communication|automation|analytics|content|integration
  description:     text("description").notNull(),
  isEnabled:       boolean("is_enabled").notNull().default(true),
  parameters:      jsonb("parameters").notNull().default("{}"),
  declaredBy:      text("declared_by").notNull().default("system"), // system|builder|ash|user
  createdAt:       timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("idx_asset_capabilities_asset").on(t.assetId),
  index("idx_asset_capabilities_user").on(t.userId),
  index("idx_asset_capabilities_id").on(t.capabilityId),
  index("idx_asset_capabilities_category").on(t.category),
]);

// ── 6. asset_relationships_v2 ────────────────────────────────────────────────
// Semantic relationships between canonical assets (append-only).
// v2 = richer semantic model vs. UWPS asset_relationships (structural only).
export const assetRelationshipsV2 = pgTable("asset_relationships_v2", {
  id:              serial("id").primaryKey(),
  userId:          integer("user_id").notNull(),
  sourceAssetId:   integer("source_asset_id").notNull(),
  targetAssetId:   integer("target_asset_id").notNull(),
  relationshipType: text("relationship_type").notNull(),        // semantic type
  semanticLabel:   text("semantic_label").notNull(),            // human-readable "collects leads for"
  strength:        text("strength").notNull().default("strong"), // strong|moderate|weak
  direction:       text("direction").notNull().default("directed"), // directed|bidirectional
  isInferred:      boolean("is_inferred").notNull().default(false), // ASH inferred vs user-declared
  confidence:      integer("confidence").notNull().default(100),
  metadata:        jsonb("metadata").notNull().default("{}"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("idx_asset_rels_v2_source").on(t.sourceAssetId),
  index("idx_asset_rels_v2_target").on(t.targetAssetId),
  index("idx_asset_rels_v2_user").on(t.userId),
  index("idx_asset_rels_v2_type").on(t.relationshipType),
]);

// ── 7. asset_translation ─────────────────────────────────────────────────────
// Builder-to-canonical translation records (append-only).
export const assetTranslation = pgTable("asset_translation", {
  id:               serial("id").primaryKey(),
  canonicalAssetId: integer("canonical_asset_id").notNull(),
  userId:           integer("user_id").notNull(),
  builderSource:    text("builder_source").notNull(),          // "website-builder"|"crm"|"automation"|"dashboard"
  builderObjectId:  text("builder_object_id").notNull(),
  builderObjectType: text("builder_object_type").notNull(),    // native type name in builder
  translatedClassKey: text("translated_class_key").notNull(),  // resolved canonical class
  fieldMappings:    jsonb("field_mappings").notNull().default("{}"), // { builderField → canonicalField }
  rawPayload:       jsonb("raw_payload").notNull().default("{}"),    // original builder payload
  translationVersion: text("translation_version").notNull().default("1.0"),
  status:           text("status").notNull().default("active"), // active|stale|superseded
  createdAt:        timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("idx_asset_translation_canonical").on(t.canonicalAssetId),
  index("idx_asset_translation_builder").on(t.builderSource, t.builderObjectId),
  index("idx_asset_translation_user").on(t.userId),
]);

// ── 8. asset_registry (mutable) ───────────────────────────────────────────────
// One mutable aggregate row per canonical asset. Upserted on every change.
export const assetRegistry = pgTable("asset_registry", {
  id:               serial("id").primaryKey(),
  assetId:          integer("asset_id").notNull().unique(),
  userId:           integer("user_id").notNull(),
  classKey:         text("class_key").notNull(),
  canonicalName:    text("canonical_name").notNull(),
  status:           text("status").notNull().default("active"),
  lifecycleStage:   text("lifecycle_stage").notNull().default("active"), // draft|active|deprecated|archived
  capabilityCount:  integer("capability_count").notNull().default(0),
  relationshipCount: integer("relationship_count").notNull().default(0),
  metadataCount:    integer("metadata_count").notNull().default(0),
  manifestVersion:  text("manifest_version"),
  hasTranslation:   boolean("has_translation").notNull().default(false),
  lastActivityAt:   timestamp("last_activity_at"),
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("idx_asset_registry_user").on(t.userId),
  index("idx_asset_registry_class").on(t.classKey),
  index("idx_asset_registry_status").on(t.status),
  index("idx_asset_registry_lifecycle").on(t.lifecycleStage),
]);

// ── 9. asset_snapshots ────────────────────────────────────────────────────────
// Platform-wide asset snapshot (append-only).
export const assetSnapshots = pgTable("asset_snapshots", {
  id:               serial("id").primaryKey(),
  totalAssets:      integer("total_assets").notNull().default(0),
  totalClasses:     integer("total_classes").notNull().default(0),
  totalRelationships: integer("total_relationships").notNull().default(0),
  totalCapabilities: integer("total_capabilities").notNull().default(0),
  totalTranslations: integer("total_translations").notNull().default(0),
  activeAssets:     integer("active_assets").notNull().default(0),
  classBreakdown:   jsonb("class_breakdown").notNull().default("{}"), // { classKey: count }
  capabilityBreakdown: jsonb("capability_breakdown").notNull().default("{}"),
  topRelationshipTypes: jsonb("top_relationship_types").notNull().default("[]"),
  lawApplied:       boolean("law_applied").notNull().default(true),
  snapshotData:     jsonb("snapshot_data").notNull().default("{}"),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

// ── 10. asset_lifecycle ───────────────────────────────────────────────────────
// Lifecycle events for each asset (append-only).
export const assetLifecycle = pgTable("asset_lifecycle", {
  id:              serial("id").primaryKey(),
  assetId:         integer("asset_id").notNull(),
  userId:          integer("user_id").notNull(),
  eventType:       text("event_type").notNull(),               // registered|classified|manifested|translated|activated|deprecated|archived|capability_added|relationship_added|metadata_normalized
  fromStage:       text("from_stage"),
  toStage:         text("to_stage"),
  actor:           text("actor").notNull().default("system"),  // user|ash|system|builder
  summary:         text("summary").notNull(),
  details:         jsonb("details").notNull().default("{}"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("idx_asset_lifecycle_asset").on(t.assetId),
  index("idx_asset_lifecycle_user").on(t.userId),
  index("idx_asset_lifecycle_type").on(t.eventType),
  index("idx_asset_lifecycle_created").on(t.createdAt),
]);
