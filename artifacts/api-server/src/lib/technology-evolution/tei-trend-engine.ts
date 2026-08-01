// ── TEI Trend Engine ────────────────────────────────────────────────────────
// Tracks deterministic trend indicators for all 54 catalogued technologies.
// 6 trend directions: accelerating, growing, stable, slowing, declining, recovering.
// Real trend data arrives via EP_TEI_TREND_TRACKED.

import type { TechnologyEvolutionProfile, TrendDirection } from "./types";

export type TrendRecord = Pick<
  TechnologyEvolutionProfile,
  | "technologyKey"
  | "trendDirection"
  | "adoptionVelocity"
  | "marketMomentum"
  | "communityGrowthRate"
  | "enterpriseInterestScore"
  | "jobMarketTrend"
  | "githubStarsTrend"
  | "trendNotes"
>;

// ── Trend catalog ─────────────────────────────────────────────────────────
export const TREND_CATALOG: TrendRecord[] = [
  // AI Models
  { technologyKey: "openai:gpt-4o",          trendDirection: "stable",        adoptionVelocity: 0.35, marketMomentum: 0.90, communityGrowthRate: 0.75, enterpriseInterestScore: 0.95, jobMarketTrend: "rising",    trendNotes: "Market leader consolidating position. Growth rate stabilizing as the field catches up." },
  { technologyKey: "anthropic:claude-4",      trendDirection: "accelerating",  adoptionVelocity: 0.55, marketMomentum: 0.88, communityGrowthRate: 0.80, enterpriseInterestScore: 0.90, jobMarketTrend: "rising",    trendNotes: "Enterprise trust driving accelerating adoption. Constitutional AI differentiation resonating." },
  { technologyKey: "google:gemini-2-flash",   trendDirection: "accelerating",  adoptionVelocity: 0.50, marketMomentum: 0.82, communityGrowthRate: 0.72, enterpriseInterestScore: 0.80, jobMarketTrend: "rising",    trendNotes: "Google AI ecosystem integration driving rapid growth. Cost efficiency attracting high-volume users." },
  { technologyKey: "meta:llama-4",            trendDirection: "accelerating",  adoptionVelocity: 0.60, marketMomentum: 0.80, communityGrowthRate: 0.88, enterpriseInterestScore: 0.72, jobMarketTrend: "rising",    trendNotes: "Open-weights model driving strongest community growth in AI space. Self-hosted adoption surging." },
  { technologyKey: "mistral:large",           trendDirection: "growing",       adoptionVelocity: 0.40, marketMomentum: 0.70, communityGrowthRate: 0.65, enterpriseInterestScore: 0.72, jobMarketTrend: "rising",    trendNotes: "Strong EU growth. GDPR-native advantage growing as regulations tighten." },
  { technologyKey: "deepseek:r2",             trendDirection: "slowing",       adoptionVelocity: 0.20, marketMomentum: 0.55, communityGrowthRate: 0.60, enterpriseInterestScore: 0.30, jobMarketTrend: "stable",    trendNotes: "Initial excitement slowing due to security/sovereignty concerns. Enterprise adoption constrained by compliance." },
  // Inference Platforms
  { technologyKey: "openrouter:platform",     trendDirection: "accelerating",  adoptionVelocity: 0.65, marketMomentum: 0.82, communityGrowthRate: 0.78, enterpriseInterestScore: 0.75, jobMarketTrend: "rising",    trendNotes: "Model-routing abstraction becoming standard practice. Fastest-growing AI infrastructure platform." },
  { technologyKey: "together:inference",      trendDirection: "growing",       adoptionVelocity: 0.45, marketMomentum: 0.68, communityGrowthRate: 0.62, enterpriseInterestScore: 0.60, jobMarketTrend: "rising",    trendNotes: "Open-model specialist growing steadily. Fine-tuning offering differentiates from pure inference." },
  { technologyKey: "groq:cloud",              trendDirection: "accelerating",  adoptionVelocity: 0.70, marketMomentum: 0.78, communityGrowthRate: 0.75, enterpriseInterestScore: 0.65, jobMarketTrend: "rising",    trendNotes: "LPU latency story is compelling. Fastest adoption in latency-sensitive AI applications." },
  { technologyKey: "fireworks:ai",            trendDirection: "growing",       adoptionVelocity: 0.38, marketMomentum: 0.58, communityGrowthRate: 0.48, enterpriseInterestScore: 0.52, jobMarketTrend: "stable",    trendNotes: "Structured output niche growing as AI applications require reliable JSON extraction." },
  // Cloud Platforms
  { technologyKey: "aws:platform",            trendDirection: "stable",        adoptionVelocity: 0.05, marketMomentum: 0.92, communityGrowthRate: 0.45, enterpriseInterestScore: 0.98, jobMarketTrend: "stable",    trendNotes: "Dominant market position. Growth at base rate. AI services (Bedrock) providing new momentum." },
  { technologyKey: "gcp:platform",            trendDirection: "growing",       adoptionVelocity: 0.30, marketMomentum: 0.80, communityGrowthRate: 0.55, enterpriseInterestScore: 0.82, jobMarketTrend: "rising",    trendNotes: "Vertex AI + Gemini integration driving enterprise cloud growth. Best-in-class AI infrastructure." },
  { technologyKey: "azure:platform",          trendDirection: "accelerating",  adoptionVelocity: 0.40, marketMomentum: 0.85, communityGrowthRate: 0.50, enterpriseInterestScore: 0.95, jobMarketTrend: "rising",    trendNotes: "OpenAI partnership creating fastest enterprise AI workload growth of any hyperscaler." },
  { technologyKey: "replit:platform",         trendDirection: "growing",       adoptionVelocity: 0.45, marketMomentum: 0.70, communityGrowthRate: 0.78, enterpriseInterestScore: 0.45, jobMarketTrend: "rising",    trendNotes: "AI-native development environment driving education and rapid prototyping growth." },
  { technologyKey: "vercel:platform",         trendDirection: "accelerating",  adoptionVelocity: 0.50, marketMomentum: 0.82, communityGrowthRate: 0.75, enterpriseInterestScore: 0.70, jobMarketTrend: "rising",    trendNotes: "Edge-native + Next.js dominance creating flywheel. AI SDK driving new adoption wave." },
  { technologyKey: "railway:platform",        trendDirection: "growing",       adoptionVelocity: 0.50, marketMomentum: 0.65, communityGrowthRate: 0.72, enterpriseInterestScore: 0.42, jobMarketTrend: "rising",    trendNotes: "Developer-experience-first positioning resonating strongly with indie developers." },
  { technologyKey: "cloudflare:r2",           trendDirection: "accelerating",  adoptionVelocity: 0.65, marketMomentum: 0.80, communityGrowthRate: 0.70, enterpriseInterestScore: 0.65, jobMarketTrend: "rising",    trendNotes: "Zero-egress story is compelling. Fastest-growing object storage. AWS S3 alternative momentum strong." },
  { technologyKey: "aws:s3",                  trendDirection: "stable",        adoptionVelocity: 0.02, marketMomentum: 0.95, communityGrowthRate: 0.30, enterpriseInterestScore: 0.98, jobMarketTrend: "stable",    trendNotes: "Market standard. Growth limited by market saturation. R2/Backblaze taking share at margin." },
  // Databases
  { technologyKey: "postgresql:database",     trendDirection: "stable",        adoptionVelocity: 0.10, marketMomentum: 0.95, communityGrowthRate: 0.55, enterpriseInterestScore: 0.95, jobMarketTrend: "stable",    trendNotes: "Consistent winner of DB-Engines rankings. Ecosystem adding pgvector, Citus, Timescale. Best-in-class." },
  { technologyKey: "mysql:database",          trendDirection: "slowing",       adoptionVelocity: -0.05, marketMomentum: 0.75, communityGrowthRate: 0.30, enterpriseInterestScore: 0.75, jobMarketTrend: "stable",  trendNotes: "Losing share to PostgreSQL for new projects. Legacy install base provides stability but growth has stopped." },
  { technologyKey: "redis:cache",             trendDirection: "stable",        adoptionVelocity: 0.05, marketMomentum: 0.88, communityGrowthRate: 0.45, enterpriseInterestScore: 0.90, jobMarketTrend: "stable",    trendNotes: "License change concerns. Valkey fork healthy. Core caching use case completely stable." },
  { technologyKey: "mongodb:database",        trendDirection: "slowing",       adoptionVelocity: 0.00, marketMomentum: 0.80, communityGrowthRate: 0.40, enterpriseInterestScore: 0.80, jobMarketTrend: "stable",    trendNotes: "Growth plateauing as PostgreSQL JSONB closes document DB feature gap. Large existing install base." },
  { technologyKey: "pgvector:extension",      trendDirection: "accelerating",  adoptionVelocity: 0.80, marketMomentum: 0.85, communityGrowthRate: 0.88, enterpriseInterestScore: 0.80, jobMarketTrend: "rising",    trendNotes: "Fastest-growing database extension. AI workload demand driving explosive adoption." },
  { technologyKey: "pinecone:platform",       trendDirection: "growing",       adoptionVelocity: 0.35, marketMomentum: 0.68, communityGrowthRate: 0.60, enterpriseInterestScore: 0.65, jobMarketTrend: "rising",    trendNotes: "Managed vector DB growing but facing pressure from open-source alternatives." },
  { technologyKey: "weaviate:database",       trendDirection: "growing",       adoptionVelocity: 0.40, marketMomentum: 0.60, communityGrowthRate: 0.62, enterpriseInterestScore: 0.52, jobMarketTrend: "rising",    trendNotes: "Multimodal niche growing as vision AI applications proliferate." },
  { technologyKey: "qdrant:database",         trendDirection: "accelerating",  adoptionVelocity: 0.55, marketMomentum: 0.70, communityGrowthRate: 0.78, enterpriseInterestScore: 0.55, jobMarketTrend: "rising",    trendNotes: "Best GitHub growth in vector DB space. Open-source performance benchmarks driving adoption." },
  { technologyKey: "elasticsearch:search",    trendDirection: "slowing",       adoptionVelocity: -0.05, marketMomentum: 0.72, communityGrowthRate: 0.35, enterpriseInterestScore: 0.75, jobMarketTrend: "stable",  trendNotes: "License concerns + OpenSearch split + Typesense competition slowing new adoption." },
  { technologyKey: "typesense:search",        trendDirection: "accelerating",  adoptionVelocity: 0.60, marketMomentum: 0.72, communityGrowthRate: 0.75, enterpriseInterestScore: 0.52, jobMarketTrend: "rising",    trendNotes: "Open-source Algolia alternative capturing developer-first search market rapidly." },
  // Runtimes
  { technologyKey: "nodejs:runtime",          trendDirection: "stable",        adoptionVelocity: 0.02, marketMomentum: 0.96, communityGrowthRate: 0.40, enterpriseInterestScore: 0.98, jobMarketTrend: "stable",    trendNotes: "Dominant server runtime. npm ecosystem moat is insurmountable. Extremely stable." },
  { technologyKey: "bun:runtime",             trendDirection: "accelerating",  adoptionVelocity: 0.75, marketMomentum: 0.72, communityGrowthRate: 0.85, enterpriseInterestScore: 0.35, jobMarketTrend: "rising",    trendNotes: "Fastest adoption velocity in runtime space. Speed narrative compelling. Enterprise adoption lagging." },
  { technologyKey: "deno:runtime",            trendDirection: "slowing",       adoptionVelocity: 0.10, marketMomentum: 0.52, communityGrowthRate: 0.45, enterpriseInterestScore: 0.32, jobMarketTrend: "stable",    trendNotes: "Bun captured the speed narrative. v2 npm support helped but momentum has stalled." },
  { technologyKey: "playwright:automation",   trendDirection: "accelerating",  adoptionVelocity: 0.60, marketMomentum: 0.85, communityGrowthRate: 0.82, enterpriseInterestScore: 0.78, jobMarketTrend: "rising",    trendNotes: "Replaced Cypress/Puppeteer as default browser testing choice. AI-assisted test generation expanding market." },
  { technologyKey: "chromium:browser",        trendDirection: "stable",        adoptionVelocity: 0.01, marketMomentum: 0.95, communityGrowthRate: 0.20, enterpriseInterestScore: 0.98, jobMarketTrend: "stable",    trendNotes: "Browser engine standard. Market share at asymptote. No realistic displacement scenario." },
  { technologyKey: "n8n:automation",          trendDirection: "accelerating",  adoptionVelocity: 0.65, marketMomentum: 0.78, communityGrowthRate: 0.82, enterpriseInterestScore: 0.58, jobMarketTrend: "rising",    trendNotes: "AI-native workflow nodes + open-source driving exceptional community growth." },
  { technologyKey: "zapier:automation",       trendDirection: "stable",        adoptionVelocity: 0.02, marketMomentum: 0.82, communityGrowthRate: 0.30, enterpriseInterestScore: 0.82, jobMarketTrend: "stable",    trendNotes: "Dominant no-code automation. Growth plateauing but SMB lock-in provides stability." },
  { technologyKey: "zapier:connect",          trendDirection: "stable",        adoptionVelocity: 0.05, marketMomentum: 0.75, communityGrowthRate: 0.28, enterpriseInterestScore: 0.72, jobMarketTrend: "stable",    trendNotes: "Growth tied to Zapier platform growth. Stable connector ecosystem." },
  { technologyKey: "temporal:orchestration",  trendDirection: "accelerating",  adoptionVelocity: 0.58, marketMomentum: 0.75, communityGrowthRate: 0.78, enterpriseInterestScore: 0.68, jobMarketTrend: "rising",    trendNotes: "Durable workflow category growing rapidly. Cadence/Temporal track record building enterprise confidence." },
  { technologyKey: "make:platform",           trendDirection: "stable",        adoptionVelocity: 0.10, marketMomentum: 0.68, communityGrowthRate: 0.42, enterpriseInterestScore: 0.60, jobMarketTrend: "stable",    trendNotes: "Stable European automation platform. Growth steady but lower than n8n momentum." },
  // OS/Infra
  { technologyKey: "nixos:platform",          trendDirection: "growing",       adoptionVelocity: 0.35, marketMomentum: 0.62, communityGrowthRate: 0.68, enterpriseInterestScore: 0.42, jobMarketTrend: "rising",    trendNotes: "Reproducible builds resonating with DevOps engineers. Growing in ML/AI infra teams." },
  { technologyKey: "linux:ubuntu",            trendDirection: "stable",        adoptionVelocity: 0.02, marketMomentum: 0.95, communityGrowthRate: 0.30, enterpriseInterestScore: 0.95, jobMarketTrend: "stable",    trendNotes: "Server OS standard. Canonical's LTS model provides exceptional stability." },
  { technologyKey: "docker:platform",         trendDirection: "stable",        adoptionVelocity: 0.02, marketMomentum: 0.92, communityGrowthRate: 0.35, enterpriseInterestScore: 0.95, jobMarketTrend: "stable",    trendNotes: "Container standard. Kubernetes drives ongoing Docker demand. Desktop licensing changes minor friction." },
  // Dev Tools
  { technologyKey: "github:platform",         trendDirection: "stable",        adoptionVelocity: 0.05, marketMomentum: 0.97, communityGrowthRate: 0.50, enterpriseInterestScore: 0.98, jobMarketTrend: "stable",    trendNotes: "Copilot AI integration accelerating value. Market position unassailable." },
  { technologyKey: "vscode:editor",           trendDirection: "accelerating",  adoptionVelocity: 0.25, marketMomentum: 0.95, communityGrowthRate: 0.65, enterpriseInterestScore: 0.92, jobMarketTrend: "rising",    trendNotes: "AI coding assistant integration driving renewed adoption acceleration. Monthly release cadence exceptional." },
  // Security
  { technologyKey: "clerk:auth",              trendDirection: "accelerating",  adoptionVelocity: 0.70, marketMomentum: 0.80, communityGrowthRate: 0.82, enterpriseInterestScore: 0.62, jobMarketTrend: "rising",    trendNotes: "Best DX in auth space driving developer-led adoption. B2B org/SAML features closing enterprise gap." },
  { technologyKey: "auth0:identity",          trendDirection: "stable",        adoptionVelocity: 0.00, marketMomentum: 0.78, communityGrowthRate: 0.30, enterpriseInterestScore: 0.88, jobMarketTrend: "stable",    trendNotes: "Enterprise stalwart. Okta integration adding breadth but DX not improving vs Clerk/WorkOS." },
  // Analytics
  { technologyKey: "posthog:analytics",       trendDirection: "accelerating",  adoptionVelocity: 0.65, marketMomentum: 0.78, communityGrowthRate: 0.80, enterpriseInterestScore: 0.55, jobMarketTrend: "rising",    trendNotes: "Open-source + self-hosted driving strongest growth in analytics space. Privacy-first angle resonating." },
  { technologyKey: "mixpanel:analytics",      trendDirection: "slowing",       adoptionVelocity: 0.00, marketMomentum: 0.72, communityGrowthRate: 0.28, enterpriseInterestScore: 0.72, jobMarketTrend: "stable",    trendNotes: "Growth plateauing as PostHog and Amplitude compete on price and openness." },
  // Commerce
  { technologyKey: "stripe:payments",         trendDirection: "stable",        adoptionVelocity: 0.08, marketMomentum: 0.95, communityGrowthRate: 0.50, enterpriseInterestScore: 0.95, jobMarketTrend: "stable",    trendNotes: "Market leader. Revenue Link + new features expanding addressable market. Core API extremely stable." },
  { technologyKey: "paddle:payments",         trendDirection: "growing",       adoptionVelocity: 0.40, marketMomentum: 0.70, communityGrowthRate: 0.58, enterpriseInterestScore: 0.60, jobMarketTrend: "rising",    trendNotes: "Global SaaS tax compliance driving strong growth as Stripe lacks full MOR offering." },
  // Communication
  { technologyKey: "resend:email",            trendDirection: "accelerating",  adoptionVelocity: 0.80, marketMomentum: 0.80, communityGrowthRate: 0.85, enterpriseInterestScore: 0.52, jobMarketTrend: "rising",    trendNotes: "React Email integration is a category-defining differentiator. Fastest-growing transactional email." },
  { technologyKey: "twilio:communications",   trendDirection: "stable",        adoptionVelocity: 0.00, marketMomentum: 0.82, communityGrowthRate: 0.30, enterpriseInterestScore: 0.88, jobMarketTrend: "stable",    trendNotes: "CPaaS standard. Revenue growth stabilizing but platform breadth prevents disruption." },
  { technologyKey: "slack:platform",          trendDirection: "stable",        adoptionVelocity: 0.05, marketMomentum: 0.88, communityGrowthRate: 0.35, enterpriseInterestScore: 0.90, jobMarketTrend: "stable",    trendNotes: "Enterprise standard. Salesforce integration deepening. Teams competition steady but not accelerating." },
  { technologyKey: "hubspot:crm",             trendDirection: "stable",        adoptionVelocity: 0.08, marketMomentum: 0.85, communityGrowthRate: 0.45, enterpriseInterestScore: 0.85, jobMarketTrend: "stable",    trendNotes: "AI CRM features accelerating but market growth at steady state. Strong platform health." },
  { technologyKey: "salesforce:crm",          trendDirection: "stable",        adoptionVelocity: 0.02, marketMomentum: 0.92, communityGrowthRate: 0.25, enterpriseInterestScore: 0.98, jobMarketTrend: "stable",    trendNotes: "Enterprise CRM standard. Agentforce AI platform adding new adoption vector." },
  // AI Search
  { technologyKey: "tavily:search_api",       trendDirection: "accelerating",  adoptionVelocity: 0.85, marketMomentum: 0.80, communityGrowthRate: 0.82, enterpriseInterestScore: 0.58, jobMarketTrend: "rising",    trendNotes: "AI agent search use case growing explosively. First-mover in LLM-optimized search API category." },
];

export function getTrendCatalog(): TrendRecord[] {
  return TREND_CATALOG;
}

export function getTrendLeaders(catalog: TrendRecord[]): string[] {
  return catalog
    .filter(t => t.trendDirection === "accelerating")
    .sort((a, b) => b.adoptionVelocity - a.adoptionVelocity)
    .slice(0, 10)
    .map(t => t.technologyKey);
}
