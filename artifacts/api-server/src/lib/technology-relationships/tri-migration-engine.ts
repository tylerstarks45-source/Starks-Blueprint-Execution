// ── TRI Migration Engine ────────────────────────────────────────────────────
// Maps migration paths between technologies: replacement type, complexity, risk,
// estimated effort, rollback strategy, compatibility confidence, benefit score.
// Real migration data arrives via EP_TRI_MIGRATION_MAPPED.

import type { ReplacementEdge, MigrationComplexity, MigrationRisk, ReplacementType, ReplacementDirection } from "./types";
import type { TechnologyRelationship } from "./types";

// ── Static migration catalog ───────────────────────────────────────────────
const MIGRATION_CATALOG: ReplacementEdge[] = [
  // JavaScript runtime migrations
  {
    sourceTechnologyKey:    "nodejs:runtime",
    targetTechnologyKey:    "bun:runtime",
    replacementType:        "gradual",
    direction:              "upgrade",
    migrationComplexity:    "high",
    migrationRisk:          "medium",
    estimatedEffort:        "4–8 weeks (audit, replace build scripts, validate native add-ons, E2E testing)",
    rollbackStrategy:       "Keep Node.js as fallback runtime. Switch back by reverting package.json scripts. No data migration required.",
    compatibilityConfidence: 0.72,
    benefitScore:           0.82,
    description:            "Migrating from Node.js to Bun delivers significant performance gains but requires validating all native dependencies.",
  },
  {
    sourceTechnologyKey:    "nodejs:runtime",
    targetTechnologyKey:    "deno:runtime",
    replacementType:        "full",
    direction:              "upgrade",
    migrationComplexity:    "very_high",
    migrationRisk:          "high",
    estimatedEffort:        "12–24 weeks (module rewrites, npm shim validation, permission model adoption)",
    rollbackStrategy:       "Full rollback to Node.js: maintain Node.js codebase in parallel branch until Deno migration is fully validated.",
    compatibilityConfidence: 0.55,
    benefitScore:           0.68,
    description:            "Node.js → Deno is a major architectural migration requiring full module-system rewrite.",
  },

  // Vector database migrations
  {
    sourceTechnologyKey:    "pgvector:extension",
    targetTechnologyKey:    "pinecone:platform",
    replacementType:        "full",
    direction:              "upgrade",
    migrationComplexity:    "medium",
    migrationRisk:          "medium",
    estimatedEffort:        "2–4 weeks (data export, Pinecone ingestion, query layer update, fallback period)",
    rollbackStrategy:       "Keep pgvector active during migration. Maintain both until Pinecone is validated at target query volume.",
    compatibilityConfidence: 0.82,
    benefitScore:           0.75,
    description:            "pgvector → Pinecone: move to managed vector DB for 10M+ vector scale. Adds ongoing cost.",
  },
  {
    sourceTechnologyKey:    "pgvector:extension",
    targetTechnologyKey:    "qdrant:database",
    replacementType:        "full",
    direction:              "upgrade",
    migrationComplexity:    "medium",
    migrationRisk:          "medium",
    estimatedEffort:        "2–3 weeks (deploy Qdrant, migrate vectors, update query layer, validate ANN accuracy)",
    rollbackStrategy:       "Keep pgvector running in parallel. Fall back to pgvector queries if Qdrant latency exceeds threshold.",
    compatibilityConfidence: 0.85,
    benefitScore:           0.80,
    description:            "pgvector → Qdrant: higher ANN performance for large vector collections. Self-hosted, so no vendor dependency.",
  },
  {
    sourceTechnologyKey:    "pgvector:extension",
    targetTechnologyKey:    "weaviate:database",
    replacementType:        "full",
    direction:              "upgrade",
    migrationComplexity:    "medium",
    migrationRisk:          "medium",
    estimatedEffort:        "3–5 weeks (schema mapping, data ingestion, hybrid search integration, API layer update)",
    rollbackStrategy:       "Parallel-run pgvector until Weaviate multimodal hybrid search is validated end-to-end.",
    compatibilityConfidence: 0.80,
    benefitScore:           0.78,
    description:            "pgvector → Weaviate: adds multimodal + hybrid search. Worthwhile for vision or multi-type embedding workloads.",
  },

  // Object storage migrations
  {
    sourceTechnologyKey:    "aws:s3",
    targetTechnologyKey:    "cloudflare:r2",
    replacementType:        "gradual",
    direction:              "lateral",
    migrationComplexity:    "low",
    migrationRisk:          "low",
    estimatedEffort:        "1–2 weeks (S3-compatible API swap, DNS/CDN update, egress cost validation)",
    rollbackStrategy:       "S3 bucket remains active. Revert DNS/R2 endpoint configuration. No data loss — objects can be re-synced.",
    compatibilityConfidence: 0.92,
    benefitScore:           0.88,
    description:            "S3 → Cloudflare R2: eliminates egress fees. S3-compatible API makes this the lowest-risk migration in the catalog.",
  },

  // Auth migrations
  {
    sourceTechnologyKey:    "clerk:auth",
    targetTechnologyKey:    "auth0:identity",
    replacementType:        "full",
    direction:              "upgrade",
    migrationComplexity:    "high",
    migrationRisk:          "high",
    estimatedEffort:        "6–12 weeks (user export, Auth0 tenant setup, JWT migration, session strategy, testing)",
    rollbackStrategy:       "Maintain Clerk tenant active during Auth0 pilot. Cut over when 100% of user cohort is verified in Auth0.",
    compatibilityConfidence: 0.75,
    benefitScore:           0.68,
    description:            "Clerk → Auth0: justified only if enterprise SSO, complex RBAC, or Okta integration is required.",
  },

  // AI inference migrations
  {
    sourceTechnologyKey:    "openrouter:platform",
    targetTechnologyKey:    "together:inference",
    replacementType:        "partial",
    direction:              "lateral",
    migrationComplexity:    "low",
    migrationRisk:          "low",
    estimatedEffort:        "1–2 weeks (API key swap, model name mapping, fallback chain update)",
    rollbackStrategy:       "Revert API base URL to OpenRouter endpoint. No data migration required.",
    compatibilityConfidence: 0.88,
    benefitScore:           0.72,
    description:            "OpenRouter → Together AI: reasonable for open-model-only workloads. Loses multi-provider routing breadth.",
  },
  {
    sourceTechnologyKey:    "openrouter:platform",
    targetTechnologyKey:    "groq:cloud",
    replacementType:        "partial",
    direction:              "lateral",
    migrationComplexity:    "low",
    migrationRisk:          "low",
    estimatedEffort:        "1 week (API endpoint swap, model list update, throughput testing)",
    rollbackStrategy:       "Revert API base URL. Groq and OpenRouter are both REST-compatible inference APIs.",
    compatibilityConfidence: 0.92,
    benefitScore:           0.82,
    description:            "OpenRouter → Groq: justified for latency-critical paths where sub-200ms is required.",
  },

  // Database migrations
  {
    sourceTechnologyKey:    "postgresql:database",
    targetTechnologyKey:    "mongodb:database",
    replacementType:        "full",
    direction:              "lateral",
    migrationComplexity:    "very_high",
    migrationRisk:          "critical",
    estimatedEffort:        "24–52 weeks (schema redesign, ORM migration, data transformation, testing, phased rollout)",
    rollbackStrategy:       "Keep PostgreSQL as source of truth during entire migration. Never decommission until MongoDB has served full production load for 90+ days.",
    compatibilityConfidence: 0.45,
    benefitScore:           0.40,
    description:            "PostgreSQL → MongoDB: not recommended without a specific schema-flexibility requirement. Very high risk for the current system.",
  },
  {
    sourceTechnologyKey:    "postgresql:database",
    targetTechnologyKey:    "mysql:database",
    replacementType:        "full",
    direction:              "lateral",
    migrationComplexity:    "high",
    migrationRisk:          "high",
    estimatedEffort:        "8–16 weeks (SQL dialect audit, Drizzle schema migration, data dump + restore, testing)",
    rollbackStrategy:       "Run MySQL in parallel with PostgreSQL until all queries validated. Maintain pg_dump backup for rollback.",
    compatibilityConfidence: 0.65,
    benefitScore:           0.38,
    description:            "PostgreSQL → MySQL: not recommended. PostgreSQL is superior in most metrics. Only justified by specific MySQL-only managed service requirements.",
  },

  // CRM migrations
  {
    sourceTechnologyKey:    "hubspot:crm",
    targetTechnologyKey:    "salesforce:crm",
    replacementType:        "full",
    direction:              "upgrade",
    migrationComplexity:    "very_high",
    migrationRisk:          "high",
    estimatedEffort:        "16–32 weeks (data migration, workflow mapping, integration re-build, training)",
    rollbackStrategy:       "Maintain HubSpot export. Salesforce migration is rarely reversible at enterprise scale — validate thoroughly before committing.",
    compatibilityConfidence: 0.65,
    benefitScore:           0.58,
    description:            "HubSpot → Salesforce: justified only at enterprise scale (>500 users, complex territory management). Very high operational cost increase.",
  },

  // Payment migrations
  {
    sourceTechnologyKey:    "stripe:payments",
    targetTechnologyKey:    "paddle:payments",
    replacementType:        "full",
    direction:              "lateral",
    migrationComplexity:    "high",
    migrationRisk:          "high",
    estimatedEffort:        "8–12 weeks (webhook re-wiring, subscription migration, tax compliance configuration, testing)",
    rollbackStrategy:       "Keep Stripe active for existing subscriptions. Run Paddle only for new subscriptions during transition. Full cutover requires subscription migration.",
    compatibilityConfidence: 0.72,
    benefitScore:           0.65,
    description:            "Stripe → Paddle: justified for global expansion requiring VAT/GST MOR compliance. Adds complexity for US-only businesses.",
  },
];

