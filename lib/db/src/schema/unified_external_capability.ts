import {
  pgTable, serial, integer, text, boolean, timestamp, jsonb, real, index, uniqueIndex
} from "drizzle-orm/pg-core";

// ─── capability_domains ───────────────────────────────────────────────────────
// Canonical domain taxonomy — every capability belongs to a domain.
export const ueciosDomains = pgTable(
  "uecios_domains",
  {
    id:           serial("id").primaryKey(),
    domainId:     text("domain_id").notNull(),
    name:         text("name").notNull(),
    slug:         text("slug").notNull(),
    description:  text("description"),
    parentDomain: text("parent_domain"),
    icon:         text("icon"),
    isSystem:     boolean("is_system").default(true),
    providerCount: integer("provider_count").default(0),
    metadata:     jsonb("metadata").default("{}"),
    createdAt:    timestamp("created_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_capability_domains_id").on(t.domainId),
    uniqueIndex("idx_capability_domains_slug").on(t.slug),
  ]
);

// ─── capability_providers ─────────────────────────────────────────────────────
// UECIOS provider catalog — richer than connection_providers (Build 044).
// Tracks every external platform ASH can interact with.
export const capabilityProviders = pgTable(
  "capability_providers",
  {
    id:              serial("id").primaryKey(),
    providerId:      text("provider_id").notNull(),
    name:            text("name").notNull(),
    slug:            text("slug").notNull(),
    domains:         jsonb("domains").default("[]"),
    // ["payments", "billing", ...]
    authMethods:     jsonb("auth_methods").default("[]"),
    // ["api_key", "oauth2", "webhook"]
    status:          text("status").notNull().default("registered"),
    // registered | active | deprecated | suspended | unknown
    existingConnector: boolean("existing_connector").default(false),
    // true if a connector already exists in lib/connectors/
    connectorId:     text("connector_id"),
    // references the connector id in the connector registry
    registeredAt:    timestamp("registered_at").defaultNow(),
    docsUrl:         text("docs_url"),
    baseUrl:         text("base_url"),
    apiVersion:      text("api_version"),
    isOfficiallySupported: boolean("is_officially_supported").default(false),
    capabilityCount: integer("capability_count").default(0),
    healthScore:     real("health_score").default(1.0),
    metadata:        jsonb("metadata").default("{}"),
    createdAt:       timestamp("created_at").defaultNow(),
    updatedAt:       timestamp("updated_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_capability_providers_id").on(t.providerId),
    uniqueIndex("idx_capability_providers_slug").on(t.slug),
    index("idx_capability_providers_status").on(t.status),
  ]
);

// ─── provider_manifests ───────────────────────────────────────────────────────
// Full manifest for a provider — capabilities, auth requirements, limits.
export const providerManifests = pgTable(
  "provider_manifests",
  {
    id:              serial("id").primaryKey(),
    manifestId:      text("manifest_id").notNull(),
    providerId:      text("provider_id").notNull(),
    version:         text("version").notNull().default("1.0.0"),
    capabilities:    jsonb("capabilities").default("[]"),
    // [{ id, name, domain, description }]
    authRequirements: jsonb("auth_requirements").default("{}"),
    // { type: "oauth2", scopes: [...], tokenUrl: "..." }
    rateLimits:      jsonb("rate_limits").default("{}"),
    // { requestsPerMinute: 100, requestsPerDay: 10000 }
    quotas:          jsonb("quotas").default("{}"),
    webhookSupport:  boolean("webhook_support").default(false),
    webhookEvents:   jsonb("webhook_events").default("[]"),
    sdkLanguages:    jsonb("sdk_languages").default("[]"),
    compliance:      jsonb("compliance").default("[]"),
    // ["SOC2", "GDPR", "HIPAA"]
    regions:         jsonb("regions").default("[]"),
    isActive:        boolean("is_active").default(true),
    metadata:        jsonb("metadata").default("{}"),
    createdAt:       timestamp("created_at").defaultNow(),
    updatedAt:       timestamp("updated_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_provider_manifests_id").on(t.manifestId),
    index("idx_provider_manifests_provider").on(t.providerId),
  ]
);

