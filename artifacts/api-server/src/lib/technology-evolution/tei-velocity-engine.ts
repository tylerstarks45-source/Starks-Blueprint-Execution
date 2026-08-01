// ── TEI Velocity Engine ────────────────────────────────────────────────────
// Measures release frequency, maintenance activity, compatibility evolution,
// operational stability per technology.
// Real velocity data arrives via EP_TEI_VELOCITY_MEASURED.

import type {
  TechnologyEvolutionProfile,
  ReleaseFrequency,
  BreakingChangeFrequency,
} from "./types";

export type VelocityRecord = Pick<
  TechnologyEvolutionProfile,
  | "technologyKey"
  | "releaseFrequency"
  | "releasesPerYear"
  | "breakingChangeFrequency"
  | "maintenanceActivity"
  | "issueResolutionSpeed"
  | "backwardsCompatibilityScore"
  | "operationalStabilityScore"
  | "velocityNotes"
>;

// ── Velocity score from raw dimensions ───────────────────────────────────
export function computeVelocityScore(v: VelocityRecord): number {
  // Backwards compat and operational stability are positive contributors.
  // Release frequency is positive up to "regular"; too fast = instability.
  const freqScore: Record<ReleaseFrequency, number> = {
    rapid: 0.80, frequent: 0.90, regular: 1.00, slow: 0.70, stagnant: 0.40,
  };
  const mainScore: Record<string, number> = { active: 1.00, sporadic: 0.60, inactive: 0.20 };
  const issueScore: Record<string, number> = { fast: 1.00, moderate: 0.70, slow: 0.40 };

  return Math.round((
    freqScore[v.releaseFrequency] * 0.25 +
    (mainScore[v.maintenanceActivity] ?? 0.50) * 0.25 +
    (issueScore[v.issueResolutionSpeed] ?? 0.50) * 0.20 +
    v.backwardsCompatibilityScore * 0.15 +
    v.operationalStabilityScore * 0.15
  ) * 1000) / 1000;
}

