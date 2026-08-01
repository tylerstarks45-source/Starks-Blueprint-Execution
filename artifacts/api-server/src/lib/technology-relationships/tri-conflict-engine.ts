// ── TRI Conflict Engine ─────────────────────────────────────────────────────
// Detects conflicts between technologies.
// 8 conflict types: version, runtime, infrastructure, licensing,
//   security, execution, resource, operational.
// Static conflict catalog + inference from "conflicts_with" relationships.

import type { ConflictEdge, ConflictType, ConflictSeverity } from "./types";
import type { TechnologyRelationship } from "./types";

// ── Static conflict catalog ────────────────────────────────────────────────
const CONFLICT_CATALOG: ConflictEdge[] = [
  // Runtime conflicts
  {
    technologyKeyA: "nodejs:runtime",
    technologyKeyB: "bun:runtime",
    conflictType:   "runtime",
    severity:       "medium",
    description:    "Node.js and Bun cannot both serve as the primary runtime simultaneously. Package lock files and native add-ons may be incompatible.",
    resolution:     "Choose one primary runtime. Bun can be used for specific build steps while Node.js serves as the production runtime.",
  },
  {
    technologyKeyA: "nodejs:runtime",
    technologyKeyB: "deno:runtime",
    conflictType:   "runtime",
    severity:       "high",
    description:    "Node.js and Deno use incompatible module systems (CommonJS/npm vs ESM/URL imports). Migrating requires significant codebase changes.",
    resolution:     "Full runtime migration required. Not compatible for concurrent production use.",
  },
  {
    technologyKeyA: "bun:runtime",
    technologyKeyB: "deno:runtime",
    conflictType:   "runtime",
    severity:       "high",
    description:    "Bun and Deno use different module resolution strategies and security models. Cannot be used concurrently as primary runtime.",
    resolution:     "Select one runtime. Both are Node.js alternatives that serve distinct design philosophies.",
  },

  // Infrastructure conflicts
  {
    technologyKeyA: "nixos:platform",
    technologyKeyB: "linux:ubuntu",
    conflictType:   "infrastructure",
    severity:       "critical",
    description:    "NixOS and Ubuntu LTS are mutually exclusive operating systems. Cannot run both simultaneously on the same host.",
    resolution:     "OS migration required. Switching from NixOS to Ubuntu requires full system reinstall and Nix-to-APT package mapping.",
  },
  {
    technologyKeyA: "nixos:platform",
    technologyKeyB: "docker:platform",
    conflictType:   "infrastructure",
    severity:       "low",
    description:    "Docker on NixOS requires additional configuration (nix-daemon + docker daemon). Standard Docker installation methods do not apply.",
    resolution:     "Use nixpkgs.docker or virtualisation.docker.enable = true in NixOS configuration.",
  },
  {
    technologyKeyA: "replit:platform",
    technologyKeyB: "aws:platform",
    conflictType:   "infrastructure",
    severity:       "medium",
    description:    "ASH runs on Replit and cannot natively access AWS VPC resources or private subnets without egress configuration.",
    resolution:     "Use public AWS service endpoints. VPC resources require Lambda@Edge or API Gateway for Replit access.",
  },

  // Licensing conflicts
  {
    technologyKeyA: "deepseek:r2",
    technologyKeyB: "anthropic:claude-4",
    conflictType:   "licensing",
    severity:       "low",
    description:    "DeepSeek models have usage restrictions in certain jurisdictions and may conflict with enterprise data-residency requirements alongside Anthropic's cloud-only model.",
    resolution:     "Review DeepSeek license terms for specific jurisdictions. Do not route sensitive data to DeepSeek in regulated environments.",
  },
  {
    technologyKeyA: "meta:llama-4",
    technologyKeyB: "openai:gpt-4o",
    conflictType:   "licensing",
    severity:       "low",
    description:    "LLaMA 4 license restricts commercial use above 700M MAU threshold. OpenAI commercial terms are separate. No technical conflict but licensing terms differ.",
    resolution:     "Review LLaMA 4 community license if MAU scale exceeds threshold. No operational change needed at current scale.",
  },

  // Security conflicts
  {
    technologyKeyA: "deepseek:r2",
    technologyKeyB: "postgresql:database",
    conflictType:   "security",
    severity:       "high",
    description:    "Routing database-backed customer PII or business-sensitive data through DeepSeek R2 (PRC-based) creates data sovereignty risk in regulated industries.",
    resolution:     "Do not send PII, financial data, or IP to DeepSeek. Use only for public-domain tasks. Route sensitive workloads to EU/US-based providers.",
  },
  {
    technologyKeyA: "deepseek:r2",
    technologyKeyB: "stripe:payments",
    conflictType:   "security",
    severity:       "critical",
    description:    "Never send Stripe payment data, PCI-DSS-scoped information, or cardholder data to DeepSeek R2.",
    resolution:     "Maintain strict data segregation. DeepSeek must never receive payment context. Use GPT-4o, Claude 4, or Mistral for payment-adjacent AI tasks.",
  },

  // Resource conflicts
  {
    technologyKeyA: "elasticsearch:search",
    technologyKeyB: "postgresql:database",
    conflictType:   "resource",
    severity:       "medium",
    description:    "Elasticsearch and PostgreSQL both consume significant memory (2–8GB each under load). Running both on a single node may cause resource contention.",
    resolution:     "Provision separate hosts or use managed cloud services. Monitor memory pressure carefully on shared hosts.",
  },
  {
    technologyKeyA: "pinecone:platform",
    technologyKeyB: "pgvector:extension",
    conflictType:   "operational",
    severity:       "low",
    description:    "Maintaining two vector stores simultaneously creates synchronization overhead and data consistency risk. Data may diverge between Pinecone and pgvector.",
    resolution:     "Choose one vector store as primary. Migrate data fully before decommissioning the other.",
  },

  // Execution conflicts
  {
    technologyKeyA: "temporal:orchestration",
    technologyKeyB: "n8n:automation",
    conflictType:   "execution",
    severity:       "low",
    description:    "Running Temporal and n8n for the same workflow type creates confusion about execution ownership and duplicates orchestration complexity.",
    resolution:     "Assign distinct workflow domains to each engine. Temporal for code-level durable execution; n8n for visual integration workflows.",
  },

  // Operational conflicts
  {
    technologyKeyA: "auth0:identity",
    technologyKeyB: "clerk:auth",
    conflictType:   "operational",
    severity:       "medium",
    description:    "Running Auth0 and Clerk simultaneously for the same application creates token incompatibility, duplicate user records, and session management complexity.",
    resolution:     "Use one identity provider per application. Migration from Clerk to Auth0 or vice versa requires user data export and re-enrollment.",
  },
  {
    technologyKeyA: "salesforce:crm",
    technologyKeyB: "hubspot:crm",
    conflictType:   "operational",
    severity:       "medium",
    description:    "Running Salesforce and HubSpot in parallel for the same business creates duplicate contact records, data sync overhead, and conflicting sales pipelines.",
    resolution:     "Select one CRM as the system of record. Use integration tools for data migration, not parallel operation.",
  },
  {
    technologyKeyA: "mixpanel:analytics",
    technologyKeyB: "posthog:analytics",
    conflictType:   "operational",
    severity:       "low",
    description:    "Instrumenting the same user events in both Mixpanel and PostHog doubles event tracking cost and creates reporting inconsistencies.",
    resolution:     "Select one analytics platform as primary. PostHog self-hosted reduces cost; Mixpanel offers stronger funnel analysis.",
  },
];