// ─── uecios_capabilities ──────────────────────────────────────────────────────
// UECIOS-level capability registry — maps providers to domains.
// NOTE: renamed from `provider_capabilities` (spec) to avoid conflict with
// Build 044's `provider_capabilities` table in connections_hub schema.
export const ueciosCapabilities = pgTable(
  "uecios_capabilities",
  {
    id:              serial("id").primaryKey(),
    capabilityId:    text("capability_id").notNull(),
    providerId:      text("provider_id").notNull(),
    domainSlug:      text("domain_slug").notNull(),
    name:            text("name").notNull(),
    description:     text("description"),
    capabilityType:  text("capability_type").notNull(),
    // read | write | execute | webhook | stream | batch | oauth | billing | commerce
    status:          text("status").notNull().default("available"),
    // available | limited | deprecated | unavailable
    existingAction:  text("existing_action"),
    // if this maps to an existing connector action
    isRegistered:    boolean("is_registered").default(false),
    // registered means it's actively used
    metadata:        jsonb("metadata").default("{}"),
    createdAt:       timestamp("created_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_uecios_capabilities_id").on(t.capabilityId),
    index("idx_uecios_capabilities_provider").on(t.providerId),
    index("idx_uecios_capabilities_domain").on(t.domainSlug),
  ]
);

// ─── provider_versions ────────────────────────────────────────────────────────
export const providerVersions = pgTable(
  "provider_versions",
  {
    id:           serial("id").primaryKey(),
    versionId:    text("version_id").notNull(),
    providerId:   text("provider_id").notNull(),
    version:      text("version").notNull(),
    changeType:   text("change_type").notNull().default("minor"),
    // major | minor | patch | breaking
    releaseDate:  timestamp("release_date"),
    isSupported:  boolean("is_supported").default(true),
    isLatest:     boolean("is_latest").default(false),
    changeNotes:  text("change_notes"),
    breakingChanges: jsonb("breaking_changes").default("[]"),
    metadata:     jsonb("metadata").default("{}"),
    createdAt:    timestamp("created_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_provider_versions_id").on(t.versionId),
    index("idx_provider_versions_provider").on(t.providerId),
  ]
);

// ─── provider_connections ─────────────────────────────────────────────────────
// UECIOS-level active connections — extends connection_profiles concept.
export const providerConnections = pgTable(
  "provider_connections",
  {
    id:              serial("id").primaryKey(),
    connectionId:    text("connection_id").notNull(),
    userId:          integer("user_id"),
    businessId:      integer("business_id"),
    providerId:      text("provider_id").notNull(),
    status:          text("status").notNull().default("pending"),
    // pending | connected | suspended | revoked | expired | drifted
    authMethod:      text("auth_method").notNull().default("api_key"),
    // api_key | oauth2 | webhook | basic | certificate
    connectedAt:     timestamp("connected_at"),
    lastHealthCheck: timestamp("last_health_check"),
    lastActiveAt:    timestamp("last_active_at"),
    expiresAt:       timestamp("expires_at"),
    driftDetectedAt: timestamp("drift_detected_at"),
    healthScore:     real("health_score").default(1.0),
    // 0-1
    scopeIds:        jsonb("scope_ids").default("[]"),
    metadata:        jsonb("metadata").default("{}"),
    createdAt:       timestamp("created_at").defaultNow(),
    updatedAt:       timestamp("updated_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_provider_connections_id").on(t.connectionId),
    index("idx_provider_connections_user").on(t.userId),
    index("idx_provider_connections_provider").on(t.providerId),
    index("idx_provider_connections_status").on(t.status),
  ]
);

