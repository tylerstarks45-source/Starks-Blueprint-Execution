// ── Build 044: Unified Connections & Integration Hub — Schema ─────────────
import { pgTable, serial, integer, text, real, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

// ── connection_providers ──────────────────────────────────────────────────
// Canonical record for every external provider known to ASH.
// One provider record per integration — Unified Connection Law.
export const connectionProviders = pgTable("connection_providers", {
  id:           serial("id").primaryKey(),
  providerName: text("provider_name").notNull().unique(),
  domain:       text("domain").notNull(),          // ConnectionDomain
  providerType: text("provider_type").notNull(),   // api/oauth/basic/key/certificate/mcp
  version:      text("version"),
  status:       text("status").notNull().default("active"), // active/inactive/deprecated/pending
  baseUrl:      text("base_url"),
  docsUrl:      text("docs_url"),
  metadata:     jsonb("metadata").notNull().default({}),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

// ── provider_capabilities ─────────────────────────────────────────────────
// What each provider is capable of — capability catalog per provider.
export const providerCapabilities = pgTable("provider_capabilities", {
  id:              serial("id").primaryKey(),
  providerId:      integer("provider_id").notNull(),
  capabilityName:  text("capability_name").notNull(),
  capabilityType:  text("capability_type").notNull(), // read/write/execute/webhook/stream/batch
  description:     text("description"),
  rateLimit:       integer("rate_limit"),             // requests per minute
  quotaLimit:      integer("quota_limit"),            // requests per day
  apiVersion:      text("api_version"),
  supported:       boolean("supported").notNull().default(true),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});

// ── connection_profiles ───────────────────────────────────────────────────
// A user's active connection to a provider — scoped to userId + providerId.
export const connectionProfiles = pgTable("connection_profiles", {
  id:              serial("id").primaryKey(),
  userId:          integer("user_id").notNull(),
  providerId:      integer("provider_id").notNull(),
  status:          text("status").notNull().default("created"),
  // created/connected/suspended/revoked/expired/migrated/archived
  authProfileId:   text("auth_profile_id"),         // reference to auth record
  connectedAt:     timestamp("connected_at"),
  lastActiveAt:    timestamp("last_active_at"),
  expiresAt:       timestamp("expires_at"),
  metadata:        jsonb("metadata").notNull().default({}),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});

// ── credential_references ─────────────────────────────────────────────────
// NEVER stores actual credentials — only references into the platform credential vault.
// Unified Connection Law: no connector owns credentials.
export const credentialReferences = pgTable("credential_references", {
  id:                  serial("id").primaryKey(),
  connectionProfileId: integer("connection_profile_id").notNull(),
  providerId:          integer("provider_id").notNull(),
  credentialRefKey:    text("credential_ref_key").notNull(), // key in platform credential vault
  credentialType:      text("credential_type").notNull(),    // api_key/oauth_token/basic/certificate
  isActive:            boolean("is_active").notNull().default(true),
  rotationDue:         timestamp("rotation_due"),
  createdAt:           timestamp("created_at").notNull().defaultNow(),
});

// ── connection_health ─────────────────────────────────────────────────────
// Availability, latency, quota, rate-limit, auth state, version compatibility.
export const connectionHealth = pgTable("connection_health", {
  id:                  serial("id").primaryKey(),
  providerId:          integer("provider_id").notNull(),
  connectionProfileId: integer("connection_profile_id"),
  availability:        real("availability").notNull().default(1.0),
  latencyMs:           integer("latency_ms").notNull().default(0),
  quotaUsed:           integer("quota_used").notNull().default(0),
  quotaLimit:          integer("quota_limit"),
  rateLimitUsed:       integer("rate_limit_used").notNull().default(0),
  rateLimitMax:        integer("rate_limit_max"),
  authState:           text("auth_state").notNull().default("valid"),
  // valid/expired/revoked/unknown
  versionCompatible:   boolean("version_compatible").notNull().default(true),
  healthScore:         real("health_score").notNull().default(1.0),
  measuredAt:          timestamp("measured_at").notNull().defaultNow(),
});

// ── provider_compatibility ────────────────────────────────────────────────
// Which providers can satisfy the same capabilities — enables failover & comparison.
export const providerCompatibility = pgTable("provider_compatibility", {
  id:                    serial("id").primaryKey(),
  providerId:            integer("provider_id").notNull(),
  capabilityName:        text("capability_name").notNull(),
  compatibleWith:        jsonb("compatible_with").notNull().default([]),        // array of provider IDs
  alternativeProviderIds:jsonb("alternative_provider_ids").notNull().default([]),
  failoverScore:         real("failover_score").notNull().default(0.5),
  notes:                 text("notes"),
  createdAt:             timestamp("created_at").notNull().defaultNow(),
});

// ── connection_registry ───────────────────────────────────────────────────
// Mutable per-domain aggregation — provider and connection counts.
export const connectionRegistry = pgTable("connection_registry", {
  id:                serial("id").primaryKey(),
  domain:            text("domain").notNull().unique(),
  providerCount:     integer("provider_count").notNull().default(0),
  activeConnections: integer("active_connections").notNull().default(0),
  healthyProviders:  integer("healthy_providers").notNull().default(0),
  lastUpdated:       timestamp("last_updated"),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
});

// ── connection_snapshots ──────────────────────────────────────────────────
// Point-in-time view of the full connections hub state.
export const connectionSnapshots = pgTable("connection_snapshots", {
  id:                 serial("id").primaryKey(),
  userId:             integer("user_id"),
  totalProviders:     integer("total_providers").notNull().default(0),
  totalConnections:   integer("total_connections").notNull().default(0),
  healthyConnections: integer("healthy_connections").notNull().default(0),
  avgHealthScore:     real("avg_health_score").notNull().default(0),
  domainsRegistered:  integer("domains_registered").notNull().default(0),
  riskFlags:          integer("risk_flags").notNull().default(0),
  lawApplied:         boolean("law_applied").notNull().default(true),
  snapshotData:       jsonb("snapshot_data").notNull().default({}),
  createdAt:          timestamp("created_at").notNull().defaultNow(),
});

// ── connection_audit ──────────────────────────────────────────────────────
// Immutable audit trail for every connection lifecycle event.
export const connectionAudit = pgTable("connection_audit", {
  id:                  serial("id").primaryKey(),
  providerId:          integer("provider_id"),
  connectionProfileId: integer("connection_profile_id"),
  auditType:           text("audit_type").notNull(),
  // registered/connected/disconnected/health_check/rotation/revoked/migrated
  actor:               text("actor").notNull(),           // system/user/admin
  details:             jsonb("details").notNull().default({}),
  createdAt:           timestamp("created_at").notNull().defaultNow(),
});
