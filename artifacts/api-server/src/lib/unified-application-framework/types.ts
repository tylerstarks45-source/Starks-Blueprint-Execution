// ─────────────────────────────────────────────────────────────────────────────
// Build 050 — Unified Application Framework (UAF) — Types
// ─────────────────────────────────────────────────────────────────────────────

export const UAF_THROTTLE_CYCLES = 360;

// ── Supported Applications ────────────────────────────────────────────────────
export const PLATFORM_APPLICATIONS = [
  "dashboard",
  "website_builder",
  "application_builder",
  "workflow_builder",
  "automation_builder",
  "crm",
  "database_builder",
  "knowledge_builder",
  "ai_agent_builder",
  "marketplace",
  "settings",
  "developer_center",
  "admin_center",
  "future_application",
] as const;
export type PlatformApplicationId = typeof PLATFORM_APPLICATIONS[number];

// ── Application Lifecycle States ──────────────────────────────────────────────
export const LIFECYCLE_STATES = [
  "available",
  "installed",
  "enabled",
  "disabled",
  "deprecated",
  "upgrading",
] as const;
export type LifecycleState = typeof LIFECYCLE_STATES[number];

// ── Application Health States ─────────────────────────────────────────────────
export const HEALTH_STATES = ["healthy", "degraded", "offline", "unknown"] as const;
export type HealthState = typeof HEALTH_STATES[number];

// ── Capability Types ──────────────────────────────────────────────────────────
export const CAPABILITY_TYPES = ["read", "write", "execute", "subscribe", "admin"] as const;
export type CapabilityType = typeof CAPABILITY_TYPES[number];

// ── Widget Types ──────────────────────────────────────────────────────────────
export const WIDGET_TYPES = [
  "display", "chart", "table", "form", "action", "navigation",
  "media", "embed", "ai_prompt", "notification",
] as const;
export type WidgetType = typeof WIDGET_TYPES[number];

// ── View Types ────────────────────────────────────────────────────────────────
export const VIEW_TYPES = [
  "table", "grid", "kanban", "calendar", "list",
  "form", "detail", "empty", "custom",
] as const;
export type ViewType = typeof VIEW_TYPES[number];

// ── Panel Types ───────────────────────────────────────────────────────────────
export const PANEL_TYPES = [
  "sidebar", "drawer", "inspector", "modal", "bottom_sheet", "contextual",
] as const;
export type PanelType = typeof PANEL_TYPES[number];

// ── Service Types ─────────────────────────────────────────────────────────────
export const SERVICE_TYPES = [
  "api", "data", "event", "compute", "storage", "notification",
] as const;
export type ServiceType = typeof SERVICE_TYPES[number];

// ── Menu Placements ───────────────────────────────────────────────────────────
export const MENU_PLACEMENTS = ["sidebar", "topbar", "contextual", "none"] as const;
export type MenuPlacement = typeof MENU_PLACEMENTS[number];

// ── Extension Point IDs ───────────────────────────────────────────────────────
export const UAF_EP_IDS = {
  APPLICATION_REGISTRY:  "uaf.application_registry",
  MANIFEST:              "uaf.manifest",
  CAPABILITY:            "uaf.capability",
  NAVIGATION:            "uaf.navigation",
  LIFECYCLE:             "uaf.lifecycle",
  DIAGNOSTICS:           "uaf.diagnostics",
  ASH_ADVISORY:          "uaf.ash_advisory",
  FUTURE_APP:            "uaf.future_application",
} as const;

// ── DTOs ──────────────────────────────────────────────────────────────────────
export interface AppRegistration {
  appId:       string;
  title:       string;
  version:     string;
  description: string;
  icon?:       string;
  category:    string;
  developer:   string;
}

export interface AppPage {
  appId:       string;
  pageKey:     string;
  title:       string;
  route:       string;
  isDefault:   boolean;
  menuPlacement: string;
  menuGroup:   string;
  sortOrder:   number;
}

export interface AppCapability {
  appId:          string;
  capabilityKey:  string;
  title:          string;
  capabilityType: CapabilityType;
  ashCanInvoke:   boolean;
}

export interface UAFSummary {
  totalApps:             number;
  enabledApps:           number;
  disabledApps:          number;
  platformApps:          number;
  availableCapabilities: number;
  availableWidgets:      number;
  availableServices:     number;
  availablePages:        number;
  lifecycleBreakdown:    Record<string, number>;
  healthBreakdown:       Record<string, number>;
  ashInvocableCapabilities: number;
  recentDiagnostics:     number;
}