// ─── provider_credentials ─────────────────────────────────────────────────────
// Credential lifecycle tracking — NEVER stores values, only references.
export const providerCredentials = pgTable(
  "provider_credentials",
  {
    id:               serial("id").primaryKey(),
    credentialId:     text("credential_id").notNull(),
    connectionId:     text("connection_id").notNull(),
    providerId:       text("provider_id").notNull(),
    userId:           integer("user_id"),
    credentialType:   text("credential_type").notNull(),
    // api_key | oauth_token | refresh_token | webhook_secret | basic | certificate
    vaultRefKey:      text("vault_ref_key").notNull(),
    // reference into user_credentials vault — no actual value stored
    status:           text("status").notNull().default("active"),
    // active | expired | revoked | rotating | invalid
    issuedAt:         timestamp("issued_at"),
    expiresAt:        timestamp("expires_at"),
    lastRotatedAt:    timestamp("last_rotated_at"),
    rotationDueAt:    timestamp("rotation_due_at"),
    metadata:         jsonb("metadata").default("{}"),
    createdAt:        timestamp("created_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_provider_credentials_id").on(t.credentialId),
    index("idx_provider_credentials_connection").on(t.connectionId),
    index("idx_provider_credentials_user").on(t.userId),
    index("idx_provider_credentials_status").on(t.status),
  ]
);

// ─── provider_oauth ───────────────────────────────────────────────────────────
// OAuth token lifecycle management — references only, no token values.
export const providerOauth = pgTable(
  "provider_oauth",
  {
    id:              serial("id").primaryKey(),
    oauthId:         text("oauth_id").notNull(),
    connectionId:    text("connection_id").notNull(),
    providerId:      text("provider_id").notNull(),
    userId:          integer("user_id"),
    oauthVersion:    text("oauth_version").notNull().default("2.0"),
    // 1.0 | 2.0 | 2.0_pkce
    grantType:       text("grant_type").default("authorization_code"),
    // authorization_code | client_credentials | refresh_token | device_code
    scopes:          jsonb("scopes").default("[]"),
    tokenStatus:     text("token_status").notNull().default("pending"),
    // pending | active | refreshing | expired | revoked
    tokenExpiresAt:  timestamp("token_expires_at"),
    refreshTokenRef: text("refresh_token_ref"),
    // vault reference to refresh token
    lastRefreshAt:   timestamp("last_refresh_at"),
    refreshFailCount: integer("refresh_fail_count").default(0),
    metadata:        jsonb("metadata").default("{}"),
    createdAt:       timestamp("created_at").defaultNow(),
    updatedAt:       timestamp("updated_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_provider_oauth_id").on(t.oauthId),
    index("idx_provider_oauth_connection").on(t.connectionId),
    index("idx_provider_oauth_user").on(t.userId),
    index("idx_provider_oauth_status").on(t.tokenStatus),
  ]
);

// ─── provider_permissions ─────────────────────────────────────────────────────
export const providerPermissions = pgTable(
  "provider_permissions",
  {
    id:             serial("id").primaryKey(),
    permissionId:   text("permission_id").notNull(),
    connectionId:   text("connection_id").notNull(),
    providerId:     text("provider_id").notNull(),
    userId:         integer("user_id"),
    permissionType: text("permission_type").notNull(),
    // read | write | admin | execute | delete | webhook
    resourceType:   text("resource_type"),
    // what the permission applies to (e.g., "payments", "customers")
    isGranted:      boolean("is_granted").default(false),
    isVerified:     boolean("is_verified").default(false),
    grantedAt:      timestamp("granted_at"),
    revokedAt:      timestamp("revoked_at"),
    verifiedAt:     timestamp("verified_at"),
    metadata:       jsonb("metadata").default("{}"),
    createdAt:      timestamp("created_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_provider_permissions_id").on(t.permissionId),
    index("idx_provider_permissions_connection").on(t.connectionId),
    index("idx_provider_permissions_user").on(t.userId),
  ]
);

