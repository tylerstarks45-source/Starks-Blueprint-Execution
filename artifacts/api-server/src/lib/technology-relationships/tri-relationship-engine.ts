// ── TRI Relationship Engine ─────────────────────────────────────────────────
// Builds the technology relationship graph from a curated static seed.
// 21 relationship types × 54 technologies from Build 033.
// Real relationships arrive via EP_TRI_RELATIONSHIP_DISCOVERED.

import type { TechnologyRelationship, RelationshipType } from "./types";

// ── Relationship Seed ──────────────────────────────────────────────────────
// Each entry: [source, target, type, strength, directionality?, description?]
type RelSeed = [string, string, RelationshipType, number, ("directed" | "bidirectional")?, string?];

const RELATIONSHIP_SEED: RelSeed[] = [
  // ── AI Provider relationships ─────────────────────────────────────────
  ["openrouter:platform",  "openai:gpt-4o",          "hosts",         0.95, "directed",     "OpenRouter routes requests to GPT-4o as one of its primary model backends."],
  ["openrouter:platform",  "anthropic:claude-4",     "hosts",         0.95, "directed",     "OpenRouter routes requests to Claude 4 as a primary model backend."],
  ["openrouter:platform",  "google:gemini-2-flash",  "hosts",         0.90, "directed",     "OpenRouter routes to Gemini 2 Flash for cost-efficient high-throughput tasks."],
  ["openrouter:platform",  "meta:llama-4",           "hosts",         0.85, "directed",     "OpenRouter provides hosted access to LLaMA 4 open-weights model."],
  ["openrouter:platform",  "mistral:large",          "hosts",         0.88, "directed",     "OpenRouter routes to Mistral Large as an EU-compliant model option."],
  ["openrouter:platform",  "deepseek:r2",            "hosts",         0.80, "directed",     "OpenRouter provides access to DeepSeek R2 for cost-efficient reasoning."],
  ["together:inference",   "meta:llama-4",           "hosts",         0.92, "directed",     "Together AI specializes in fast LLaMA 4 inference."],
  ["together:inference",   "mistral:large",          "hosts",         0.88, "directed",     "Together AI provides Mistral inference with fine-tuning support."],
  ["groq:cloud",           "meta:llama-4",           "accelerates",   0.98, "directed",     "Groq LPU delivers ultra-low-latency LLaMA 4 inference."],
  ["fireworks:ai",         "meta:llama-4",           "hosts",         0.88, "directed",     "Fireworks AI optimizes LLaMA 4 for structured output."],
  ["openai:gpt-4o",        "anthropic:claude-4",     "alternative_to",0.85, "bidirectional","GPT-4o and Claude 4 are the two leading frontier model alternatives."],
  ["openai:gpt-4o",        "google:gemini-2-flash",  "alternative_to",0.75, "bidirectional","GPT-4o vs Gemini Flash: capability vs speed-cost trade-off."],
  ["meta:llama-4",         "openai:gpt-4o",          "can_replace",   0.72, "directed",     "LLaMA 4 can replace GPT-4o for organizations needing data sovereignty."],
  ["meta:llama-4",         "anthropic:claude-4",     "can_replace",   0.70, "directed",     "LLaMA 4 open-weights model can replace Claude 4 for self-hosted deployments."],
  ["deepseek:r2",          "openai:gpt-4o",          "can_replace",   0.65, "directed",     "DeepSeek R2 replaces GPT-4o for cost-sensitive reasoning tasks, with security trade-offs."],

  // ── Inference Provider relationships ─────────────────────────────────
  ["openrouter:platform",  "together:inference",     "alternative_to",0.80, "bidirectional","OpenRouter and Together AI are alternative managed inference platforms."],
  ["openrouter:platform",  "groq:cloud",             "complements",   0.88, "bidirectional","OpenRouter for routing breadth; Groq for latency-critical paths."],
  ["openrouter:platform",  "fireworks:ai",           "alternative_to",0.78, "bidirectional","OpenRouter and Fireworks are alternative model-routing platforms."],
  ["groq:cloud",           "together:inference",     "alternative_to",0.82, "bidirectional","Groq (LPU speed) vs Together (broader model selection)."],

  // ── Cloud Provider relationships ──────────────────────────────────────
  ["aws:platform",         "postgresql:database",    "hosts",         0.95, "directed",     "AWS RDS provides managed PostgreSQL hosting at scale."],
  ["aws:platform",         "redis:cache",            "hosts",         0.92, "directed",     "AWS ElastiCache provides managed Redis at cloud scale."],
  ["aws:platform",         "aws:s3",                 "produces",      1.00, "directed",     "S3 is a core AWS platform service."],
  ["aws:platform",         "gcp:platform",           "alternative_to",0.90, "bidirectional","AWS and GCP are the two largest hyperscaler alternatives."],
  ["aws:platform",         "azure:platform",         "alternative_to",0.92, "bidirectional","AWS and Azure are the dominant enterprise hyperscaler alternatives."],
  ["gcp:platform",         "azure:platform",         "alternative_to",0.88, "bidirectional","GCP and Azure are major hyperscaler alternatives."],
  ["replit:platform",      "nodejs:runtime",         "hosts",         0.98, "directed",     "Replit hosts the Node.js runtime — current ASH execution environment."],
  ["replit:platform",      "nixos:platform",         "hosts",         0.98, "directed",     "Replit runs NixOS as the underlying OS — current ASH host OS."],
  ["replit:platform",      "postgresql:database",    "hosts",         0.95, "directed",     "Replit provides the PostgreSQL database — current ASH datastore."],
  ["replit:platform",      "chromium:browser",       "hosts",         0.92, "directed",     "Replit's NixOS environment provides Chromium for ASH browser agent."],
  ["vercel:platform",      "nodejs:runtime",         "hosts",         0.90, "directed",     "Vercel serverless functions run on Node.js."],
  ["vercel:platform",      "aws:platform",           "depends_on",    0.85, "directed",     "Vercel's edge network runs on top of AWS infrastructure."],
  ["railway:platform",     "postgresql:database",    "hosts",         0.88, "directed",     "Railway provides one-click managed PostgreSQL."],

  // ── Database relationships ─────────────────────────────────────────────
  ["pgvector:extension",   "postgresql:database",    "extends",       1.00, "directed",     "pgvector is a PostgreSQL extension — cannot run without it."],
  ["pgvector:extension",   "postgresql:database",    "depends_on",    1.00, "directed",     "pgvector has a hard dependency on a running PostgreSQL instance."],
  ["postgresql:database",  "redis:cache",            "complements",   0.90, "bidirectional","PostgreSQL for persistence; Redis for low-latency caching layer."],
  ["postgresql:database",  "mongodb:database",       "alternative_to",0.78, "bidirectional","PostgreSQL vs MongoDB: relational vs document model trade-off."],
  ["postgresql:database",  "mysql:database",         "alternative_to",0.82, "bidirectional","PostgreSQL and MySQL are the two dominant open-source RDBMS alternatives."],
  ["redis:cache",          "postgresql:database",    "optimizes",     0.88, "directed",     "Redis query result caching reduces PostgreSQL read load significantly."],
  ["mongodb:database",     "redis:cache",            "complements",   0.82, "bidirectional","MongoDB for flexible document storage; Redis for session/cache layer."],
  ["pinecone:platform",    "pgvector:extension",     "alternative_to",0.85, "bidirectional","Pinecone vs pgvector: managed scale vs embedded simplicity."],
  ["qdrant:database",      "pgvector:extension",     "alternative_to",0.88, "bidirectional","Qdrant vs pgvector: dedicated vector DB vs PostgreSQL extension."],
  ["weaviate:database",    "pgvector:extension",     "alternative_to",0.82, "bidirectional","Weaviate vs pgvector: multimodal vs simple vector store."],
  ["qdrant:database",      "pinecone:platform",      "alternative_to",0.85, "bidirectional","Qdrant (open-source) vs Pinecone (managed): cost vs operational simplicity."],
  ["weaviate:database",    "pinecone:platform",      "alternative_to",0.80, "bidirectional","Weaviate vs Pinecone: multimodal hybrid search vs pure vector managed service."],

  // ── Search relationships ───────────────────────────────────────────────
  ["elasticsearch:search", "typesense:search",       "alternative_to",0.78, "bidirectional","Elasticsearch vs Typesense: power vs simplicity/cost trade-off."],
  ["typesense:search",     "postgresql:database",    "complements",   0.80, "bidirectional","Typesense for full-text; PostgreSQL for structured data — common pattern."],
  ["elasticsearch:search", "postgresql:database",    "complements",   0.75, "bidirectional","Elasticsearch for full-text search on top of PostgreSQL source data."],
  ["tavily:search_api",    "openai:gpt-4o",          "enables",       0.92, "directed",     "Tavily provides grounded web search context for GPT-4o completions."],
  ["tavily:search_api",    "anthropic:claude-4",     "enables",       0.90, "directed",     "Tavily web search enriches Claude 4 with real-time information."],
  ["tavily:search_api",    "openrouter:platform",    "complements",   0.88, "directed",     "Tavily provides the search primitive that AI models route through OpenRouter consume."],

  // ── Browser / Playwright relationships ────────────────────────────────
  ["playwright:automation","chromium:browser",       "depends_on",    1.00, "directed",     "Playwright requires Chromium as its primary browser engine."],
  ["playwright:automation","nodejs:runtime",         "requires",      1.00, "directed",     "Playwright is a Node.js library and requires the Node.js runtime."],
  ["chromium:browser",     "nixos:platform",         "requires",      0.95, "directed",     "Chromium is installed via NixOS Nix packages on the current ASH host."],
  ["playwright:automation","openai:gpt-4o",          "enables",       0.85, "directed",     "Playwright browser automation + GPT-4o vision enables visual web understanding."],

  // ── Execution Environment relationships ───────────────────────────────
  ["nodejs:runtime",       "bun:runtime",            "alternative_to",0.80, "bidirectional","Node.js vs Bun: stability+ecosystem vs raw speed."],
  ["nodejs:runtime",       "deno:runtime",           "alternative_to",0.75, "bidirectional","Node.js vs Deno: npm ecosystem vs security-first TypeScript native."],
  ["bun:runtime",          "deno:runtime",           "alternative_to",0.78, "bidirectional","Bun vs Deno: speed focus vs security focus."],
  ["bun:runtime",          "nodejs:runtime",         "can_replace",   0.72, "directed",     "Bun can replace Node.js for performance-critical workloads with migration effort."],
  ["deno:runtime",         "nodejs:runtime",         "can_replace",   0.65, "directed",     "Deno can replace Node.js with significant migration effort."],
  ["nodejs:runtime",       "nixos:platform",         "requires",      0.95, "directed",     "Node.js runtime is installed and managed via NixOS on the current host."],

  // ── Developer Tool relationships ──────────────────────────────────────
  ["github:platform",      "docker:platform",        "supports",      0.90, "directed",     "GitHub Actions CI/CD natively builds and pushes Docker images."],
  ["github:platform",      "vercel:platform",        "enables",       0.92, "directed",     "GitHub provides the source repository that Vercel deploys automatically."],
  ["github:platform",      "railway:platform",       "enables",       0.88, "directed",     "GitHub provides source repositories for Railway deployments."],
  ["docker:platform",      "postgresql:database",    "hosts",         0.88, "directed",     "Docker containers provide portable PostgreSQL instances for dev/test."],
  ["docker:platform",      "redis:cache",            "hosts",         0.88, "directed",     "Docker provides containerized Redis for development environments."],
  ["docker:platform",      "nodejs:runtime",         "hosts",         0.90, "directed",     "Docker containers run Node.js applications in isolated environments."],
  ["vscode:editor",        "nodejs:runtime",         "supports",      0.95, "directed",     "VS Code has first-class TypeScript/Node.js debugging and IntelliSense support."],
  ["vscode:editor",        "playwright:automation",  "supports",      0.85, "directed",     "VS Code has a Playwright Test extension for test authoring and debugging."],
  ["vscode:editor",        "github:platform",        "complements",   0.92, "bidirectional","VS Code with GitHub Copilot + GitHub integration is the dominant dev workflow."],

  // ── Security relationships ─────────────────────────────────────────────
  ["clerk:auth",           "nodejs:runtime",         "requires",      0.95, "directed",     "Clerk SDK requires the Node.js runtime."],
  ["clerk:auth",           "postgresql:database",    "complements",   0.85, "directed",     "Clerk manages auth; PostgreSQL stores application user data (separate concerns)."],
  ["auth0:identity",       "clerk:auth",             "alternative_to",0.88, "bidirectional","Auth0 vs Clerk: enterprise breadth vs developer-experience simplicity."],
  ["auth0:identity",       "nodejs:runtime",         "requires",      0.92, "directed",     "Auth0 Node.js SDK requires the Node.js runtime."],
  ["clerk:auth",           "aws:platform",           "works_best_with",0.82,"directed",     "Clerk works well with AWS deployment for enterprise auth patterns."],

  // ── Analytics relationships ────────────────────────────────────────────
  ["posthog:analytics",    "nodejs:runtime",         "requires",      0.90, "directed",     "PostHog JavaScript SDK requires the Node.js runtime."],
  ["posthog:analytics",    "postgresql:database",    "complements",   0.88, "directed",     "PostHog for behavioral analytics; PostgreSQL for structured business data."],
  ["mixpanel:analytics",   "posthog:analytics",      "alternative_to",0.85, "bidirectional","Mixpanel vs PostHog: proprietary managed vs open-source self-hosted."],
  ["posthog:analytics",    "postgresql:database",    "depends_on",    0.80, "directed",     "PostHog self-hosted requires PostgreSQL as its primary datastore."],

  // ── Payment relationships ──────────────────────────────────────────────
  ["stripe:payments",      "nodejs:runtime",         "requires",      0.95, "directed",     "Stripe Node.js SDK requires the Node.js runtime."],
  ["stripe:payments",      "postgresql:database",    "complements",   0.90, "directed",     "Stripe handles payments; PostgreSQL stores business records and subscription state."],
  ["paddle:payments",      "stripe:payments",        "alternative_to",0.82, "bidirectional","Paddle vs Stripe: MOR tax compliance vs developer-first payment processing."],
  ["stripe:payments",      "resend:email",           "complements",   0.88, "bidirectional","Stripe payment events trigger Resend transactional email receipts."],
  ["stripe:payments",      "hubspot:crm",            "enables",       0.80, "directed",     "Stripe revenue data feeds HubSpot CRM for customer lifecycle tracking."],

  // ── Communication relationships ────────────────────────────────────────
  ["resend:email",         "nodejs:runtime",         "requires",      0.95, "directed",     "Resend Node.js SDK requires the Node.js runtime."],
  ["resend:email",         "twilio:communications",  "alternative_to",0.70, "bidirectional","Resend (email focus) vs Twilio (full CPaaS including SMS/voice)."],
  ["resend:email",         "stripe:payments",        "complements",   0.88, "bidirectional","Resend sends transactional emails triggered by Stripe payment events."],
  ["twilio:communications","stripe:payments",        "complements",   0.82, "bidirectional","Twilio SMS notifications + Stripe payment confirmations."],
  ["slack:platform",       "github:platform",        "complements",   0.90, "bidirectional","Slack receives GitHub CI/CD, PR, and deployment notifications."],
  ["slack:platform",       "stripe:payments",        "complements",   0.80, "directed",     "Slack receives Stripe payment event notifications."],

  // ── Storage relationships ──────────────────────────────────────────────
  ["aws:s3",               "postgresql:database",    "complements",   0.88, "bidirectional","S3 for file/object storage; PostgreSQL for structured relational data."],
  ["cloudflare:r2",        "aws:s3",                 "can_replace",   0.90, "directed",     "Cloudflare R2 can replace S3 with zero egress fees — strong cost reduction."],
  ["cloudflare:r2",        "aws:s3",                 "alternative_to",0.90, "bidirectional","R2 vs S3: cost model (egress free vs AWS egress fees)."],
  ["aws:s3",               "nodejs:runtime",         "complements",   0.88, "directed",     "AWS SDK for JavaScript/Node.js provides S3 access from Node.js applications."],
  ["cloudflare:r2",        "vercel:platform",        "works_best_with",0.88,"bidirectional","Cloudflare R2 + Vercel Edge = zero-egress edge-native storage architecture."],

  // ── CRM relationships ──────────────────────────────────────────────────
  ["hubspot:crm",          "stripe:payments",        "complements",   0.85, "bidirectional","HubSpot CRM for contacts; Stripe for payment and subscription data."],
  ["salesforce:crm",       "hubspot:crm",            "alternative_to",0.80, "bidirectional","Salesforce (enterprise) vs HubSpot (SMB/mid-market) CRM alternatives."],
  ["hubspot:crm",          "resend:email",           "complements",   0.82, "bidirectional","HubSpot CRM contacts drive Resend email campaigns."],
  ["hubspot:crm",          "slack:platform",         "complements",   0.78, "bidirectional","HubSpot CRM events surface as Slack notifications."],

  // ── Automation relationships ───────────────────────────────────────────
  ["n8n:automation",       "postgresql:database",    "depends_on",    0.88, "directed",     "n8n self-hosted requires PostgreSQL for workflow state persistence."],
  ["n8n:automation",       "nodejs:runtime",         "requires",      0.92, "directed",     "n8n runs on the Node.js runtime."],
  ["n8n:automation",       "zapier:automation",      "alternative_to",0.85, "bidirectional","n8n (open-source self-hosted) vs Zapier (managed no-code)."],
  ["temporal:orchestration","postgresql:database",   "depends_on",    0.90, "directed",     "Temporal server requires PostgreSQL or Cassandra for persistence."],
  ["temporal:orchestration","nodejs:runtime",        "requires",      0.90, "directed",     "Temporal client SDK runs on Node.js."],
  ["temporal:orchestration","n8n:automation",        "alternative_to",0.72, "bidirectional","Temporal (code-first durable execution) vs n8n (visual workflow builder)."],
  ["zapier:connect",       "zapier:automation",      "extends",       1.00, "directed",     "Zapier Connect is the connector layer of the Zapier automation platform."],
  ["make:platform",        "zapier:automation",      "alternative_to",0.82, "bidirectional","Make vs Zapier: visual complexity vs ease-of-use trade-off."],
  ["make:platform",        "n8n:automation",         "alternative_to",0.78, "bidirectional","Make (managed visual) vs n8n (open-source self-hosted)."],

  // ── Connector Ecosystem relationships ─────────────────────────────────
  ["zapier:connect",       "hubspot:crm",            "enables",       0.90, "directed",     "Zapier's HubSpot connector enables no-code CRM automation."],
  ["zapier:connect",       "stripe:payments",        "enables",       0.88, "directed",     "Zapier's Stripe connector enables no-code payment workflow automation."],
  ["zapier:connect",       "slack:platform",         "enables",       0.90, "directed",     "Zapier enables Slack notification workflows without code."],
  ["make:platform",        "postgresql:database",    "complements",   0.78, "directed",     "Make can query PostgreSQL data as part of visual automation workflows."],

  // ── OS/Infrastructure relationships ───────────────────────────────────
  ["nixos:platform",       "linux:ubuntu",           "alternative_to",0.75, "bidirectional","NixOS (declarative/reproducible) vs Ubuntu LTS (standard server OS)."],
  ["nixos:platform",       "nodejs:runtime",         "hosts",         0.98, "directed",     "NixOS hosts the Node.js runtime via Nix package management."],
  ["nixos:platform",       "chromium:browser",       "hosts",         0.98, "directed",     "NixOS hosts Chromium via pkgs.chromium Nix package."],
  ["linux:ubuntu",         "postgresql:database",    "hosts",         0.95, "directed",     "Ubuntu is a primary deployment target for self-managed PostgreSQL."],
  ["linux:ubuntu",         "docker:platform",        "hosts",         0.95, "directed",     "Ubuntu is the dominant Docker host OS."],
  ["linux:ubuntu",         "nodejs:runtime",         "hosts",         0.95, "directed",     "Ubuntu is a primary Node.js deployment OS."],

  // ── Security/AI cross relationships ───────────────────────────────────
  ["openai:gpt-4o",        "clerk:auth",             "complements",   0.72, "directed",     "GPT-4o AI features + Clerk auth provide a secure, personalized AI experience."],
  ["openai:gpt-4o",        "postgresql:database",    "works_best_with",0.80,"directed",     "GPT-4o insights are persisted and contextualized in PostgreSQL."],
  ["openrouter:platform",  "nodejs:runtime",         "requires",      0.95, "directed",     "OpenRouter Node.js SDK requires the Node.js runtime."],
  ["openrouter:platform",  "postgresql:database",    "complements",   0.85, "directed",     "OpenRouter usage metrics are logged to PostgreSQL for cost tracking."],

  // ── Performance/Cost optimization relationships ────────────────────────
  ["cloudflare:r2",        "aws:platform",           "limits",        0.80, "directed",     "Cloudflare R2 limits AWS platform lock-in by eliminating S3 egress dependency."],
  ["redis:cache",          "postgresql:database",    "limits",        0.70, "directed",     "Redis caching limits unnecessary PostgreSQL query load."],
  ["groq:cloud",           "openrouter:platform",    "accelerates",   0.88, "directed",     "Groq can be integrated as a low-latency inference backend behind OpenRouter."],
  ["bun:runtime",          "nodejs:runtime",         "accelerates",   0.85, "directed",     "Bun serves as a drop-in speed accelerator for compatible Node.js workloads."],

  // ── Platform → Runtime security ───────────────────────────────────────
  ["clerk:auth",           "openai:gpt-4o",          "secures",       0.78, "directed",     "Clerk authentication gates access to GPT-4o AI features per authenticated user."],
  ["clerk:auth",           "stripe:payments",        "secures",       0.85, "directed",     "Clerk authentication ensures only authenticated users access Stripe payment flows."],
  ["auth0:identity",       "postgresql:database",    "secures",       0.80, "directed",     "Auth0 provides identity for users accessing PostgreSQL-backed applications."],

  // ── Observability ─────────────────────────────────────────────────────
  ["posthog:analytics",    "stripe:payments",        "observes",      0.82, "directed",     "PostHog event tracking observes Stripe payment conversion funnels."],
  ["posthog:analytics",    "clerk:auth",             "observes",      0.80, "directed",     "PostHog tracks user behavior after Clerk authentication events."],
  ["mixpanel:analytics",   "stripe:payments",        "observes",      0.80, "directed",     "Mixpanel event analytics tracks Stripe revenue conversion flows."],
  ["posthog:analytics",    "nodejs:runtime",         "observes",      0.78, "directed",     "PostHog server-side SDK observes Node.js application events."],

  // ── Sharing resources ─────────────────────────────────────────────────
  ["redis:cache",          "nodejs:runtime",         "requires",      0.88, "directed",     "Redis Node.js clients (ioredis/redis) require the Node.js runtime."],
  ["elasticsearch:search", "nodejs:runtime",         "requires",      0.88, "directed",     "Elasticsearch JS client requires the Node.js runtime."],
  ["mongodb:database",     "nodejs:runtime",         "requires",      0.90, "directed",     "MongoDB Node.js driver requires the Node.js runtime."],
  ["typesense:search",     "nodejs:runtime",         "requires",      0.88, "directed",     "Typesense JavaScript client requires the Node.js runtime."],

  // ── Production capability chains ──────────────────────────────────────
  ["openrouter:platform",  "tavily:search_api",      "complements",   0.85, "bidirectional","OpenRouter AI models consume Tavily search results as grounded context."],
  ["playwright:automation","tavily:search_api",      "alternative_to",0.62, "bidirectional","Playwright browser scraping vs Tavily API: dynamic rendering vs structured results."],

  // ── Sharing resources: cloud ecosystems ───────────────────────────────
  ["aws:platform",         "cloudflare:r2",          "shares_resources",0.72,"directed",    "R2 on Cloudflare can serve data originally stored in or mirrored from AWS."],
  ["aws:platform",         "vercel:platform",        "supports",      0.85, "directed",     "Vercel edge functions can invoke AWS Lambda and AWS services."],
  ["aws:platform",         "temporal:orchestration", "hosts",         0.88, "directed",     "AWS hosts Temporal server clusters for enterprise durable workflow execution."],
];

