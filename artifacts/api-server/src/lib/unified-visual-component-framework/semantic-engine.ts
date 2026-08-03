// ─────────────────────────────────────────────────────────────────────────────
// Build 051 — Semantic Engine
// Maps every component to semantic meaning so ASH understands UI intent
// instead of visual appearance
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import { visualComponents, componentCapabilities } from "@workspace/db/schema";
import { eq, isNotNull } from "drizzle-orm";

// Semantic intent model: answers "what does this component DO?"
export const SEMANTIC_INTENTS: Record<string, { meaning: string; intent: string; ashTag: string }> = {
  "button":          { meaning: "Triggers an action",               intent: "action-trigger",       ashTag: "action" },
  "input":           { meaning: "Receives text input from user",    intent: "data-entry",           ashTag: "input" },
  "textarea":        { meaning: "Receives multi-line text input",   intent: "data-entry",           ashTag: "input" },
  "dropdown":        { meaning: "Selects from a list of options",   intent: "selection",            ashTag: "select" },
  "checkbox":        { meaning: "Toggles a binary on/off state",    intent: "boolean-toggle",       ashTag: "toggle" },
  "radio-group":     { meaning: "Selects one item from many",       intent: "exclusive-selection",  ashTag: "select" },
  "card":            { meaning: "Groups related content visually",  intent: "content-container",    ashTag: "container" },
  "panel":           { meaning: "Contains a distinct content area", intent: "layout-region",        ashTag: "region" },
  "tabs":            { meaning: "Switches between content views",   intent: "view-switcher",        ashTag: "navigation" },
  "accordion":       { meaning: "Expands/collapses content",        intent: "progressive-disclosure",ashTag: "disclosure" },
  "tree":            { meaning: "Displays hierarchical data",       intent: "hierarchy-navigation", ashTag: "navigation" },
  "table":           { meaning: "Displays structured tabular data", intent: "data-display",         ashTag: "data" },
  "list":            { meaning: "Displays a sequence of items",     intent: "data-display",         ashTag: "data" },
  "form":            { meaning: "Collects structured user data",    intent: "data-collection",      ashTag: "form" },
  "property-grid":   { meaning: "Edits key-value properties",       intent: "property-editing",     ashTag: "editor" },
  "toolbar":         { meaning: "Provides quick-access actions",    intent: "action-collection",    ashTag: "action" },
  "sidebar":         { meaning: "Provides persistent navigation",   intent: "primary-navigation",   ashTag: "navigation" },
  "top-bar":         { meaning: "Provides app-level actions",       intent: "global-navigation",    ashTag: "navigation" },
  "status-bar":      { meaning: "Shows current application state",  intent: "status-display",       ashTag: "status" },
  "dialog":          { meaning: "Requests confirmation or input",   intent: "interruption",         ashTag: "dialog" },
  "modal":           { meaning: "Overlays content requiring focus", intent: "focused-overlay",      ashTag: "dialog" },
  "notification":    { meaning: "Informs user of an event",         intent: "feedback",             ashTag: "feedback" },
  "badge":           { meaning: "Shows a count or status label",    intent: "status-indicator",     ashTag: "status" },
  "progress":        { meaning: "Shows operation completion status",intent: "progress-display",     ashTag: "status" },
  "breadcrumbs":     { meaning: "Shows navigation hierarchy",       intent: "location-indicator",   ashTag: "navigation" },
  "search-box":      { meaning: "Filters or finds content",         intent: "search",               ashTag: "search" },
  "canvas-node":     { meaning: "Represents a node in a graph",     intent: "graph-element",        ashTag: "canvas" },
  "canvas-connector":{ meaning: "Connects two graph nodes",         intent: "graph-relation",       ashTag: "canvas" },
  "canvas-group":    { meaning: "Groups canvas nodes logically",    intent: "graph-grouping",       ashTag: "canvas" },
  "inspector-panel": { meaning: "Edits properties of selection",    intent: "property-editing",     ashTag: "editor" },
  "future-component":{ meaning: "Reserved for future use",          intent: "future",               ashTag: "future" },
};

export interface SemanticProfile {
  componentKey: string;
  meaning:      string;
  intent:       string;
  ashTag:       string;
  category:     string;
}

export function getSemanticProfile(componentKey: string, category: string): SemanticProfile {
  const def = SEMANTIC_INTENTS[componentKey] ?? {
    meaning: `${componentKey} component`,
    intent:  "unknown",
    ashTag:  "component",
  };
  return { componentKey, ...def, category };
}

export async function listSemanticProfiles(): Promise<SemanticProfile[]> {
  const comps = await db.select({
    componentKey:  visualComponents.componentKey,
    semanticMeaning:visualComponents.semanticMeaning,
    semanticIntent: visualComponents.semanticIntent,
    ashSemanticTag: visualComponents.ashSemanticTag,
    category:       visualComponents.category,
  }).from(visualComponents);

  return comps.map((c) => ({
    componentKey:  c.componentKey,
    meaning:       c.semanticMeaning ?? SEMANTIC_INTENTS[c.componentKey]?.meaning ?? c.componentKey,
    intent:        c.semanticIntent  ?? SEMANTIC_INTENTS[c.componentKey]?.intent  ?? "unknown",
    ashTag:        c.ashSemanticTag  ?? SEMANTIC_INTENTS[c.componentKey]?.ashTag  ?? "component",
    category:      c.category,
  }));
}

export async function getSemanticCoveragePercent(): Promise<number> {
  const all = await db.select({ id: visualComponents.id }).from(visualComponents);
  const tagged = await db
    .select({ id: visualComponents.id })
    .from(visualComponents)
    .where(isNotNull(visualComponents.ashSemanticTag));
  if (all.length === 0) return 100;
  return Math.round((tagged.length / all.length) * 100);
}

export async function resolveComponentByIntent(intent: string): Promise<SemanticProfile[]> {
  const profiles = await listSemanticProfiles();
  return profiles.filter(
    (p) => p.intent === intent || p.ashTag === intent || p.meaning.toLowerCase().includes(intent.toLowerCase())
  );
}