// ─── provider_scopes ─────────────────────────────────────────────────────────
export const providerScopes = pgTable(
  "provider_scopes",
  {
    id:             serial("id").primaryKey(),
    scopeId:        text("scope_id").notNull(),
    connectionId:   text("connection_id").notNull(),
    providerId:     text("provider_id").notNull(),
    userId:         integer("user_id"),
    scopeName:      text("scope_name").notNull(),
    // e.g. "payments:read", "customers:write"
    isGranted:      boolean("is_granted").default(false),
    isRequired:     boolean("is_required").default(false),
    grantedAt:      timestamp("granted_at"),
    revokedAt:      timestamp("revoked_at"),
    metadata:       jsonb("metadata").default("{}"),
    createdAt:      timestamp("created_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_provider_scopes_id").on(t.scopeId),
    index("idx_provider_scopes_connection").on(t.connectionId),
    index("idx_provider_scopes_user").on(t.userId),
  ]
);

// ─── provider_webhooks ────────────────────────────────────────────────────────
// Provider-side webhook registrations (inbound from providers to this platform).
// Different from webhook_endpoints (user-defined outbound webhooks).
export const providerWebhooks = pgTable(
  "provider_webhooks",
  {
    id:              serial("id").primaryKey(),
    webhookId:       text("webhook_id").notNull(),
    connectionId:    text("connection_id").notNull(),
    providerId:      text("provider_id").notNull(),
    userId:          integer("user_id"),
    endpointUrl:     text("endpoint_url"),
    events:          jsonb("events").default("[]"),
    // subscribed event types
    status:          text("status").notNull().default("pending"),
    // pending | active | failed | suspended | deleted
    failureCount:    integer("failure_count").default(0),
    lastDeliveryAt:  timestamp("last_delivery_at"),
    lastFailureAt:   timestamp("last_failure_at"),
    lastFailureMsg:  text("last_failure_msg"),
    secretRef:       text("secret_ref"),
    // vault reference to webhook signing secret
    metadata:        jsonb("metadata").default("{}"),
    createdAt:       timestamp("created_at").defaultNow(),
    updatedAt:       timestamp("updated_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_provider_webhooks_id").on(t.webhookId),
    index("idx_provider_webhooks_connection").on(t.connectionId),
    index("idx_provider_webhooks_provider").on(t.providerId),
    index("idx_provider_webhooks_status").on(t.status),
  ]
);

// ─── provider_sync_jobs ───────────────────────────────────────────────────────
export const providerSyncJobs = pgTable(
  "provider_sync_jobs",
  {
    id:              serial("id").primaryKey(),
    syncJobId:       text("sync_job_id").notNull(),
    connectionId:    text("connection_id"),
    providerId:      text("provider_id").notNull(),
    userId:          integer("user_id"),
    syncType:        text("sync_type").notNull(),
    // health_check | credential_refresh | scope_verify | drift_detect | quota_sync | full_sync
    status:          text("status").notNull().default("pending"),
    // pending | running | completed | failed | cancelled
    scheduledAt:     timestamp("scheduled_at"),
    startedAt:       timestamp("started_at"),
    completedAt:     timestamp("completed_at"),
    failedAt:        timestamp("failed_at"),
    errorMessage:    text("error_message"),
    retryCount:      integer("retry_count").default(0),
    maxRetries:      integer("max_retries").default(3),
    result:          jsonb("result").default("{}"),
    metadata:        jsonb("metadata").default("{}"),
    createdAt:       timestamp("created_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_provider_sync_jobs_id").on(t.syncJobId),
    index("idx_provider_sync_jobs_provider").on(t.providerId),
    index("idx_provider_sync_jobs_status").on(t.status),
    index("idx_provider_sync_jobs_user").on(t.userId),
  ]
);

// ─── provider_sync_history ────────────────────────────────────────────────────
export const providerSyncHistory = pgTable(
  "provider_sync_history",
  {
    id:            serial("id").primaryKey(),
    historyId:     text("history_id").notNull(),
    syncJobId:     text("sync_job_id").notNull(),
    connectionId:  text("connection_id"),
    providerId:    text("provider_id").notNull(),
    userId:        integer("user_id"),
    syncType:      text("sync_type").notNull(),
    outcome:       text("outcome").notNull(),
    // success | failure | partial | timeout | cancelled
    durationMs:    integer("duration_ms"),
    recordsProcessed: integer("records_processed").default(0),
    errorsFound:   integer("errors_found").default(0),
    summary:       jsonb("summary").default("{}"),
    createdAt:     timestamp("created_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_provider_sync_history_id").on(t.historyId),
    index("idx_provider_sync_history_provider").on(t.providerId),
    index("idx_provider_sync_history_job").on(t.syncJobId),
  ]
);

