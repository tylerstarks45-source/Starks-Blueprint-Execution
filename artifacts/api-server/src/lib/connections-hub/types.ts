// ── Build 044: Unified Connections & Integration Hub — Types ─────────────
// Self-contained. No re-exports from @workspace/db.

// ── Connection domains ────────────────────────────────────────────────────
export type ConnectionDomain =
  | "ai_providers" | "cloud_providers" | "source_control" | "developer_platforms"
  | "payment_platforms" | "accounting_platforms" | "crm_platforms"
  | "marketing_platforms" | "advertising_platforms" | "communication_platforms"
  | "storage_providers" | "databases" | "productivity_platforms"
  | "automation_platforms" | "identity_providers" | "analytics_platforms"
  | "browser_providers" | "desktop_providers" | "mcp_servers" | "future_providers";

export const CONNECTION_DOMAINS: ConnectionDomain[] = [
  "ai_providers", "cloud_providers", "source_control", "developer_platforms",
  "payment_platforms", "accounting_platforms", "crm_platforms",
  "marketing_platforms", "advertising_platforms", "communication_platforms",
  "storage_providers", "databases", "productivity_platforms",
  "automation_platforms", "identity_providers", "analytics_platforms",
  "browser_providers", "desktop_providers", "mcp_servers", "future_providers",
];

// ── Provider / connection types ───────────────────────────────────────────
export type ProviderType = "api" | "oauth" | "basic" | "key" | "certificate" | "mcp";
export type ProviderStatus = "active" | "inactive" | "deprecated" | "pending";
export type ConnectionStatus =
  | "created" | "connected" | "suspended" | "revoked" | "expired" | "migrated" | "archived";
export type CapabilityType = "read" | "write" | "execute" | "webhook" | "stream" | "batch";
export type AuthState = "valid" | "expired" | "revoked" | "unknown";
export type AuditType =
  | "registered" | "connected" | "disconnected" | "health_check" | "rotation" | "revoked" | "migrated";

// ── Lightweight runtime objects ───────────────────────────────────────────
export interface ProviderRecord {
  id:           number;
  providerName: string;
  domain:       ConnectionDomain;
  providerType: ProviderType;
  version:      string | null;
  status:       ProviderStatus;
  baseUrl:      string | null;
}

export interface CapabilityRecord {
  id:             number;
  providerId:     number;
  capabilityName: string;
  capabilityType: CapabilityType;
  rateLimit:      number | null;
  quotaLimit:     number | null;
  supported:      boolean;
}

export interface HealthRecord {
  providerId:        number;
  availability:      number;
  latencyMs:         number;
  quotaUsed:         number;
  quotaLimit:        number | null;
  rateLimitUsed:     number;
  rateLimitMax:      number | null;
  authState:         AuthState;
  versionCompatible: boolean;
  healthScore:       number;
}

export interface CompatibilityRecord {
  providerId:             number;
  capabilityName:         string;
  alternativeProviderIds: number[];
  failoverScore:          number;
}

export interface IntegrationRecommendation {
  type:        "migration" | "failover" | "redundancy" | "upgrade" | "expansion" | "risk_reduction";
  providerId:  number;
  targetId?:   number;
  reason:      string;
  priority:    "low" | "medium" | "high";
}

// ── Hub summary (returned to EB) ──────────────────────────────────────────
export interface ConnectionHubSummary {
  totalProviders:     number;
  totalConnections:   number;
  healthyConnections: number;
  avgHealthScore:     number;
  domainsRegistered:  number;
  riskFlags:          number;
  lawApplied:         boolean;
  snapshotId:         number | null;
  computedAt:         Date;
}

// ── EP IDs ────────────────────────────────────────────────────────────────
export const HUB_EP_IDS = {
  PROVIDER_REGISTRY:      "hub.provider.registry",
  CAPABILITY_DISCOVERY:   "hub.capability.discovery",
  CONNECTION_HEALTH:      "hub.connection.health",
  COMPATIBILITY:          "hub.compatibility",
  LIFECYCLE:              "hub.lifecycle",
  RECOMMENDATION:         "hub.recommendation",
  AUDIT_SYNCHRONIZATION:  "hub.audit.synchronization",
  ADVISORY:               "hub.advisory",
} as const;

export const HUB_THROTTLE_CYCLES = 310;

