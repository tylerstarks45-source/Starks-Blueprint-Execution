// ── GTI Benchmark Engine ────────────────────────────────────────────────────
// Stores deterministic benchmark metadata for each technology.
// 9 benchmark dimensions + composite score.
// Baseline values derived from public knowledge; real values via EP_GTI_BENCHMARK_ASSESSED.

import type { TechnologyEntry, BenchmarkScores } from "./types";

// ── Benchmark profiles by technology key ──────────────────────────────────
// Each score is 0-1 where higher is better on all dimensions.
// maintenance_burden: higher = LOWER maintenance burden (i.e. easy to operate).
// cost: higher = MORE cost-efficient (i.e. cheaper for the value delivered).
interface BenchmarkProfile {
  performance: number;
  reliability: number;
  cost: number;
  latency: number;
  scalability: number;
  maintenanceBurden: number;
  vendorMaturity: number;
  communityAdoption: number;
  securityPosture: number;
  notes?: string;
}

const BENCHMARK_PROFILES: Record<string, BenchmarkProfile> = {
  // AI Providers
  "openai:gpt-4o":          { performance: 0.95, reliability: 0.92, cost: 0.40, latency: 0.80, scalability: 0.95, maintenanceBurden: 0.95, vendorMaturity: 0.95, communityAdoption: 0.98, securityPosture: 0.88, notes: "Best-in-class multimodal; highest cost tier among commercial providers." },
  "anthropic:claude-4":     { performance: 0.94, reliability: 0.90, cost: 0.38, latency: 0.78, scalability: 0.92, maintenanceBurden: 0.95, vendorMaturity: 0.88, communityAdoption: 0.85, securityPosture: 0.92, notes: "Superior reasoning; constitutional AI design enhances safety posture." },
  "google:gemini-2-flash":  { performance: 0.88, reliability: 0.90, cost: 0.75, latency: 0.90, scalability: 0.95, maintenanceBurden: 0.95, vendorMaturity: 0.92, communityAdoption: 0.82, securityPosture: 0.88, notes: "Exceptional speed-to-cost ratio; ideal for high-throughput routing." },
  "meta:llama-4":           { performance: 0.90, reliability: 0.75, cost: 0.90, latency: 0.70, scalability: 0.80, maintenanceBurden: 0.55, vendorMaturity: 0.85, communityAdoption: 0.88, securityPosture: 0.78, notes: "Self-hosted means zero marginal cost but requires infrastructure to serve." },
  "mistral:large":          { performance: 0.84, reliability: 0.85, cost: 0.65, latency: 0.82, scalability: 0.88, maintenanceBurden: 0.90, vendorMaturity: 0.78, communityAdoption: 0.72, securityPosture: 0.85, notes: "Strong EU regulatory compliance posture; competitive at mid tier." },
  "deepseek:r2":            { performance: 0.88, reliability: 0.72, cost: 0.88, latency: 0.75, scalability: 0.82, maintenanceBurden: 0.70, vendorMaturity: 0.65, communityAdoption: 0.75, securityPosture: 0.60, notes: "Exceptional cost-efficiency; geopolitical risk and data-residency concerns." },

  // Inference Providers
  "openrouter:platform":    { performance: 0.90, reliability: 0.88, cost: 0.80, latency: 0.82, scalability: 0.92, maintenanceBurden: 0.92, vendorMaturity: 0.78, communityAdoption: 0.82, securityPosture: 0.80, notes: "Already integrated; routing layer adds minimal latency overhead." },
  "together:inference":     { performance: 0.85, reliability: 0.85, cost: 0.72, latency: 0.82, scalability: 0.88, maintenanceBurden: 0.90, vendorMaturity: 0.80, communityAdoption: 0.75, securityPosture: 0.78, notes: "Strong open-model specialization; fine-tuning capability adds differentiation." },
  "groq:cloud":             { performance: 0.80, reliability: 0.82, cost: 0.62, latency: 0.98, scalability: 0.80, maintenanceBurden: 0.90, vendorMaturity: 0.72, communityAdoption: 0.70, securityPosture: 0.78, notes: "Unmatched latency via LPU; excellent for real-time streaming use cases." },
  "fireworks:ai":           { performance: 0.85, reliability: 0.85, cost: 0.72, latency: 0.85, scalability: 0.88, maintenanceBurden: 0.90, vendorMaturity: 0.75, communityAdoption: 0.68, securityPosture: 0.78, notes: "Strong structured output support; competitive with Together AI." },

  // Cloud Providers
  "aws:platform":           { performance: 0.95, reliability: 0.99, cost: 0.45, latency: 0.88, scalability: 0.99, maintenanceBurden: 0.60, vendorMaturity: 0.99, communityAdoption: 0.99, securityPosture: 0.95, notes: "Gold standard reliability; complex pricing and operational overhead." },
  "gcp:platform":           { performance: 0.93, reliability: 0.97, cost: 0.50, latency: 0.88, scalability: 0.98, maintenanceBurden: 0.62, vendorMaturity: 0.97, communityAdoption: 0.92, securityPosture: 0.95, notes: "Best AI/ML managed services integration; strong BigQuery ecosystem." },
  "azure:platform":         { performance: 0.92, reliability: 0.97, cost: 0.48, latency: 0.85, scalability: 0.98, maintenanceBurden: 0.60, vendorMaturity: 0.98, communityAdoption: 0.93, securityPosture: 0.97, notes: "Enterprise compliance leader; deep Microsoft/OpenAI partnership." },
  "replit:platform":        { performance: 0.80, reliability: 0.88, cost: 0.82, latency: 0.80, scalability: 0.80, maintenanceBurden: 0.95, vendorMaturity: 0.82, communityAdoption: 0.85, securityPosture: 0.80, notes: "Current host; highest developer experience score, lower raw throughput." },

  // Developer Tools
  "github:platform":        { performance: 0.90, reliability: 0.97, cost: 0.72, latency: 0.85, scalability: 0.96, maintenanceBurden: 0.92, vendorMaturity: 0.99, communityAdoption: 0.99, securityPosture: 0.90, notes: "Universal source control standard; Actions CI deeply adopted." },
  "vscode:editor":          { performance: 0.88, reliability: 0.95, cost: 0.99, latency: 0.90, scalability: 0.85, maintenanceBurden: 0.88, vendorMaturity: 0.99, communityAdoption: 0.98, securityPosture: 0.85, notes: "Free, open-source; dominant developer tool worldwide." },
  "docker:platform":        { performance: 0.88, reliability: 0.92, cost: 0.72, latency: 0.82, scalability: 0.90, maintenanceBurden: 0.80, vendorMaturity: 0.98, communityAdoption: 0.97, securityPosture: 0.82, notes: "Container standard; not currently used on Replit's managed environment." },

  // Browser
  "chromium:browser":       { performance: 0.92, reliability: 0.95, cost: 0.99, latency: 0.88, scalability: 0.85, maintenanceBurden: 0.85, vendorMaturity: 0.99, communityAdoption: 0.99, securityPosture: 0.88, notes: "Already deployed; powers ASH browser agent." },
  "playwright:automation":  { performance: 0.92, reliability: 0.95, cost: 0.99, latency: 0.85, scalability: 0.88, maintenanceBurden: 0.88, vendorMaturity: 0.95, communityAdoption: 0.95, securityPosture: 0.88, notes: "Already deployed for ASH browser automation." },

  // Operating Systems
  "linux:ubuntu":           { performance: 0.90, reliability: 0.95, cost: 0.99, latency: 0.90, scalability: 0.95, maintenanceBurden: 0.78, vendorMaturity: 0.99, communityAdoption: 0.99, securityPosture: 0.88, notes: "Dominant server OS; strong ecosystem and long support windows." },
  "nixos:platform":         { performance: 0.88, reliability: 0.92, cost: 0.99, latency: 0.88, scalability: 0.90, maintenanceBurden: 0.75, vendorMaturity: 0.85, communityAdoption: 0.72, securityPosture: 0.92, notes: "Current ASH OS; reproducible builds and declarative configuration." },

  // Databases
  "postgresql:database":    { performance: 0.92, reliability: 0.99, cost: 0.95, latency: 0.88, scalability: 0.90, maintenanceBurden: 0.82, vendorMaturity: 0.99, communityAdoption: 0.98, securityPosture: 0.92, notes: "Current primary datastore; mature, battle-tested, and extensible." },
  "redis:cache":            { performance: 0.98, reliability: 0.95, cost: 0.85, latency: 0.99, scalability: 0.92, maintenanceBurden: 0.85, vendorMaturity: 0.98, communityAdoption: 0.97, securityPosture: 0.85, notes: "Sub-millisecond latency; ideal for caching, pub/sub, and rate limiting." },
  "mongodb:database":       { performance: 0.88, reliability: 0.90, cost: 0.72, latency: 0.85, scalability: 0.92, maintenanceBurden: 0.80, vendorMaturity: 0.95, communityAdoption: 0.90, securityPosture: 0.82, notes: "Flexible schema; migration from PostgreSQL requires significant data-layer work." },
  "mysql:database":         { performance: 0.88, reliability: 0.95, cost: 0.90, latency: 0.88, scalability: 0.88, maintenanceBurden: 0.82, vendorMaturity: 0.99, communityAdoption: 0.95, securityPosture: 0.85, notes: "Reliable and widely understood; less feature-rich than PostgreSQL." },

  // Vector DBs
  "pgvector:extension":     { performance: 0.82, reliability: 0.95, cost: 0.99, latency: 0.80, scalability: 0.80, maintenanceBurden: 0.95, vendorMaturity: 0.88, communityAdoption: 0.88, securityPosture: 0.92, notes: "Already deployed; zero additional infrastructure; scales to ~10M vectors." },
  "pinecone:platform":      { performance: 0.95, reliability: 0.95, cost: 0.40, latency: 0.92, scalability: 0.98, maintenanceBurden: 0.95, vendorMaturity: 0.88, communityAdoption: 0.82, securityPosture: 0.88, notes: "Best managed vector DB for 100M+ vectors; high cost at scale." },
  "weaviate:database":      { performance: 0.90, reliability: 0.88, cost: 0.72, latency: 0.85, scalability: 0.92, maintenanceBurden: 0.78, vendorMaturity: 0.82, communityAdoption: 0.75, securityPosture: 0.82, notes: "Multimodal support and hybrid search are key differentiators." },
  "qdrant:database":        { performance: 0.92, reliability: 0.88, cost: 0.75, latency: 0.88, scalability: 0.90, maintenanceBurden: 0.80, vendorMaturity: 0.80, communityAdoption: 0.72, securityPosture: 0.85, notes: "Highest raw similarity-search performance among open-source options." },

  // Search
  "elasticsearch:search":   { performance: 0.90, reliability: 0.92, cost: 0.50, latency: 0.82, scalability: 0.95, maintenanceBurden: 0.62, vendorMaturity: 0.98, communityAdoption: 0.95, securityPosture: 0.88, notes: "Most powerful full-text search; operationally complex and resource-hungry." },
  "typesense:search":       { performance: 0.85, reliability: 0.88, cost: 0.80, latency: 0.92, scalability: 0.85, maintenanceBurden: 0.88, vendorMaturity: 0.80, communityAdoption: 0.72, securityPosture: 0.85, notes: "Simpler, faster, and cheaper alternative to Elasticsearch for most use cases." },
  "tavily:search_api":      { performance: 0.82, reliability: 0.85, cost: 0.62, latency: 0.80, scalability: 0.90, maintenanceBurden: 0.95, vendorMaturity: 0.72, communityAdoption: 0.68, securityPosture: 0.80, notes: "Purpose-built for AI agents; returns structured, LLM-ready search results." },

  // Automation
  "n8n:automation":         { performance: 0.82, reliability: 0.85, cost: 0.88, latency: 0.75, scalability: 0.80, maintenanceBurden: 0.80, vendorMaturity: 0.82, communityAdoption: 0.78, securityPosture: 0.82, notes: "Self-hostable; strong AI workflow nodes; growing community." },
  "zapier:automation":      { performance: 0.80, reliability: 0.90, cost: 0.45, latency: 0.72, scalability: 0.88, maintenanceBurden: 0.95, vendorMaturity: 0.98, communityAdoption: 0.95, securityPosture: 0.85, notes: "Highest no-code adoption; expensive at volume; 5000+ integrations." },
  "temporal:orchestration": { performance: 0.92, reliability: 0.95, cost: 0.75, latency: 0.78, scalability: 0.95, maintenanceBurden: 0.72, vendorMaturity: 0.85, communityAdoption: 0.72, securityPosture: 0.88, notes: "Best-in-class durable execution; steeper learning curve than simpler alternatives." },

  // CRM
  "hubspot:crm":            { performance: 0.82, reliability: 0.90, cost: 0.55, latency: 0.78, scalability: 0.85, maintenanceBurden: 0.85, vendorMaturity: 0.95, communityAdoption: 0.90, securityPosture: 0.85, notes: "Strong SMB/mid-market fit; good API; expensive at full suite." },
  "salesforce:crm":         { performance: 0.82, reliability: 0.95, cost: 0.30, latency: 0.72, scalability: 0.95, maintenanceBurden: 0.62, vendorMaturity: 0.99, communityAdoption: 0.95, securityPosture: 0.92, notes: "Enterprise standard; very expensive; highest operational complexity." },

  // Security
  "auth0:identity":         { performance: 0.88, reliability: 0.95, cost: 0.60, latency: 0.82, scalability: 0.92, maintenanceBurden: 0.90, vendorMaturity: 0.95, communityAdoption: 0.90, securityPosture: 0.95, notes: "Industry-leading identity platform; pricing escalates with MAUs." },
  "clerk:auth":             { performance: 0.88, reliability: 0.92, cost: 0.70, latency: 0.85, scalability: 0.88, maintenanceBurden: 0.95, vendorMaturity: 0.82, communityAdoption: 0.80, securityPosture: 0.90, notes: "Best developer experience for React/Next.js; already used in ASH." },

  // Analytics
  "posthog:analytics":      { performance: 0.85, reliability: 0.88, cost: 0.78, latency: 0.80, scalability: 0.85, maintenanceBurden: 0.88, vendorMaturity: 0.82, communityAdoption: 0.78, securityPosture: 0.85, notes: "Open-source product analytics; can self-host for data residency." },
  "mixpanel:analytics":     { performance: 0.85, reliability: 0.90, cost: 0.60, latency: 0.80, scalability: 0.90, maintenanceBurden: 0.90, vendorMaturity: 0.92, communityAdoption: 0.85, securityPosture: 0.88, notes: "Best event analytics for product decisions; free tier limited." },

  // Payments
  "stripe:payments":        { performance: 0.92, reliability: 0.99, cost: 0.72, latency: 0.88, scalability: 0.99, maintenanceBurden: 0.92, vendorMaturity: 0.99, communityAdoption: 0.98, securityPosture: 0.98, notes: "Already integrated; industry standard for developer-first payments." },
  "paddle:payments":        { performance: 0.85, reliability: 0.90, cost: 0.65, latency: 0.80, scalability: 0.88, maintenanceBurden: 0.88, vendorMaturity: 0.88, communityAdoption: 0.72, securityPosture: 0.90, notes: "MOR model handles global VAT compliance automatically — key differentiator." },

  // Communications
  "resend:email":           { performance: 0.88, reliability: 0.90, cost: 0.80, latency: 0.85, scalability: 0.88, maintenanceBurden: 0.95, vendorMaturity: 0.78, communityAdoption: 0.78, securityPosture: 0.85, notes: "Already integrated; React Email support is a major developer experience win." },
  "twilio:communications":  { performance: 0.90, reliability: 0.97, cost: 0.50, latency: 0.88, scalability: 0.95, maintenanceBurden: 0.85, vendorMaturity: 0.98, communityAdoption: 0.97, securityPosture: 0.92, notes: "Communications industry standard; covers voice/SMS/video/email." },
  "slack:platform":         { performance: 0.88, reliability: 0.92, cost: 0.55, latency: 0.82, scalability: 0.90, maintenanceBurden: 0.88, vendorMaturity: 0.98, communityAdoption: 0.92, securityPosture: 0.90, notes: "Standard enterprise team platform; Slack API enables bot integration." },

  // Storage
  "aws:s3":                 { performance: 0.95, reliability: 0.99, cost: 0.72, latency: 0.88, scalability: 0.99, maintenanceBurden: 0.90, vendorMaturity: 0.99, communityAdoption: 0.99, securityPosture: 0.95, notes: "Definitive object storage standard; 11 nines durability." },
  "cloudflare:r2":          { performance: 0.90, reliability: 0.95, cost: 0.88, latency: 0.85, scalability: 0.95, maintenanceBurden: 0.90, vendorMaturity: 0.82, communityAdoption: 0.78, securityPosture: 0.90, notes: "Zero egress fees make it dramatically cheaper than S3 for read-heavy workloads." },

  // Execution Environments
  "nodejs:runtime":         { performance: 0.88, reliability: 0.95, cost: 0.99, latency: 0.88, scalability: 0.88, maintenanceBurden: 0.85, vendorMaturity: 0.99, communityAdoption: 0.99, securityPosture: 0.85, notes: "Current ASH runtime; unmatched npm ecosystem." },
  "deno:runtime":           { performance: 0.88, reliability: 0.88, cost: 0.99, latency: 0.88, scalability: 0.85, maintenanceBurden: 0.88, vendorMaturity: 0.85, communityAdoption: 0.72, securityPosture: 0.92, notes: "Secure-by-default; TypeScript native; migration from Node.js is complex." },
  "bun:runtime":            { performance: 0.95, reliability: 0.82, cost: 0.99, latency: 0.92, scalability: 0.88, maintenanceBurden: 0.88, vendorMaturity: 0.78, communityAdoption: 0.72, securityPosture: 0.82, notes: "Fastest JS runtime; reliability and ecosystem maturity still maturing." },

  // Connector Ecosystems
  "zapier:connect":         { performance: 0.80, reliability: 0.90, cost: 0.45, latency: 0.72, scalability: 0.88, maintenanceBurden: 0.92, vendorMaturity: 0.98, communityAdoption: 0.97, securityPosture: 0.85, notes: "5000+ connectors; expensive at scale; limited customization." },
  "make:platform":          { performance: 0.82, reliability: 0.88, cost: 0.60, latency: 0.75, scalability: 0.85, maintenanceBurden: 0.88, vendorMaturity: 0.88, communityAdoption: 0.80, securityPosture: 0.82, notes: "More powerful than Zapier for complex routing; lower MAU." },

  // Platform
  "vercel:platform":        { performance: 0.92, reliability: 0.97, cost: 0.62, latency: 0.92, scalability: 0.95, maintenanceBurden: 0.92, vendorMaturity: 0.92, communityAdoption: 0.90, securityPosture: 0.88, notes: "Best-in-class frontend edge delivery; Node.js serverless model." },
  "railway:platform":       { performance: 0.85, reliability: 0.88, cost: 0.75, latency: 0.82, scalability: 0.85, maintenanceBurden: 0.92, vendorMaturity: 0.80, communityAdoption: 0.75, securityPosture: 0.82, notes: "Simple full-stack deployment; good alternative to Replit for production." },
};