// ─── provider_health ──────────────────────────────────────────────────────────
// UECIOS-level health monitoring. Different from Build 044's connection_health.
export const providerHealth = pgTable(
  "provider_health",
  {
    id:                serial("id").primaryKey(),
    healthId:          text("health_id").notNull(),
    providerId:        text("provider_id").notNull(),
    connectionId:      text("connection_id"),
    userId:            integer("user_id"),
    healthStatus:      text("health_status").notNull().default("unknown"),
    // healthy | degraded | unavailable | unknown | maintenance
    availabilityScore: real("availability_score").default(1.0),
    // 0-1
    latencyMs:         integer("latency_ms"),
    authState:         text("auth_state").default("valid"),
    // valid | expired | revoked | unknown
    quotaState:        text("quota_state").default("ok"),
    // ok | warning | critical | exceeded
    rateLimitState:    text("rate_limit_state").default("ok"),
    // ok | warning | throttled
    versionCompatible: boolean("version_compatible").default(true),
    driftDetected:     boolean("drift_detected").default(false),
    issues:            jsonb("issues").default("[]"),
    checkedAt:         timestamp("checked_at").defaultNow(),
    metadata:          jsonb("metadata").default("{}"),
    createdAt:         timestamp("created_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_provider_health_id").on(t.healthId),
    index("idx_provider_health_provider").on(t.providerId),
    index("idx_provider_health_user").on(t.userId),
    index("idx_provider_health_status").on(t.healthStatus),
  ]
);

// ─── provider_quotas ─────────────────────────────────────────────────────────
export const providerQuotas = pgTable(
  "provider_quotas",
  {
    id:              serial("id").primaryKey(),
    quotaId:         text("quota_id").notNull(),
    providerId:      text("provider_id").notNull(),
    connectionId:    text("connection_id"),
    userId:          integer("user_id"),
    quotaType:       text("quota_type").notNull(),
    // requests_per_minute | requests_per_day | tokens_per_minute | bandwidth_gb | storage_gb | seats
    quotaLimit:      integer("quota_limit"),
    quotaUsed:       integer("quota_used").default(0),
    resetAt:         timestamp("reset_at"),
    usagePercent:    real("usage_percent").default(0),
    // 0-100
    alertThreshold:  real("alert_threshold").default(80),
    // % at which to alert
    status:          text("status").default("ok"),
    // ok | warning | critical | exceeded
    metadata:        jsonb("metadata").default("{}"),
    updatedAt:       timestamp("updated_at").defaultNow(),
    createdAt:       timestamp("created_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_provider_quotas_id").on(t.quotaId),
    index("idx_provider_quotas_provider").on(t.providerId),
    index("idx_provider_quotas_user").on(t.userId),
  ]
);

// ─── provider_rate_limits ─────────────────────────────────────────────────────
export const providerRateLimits = pgTable(
  "provider_rate_limits",
  {
    id:              serial("id").primaryKey(),
    rateLimitId:     text("rate_limit_id").notNull(),
    providerId:      text("provider_id").notNull(),
    connectionId:    text("connection_id"),
    userId:          integer("user_id"),
    windowType:      text("window_type").notNull().default("minute"),
    // second | minute | hour | day
    limitValue:      integer("limit_value"),
    usedValue:       integer("used_value").default(0),
    remainingValue:  integer("remaining_value"),
    resetAt:         timestamp("reset_at"),
    status:          text("status").default("ok"),
    // ok | warning | throttled | blocked
    retryAfterMs:    integer("retry_after_ms"),
    metadata:        jsonb("metadata").default("{}"),
    updatedAt:       timestamp("updated_at").defaultNow(),
    createdAt:       timestamp("created_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_provider_rate_limits_id").on(t.rateLimitId),
    index("idx_provider_rate_limits_provider").on(t.providerId),
    index("idx_provider_rate_limits_user").on(t.userId),
  ]
);

