// ── Build 043: Unified Digital Operating Layer — Types ────────────────────
// Self-contained. No re-exports from @workspace/db.

// ── Operating domains ─────────────────────────────────────────────────────
export type OperatingDomain =
  | "desktop" | "filesystem" | "browser" | "terminal" | "operating_system"
  | "cloud_infrastructure" | "databases" | "developer_tools"
  | "communication_platforms" | "business_platforms" | "ai_providers"
  | "api_services" | "automation_platforms" | "future_connectors";

export const OPERATING_DOMAINS: OperatingDomain[] = [
  "desktop", "filesystem", "browser", "terminal", "operating_system",
  "cloud_infrastructure", "databases", "developer_tools",
  "communication_platforms", "business_platforms", "ai_providers",
  "api_services", "automation_platforms", "future_connectors",
];

// ── Channel types ─────────────────────────────────────────────────────────
export type ExecutionChannelType =
  | "desktop" | "browser" | "filesystem" | "terminal"
  | "cloud" | "api" | "database" | "future";

export const EXECUTION_CHANNEL_TYPES: ExecutionChannelType[] = [
  "desktop", "browser", "filesystem", "terminal", "cloud", "api", "database", "future",
];

// ── Session / receipt status ──────────────────────────────────────────────
export type SessionStatus = "created" | "active" | "completed" | "expired" | "failed";
export type ReceiptResult = "success" | "failure" | "partial";
export type ChannelStatus = "ready" | "busy" | "error" | "closed";
export type HealthStatus = "healthy" | "degraded" | "failed";

// ── Lightweight runtime objects ───────────────────────────────────────────
export interface OperatingSession {
  id:           number;
  workspaceId:  number | null;
  userId:       number | null;
  sessionType:  ExecutionChannelType;
  status:       SessionStatus;
  authorityRef: string | null;
  startedAt:    Date;
  expiresAt:    Date | null;
}

export interface EnvironmentProfile {
  id:              number;
  domain:          OperatingDomain;
  environmentName: string;
  environmentType: string;
  discovered:      boolean;
  available:       boolean;
}

export interface ExecutionReceipt {
  id:                  number;
  sessionId:           number;
  channelType:         ExecutionChannelType;
  requestedOperation:  string;
  authorizedOperation: string;
  actualOperation:     string;
  result:              ReceiptResult;
  durationMs:          number | null;
  authorityRef:        string;
}

export interface DiagnosticsReport {
  channelType:         ExecutionChannelType;
  availability:        number;
  latencyMs:           number;
  reliability:         number;
  sessionHealth:       HealthStatus;
  connectorHealth:     HealthStatus;
  resourceUtilization: number;
  throughput:          number;
}

// ── Operating layer summary (returned to EB) ──────────────────────────────
export interface OperatingLayerSummary {
  activeWorkspaces: number;
  activeSessions:   number;
  totalChannels:    number;
  totalReceipts:    number;
  avgLatencyMs:     number;
  overallHealth:    HealthStatus;
  lawApplied:       boolean;
  registeredDomains:number;
  snapshotId:       number | null;
  computedAt:       Date;
}

// ── EP IDs ────────────────────────────────────────────────────────────────
export const DOL_EP_IDS = {
  ENVIRONMENT_DISCOVERY:  "dol.environment.discovery",
  SESSION_MANAGEMENT:     "dol.session.management",
  CAPABILITY_BINDING:     "dol.capability.binding",
  CHANNEL_EXECUTION:      "dol.channel.execution",
  RECEIPT_GENERATION:     "dol.receipt.generation",
  DIAGNOSTICS:            "dol.diagnostics",
  AUDIT_SYNCHRONIZATION:  "dol.audit.synchronization",
  ADVISORY:               "dol.advisory",
} as const;

export const DOL_THROTTLE_CYCLES = 300;