// ── Build relationships from seed ─────────────────────────────────────────
export function buildRelationships(): TechnologyRelationship[] {
  return RELATIONSHIP_SEED.map(([source, target, type, strength, dir, desc]) => ({
    sourceTechnologyKey: source,
    targetTechnologyKey: target,
    relationshipType: type,
    strength,
    directionality: dir ?? "directed",
    description: desc,
    evidence: `Static relationship seed (Build 034). Inject real evidence via EP_TRI_RELATIONSHIP_DISCOVERED.`,
  }));
}

// ── Adjacency map for graph queries ───────────────────────────────────────
export interface AdjacencyMap {
  outgoing: Map<string, TechnologyRelationship[]>;
  incoming: Map<string, TechnologyRelationship[]>;
  nodes: Set<string>;
}

export function buildAdjacencyMap(relationships: TechnologyRelationship[]): AdjacencyMap {
  const outgoing = new Map<string, TechnologyRelationship[]>();
  const incoming = new Map<string, TechnologyRelationship[]>();
  const nodes = new Set<string>();

  for (const rel of relationships) {
    nodes.add(rel.sourceTechnologyKey);
    nodes.add(rel.targetTechnologyKey);

    if (!outgoing.has(rel.sourceTechnologyKey)) outgoing.set(rel.sourceTechnologyKey, []);
    outgoing.get(rel.sourceTechnologyKey)!.push(rel);

    if (!incoming.has(rel.targetTechnologyKey)) incoming.set(rel.targetTechnologyKey, []);
    incoming.get(rel.targetTechnologyKey)!.push(rel);

    // Bidirectional: also add reverse direction
    if (rel.directionality === "bidirectional") {
      if (!outgoing.has(rel.targetTechnologyKey)) outgoing.set(rel.targetTechnologyKey, []);
      outgoing.get(rel.targetTechnologyKey)!.push({ ...rel, sourceTechnologyKey: rel.targetTechnologyKey, targetTechnologyKey: rel.sourceTechnologyKey });
      if (!incoming.has(rel.sourceTechnologyKey)) incoming.set(rel.sourceTechnologyKey, []);
      incoming.get(rel.sourceTechnologyKey)!.push({ ...rel, sourceTechnologyKey: rel.targetTechnologyKey, targetTechnologyKey: rel.sourceTechnologyKey });
    }
  }
  return { outgoing, incoming, nodes };
}