// ─── provider_diagnostics ─────────────────────────────────────────────────────
export const providerDiagnostics = pgTable(
  "provider_diagnostics",
  {
    id:              serial("id").primaryKey(),
    diagnosticId:    text("diagnostic_id").notNull(),
    providerId:      text("provider_id").notNull(),
    connectionId:    text("connection_id"),
    userId:          integer("user_id"),
    engineName:      text("engine_name").notNull(),
    severity:        text("severity").notNull(),
    // info | warning | critical
    category:        text("category").notNull(),
    // auth_failure | quota_exceeded | rate_limited | webhook_failure | sync_failure
    // drift_detected | version_incompatible | credential_expired | permission_missing
    title:           text("title").notNull(),
    description:     text("description"),
    recommendation:  text("recommendation"),
    isResolved:      boolean("is_resolved").default(false),
    resolvedAt:      timestamp("resolved_at"),
    metadata:        jsonb("metadata").default("{}"),
    createdAt:       timestamp("created_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_provider_diagnostics_id").on(t.diagnosticId),
    index("idx_provider_diagnostics_provider").on(t.providerId),
    index("idx_provider_diagnostics_severity").on(t.severity),
    index("idx_provider_diagnostics_user").on(t.userId),
  ]
);

// ─── provider_recommendations ─────────────────────────────────────────────────
// Infrastructure and capability recommendations — visible only to FOUNDER_ADMIN / SUPER_ADMIN.
export const providerRecommendations = pgTable(
  "provider_recommendations",
  {
    id:                  serial("id").primaryKey(),
    recommendationId:    text("recommendation_id").notNull(),
    targetRole:          text("target_role").notNull().default("FOUNDER_ADMIN"),
    // FOUNDER_ADMIN | SUPER_ADMIN (never regular users)
    category:            text("category").notNull(),
    // missing_provider | upgrade_tier | add_capability | move_workload
    // gpu_deficiency | storage_deficiency | database_deficiency | ai_model_deficiency
    // cloud_deficiency | infrastructure_deficiency
    title:               text("title").notNull(),
    description:         text("description"),
    recommendedAction:   text("recommended_action"),
    priority:            integer("priority").default(5),
    // 1 (highest) - 10 (lowest)
    estimatedImpact:     text("estimated_impact"),
    suggestedProviderId: text("suggested_provider_id"),
    status:              text("status").notNull().default("open"),
    // open | acknowledged | actioned | dismissed
    acknowledgedAt:      timestamp("acknowledged_at"),
    actionedAt:          timestamp("actioned_at"),
    dismissedAt:         timestamp("dismissed_at"),
    expiresAt:           timestamp("expires_at"),
    metadata:            jsonb("metadata").default("{}"),
    createdAt:           timestamp("created_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_provider_recommendations_id").on(t.recommendationId),
    index("idx_provider_recommendations_category").on(t.category),
    index("idx_provider_recommendations_status").on(t.status),
    index("idx_provider_recommendations_role").on(t.targetRole),
  ]
);

// ─── provider_registry ────────────────────────────────────────────────────────
// Mutable singleton — the only table updated in-place.
export const providerRegistry = pgTable(
  "provider_registry",
  {
    id:                    serial("id").primaryKey(),
    registryId:            text("registry_id").notNull(),
    userId:                integer("user_id"),
    // null = platform-level, otherwise user-scoped
    totalProviders:        integer("total_providers").default(0),
    activeProviders:       integer("active_providers").default(0),
    connectedProviders:    integer("connected_providers").default(0),
    healthyProviders:      integer("healthy_providers").default(0),
    degradedProviders:     integer("degraded_providers").default(0),
    expiredCredentials:    integer("expired_credentials").default(0),
    pendingSync:           integer("pending_sync").default(0),
    totalCapabilities:     integer("total_capabilities").default(0),
    activeConnections:     integer("active_connections").default(0),
    openRecommendations:   integer("open_recommendations").default(0),
    criticalDiagnostics:   integer("critical_diagnostics").default(0),
    integrationReadiness:  real("integration_readiness").default(0),
    // 0-100 platform integration readiness score
    missingDomains:        jsonb("missing_domains").default("[]"),
    infrastructureAlerts:  jsonb("infrastructure_alerts").default("[]"),
    lastAnalyzedAt:        timestamp("last_analyzed_at"),
    metadata:              jsonb("metadata").default("{}"),
    createdAt:             timestamp("created_at").defaultNow(),
    updatedAt:             timestamp("updated_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_provider_registry_id").on(t.registryId),
    index("idx_provider_registry_user").on(t.userId),
  ]
);

