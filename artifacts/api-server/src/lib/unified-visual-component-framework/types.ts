// ─────────────────────────────────────────────────────────────────────────────
// Build 051 — Unified Visual Component Framework (UVCF) — Types
// ─────────────────────────────────────────────────────────────────────────────

export const UVCF_THROTTLE_CYCLES = 370;

// ── Component Categories ──────────────────────────────────────────────────────
export const COMPONENT_CATEGORIES = [
  "layout",
  "navigation",
  "input",
  "display",
  "data",
  "feedback",
  "builder",
  "canvas",
  "property",
  "dialog",
  "command",
  "visualization",
  "future",
] as const;
export type ComponentCategory = typeof COMPONENT_CATEGORIES[number];

// ── Capability Types ──────────────────────────────────────────────────────────
export const COMPONENT_CAPABILITY_TYPES = [
  "render", "interact", "animate", "compose", "validate", "data-bind",
] as const;
export type ComponentCapabilityType = typeof COMPONENT_CAPABILITY_TYPES[number];

// ── Design Token Categories ───────────────────────────────────────────────────
export const TOKEN_CATEGORIES = [
  "color", "typography", "spacing", "elevation", "sizing", "icon", "animation", "layout",
] as const;
export type TokenCategory = typeof TOKEN_CATEGORIES[number];

// ── Accessibility Roles ───────────────────────────────────────────────────────
export const ARIA_ROLES = [
  "button", "link", "textbox", "checkbox", "radio", "listbox", "option",
  "combobox", "menu", "menuitem", "menuitemcheckbox", "menuitemradio",
  "dialog", "alertdialog", "alert", "status", "progressbar", "tab",
  "tabpanel", "tablist", "tree", "treeitem", "grid", "gridcell", "row",
  "table", "columnheader", "rowheader", "heading", "img", "navigation",
  "region", "main", "complementary", "search", "form", "presentation", "none",
] as const;
export type AriaRole = typeof ARIA_ROLES[number];

// ── Extension Point IDs ───────────────────────────────────────────────────────
export const UVCF_EP_IDS = {
  COMPONENT_REGISTRY:  "uvcf.component_registry",
  DESIGN_TOKENS:       "uvcf.design_tokens",
  VARIANT_ENGINE:      "uvcf.variant_engine",
  ACCESSIBILITY:       "uvcf.accessibility",
  SEMANTIC_ENGINE:     "uvcf.semantic_engine",
  DIAGNOSTICS:         "uvcf.diagnostics",
  ASH_ADVISORY:        "uvcf.ash_advisory",
  FUTURE_COMPONENT:    "uvcf.future_component",
} as const;

// ── Component DTOs ────────────────────────────────────────────────────────────
export interface ComponentInput {
  familyId:            number;
  componentKey:        string;
  title:               string;
  description:         string;
  category:            ComponentCategory;
  accessibilityRole?:  string;
  ariaLabelTemplate?:  string;
  keyboardInteractions?:string[];
  semanticMeaning?:    string;
  semanticIntent?:     string;
  ashSemanticTag?:     string;
  propsSchema?:        Record<string, unknown>;
  defaultProps?:       Record<string, unknown>;
  metadata?:           Record<string, unknown>;
}

export interface TokenInput {
  tokenKey:     string;
  tokenName:    string;
  category:     TokenCategory;
  valueLight:   string;
  valueDark?:   string;
  description?:  string;
  isSemantic?:  boolean;
  semanticRole?: string;
}

// ── UVCF Summary ─────────────────────────────────────────────────────────────
export interface UVCFSummary {
  totalComponents:       number;
  enabledComponents:     number;
  totalFamilies:         number;
  totalTokens:           number;
  totalVariants:         number;
  totalCapabilities:     number;
  ashSemanticCoverage:   number;   // % with ash_semantic_tag
  accessibilityCoverage: number;   // % with accessibility_role
  healthBreakdown:       Record<string, number>;
  categoryBreakdown:     Record<string, number>;
  deprecatedCount:       number;
  recentDiagnostics:     number;
}
