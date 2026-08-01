// ── GTI Compatibility Engine ────────────────────────────────────────────────
// Determines compatibility of each technology with ASH's current stack.
// Static compatibility matrix: real checks arrive via EP_GTI_COMPATIBILITY_CHECKED.

import type { TechnologyEntry, CompatibilityAssessment, CompatibilityLevel, IntegrationComplexity } from "./types";

// ── ASH current platform characteristics ──────────────────────────────────
// These represent the known stack; used to classify compatibility statically.
const ASH_STACK = {
  runtime: "nodejs",
  os: "nixos",
  database: "postgresql",
  vectorDb: "pgvector",
  containerized: false,
  adapters: ["browser", "api", "database", "llm", "filesystem"],
  languages: ["typescript", "javascript"],
};

// ── Static compatibility matrix ────────────────────────────────────────────
// Maps technology category → default compatibility profile.
// Per-technology overrides are applied after.
interface CompatibilityProfile {
  level: CompatibilityLevel;
  score: number;
  infrastructureCompatible: boolean;
  adapterCompatible: boolean;
  osCompatible: boolean;
  executionModelCompatible: boolean;
  complexity: IntegrationComplexity;
  blockers: string[];
  requirements: string[];
}

const CATEGORY_COMPAT: Record<string, CompatibilityProfile> = {
  ai_provider:           { level: "compatible",  score: 0.92, infrastructureCompatible: true,  adapterCompatible: true,  osCompatible: true,  executionModelCompatible: true,  complexity: "trivial", blockers: [], requirements: ["API key required"] },
  inference_provider:    { level: "compatible",  score: 0.90, infrastructureCompatible: true,  adapterCompatible: true,  osCompatible: true,  executionModelCompatible: true,  complexity: "trivial", blockers: [], requirements: ["API key required"] },
  cloud_provider:        { level: "partial",     score: 0.70, infrastructureCompatible: false, adapterCompatible: true,  osCompatible: true,  executionModelCompatible: true,  complexity: "high",   blockers: ["Requires cloud migration"], requirements: ["Cloud account", "infrastructure reconfiguration"] },
  developer_tool:        { level: "compatible",  score: 0.85, infrastructureCompatible: true,  adapterCompatible: true,  osCompatible: true,  executionModelCompatible: true,  complexity: "low",    blockers: [], requirements: [] },
  browser_technology:    { level: "compatible",  score: 0.95, infrastructureCompatible: true,  adapterCompatible: true,  osCompatible: true,  executionModelCompatible: true,  complexity: "trivial", blockers: [], requirements: ["Chromium installed (already present)"] },
  operating_system:      { level: "partial",     score: 0.50, infrastructureCompatible: false, adapterCompatible: false, osCompatible: false, executionModelCompatible: false, complexity: "very_high", blockers: ["Cannot run alongside current OS"], requirements: ["Full OS migration required"] },
  database:              { level: "partial",     score: 0.65, infrastructureCompatible: true,  adapterCompatible: true,  osCompatible: true,  executionModelCompatible: true,  complexity: "medium", blockers: [], requirements: ["DB adapter required", "schema migration planning"] },
  vector_database:       { level: "compatible",  score: 0.82, infrastructureCompatible: true,  adapterCompatible: true,  osCompatible: true,  executionModelCompatible: true,  complexity: "medium", blockers: [], requirements: ["Connection configuration"] },
  search_technology:     { level: "compatible",  score: 0.85, infrastructureCompatible: true,  adapterCompatible: true,  osCompatible: true,  executionModelCompatible: true,  complexity: "low",    blockers: [], requirements: ["Search adapter configuration"] },
  automation_platform:   { level: "compatible",  score: 0.80, infrastructureCompatible: true,  adapterCompatible: true,  osCompatible: true,  executionModelCompatible: true,  complexity: "medium", blockers: [], requirements: ["Webhook configuration"] },
  business_software:     { level: "compatible",  score: 0.78, infrastructureCompatible: true,  adapterCompatible: true,  osCompatible: true,  executionModelCompatible: true,  complexity: "medium", blockers: [], requirements: ["API key or OAuth credentials"] },
  security_platform:     { level: "compatible",  score: 0.88, infrastructureCompatible: true,  adapterCompatible: true,  osCompatible: true,  executionModelCompatible: true,  complexity: "low",    blockers: [], requirements: ["Identity provider configuration"] },
  analytics_platform:    { level: "compatible",  score: 0.85, infrastructureCompatible: true,  adapterCompatible: true,  osCompatible: true,  executionModelCompatible: true,  complexity: "trivial", blockers: [], requirements: ["SDK integration"] },
  payment_provider:      { level: "compatible",  score: 0.92, infrastructureCompatible: true,  adapterCompatible: true,  osCompatible: true,  executionModelCompatible: true,  complexity: "low",    blockers: [], requirements: ["API key and webhook endpoint"] },
  crm_system:            { level: "compatible",  score: 0.80, infrastructureCompatible: true,  adapterCompatible: true,  osCompatible: true,  executionModelCompatible: true,  complexity: "medium", blockers: [], requirements: ["API key or OAuth"] },
  communication_system:  { level: "compatible",  score: 0.90, infrastructureCompatible: true,  adapterCompatible: true,  osCompatible: true,  executionModelCompatible: true,  complexity: "trivial", blockers: [], requirements: ["API key required"] },
  storage_provider:      { level: "compatible",  score: 0.85, infrastructureCompatible: true,  adapterCompatible: true,  osCompatible: true,  executionModelCompatible: true,  complexity: "low",    blockers: [], requirements: ["S3-compatible credentials"] },
  execution_environment: { level: "partial",     score: 0.60, infrastructureCompatible: false, adapterCompatible: false, osCompatible: true,  executionModelCompatible: false, complexity: "high",   blockers: ["Runtime migration required"], requirements: ["Full runtime migration"] },
  connector_ecosystem:   { level: "compatible",  score: 0.78, infrastructureCompatible: true,  adapterCompatible: true,  osCompatible: true,  executionModelCompatible: true,  complexity: "medium", blockers: [], requirements: ["Platform account and API access"] },
  platform:              { level: "compatible",  score: 0.75, infrastructureCompatible: true,  adapterCompatible: true,  osCompatible: true,  executionModelCompatible: true,  complexity: "medium", blockers: [], requirements: ["Deployment configuration"] },
};