// ─── provider_snapshots ───────────────────────────────────────────────────────
export const providerSnapshots = pgTable(
  "provider_snapshots",
  {
    id:                   serial("id").primaryKey(),
    snapshotId:           text("snapshot_id").notNull(),
    userId:               integer("user_id"),
    totalProviders:       integer("total_providers").default(0),
    activeProviders:      integer("active_providers").default(0),
    connectedProviders:   integer("connected_providers").default(0),
    healthyProviders:     integer("healthy_providers").default(0),
    expiredCredentials:   integer("expired_credentials").default(0),
    activeConnections:    integer("active_connections").default(0),
    integrationReadiness: real("integration_readiness").default(0),
    metadata:             jsonb("metadata").default("{}"),
    createdAt:            timestamp("created_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_provider_snapshots_id").on(t.snapshotId),
    index("idx_provider_snapshots_user").on(t.userId),
  ]
);

// ─── provider_dependencies ────────────────────────────────────────────────────
// Maps dependencies between providers (e.g., Stripe → Plaid for bank linking).
export const providerDependencies = pgTable(
  "provider_dependencies",
  {
    id:              serial("id").primaryKey(),
    dependencyId:    text("dependency_id").notNull(),
    sourceProviderId: text("source_provider_id").notNull(),
    targetProviderId: text("target_provider_id").notNull(),
    dependencyType:  text("dependency_type").notNull(),
    // required | optional | recommended | alternative
    description:     text("description"),
    isActive:        boolean("is_active").default(true),
    metadata:        jsonb("metadata").default("{}"),
    createdAt:       timestamp("created_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_provider_dependencies_id").on(t.dependencyId),
    index("idx_provider_dependencies_source").on(t.sourceProviderId),
    index("idx_provider_dependencies_target").on(t.targetProviderId),
  ]
);

// ─── provider_events ─────────────────────────────────────────────────────────
export const providerEvents = pgTable(
  "provider_events",
  {
    id:           serial("id").primaryKey(),
    eventId:      text("event_id").notNull(),
    providerId:   text("provider_id").notNull(),
    connectionId: text("connection_id"),
    userId:       integer("user_id"),
    eventType:    text("event_type").notNull(),
    // connected | disconnected | credential_rotated | health_changed | quota_exceeded
    // rate_limited | sync_completed | drift_detected | webhook_received | oauth_refreshed
    payload:      jsonb("payload").default("{}"),
    severity:     text("severity").default("info"),
    // info | warning | critical
    metadata:     jsonb("metadata").default("{}"),
    createdAt:    timestamp("created_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_provider_events_id").on(t.eventId),
    index("idx_provider_events_provider").on(t.providerId),
    index("idx_provider_events_type").on(t.eventType),
    index("idx_provider_events_user").on(t.userId),
  ]
);

// ─── provider_lifecycle ───────────────────────────────────────────────────────
export const providerLifecycle = pgTable(
  "provider_lifecycle",
  {
    id:              serial("id").primaryKey(),
    lifecycleId:     text("lifecycle_id").notNull(),
    providerId:      text("provider_id").notNull(),
    connectionId:    text("connection_id"),
    userId:          integer("user_id"),
    lifecycleStage:  text("lifecycle_stage").notNull(),
    // discovery | evaluation | authorization | activation | monitoring | maintenance | deprecation | termination
    previousStage:   text("previous_stage"),
    transitionReason: text("transition_reason"),
    triggeredBy:     text("triggered_by").default("system"),
    // system | user | admin | auto
    metadata:        jsonb("metadata").default("{}"),
    createdAt:       timestamp("created_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_provider_lifecycle_id").on(t.lifecycleId),
    index("idx_provider_lifecycle_provider").on(t.providerId),
    index("idx_provider_lifecycle_user").on(t.userId),
  ]
);

