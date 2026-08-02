// ── Build 046: Unified Platform Operating System — Types ─────────────────────

// ── Domain enums ──────────────────────────────────────────────────────────────
export type WorkspaceType   = "personal" | "team" | "organization";
export type WorkspaceStatus = "active" | "archived" | "suspended";
export type ProjectType     = "website" | "crm" | "automation" | "dashboard" | "custom";
export type ProjectStatus   = "active" | "archived" | "completed" | "suspended";
export type AppStatus       = "active" | "inactive" | "deprecated" | "maintenance";
export type SessionStatus   = "active" | "suspended" | "expired" | "closed";
export type ActivityType    =
  | "workspace_created" | "workspace_archived"
  | "project_created" | "project_archived"
  | "app_launched" | "app_registered"
  | "command_executed" | "command_registered"
  | "session_started" | "session_closed"
  | "context_changed" | "search_performed"
  | "notification_sent" | "upos_snapshot";
export type NotificationPriority = "low" | "normal" | "high" | "urgent";
export type NotificationType     = "info" | "warning" | "error" | "success" | "action_required";
export type RuntimeHealth        = "healthy" | "degraded" | "offline" | "unknown";

// ── Command descriptor ────────────────────────────────────────────────────────
export interface CommandDescriptor {
  commandId:          string;   // app:domain:action
  commandName:        string;
  description:        string;
  requiredPermissions:string[];
  route?:             string;
  method:             "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  parameters?:        Record<string, unknown>; // JSON schema
}

// ── Application manifest ──────────────────────────────────────────────────────
export interface AppManifest {
  appId:        string;
  appName:      string;
  appDomain:    string;
  version:      string;
  description:  string;
  capabilities: string[];
  commands:     CommandDescriptor[];
  permissions:  string[];
  projectTypes: string[];
  assetTypes:   string[];
  manifest?:    Record<string, unknown>;
}

// ── Context snapshot ──────────────────────────────────────────────────────────
export interface PlatformContextSnapshot {
  userId:             number;
  currentPage?:       string;
  currentAppId?:      string;
  currentProjectId?:  number;
  currentWorkspaceId?:number;
  currentOrgId?:      number;
  permissions:        string[];
  availableCommands:  CommandDescriptor[];
  breadcrumb:         NavigationNode[];
}

export interface NavigationNode {
  label:  string;
  path:   string;
  appId?: string;
}

// ── UPOS summary ──────────────────────────────────────────────────────────────
export interface UPOSSummary {
  totalApps:            number;
  activeApps:           number;
  totalWorkspaces:      number;
  totalProjects:        number;
  activeSessions:       number;
  commandsAvailable:    number;
  notificationsPending: number;
  runtimeHealth:        RuntimeHealth;
  lawApplied:           boolean;
  contextSnapshot?:     PlatformContextSnapshot;
}

// ── Extension point IDs ───────────────────────────────────────────────────────
export const UPOS_EP_IDS = {
  RUNTIME_STATE:         "upos.runtime_state",
  WORKSPACE_LIFECYCLE:   "upos.workspace_lifecycle",
  APPLICATION_REGISTRY:  "upos.application_registry",
  COMMAND_ROUTING:       "upos.command_routing",
  SEARCH_INDEX:          "upos.search_index",
  CONTEXT_AWARENESS:     "upos.context_awareness",
  ACTIVITY_STREAM:       "upos.activity_stream",
  ADVISORY:              "upos.advisory",
} as const;

// ── Throttle ──────────────────────────────────────────────────────────────────
export const UPOS_THROTTLE_CYCLES = 320; // Fire EB → UPOS sync every 320 EB cycles

// ── Built-in application IDs ──────────────────────────────────────────────────
export const BUILTIN_APP_IDS = {
  WEBSITE_BUILDER: "com.starksglobal.website-builder",
  CRM:             "com.starksglobal.crm",
  AUTOMATION:      "com.starksglobal.automation-builder",
  DASHBOARD:       "com.starksglobal.dashboard",
} as const;