// ── Derive replacements from "replaces" / "can_replace" relationships ──────
export function deriveReplacementsFromRelationships(relationships: TechnologyRelationship[]): ReplacementEdge[] {
  return relationships
    .filter(r => r.relationshipType === "replaces" || r.relationshipType === "can_replace")
    .map(r => {
      const isHard = r.relationshipType === "replaces";
      return {
        sourceTechnologyKey:    r.targetTechnologyKey, // being replaced
        targetTechnologyKey:    r.sourceTechnologyKey, // replacement
        replacementType:        (isHard ? "full" : "partial") as ReplacementType,
        direction:              "lateral" as ReplacementDirection,
        migrationComplexity:    (r.strength >= 0.85 ? "medium" : "high") as MigrationComplexity,
        migrationRisk:          "medium" as MigrationRisk,
        estimatedEffort:        undefined,
        rollbackStrategy:       `Maintain ${r.targetTechnologyKey} during transition. Revert by restoring original configuration.`,
        compatibilityConfidence: r.strength,
        benefitScore:           r.strength * 0.85,
        description:            r.description ?? `${r.sourceTechnologyKey} can replace ${r.targetTechnologyKey}.`,
      };
    });
}

// ── Public: all migration paths ────────────────────────────────────────────
export function buildMigrationPaths(relationships: TechnologyRelationship[]): ReplacementEdge[] {
  const derived = deriveReplacementsFromRelationships(relationships);
  const seen = new Set<string>();
  const all: ReplacementEdge[] = [];

  const key = (s: string, t: string): string => `${s}→${t}`;

  for (const m of [...MIGRATION_CATALOG, ...derived]) {
    const k = key(m.sourceTechnologyKey, m.targetTechnologyKey);
    if (seen.has(k)) continue;
    seen.add(k);
    all.push(m);
  }

  return all.sort((a, b) => b.benefitScore - a.benefitScore);
}