// ─── provider_contracts ───────────────────────────────────────────────────────
// SLA, rate, and terms contracts with external providers.
// Different from commerce `contracts` table.
export const providerContracts = pgTable(
  "provider_contracts",
  {
    id:              serial("id").primaryKey(),
    contractId:      text("contract_id").notNull(),
    providerId:      text("provider_id").notNull(),
    userId:          integer("user_id"),
    contractType:    text("contract_type").notNull(),
    // sla | rate_agreement | terms_of_service | data_processing | partnership
    tier:            text("tier"),
    // free | starter | growth | business | enterprise | custom
    monthlyLimit:    integer("monthly_limit"),
    // request limit if applicable
    costPerUnit:     real("cost_per_unit"),
    currency:        text("currency").default("USD"),
    slaUptime:       real("sla_uptime"),
    // e.g. 99.9
    termsUrl:        text("terms_url"),
    startDate:       timestamp("start_date"),
    endDate:         timestamp("end_date"),
    autoRenews:      boolean("auto_renews").default(false),
    status:          text("status").notNull().default("active"),
    metadata:        jsonb("metadata").default("{}"),
    createdAt:       timestamp("created_at").defaultNow(),
    updatedAt:       timestamp("updated_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_provider_contracts_id").on(t.contractId),
    index("idx_provider_contracts_provider").on(t.providerId),
    index("idx_provider_contracts_user").on(t.userId),
  ]
);

// ─── provider_policies ────────────────────────────────────────────────────────
// Governance policies for external capability consumption.
export const providerPolicies = pgTable(
  "provider_policies",
  {
    id:              serial("id").primaryKey(),
    policyId:        text("policy_id").notNull(),
    providerId:      text("provider_id"),
    // null = applies to all providers
    policyType:      text("policy_type").notNull(),
    // data_residency | retention | access_control | approval_required | rate_cap | scope_restriction
    title:           text("title").notNull(),
    description:     text("description"),
    rules:           jsonb("rules").default("[]"),
    enforcement:     text("enforcement").notNull().default("advisory"),
    // advisory | blocking | auto_remediate
    status:          text("status").notNull().default("active"),
    // active | draft | suspended | expired
    appliesTo:       jsonb("applies_to").default("{}"),
    // { roles: [], domains: [], providers: [] }
    metadata:        jsonb("metadata").default("{}"),
    createdAt:       timestamp("created_at").defaultNow(),
    updatedAt:       timestamp("updated_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_provider_policies_id").on(t.policyId),
    index("idx_provider_policies_type").on(t.policyType),
    index("idx_provider_policies_status").on(t.status),
  ]
);

// ─── provider_audits ─────────────────────────────────────────────────────────
export const providerAudits = pgTable(
  "provider_audits",
  {
    id:           serial("id").primaryKey(),
    auditId:      text("audit_id").notNull(),
    providerId:   text("provider_id"),
    connectionId: text("connection_id"),
    userId:       integer("user_id"),
    action:       text("action").notNull(),
    // provider_registered | connection_created | credential_rotated | policy_applied
    // health_checked | sync_triggered | recommendation_actioned | oauth_refreshed
    actorId:      integer("actor_id"),
    actorRole:    text("actor_role"),
    before:       jsonb("before").default("{}"),
    after:        jsonb("after").default("{}"),
    ipAddress:    text("ip_address"),
    userAgent:    text("user_agent"),
    metadata:     jsonb("metadata").default("{}"),
    createdAt:    timestamp("created_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_provider_audits_id").on(t.auditId),
    index("idx_provider_audits_provider").on(t.providerId),
    index("idx_provider_audits_user").on(t.userId),
    index("idx_provider_audits_action").on(t.action),
  ]
);
