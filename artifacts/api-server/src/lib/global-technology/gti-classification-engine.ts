// ── GTI Classification Engine ───────────────────────────────────────────────
// Groups technologies into standardized domains.
// Pure classification — no DB writes.

import type { TechnologyEntry, TechnologyCategory } from "./types";

export interface ClassificationResult {
  category: TechnologyCategory;
  subcategory?: string;
  domain: string;
  tags: string[];
}

// ── Domain mapping from category ───────────────────────────────────────────
const CATEGORY_DOMAIN_MAP: Record<TechnologyCategory, string> = {
  ai_provider:           "Artificial Intelligence",
  inference_provider:    "Artificial Intelligence",
  cloud_provider:        "Cloud Infrastructure",
  storage_provider:      "Cloud Infrastructure",
  developer_tool:        "Developer Toolchain",
  browser_technology:    "Browser Automation",
  execution_environment: "Runtime & Execution",
  connector_ecosystem:   "Integration Layer",
  automation_platform:   "Automation & Orchestration",
  operating_system:      "System Foundation",
  database:              "Data Storage",
  vector_database:       "AI Data Layer",
  search_technology:     "Search & Retrieval",
  business_software:     "Business Operations",
  security_platform:     "Security & Identity",
  analytics_platform:    "Analytics & Observability",
  payment_provider:      "Commerce & Payments",
  crm_system:            "Customer Relations",
  communication_system:  "Communications",
  platform:              "Platform Services",
};

// ── Tag generation from technology properties ──────────────────────────────
function generateTags(entry: TechnologyEntry): string[] {
  const tags: string[] = [entry.category, entry.vendor.toLowerCase()];
  if (entry.subcategory) tags.push(entry.subcategory);
  if (entry.licenseType === "open_source") tags.push("open_source");
  if (entry.pricingModel === "free") tags.push("free_tier");
  if (entry.pricingModel === "usage_based") tags.push("pay_per_use");
  if (entry.maturityLevel === "mature") tags.push("battle_tested");
  if (entry.maturityLevel === "experimental" || entry.maturityLevel === "beta") tags.push("emerging");
  if (entry.openSourceUrl) tags.push("self_hostable");
  return tags;
}

// ── Classify a single technology ───────────────────────────────────────────
export function classifyTechnology(entry: TechnologyEntry): ClassificationResult {
  return {
    category:    entry.category,
    subcategory: entry.subcategory,
    domain:      CATEGORY_DOMAIN_MAP[entry.category] ?? "Uncategorized",
    tags:        generateTags(entry),
  };
}

// ── Group technologies by category ────────────────────────────────────────
export function groupByCategory(technologies: TechnologyEntry[]): Record<string, TechnologyEntry[]> {
  const groups: Record<string, TechnologyEntry[]> = {};
  for (const tech of technologies) {
    if (!groups[tech.category]) groups[tech.category] = [];
    groups[tech.category].push(tech);
  }
  return groups;
}

// ── Category counts ────────────────────────────────────────────────────────
export function countByCategory(technologies: TechnologyEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const tech of technologies) {
    counts[tech.category] = (counts[tech.category] ?? 0) + 1;
  }
  return counts;
}
