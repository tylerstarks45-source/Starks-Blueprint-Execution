// ─────────────────────────────────────────────────────────────────────────────
// Build 030: Universal Execution Adapter Framework — Adapter Capability Engine
// Each adapter declares: actions, resources, permissions, platforms, APIs,
// limits, rollback support, evidence support.
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import { adapterCapabilities } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { AdapterType, ActionType } from "./types";

// ── Capability coverage model ──────────────────────────────────────────────
const ALL_FIRST_CLASS_TYPES: AdapterType[] = [
  "browser", "desktop", "filesystem", "terminal",
  "api", "rest", "graphql", "database",
  "git", "github", "gitlab",
  "cloud", "aws", "azure", "google_cloud", "cloudflare",
  "docker", "kubernetes", "cicd",
  "stripe", "paypal", "quickbooks",
  "shopify", "woocommerce", "wordpress",
  "notion", "slack", "discord",
  "email", "sms", "llms", "search",
  "calendar", "crm", "marketing", "analytics",
  "storage", "identity", "custom",
];

export const TOTAL_FIRST_CLASS_TYPES = ALL_FIRST_CLASS_TYPES.length;

/**
 * List all capabilities for a given adapter.
 */
export async function listCapabilities(
  adapterId: string
): Promise<typeof adapterCapabilities.$inferSelect[]> {
  return db
    .select()
    .from(adapterCapabilities)
    .where(eq(adapterCapabilities.adapterId, adapterId));
}

/**
 * Check if an adapter supports a given action type.
 */
export async function supportsAction(adapterId: string, actionType: ActionType): Promise<boolean> {
  const caps = await db
    .select()
    .from(adapterCapabilities)
    .where(eq(adapterCapabilities.adapterId, adapterId));
  return caps.some(c => c.actionType === actionType && c.isEnabled);
}

/**
 * Compute capability coverage ratio:
 * (number of enabled adapter types) / TOTAL_FIRST_CLASS_TYPES.
 */
export function computeCapabilityCoverage(enabledAdapterTypes: AdapterType[]): number {
  const covered = ALL_FIRST_CLASS_TYPES.filter(t => enabledAdapterTypes.includes(t)).length;
  return covered / TOTAL_FIRST_CLASS_TYPES;
}

/**
 * Determine which first-class adapter types are NOT yet installed.
 */
export function missingAdapterTypes(installedTypes: AdapterType[]): AdapterType[] {
  return ALL_FIRST_CLASS_TYPES.filter(t => !installedTypes.includes(t));
}

/**
 * Recommend the next N adapter types to install based on coverage priority.
 * Priority: infrastructure > payments > communication > analytics > identity.
 */
export function recommendAdapterTypes(installedTypes: AdapterType[], n = 5): AdapterType[] {
  const priority: AdapterType[] = [
    "api", "browser", "database", "llms", "filesystem",
    "github", "slack", "stripe", "email", "cloud",
    "docker", "notion", "search", "calendar", "crm",
  ];
  return priority.filter(t => !installedTypes.includes(t)).slice(0, n);
}
