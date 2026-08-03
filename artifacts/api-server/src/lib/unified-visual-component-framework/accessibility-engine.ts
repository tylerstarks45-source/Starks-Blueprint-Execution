// ─────────────────────────────────────────────────────────────────────────────
// Build 051 — Accessibility Engine
// Associates every component with ARIA roles and keyboard interaction contracts
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import { visualComponents, componentRegistry } from "@workspace/db/schema";
import { eq, isNotNull, sql } from "drizzle-orm";

// Standard keyboard interaction contracts by component type
const KEYBOARD_CONTRACTS: Record<string, string[]> = {
  button:       ["Enter:activate", "Space:activate"],
  input:        ["Tab:focus", "Shift+Tab:unfocus", "Enter:submit"],
  dropdown:     ["Enter:open", "ArrowDown:next-option", "ArrowUp:prev-option", "Escape:close", "Tab:close"],
  checkbox:     ["Space:toggle"],
  radio:        ["ArrowDown:next", "ArrowUp:prev", "Space:select"],
  tabs:         ["ArrowLeft:prev-tab", "ArrowRight:next-tab", "Home:first-tab", "End:last-tab"],
  dialog:       ["Escape:close", "Tab:next-focusable", "Shift+Tab:prev-focusable"],
  modal:        ["Escape:close", "Tab:next-focusable", "Shift+Tab:prev-focusable"],
  tree:         ["ArrowDown:next-node", "ArrowUp:prev-node", "ArrowRight:expand", "ArrowLeft:collapse", "Enter:select"],
  table:        ["ArrowDown:next-row", "ArrowUp:prev-row", "ArrowRight:next-cell", "ArrowLeft:prev-cell"],
  "search-box": ["Enter:search", "Escape:clear", "ArrowDown:first-result"],
  accordion:    ["Enter:toggle", "Space:toggle", "ArrowDown:next-item", "ArrowUp:prev-item"],
  menu:         ["ArrowDown:next-item", "ArrowUp:prev-item", "Enter:activate", "Escape:close"],
  toolbar:      ["ArrowLeft:prev-item", "ArrowRight:next-item", "Home:first-item", "End:last-item"],
};

// WCAG 2.1 level by component
const WCAG_LEVELS: Record<string, "A" | "AA" | "AAA"> = {
  button: "A", input: "AA", checkbox: "A", radio: "A", dropdown: "AA",
  dialog: "AA", modal: "AA", table: "AA", tabs: "A", tree: "AA",
  "search-box": "AA", accordion: "AA", notification: "AA", progress: "A",
};

export interface AccessibilityProfile {
  componentKey:          string;
  ariaRole?:             string;
  ariaLabelTemplate?:    string;
  keyboardInteractions:  string[];
  wcagLevel:             "A" | "AA" | "AAA" | "N/A";
  requiresFocusManagement: boolean;
  requiresLiveRegion:    boolean;
  supportsHighContrast:  boolean;
}

export function getAccessibilityProfile(componentKey: string, ariaRole?: string | null, ariaLabelTemplate?: string | null, storedInteractions?: string[]): AccessibilityProfile {
  const baseKey = componentKey.replace(/^.*\./, ""); // strip prefix if any
  const keyboard = storedInteractions?.length
    ? storedInteractions
    : (KEYBOARD_CONTRACTS[baseKey] ?? KEYBOARD_CONTRACTS[componentKey] ?? []);
  const wcag = WCAG_LEVELS[baseKey] ?? WCAG_LEVELS[componentKey] ?? "N/A";

  return {
    componentKey,
    ariaRole:              ariaRole ?? undefined,
    ariaLabelTemplate:     ariaLabelTemplate ?? undefined,
    keyboardInteractions:  keyboard,
    wcagLevel:             wcag,
    requiresFocusManagement: ["dialog", "modal", "dropdown", "menu"].includes(baseKey),
    requiresLiveRegion:    ["notification", "progress", "status-bar"].includes(baseKey),
    supportsHighContrast:  true, // all UVCF components are designed for high contrast
  };
}

export async function listAccessibilityProfiles(): Promise<AccessibilityProfile[]> {
  const comps = await db.select({
    componentKey:        visualComponents.componentKey,
    ariaRole:            visualComponents.accessibilityRole,
    ariaLabelTemplate:   visualComponents.ariaLabelTemplate,
    keyboardInteractions:visualComponents.keyboardInteractions,
  }).from(visualComponents);

  return comps.map((c) =>
    getAccessibilityProfile(
      c.componentKey,
      c.ariaRole,
      c.ariaLabelTemplate,
      c.keyboardInteractions as string[],
    )
  );
}

export async function getAccessibilityCoveragePercent(): Promise<number> {
  const all = await db.select({ id: visualComponents.id }).from(visualComponents);
  const covered = await db
    .select({ id: visualComponents.id })
    .from(visualComponents)
    .where(isNotNull(visualComponents.accessibilityRole));
  if (all.length === 0) return 100;
  return Math.round((covered.length / all.length) * 100);
}
