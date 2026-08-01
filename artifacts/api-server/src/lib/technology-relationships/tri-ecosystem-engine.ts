// ── TRI Ecosystem Engine ────────────────────────────────────────────────────
// Groups technologies into named ecosystems.
// 10 ecosystems from the spec: cloud, ai, browser, developer, marketing,
// commerce, infrastructure, security, data, execution.

import type { EcosystemDefinition, EcosystemType } from "./types";

// ── Ecosystem Definitions ──────────────────────────────────────────────────
export const ECOSYSTEM_DEFINITIONS: EcosystemDefinition[] = [
  {
    ecosystemName:  "ai",
    displayName:    "AI Ecosystem",
    description:    "AI model providers, inference platforms, and search-augmented generation tools.",
    technologies:   ["openai:gpt-4o", "anthropic:claude-4", "google:gemini-2-flash", "meta:llama-4", "mistral:large", "deepseek:r2", "openrouter:platform", "together:inference", "groq:cloud", "fireworks:ai", "tavily:search_api"],
    coreTechnology: "openrouter:platform",
    maturityScore:  0.90,
    coherenceScore: 0.85,
    coverageScore:  0.88,
  },
  {
    ecosystemName:  "cloud",
    displayName:    "Cloud Ecosystem",
    description:    "Hyperscaler and developer cloud platforms providing managed infrastructure.",
    technologies:   ["aws:platform", "gcp:platform", "azure:platform", "replit:platform", "vercel:platform", "railway:platform", "cloudflare:r2", "aws:s3"],
    coreTechnology: "aws:platform",
    maturityScore:  0.96,
    coherenceScore: 0.78,
    coverageScore:  0.85,
  },
  {
    ecosystemName:  "data",
    displayName:    "Data Ecosystem",
    description:    "Relational databases, document stores, caches, vector stores, and search engines.",
    technologies:   ["postgresql:database", "mysql:database", "redis:cache", "mongodb:database", "pgvector:extension", "pinecone:platform", "weaviate:database", "qdrant:database", "elasticsearch:search", "typesense:search"],
    coreTechnology: "postgresql:database",
    maturityScore:  0.94,
    coherenceScore: 0.82,
    coverageScore:  0.90,
  },
  {
    ecosystemName:  "execution",
    displayName:    "Execution Ecosystem",
    description:    "JavaScript/TypeScript runtimes, automation engines, and workflow orchestrators.",
    technologies:   ["nodejs:runtime", "bun:runtime", "deno:runtime", "n8n:automation", "zapier:automation", "temporal:orchestration", "playwright:automation", "chromium:browser"],
    coreTechnology: "nodejs:runtime",
    maturityScore:  0.92,
    coherenceScore: 0.80,
    coverageScore:  0.85,
  },
  {
    ecosystemName:  "browser",
    displayName:    "Browser Ecosystem",
    description:    "Browser automation, headless scraping, and CDP-based web interaction tools.",
    technologies:   ["chromium:browser", "playwright:automation", "nodejs:runtime"],
    coreTechnology: "playwright:automation",
    maturityScore:  0.95,
    coherenceScore: 0.95,
    coverageScore:  0.90,
  },
  {
    ecosystemName:  "developer",
    displayName:    "Developer Ecosystem",
    description:    "Source control, CI/CD, IDEs, containerization, and developer workflow tools.",
    technologies:   ["github:platform", "vscode:editor", "docker:platform", "nodejs:runtime", "bun:runtime", "deno:runtime"],
    coreTechnology: "github:platform",
    maturityScore:  0.97,
    coherenceScore: 0.88,
    coverageScore:  0.85,
  },
  {
    ecosystemName:  "security",
    displayName:    "Security Ecosystem",
    description:    "Identity, authentication, and authorization platforms for application security.",
    technologies:   ["clerk:auth", "auth0:identity"],
    coreTechnology: "clerk:auth",
    maturityScore:  0.90,
    coherenceScore: 0.70,
    coverageScore:  0.65,
  },
  {
    ecosystemName:  "commerce",
    displayName:    "Commerce Ecosystem",
    description:    "Payment processing, subscription management, and revenue operations.",
    technologies:   ["stripe:payments", "paddle:payments", "hubspot:crm", "salesforce:crm"],
    coreTechnology: "stripe:payments",
    maturityScore:  0.95,
    coherenceScore: 0.80,
    coverageScore:  0.78,
  },
  {
    ecosystemName:  "marketing",
    displayName:    "Marketing Ecosystem",
    description:    "CRM, product analytics, email, and communication platforms.",
    technologies:   ["hubspot:crm", "salesforce:crm", "posthog:analytics", "mixpanel:analytics", "resend:email", "twilio:communications", "slack:platform"],
    coreTechnology: "hubspot:crm",
    maturityScore:  0.90,
    coherenceScore: 0.75,
    coverageScore:  0.80,
  },
  {
    ecosystemName:  "infrastructure",
    displayName:    "Infrastructure Ecosystem",
    description:    "Operating systems, container platforms, and cloud-native infrastructure.",
    technologies:   ["nixos:platform", "linux:ubuntu", "docker:platform", "aws:platform", "gcp:platform", "azure:platform"],
    coreTechnology: "nixos:platform",
    maturityScore:  0.95,
    coherenceScore: 0.78,
    coverageScore:  0.82,
  },
];

// ── Public: return ecosystems ──────────────────────────────────────────────
export function buildEcosystems(): EcosystemDefinition[] {
  return ECOSYSTEM_DEFINITIONS;
}

// ── Get ecosystem(s) for a given technology key ───────────────────────────
export function getEcosystemsForTechnology(key: string): EcosystemType[] {
  return ECOSYSTEM_DEFINITIONS
    .filter(eco => eco.technologies.includes(key))
    .map(eco => eco.ecosystemName);
}

// ── Get primary ecosystem (first found) ───────────────────────────────────
export function getPrimaryEcosystem(key: string): EcosystemType | null {
  const ecosystems = getEcosystemsForTechnology(key);
  return ecosystems[0] ?? null;
}