// ── Derive conflicts from explicit "conflicts_with" relationships ───────────
export function deriveConflictsFromRelationships(relationships: TechnologyRelationship[]): ConflictEdge[] {
  return relationships
    .filter(r => r.relationshipType === "conflicts_with")
    .map(r => ({
      technologyKeyA: r.sourceTechnologyKey,
      technologyKeyB: r.targetTechnologyKey,
      conflictType:   "operational" as ConflictType,
      severity:       "medium" as ConflictSeverity,
      description:    r.description ?? `${r.sourceTechnologyKey} conflicts with ${r.targetTechnologyKey}.`,
      resolution:     "Review the specific operational conflict before using both technologies simultaneously.",
    }));
}

// ── Public: all conflicts ──────────────────────────────────────────────────
export function buildConflicts(relationships: TechnologyRelationship[]): ConflictEdge[] {
  const derived = deriveConflictsFromRelationships(relationships);
  const seen = new Set<string>();
  const all: ConflictEdge[] = [];

  const key = (a: string, b: string): string => a < b ? `${a}|${b}` : `${b}|${a}`;

  for (const c of [...CONFLICT_CATALOG, ...derived]) {
    const k = key(c.technologyKeyA, c.technologyKeyB);
    if (seen.has(k)) continue;
    seen.add(k);
    all.push(c);
  }

  return all.sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });
}

// ── Count active conflicts ─────────────────────────────────────────────────
export function countActiveConflicts(conflicts: ConflictEdge[]): number {
  return conflicts.filter(c => c.severity === "critical" || c.severity === "high").length;
}