// ── Default profile for unknown technologies ──────────────────────────────
const DEFAULT_PROFILE: BenchmarkProfile = {
  performance: 0.70, reliability: 0.70, cost: 0.70, latency: 0.70,
  scalability: 0.70, maintenanceBurden: 0.70, vendorMaturity: 0.70,
  communityAdoption: 0.70, securityPosture: 0.70,
  notes: "Default benchmark — inject real values via EP_GTI_BENCHMARK_ASSESSED.",
};

// ── Composite score: equal-weighted average across 9 dimensions ────────────
function computeComposite(p: BenchmarkProfile): number {
  const vals = [
    p.performance, p.reliability, p.cost, p.latency,
    p.scalability, p.maintenanceBurden, p.vendorMaturity,
    p.communityAdoption, p.securityPosture,
  ];
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 1000) / 1000;
}

// ── Benchmark a single technology ─────────────────────────────────────────
export function benchmarkTechnology(entry: TechnologyEntry): BenchmarkScores {
  const profile = BENCHMARK_PROFILES[entry.key] ?? DEFAULT_PROFILE;
  return {
    technologyKey:          entry.key,
    performanceScore:       profile.performance,
    reliabilityScore:       profile.reliability,
    costScore:              profile.cost,
    latencyScore:           profile.latency,
    scalabilityScore:       profile.scalability,
    maintenanceBurdenScore: profile.maintenanceBurden,
    vendorMaturityScore:    profile.vendorMaturity,
    communityAdoptionScore: profile.communityAdoption,
    securityPostureScore:   profile.securityPosture,
    compositeScore:         computeComposite(profile),
    benchmarkNotes:         profile.notes,
  };
}

// ── Batch benchmark ────────────────────────────────────────────────────────
export function benchmarkAll(technologies: TechnologyEntry[]): BenchmarkScores[] {
  return technologies.map(benchmarkTechnology);
}