// ── Network statistics ─────────────────────────────────────────────────────
export function computeNetworkStats(
  relationships: TechnologyRelationship[],
  adjacency: AdjacencyMap,
): {
  totalEdges: number;
  totalNodes: number;
  avgDegree: number;
  networkDensity: number;
  networkScore: number;
  mostConnectedTechnology: string | null;
  mostConnectedDegree: number;
  relationshipTypeCounts: Record<string, number>;
} {
  const totalEdges = relationships.length;
  const totalNodes = adjacency.nodes.size;

  // Degree per node (out + in, deduplicated bidirectional counted once)
  const degrees = new Map<string, number>();
  for (const [key, rels] of adjacency.outgoing) {
    degrees.set(key, (degrees.get(key) ?? 0) + rels.length);
  }

  const degreeVals = [...degrees.values()];
  const avgDegree = degreeVals.length > 0 ? degreeVals.reduce((a, b) => a + b, 0) / degreeVals.length : 0;
  const networkDensity = totalNodes > 1 ? totalEdges / (totalNodes * (totalNodes - 1)) : 0;
  const networkScore = Math.min(1, networkDensity * 20 + avgDegree / 20); // heuristic

  let mostConnectedTechnology: string | null = null;
  let mostConnectedDegree = 0;
  for (const [key, deg] of degrees) {
    if (deg > mostConnectedDegree) { mostConnectedDegree = deg; mostConnectedTechnology = key; }
  }

  const typeCounts: Record<string, number> = {};
  for (const rel of relationships) {
    typeCounts[rel.relationshipType] = (typeCounts[rel.relationshipType] ?? 0) + 1;
  }

  return { totalEdges, totalNodes, avgDegree, networkDensity, networkScore, mostConnectedTechnology, mostConnectedDegree, relationshipTypeCounts: typeCounts };
}
