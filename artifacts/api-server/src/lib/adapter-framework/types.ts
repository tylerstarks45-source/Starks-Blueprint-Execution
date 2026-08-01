// ─────────────────────────────────────────────────────────────────────────────
// Build 030: Universal Execution Adapter Framework — Types
// Self-contained. No imports from other engine types files.
// ─────────────────────────────────────────────────────────────────────────────

// ── Adapter type catalog (32 first-class types + custom) ──────────────────
export type AdapterType =
  | "browser" | "desktop" | "filesystem" | "terminal"
  | "api" | "rest" | "graphql" | "database"
  | "git" | "github" | "gitlab"
  | "cloud" | "aws" | "azure" | "google_cloud" | "cloudflare"
  | "docker" | "kubernetes" | "cicd"
  | "stripe" | "paypal" | "quickbooks"
  | "shopify" | "woocommerce" | "wordpress"
  | "notion" | "slack" | "discord"
  | "email" | "sms" | "llms" | "search"
  | "calendar" | "crm" | "marketing" | "analytics"
  | "storage" | "identity" | "custom";

// ── Adapter lifecycle statuses ─────────────────────────────────────────────
export type AdapterStatus =
  | "pending" | "enabled" | "disabled" | "deprecated" | "retired";

// ── Adapter health states ──────────────────────────────────────────────────
export type AdapterHealthStatus = "healthy" | "degraded" | "failed" | "unknown";

// ── Lifecycle events ───────────────────────────────────────────────────────
export type AdapterLifecycleEvent =
  | "install" | "enable" | "disable" | "upgrade"
  | "rollback" | "health_check" | "deprecate" | "retire";

// ── Permission levels ──────────────────────────────────────────────────────
export type PermissionLevel = "read" | "write" | "execute" | "admin";

// ── Contract types ─────────────────────────────────────────────────────────
export type ContractType = "execution" | "rollback" | "health_check" | "capability_discovery";

// ── Action types ───────────────────────────────────────────────────────────
export type ActionType =
  | "read" | "write" | "execute" | "create" | "update" | "delete" | "search" | "notify";

// ── Extension point IDs (Build 030) ───────────────────────────────────────
export const EP_ADAPTER_REGISTERED          = "adapter-framework:adapter-registered";
export const EP_ADAPTER_RESOLVED            = "adapter-framework:adapter-resolved";
export const EP_ADAPTER_CAPABILITY_DECLARED = "adapter-framework:capability-declared";
export const EP_ADAPTER_VALIDATED           = "adapter-framework:adapter-validated";
export const EP_ADAPTER_SANDBOX_ENTERED     = "adapter-framework:sandbox-entered";
export const EP_ADAPTER_LIFECYCLE_CHANGED   = "adapter-framework:lifecycle-changed";
export const EP_ADAPTER_TELEMETRY_RECORDED  = "adapter-framework:telemetry-recorded";
export const EP_ADAPTER_HEALTH_CHECKED      = "adapter-framework:health-checked";

// ── Adapter manifest (declared in code by adapter implementors) ─────────────
export interface AdapterManifest {
  name: string;
  adapterType: AdapterType;
  version: string;
  description: string;
  capabilities: AdapterCapabilityDeclaration[];
  permissions: AdapterPermissionDeclaration[];
  contracts: AdapterContractDeclaration[];
  isBuiltin?: boolean;
  sandboxEnabled?: boolean;
}

export interface AdapterCapabilityDeclaration {
  capabilityKey: string;
  actionType: ActionType;
  resourceType: string;
  platform: string;
  api: string;
  description: string;
}

export interface AdapterPermissionDeclaration {
  permissionKey: string;
  permissionLevel: PermissionLevel;
  resourceType: string;
  isRequired: boolean;
}

export interface AdapterContractDeclaration {
  contractType: ContractType;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  errorSchema: Record<string, unknown>;
}

// ── Validation result ──────────────────────────────────────────────────────
export interface AdapterValidationResult {
  adapterId: string;
  passed: boolean;
  compatibilityOk: boolean;
  permissionsOk: boolean;
  authorityOk: boolean;
  versionOk: boolean;
  securityOk: boolean;
  preconditionsOk: boolean;
  failureReasons: string[];
}

// ── Resolution result ──────────────────────────────────────────────────────
export interface AdapterResolutionResult {
  resolved: boolean;
  adapterIds: string[];
  adapterTypes: AdapterType[];
  resolutionMode: "single" | "multi" | "fallback" | "chained" | "none";
  reason: string;
}

// ── EB summary type ────────────────────────────────────────────────────────
export interface AdapterFrameworkSummary {
  totalAdapters: number;
  enabledAdapters: number;
  healthyAdapters: number;
  degradedAdapters: number;
  failedAdapters: number;
  capabilityCoverage: number;        // enabled adapters / total first-class types
  recommendedAdapterTypes: AdapterType[];
  adapterTypes: AdapterType[];
}