// ── Per-technology overrides ────────────────────────────────────────────────
// Refine compatibility for specific technologies where the category default is wrong.
const TECHNOLOGY_OVERRIDES: Record<string, Partial<CompatibilityProfile>> = {
  "postgresql:database":   { level: "compatible", score: 0.99, complexity: "trivial", blockers: [], requirements: ["Already deployed"] },
  "pgvector:extension":    { level: "compatible", score: 0.99, complexity: "trivial", blockers: [], requirements: ["Already deployed"] },
  "nodejs:runtime":        { level: "compatible", score: 0.99, complexity: "trivial", blockers: [], requirements: ["Already deployed"] },
  "nixos:platform":        { level: "compatible", score: 0.99, complexity: "trivial", blockers: [], requirements: ["Current OS"] },
  "chromium:browser":      { level: "compatible", score: 0.99, complexity: "trivial", blockers: [], requirements: ["Already installed via Nix"] },
  "playwright:automation": { level: "compatible", score: 0.99, complexity: "trivial", blockers: [], requirements: ["Already deployed"] },
  "replit:platform":       { level: "compatible", score: 0.99, complexity: "trivial", blockers: [], requirements: ["Current host platform"] },
  "openrouter:platform":   { level: "compatible", score: 0.99, complexity: "trivial", blockers: [], requirements: ["Already integrated"] },
  "stripe:payments":       { level: "compatible", score: 0.98, complexity: "trivial", blockers: [], requirements: ["Already integrated"] },
  "resend:email":          { level: "compatible", score: 0.98, complexity: "trivial", blockers: [], requirements: ["Already integrated"] },
  "deno:runtime":          { level: "partial",    score: 0.55, complexity: "high",    blockers: ["Requires runtime migration from Node.js"], requirements: ["Full runtime migration", "dependency audit"] },
  "bun:runtime":           { level: "partial",    score: 0.60, complexity: "high",    blockers: ["Requires runtime migration from Node.js"], requirements: ["Full runtime migration", "dependency audit"] },
};

// ── Assess compatibility for one technology ────────────────────────────────
export function assessCompatibility(entry: TechnologyEntry): CompatibilityAssessment {
  const base = CATEGORY_COMPAT[entry.category] ?? {
    level: "unknown" as CompatibilityLevel,
    score: 0.5,
    infrastructureCompatible: true,
    adapterCompatible: true,
    osCompatible: true,
    executionModelCompatible: true,
    complexity: "medium" as IntegrationComplexity,
    blockers: [],
    requirements: [],
  };

  const override = TECHNOLOGY_OVERRIDES[entry.key] ?? {};
  const merged: CompatibilityProfile = { ...base, ...override };

  return {
    technologyKey: entry.key,
    compatibilityLevel: merged.level,
    compatibilityScore: merged.score,
    infrastructureCompatible: merged.infrastructureCompatible,
    adapterCompatible: merged.adapterCompatible,
    osCompatible: merged.osCompatible,
    executionModelCompatible: merged.executionModelCompatible,
    integrationComplexity: merged.complexity,
    blockers: merged.blockers,
    requirements: merged.requirements,
    notes: `Static compatibility assessment against ASH stack (Node.js/NixOS/PostgreSQL). Real values via EP_GTI_COMPATIBILITY_CHECKED.`,
  };
}

// ── Batch assess ───────────────────────────────────────────────────────────
export function assessAllCompatibility(technologies: TechnologyEntry[]): CompatibilityAssessment[] {
  return technologies.map(assessCompatibility);
}