// ── Velocity catalog ───────────────────────────────────────────────────────
export const VELOCITY_CATALOG: VelocityRecord[] = [
  // AI Models
  { technologyKey: "openai:gpt-4o",          releaseFrequency: "frequent",    releasesPerYear: 12,  breakingChangeFrequency: "occasional", maintenanceActivity: "active",   issueResolutionSpeed: "fast",     backwardsCompatibilityScore: 0.82, operationalStabilityScore: 0.88, velocityNotes: "API stable; model weights updated frequently. Deprecation windows are short (6-12 months)." },
  { technologyKey: "anthropic:claude-4",      releaseFrequency: "slow",        releasesPerYear: 2,   breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "fast",     backwardsCompatibilityScore: 0.88, operationalStabilityScore: 0.90, velocityNotes: "Conservative release cadence. Strong backwards compatibility. Enterprise-grade stability." },
  { technologyKey: "google:gemini-2-flash",   releaseFrequency: "frequent",    releasesPerYear: 8,   breakingChangeFrequency: "occasional", maintenanceActivity: "active",   issueResolutionSpeed: "fast",     backwardsCompatibilityScore: 0.78, operationalStabilityScore: 0.80, velocityNotes: "Rapid iteration. Google deprecates model versions with reasonable notice." },
  { technologyKey: "meta:llama-4",            releaseFrequency: "slow",        releasesPerYear: 2,   breakingChangeFrequency: "frequent",   maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.55, operationalStabilityScore: 0.65, velocityNotes: "Major releases break fine-tuning compatibility. Community forks provide continuity." },
  { technologyKey: "mistral:large",           releaseFrequency: "slow",        releasesPerYear: 3,   breakingChangeFrequency: "occasional", maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.78, operationalStabilityScore: 0.80, velocityNotes: "Deliberate release cadence. API changes announced with deprecation windows." },
  { technologyKey: "deepseek:r2",             releaseFrequency: "slow",        releasesPerYear: 2,   breakingChangeFrequency: "frequent",   maintenanceActivity: "active",   issueResolutionSpeed: "slow",     backwardsCompatibilityScore: 0.50, operationalStabilityScore: 0.55, velocityNotes: "Unpredictable release schedule. Breaking changes common between versions." },
  // Inference Platforms
  { technologyKey: "openrouter:platform",     releaseFrequency: "rapid",       releasesPerYear: 52,  breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "fast",     backwardsCompatibilityScore: 0.88, operationalStabilityScore: 0.82, velocityNotes: "Continuous model additions. API surface stable. New models added without breaking existing." },
  { technologyKey: "together:inference",      releaseFrequency: "frequent",    releasesPerYear: 12,  breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.85, operationalStabilityScore: 0.80, velocityNotes: "API stable. Model catalog additions frequent. SLAs improving." },
  { technologyKey: "groq:cloud",              releaseFrequency: "rapid",       releasesPerYear: 26,  breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "fast",     backwardsCompatibilityScore: 0.88, operationalStabilityScore: 0.78, velocityNotes: "Rapid model additions. OpenAI-compatible API surface provides stability." },
  { technologyKey: "fireworks:ai",            releaseFrequency: "frequent",    releasesPerYear: 12,  breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.82, operationalStabilityScore: 0.72, velocityNotes: "Specialization in structured output. API improving but SLA guarantees limited." },
  // Cloud Platforms
  { technologyKey: "aws:platform",            releaseFrequency: "rapid",       releasesPerYear: 100, breakingChangeFrequency: "never",      maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.99, operationalStabilityScore: 0.99, velocityNotes: "Services never removed. Unlimited backwards compatibility. Industry reference for platform stability." },
  { technologyKey: "gcp:platform",            releaseFrequency: "rapid",       releasesPerYear: 80,  breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.88, operationalStabilityScore: 0.92, velocityNotes: "Product cancellation history (Stadia, Domains) creates mild concern but core services stable." },
  { technologyKey: "azure:platform",          releaseFrequency: "rapid",       releasesPerYear: 90,  breakingChangeFrequency: "never",      maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.95, operationalStabilityScore: 0.96, velocityNotes: "Enterprise-grade stability. Microsoft's enterprise obligations enforce backwards compatibility." },
  { technologyKey: "replit:platform",         releaseFrequency: "rapid",       releasesPerYear: 52,  breakingChangeFrequency: "occasional", maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.72, operationalStabilityScore: 0.75, velocityNotes: "Continuous improvement but some features deprecated without extended transition windows." },
  { technologyKey: "vercel:platform",         releaseFrequency: "rapid",       releasesPerYear: 52,  breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "fast",     backwardsCompatibilityScore: 0.88, operationalStabilityScore: 0.90, velocityNotes: "Extremely fast release cadence. Edge APIs stable. Framework adapters occasionally break." },
  { technologyKey: "railway:platform",        releaseFrequency: "rapid",       releasesPerYear: 52,  breakingChangeFrequency: "occasional", maintenanceActivity: "active",   issueResolutionSpeed: "fast",     backwardsCompatibilityScore: 0.75, operationalStabilityScore: 0.78, velocityNotes: "Moving fast. Feature flags deprecated occasionally. Good developer communication." },
  { technologyKey: "cloudflare:r2",           releaseFrequency: "frequent",    releasesPerYear: 12,  breakingChangeFrequency: "never",      maintenanceActivity: "active",   issueResolutionSpeed: "fast",     backwardsCompatibilityScore: 0.98, operationalStabilityScore: 0.92, velocityNotes: "S3-compatible API guarantees backwards compatibility. New features additive." },
  { technologyKey: "aws:s3",                  releaseFrequency: "slow",        releasesPerYear: 2,   breakingChangeFrequency: "never",      maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 1.00, operationalStabilityScore: 0.99, velocityNotes: "API frozen for compatibility. New features (Intelligent Tiering, etc.) additive only." },
  // Databases
  { technologyKey: "postgresql:database",     releaseFrequency: "slow",        releasesPerYear: 1,   breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.95, operationalStabilityScore: 0.99, velocityNotes: "Annual major release. 5-year support lifecycle. Rock-solid backwards compatibility." },
  { technologyKey: "mysql:database",          releaseFrequency: "slow",        releasesPerYear: 1,   breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "slow",     backwardsCompatibilityScore: 0.92, operationalStabilityScore: 0.96, velocityNotes: "Annual release. Oracle stewardship slows innovation but preserves stability." },
  { technologyKey: "redis:cache",             releaseFrequency: "frequent",    releasesPerYear: 4,   breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "fast",     backwardsCompatibilityScore: 0.95, operationalStabilityScore: 0.97, velocityNotes: "Quarterly releases. Protocol stable. License change created community concern but Valkey fork healthy." },
  { technologyKey: "mongodb:database",        releaseFrequency: "frequent",    releasesPerYear: 4,   breakingChangeFrequency: "occasional", maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.85, operationalStabilityScore: 0.90, velocityNotes: "Quarterly major features. Driver compatibility occasionally requires updating." },
  { technologyKey: "pgvector:extension",      releaseFrequency: "frequent",    releasesPerYear: 6,   breakingChangeFrequency: "occasional", maintenanceActivity: "active",   issueResolutionSpeed: "fast",     backwardsCompatibilityScore: 0.80, operationalStabilityScore: 0.82, velocityNotes: "Rapidly iterating. Index format changes between versions require re-indexing. Fast issue response." },
  { technologyKey: "pinecone:platform",       releaseFrequency: "frequent",    releasesPerYear: 8,   breakingChangeFrequency: "occasional", maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.82, operationalStabilityScore: 0.85, velocityNotes: "Index versions occasionally require migration. V1→V2 migration was complex." },
  { technologyKey: "weaviate:database",       releaseFrequency: "frequent",    releasesPerYear: 8,   breakingChangeFrequency: "occasional", maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.75, operationalStabilityScore: 0.78, velocityNotes: "Frequent releases. Module API changes between versions require attention." },
  { technologyKey: "qdrant:database",         releaseFrequency: "frequent",    releasesPerYear: 10,  breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "fast",     backwardsCompatibilityScore: 0.82, operationalStabilityScore: 0.80, velocityNotes: "Rapid open-source development. gRPC API more stable than REST. Community responsive." },
  { technologyKey: "elasticsearch:search",    releaseFrequency: "frequent",    releasesPerYear: 4,   breakingChangeFrequency: "occasional", maintenanceActivity: "active",   issueResolutionSpeed: "slow",     backwardsCompatibilityScore: 0.80, operationalStabilityScore: 0.85, velocityNotes: "Major version upgrades require full re-index. Mapping changes are painful. Stable once deployed." },
  { technologyKey: "typesense:search",        releaseFrequency: "frequent",    releasesPerYear: 8,   breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "fast",     backwardsCompatibilityScore: 0.88, operationalStabilityScore: 0.85, velocityNotes: "Fast releases with careful compatibility attention. Schema migration tooling improving." },
  // Runtimes
  { technologyKey: "nodejs:runtime",          releaseFrequency: "frequent",    releasesPerYear: 4,   breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.92, operationalStabilityScore: 0.97, velocityNotes: "Even-numbered LTS versions guaranteed 3-year support. API surface extremely stable." },
  { technologyKey: "bun:runtime",             releaseFrequency: "rapid",       releasesPerYear: 26,  breakingChangeFrequency: "frequent",   maintenanceActivity: "active",   issueResolutionSpeed: "fast",     backwardsCompatibilityScore: 0.65, operationalStabilityScore: 0.65, velocityNotes: "Pre-1.0 velocity high. Breaking changes common. API surface stabilizing with 1.x releases." },
  { technologyKey: "deno:runtime",            releaseFrequency: "frequent",    releasesPerYear: 12,  breakingChangeFrequency: "occasional", maintenanceActivity: "active",   issueResolutionSpeed: "fast",     backwardsCompatibilityScore: 0.75, operationalStabilityScore: 0.78, velocityNotes: "v2 added npm compatibility. Breaking changes reduced. std library stabilizing." },
  { technologyKey: "playwright:automation",   releaseFrequency: "frequent",    releasesPerYear: 12,  breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "fast",     backwardsCompatibilityScore: 0.88, operationalStabilityScore: 0.90, velocityNotes: "Monthly releases with Chromium updates. Test API extremely stable. Minor auto-waiting changes." },
  { technologyKey: "chromium:browser",        releaseFrequency: "frequent",    releasesPerYear: 8,   breakingChangeFrequency: "never",      maintenanceActivity: "active",   issueResolutionSpeed: "fast",     backwardsCompatibilityScore: 0.98, operationalStabilityScore: 0.99, velocityNotes: "8 major releases/year. Web standards compatibility never broken. CDP API very stable." },
  { technologyKey: "n8n:automation",          releaseFrequency: "frequent",    releasesPerYear: 12,  breakingChangeFrequency: "occasional", maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.80, operationalStabilityScore: 0.82, velocityNotes: "Monthly releases. Credential encryption migrations between versions require care." },
  { technologyKey: "zapier:automation",       releaseFrequency: "rapid",       releasesPerYear: 52,  breakingChangeFrequency: "never",      maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.95, operationalStabilityScore: 0.92, velocityNotes: "API backwards-compatible by design. Zap logic preserved indefinitely." },
  { technologyKey: "zapier:connect",          releaseFrequency: "frequent",    releasesPerYear: 12,  breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.90, operationalStabilityScore: 0.88, velocityNotes: "Connector API stable. SDK versioning allows gradual migration." },
  { technologyKey: "temporal:orchestration",  releaseFrequency: "frequent",    releasesPerYear: 8,   breakingChangeFrequency: "occasional", maintenanceActivity: "active",   issueResolutionSpeed: "fast",     backwardsCompatibilityScore: 0.85, operationalStabilityScore: 0.88, velocityNotes: "SDK changes between versions require workflow code updates. Server API stable." },
  { technologyKey: "make:platform",           releaseFrequency: "frequent",    releasesPerYear: 12,  breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.88, operationalStabilityScore: 0.85, velocityNotes: "Monthly releases. Scenario logic preserved across versions. API stable." },
  // OS/Infra
  { technologyKey: "nixos:platform",          releaseFrequency: "slow",        releasesPerYear: 2,   breakingChangeFrequency: "occasional", maintenanceActivity: "active",   issueResolutionSpeed: "slow",     backwardsCompatibilityScore: 0.72, operationalStabilityScore: 0.85, velocityNotes: "Biannual releases. Nix derivation language stable. Channel migrations occasionally breaking." },
  { technologyKey: "linux:ubuntu",            releaseFrequency: "slow",        releasesPerYear: 2,   breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.95, operationalStabilityScore: 0.98, velocityNotes: "LTS releases every 2 years with 5-year support. Most stable server OS." },
  { technologyKey: "docker:platform",         releaseFrequency: "frequent",    releasesPerYear: 4,   breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.92, operationalStabilityScore: 0.96, velocityNotes: "Dockerfile format and compose spec stable. Engine updates transparent to most users." },
  // Dev Tools
  { technologyKey: "github:platform",         releaseFrequency: "rapid",       releasesPerYear: 52,  breakingChangeFrequency: "never",      maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.97, operationalStabilityScore: 0.99, velocityNotes: "API versioned and stable. Actions YAML syntax very stable. Git protocol unchanged." },
  { technologyKey: "vscode:editor",           releaseFrequency: "frequent",    releasesPerYear: 12,  breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "fast",     backwardsCompatibilityScore: 0.92, operationalStabilityScore: 0.96, velocityNotes: "Monthly releases. Extension API stable. Settings format backward-compatible." },
  // Security
  { technologyKey: "clerk:auth",              releaseFrequency: "frequent",    releasesPerYear: 12,  breakingChangeFrequency: "occasional", maintenanceActivity: "active",   issueResolutionSpeed: "fast",     backwardsCompatibilityScore: 0.80, operationalStabilityScore: 0.85, velocityNotes: "Active development. SDK major versions (v4→v5) require migration but docs are excellent." },
  { technologyKey: "auth0:identity",          releaseFrequency: "frequent",    releasesPerYear: 8,   breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "slow",     backwardsCompatibilityScore: 0.88, operationalStabilityScore: 0.90, velocityNotes: "Mature platform. Few breaking changes. Enterprise SLAs provide operational stability." },
  // Analytics
  { technologyKey: "posthog:analytics",       releaseFrequency: "rapid",       releasesPerYear: 52,  breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "fast",     backwardsCompatibilityScore: 0.85, operationalStabilityScore: 0.82, velocityNotes: "Extremely rapid releases. API stable. Self-hosted upgrade path well-documented." },
  { technologyKey: "mixpanel:analytics",      releaseFrequency: "slow",        releasesPerYear: 2,   breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.90, operationalStabilityScore: 0.90, velocityNotes: "Stable, mature platform. Few releases. SDK API rarely changes." },
  // Commerce
  { technologyKey: "stripe:payments",         releaseFrequency: "frequent",    releasesPerYear: 8,   breakingChangeFrequency: "never",      maintenanceActivity: "active",   issueResolutionSpeed: "fast",     backwardsCompatibilityScore: 0.99, operationalStabilityScore: 0.99, velocityNotes: "API versioned with date-based versioning. Old API versions never removed. Industry reference." },
  { technologyKey: "paddle:payments",         releaseFrequency: "frequent",    releasesPerYear: 6,   breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.85, operationalStabilityScore: 0.88, velocityNotes: "V2 API stable. Billing V3 required migration. Reasonable notice given." },
  // Communication
  { technologyKey: "resend:email",            releaseFrequency: "rapid",       releasesPerYear: 24,  breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "fast",     backwardsCompatibilityScore: 0.88, operationalStabilityScore: 0.85, velocityNotes: "Fast-growing startup. API stabilizing. React Email integration changes occasionally require updates." },
  { technologyKey: "twilio:communications",   releaseFrequency: "frequent",    releasesPerYear: 6,   breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.92, operationalStabilityScore: 0.92, velocityNotes: "Mature API platform. TwiML and REST API stable. Product additions additive." },
  { technologyKey: "slack:platform",          releaseFrequency: "frequent",    releasesPerYear: 6,   breakingChangeFrequency: "occasional", maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.85, operationalStabilityScore: 0.92, velocityNotes: "Slack app platform API stable. RTM API being deprecated in favor of Events API." },
  { technologyKey: "hubspot:crm",             releaseFrequency: "frequent",    releasesPerYear: 8,   breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "moderate", backwardsCompatibilityScore: 0.88, operationalStabilityScore: 0.90, velocityNotes: "API v3 stable. Quarterly feature additions. Breaking changes rare and well-announced." },
  { technologyKey: "salesforce:crm",          releaseFrequency: "slow",        releasesPerYear: 3,   breakingChangeFrequency: "rare",       maintenanceActivity: "active",   issueResolutionSpeed: "slow",     backwardsCompatibilityScore: 0.95, operationalStabilityScore: 0.95, velocityNotes: "Tri-annual release cycle (Spring/Summer/Winter). API versioned with 3-year deprecation notice." },
  // AI Search
  { technologyKey: "tavily:search_api",       releaseFrequency: "rapid",       releasesPerYear: 26,  breakingChangeFrequency: "occasional", maintenanceActivity: "active",   issueResolutionSpeed: "fast",     backwardsCompatibilityScore: 0.75, operationalStabilityScore: 0.72, velocityNotes: "Early-stage startup. Rapid iteration. API maturing but breaking changes possible." },
];

export function getVelocityCatalog(): VelocityRecord[] {
  return VELOCITY_CATALOG;
}