// ── Seeded provider catalog ───────────────────────────────────────────────
// 40 providers across 20 domains. Platform-seeded on first initialization.
export interface SeededProvider {
  name:   string;
  domain: ConnectionDomain;
  type:   ProviderType;
  baseUrl?:string;
  caps:   Array<{ name: string; type: CapabilityType }>;
}

export const SEEDED_PROVIDERS: SeededProvider[] = [
  // AI Providers
  { name: "OpenRouter",     domain: "ai_providers",          type: "key",   baseUrl: "https://openrouter.ai/api/v1",    caps: [{ name: "completions", type: "execute" }, { name: "chat", type: "execute" }] },
  { name: "OpenAI",         domain: "ai_providers",          type: "key",   baseUrl: "https://api.openai.com/v1",       caps: [{ name: "completions", type: "execute" }, { name: "embeddings", type: "execute" }, { name: "tts", type: "execute" }] },
  { name: "Anthropic",      domain: "ai_providers",          type: "key",   baseUrl: "https://api.anthropic.com/v1",    caps: [{ name: "completions", type: "execute" }] },
  { name: "Google Gemini",  domain: "ai_providers",          type: "key",   baseUrl: "https://generativelanguage.googleapis.com", caps: [{ name: "completions", type: "execute" }] },
  { name: "ElevenLabs",     domain: "ai_providers",          type: "key",   baseUrl: "https://api.elevenlabs.io",       caps: [{ name: "tts", type: "execute" }, { name: "voice_clone", type: "execute" }] },
  // Cloud Providers
  { name: "AWS",            domain: "cloud_providers",       type: "key",   baseUrl: "https://aws.amazon.com",          caps: [{ name: "compute", type: "execute" }, { name: "storage", type: "write" }, { name: "database", type: "read" }] },
  { name: "Google Cloud",   domain: "cloud_providers",       type: "oauth", baseUrl: "https://cloud.google.com",        caps: [{ name: "compute", type: "execute" }, { name: "storage", type: "write" }] },
  { name: "Azure",          domain: "cloud_providers",       type: "oauth", baseUrl: "https://management.azure.com",    caps: [{ name: "compute", type: "execute" }, { name: "storage", type: "write" }] },
  // Source Control
  { name: "GitHub",         domain: "source_control",        type: "oauth", baseUrl: "https://api.github.com",          caps: [{ name: "repos", type: "read" }, { name: "commits", type: "write" }, { name: "webhooks", type: "webhook" }] },
  { name: "GitLab",         domain: "source_control",        type: "oauth", baseUrl: "https://gitlab.com/api/v4",       caps: [{ name: "repos", type: "read" }, { name: "ci_cd", type: "execute" }] },
  // Payment Platforms
  { name: "Stripe",         domain: "payment_platforms",     type: "key",   baseUrl: "https://api.stripe.com/v1",       caps: [{ name: "payments", type: "execute" }, { name: "subscriptions", type: "write" }, { name: "webhooks", type: "webhook" }] },
  { name: "Whop",           domain: "payment_platforms",     type: "oauth", baseUrl: "https://api.whop.com",             caps: [{ name: "payments", type: "execute" }, { name: "products", type: "read" }] },
  // CRM Platforms
  { name: "HubSpot",        domain: "crm_platforms",         type: "oauth", baseUrl: "https://api.hubapi.com",           caps: [{ name: "contacts", type: "read" }, { name: "deals", type: "write" }, { name: "webhooks", type: "webhook" }] },
  { name: "Salesforce",     domain: "crm_platforms",         type: "oauth", baseUrl: "https://login.salesforce.com",    caps: [{ name: "contacts", type: "read" }, { name: "opportunities", type: "write" }] },
  // Communication Platforms
  { name: "Resend",         domain: "communication_platforms",type: "key",  baseUrl: "https://api.resend.com",           caps: [{ name: "email", type: "execute" }] },
  { name: "Slack",          domain: "communication_platforms",type: "oauth", baseUrl: "https://slack.com/api",            caps: [{ name: "messages", type: "write" }, { name: "webhooks", type: "webhook" }] },
  { name: "Twilio",         domain: "communication_platforms",type: "key",  baseUrl: "https://api.twilio.com",           caps: [{ name: "sms", type: "execute" }, { name: "voice", type: "execute" }] },
  // Storage Providers
  { name: "Cloudflare R2",  domain: "storage_providers",     type: "key",   baseUrl: "https://cloudflare.com",          caps: [{ name: "object_storage", type: "write" }, { name: "cdn", type: "execute" }] },
  { name: "AWS S3",         domain: "storage_providers",     type: "key",   baseUrl: "https://s3.amazonaws.com",        caps: [{ name: "object_storage", type: "write" }] },
  // Databases
  { name: "PostgreSQL",     domain: "databases",             type: "basic", caps: [{ name: "query", type: "read" }, { name: "write", type: "write" }] },
  { name: "Redis",          domain: "databases",             type: "basic", caps: [{ name: "cache", type: "read" }, { name: "pub_sub", type: "execute" }] },
  // Developer Platforms
  { name: "Vercel",         domain: "developer_platforms",   type: "key",   baseUrl: "https://api.vercel.com",          caps: [{ name: "deployments", type: "execute" }, { name: "domains", type: "write" }] },
  { name: "Linear",         domain: "developer_platforms",   type: "oauth", baseUrl: "https://api.linear.app",          caps: [{ name: "issues", type: "write" }, { name: "projects", type: "read" }] },
  // Analytics Platforms
  { name: "Mixpanel",       domain: "analytics_platforms",   type: "key",   baseUrl: "https://api.mixpanel.com",        caps: [{ name: "events", type: "write" }, { name: "reports", type: "read" }] },
  { name: "Amplitude",      domain: "analytics_platforms",   type: "key",   baseUrl: "https://api2.amplitude.com",      caps: [{ name: "events", type: "write" }, { name: "cohorts", type: "read" }] },
  // Productivity
  { name: "Notion",         domain: "productivity_platforms",type: "oauth", baseUrl: "https://api.notion.com/v1",       caps: [{ name: "pages", type: "write" }, { name: "databases", type: "read" }] },
  { name: "Google Workspace",domain: "productivity_platforms",type: "oauth",baseUrl: "https://workspace.googleapis.com", caps: [{ name: "docs", type: "write" }, { name: "sheets", type: "write" }, { name: "calendar", type: "read" }] },
  // Automation
  { name: "Zapier",         domain: "automation_platforms",  type: "key",   baseUrl: "https://hooks.zapier.com",        caps: [{ name: "triggers", type: "webhook" }, { name: "actions", type: "execute" }] },
  { name: "Make",           domain: "automation_platforms",  type: "key",   baseUrl: "https://www.make.com/api",        caps: [{ name: "scenarios", type: "execute" }] },
  // Identity
  { name: "Clerk",          domain: "identity_providers",    type: "key",   baseUrl: "https://api.clerk.com",           caps: [{ name: "users", type: "read" }, { name: "sessions", type: "execute" }] },
  { name: "Auth0",          domain: "identity_providers",    type: "oauth", baseUrl: "https://manage.auth0.com",        caps: [{ name: "users", type: "read" }, { name: "tokens", type: "execute" }] },
  // Marketing
  { name: "Mailchimp",      domain: "marketing_platforms",   type: "oauth", baseUrl: "https://api.mailchimp.com",       caps: [{ name: "campaigns", type: "execute" }, { name: "lists", type: "write" }] },
  // Advertising
  { name: "Google Ads",     domain: "advertising_platforms", type: "oauth", baseUrl: "https://ads.googleapis.com",      caps: [{ name: "campaigns", type: "read" }, { name: "reports", type: "read" }] },
  // Browser
  { name: "Playwright",     domain: "browser_providers",     type: "api",   caps: [{ name: "automation", type: "execute" }, { name: "screenshots", type: "read" }] },
  // Desktop
  { name: "Tauri",          domain: "desktop_providers",     type: "api",   caps: [{ name: "native_ui", type: "execute" }, { name: "file_access", type: "read" }] },
  // MCP Servers
  { name: "MCP Generic",    domain: "mcp_servers",           type: "mcp",   caps: [{ name: "tools", type: "execute" }, { name: "resources", type: "read" }] },
  // Accounting
  { name: "QuickBooks",     domain: "accounting_platforms",  type: "oauth", baseUrl: "https://quickbooks.api.intuit.com", caps: [{ name: "invoices", type: "write" }, { name: "reports", type: "read" }] },
  { name: "Xero",           domain: "accounting_platforms",  type: "oauth", baseUrl: "https://api.xero.com",            caps: [{ name: "invoices", type: "write" }, { name: "contacts", type: "read" }] },
  // Future
  { name: "Future Connector",domain: "future_providers",     type: "api",   caps: [{ name: "generic", type: "execute" }] },
];
