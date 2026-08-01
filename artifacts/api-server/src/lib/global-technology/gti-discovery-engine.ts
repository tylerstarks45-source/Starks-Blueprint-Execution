// ── GTI Discovery Engine ────────────────────────────────────────────────────
// Maintains the structured technology catalog.
// Never installs. Never provisions. Never modifies.
// Observe, catalog, and classify only.

import type { TechnologyEntry, ProviderEntry } from "./types";

// ── Catalog seed: 40+ technologies across all 20 categories ───────────────
export const TECHNOLOGY_CATALOG: TechnologyEntry[] = [
  // AI Providers
  { key: "openai:gpt-4o",           name: "GPT-4o",             category: "ai_provider",          subcategory: "language_model", vendor: "OpenAI",        description: "Multimodal frontier language model for text, vision, and audio tasks.", website: "https://openai.com", licenseType: "commercial", pricingModel: "usage_based", maturityLevel: "mature" },
  { key: "anthropic:claude-4",      name: "Claude 4 Opus",      category: "ai_provider",          subcategory: "language_model", vendor: "Anthropic",     description: "Frontier reasoning model with extended context and constitutional AI design.", website: "https://anthropic.com", licenseType: "commercial", pricingModel: "usage_based", maturityLevel: "stable" },
  { key: "google:gemini-2-flash",   name: "Gemini 2.0 Flash",   category: "ai_provider",          subcategory: "language_model", vendor: "Google",        description: "Fast, efficient multimodal model optimized for high-throughput workloads.", website: "https://deepmind.google", licenseType: "commercial", pricingModel: "usage_based", maturityLevel: "stable" },
  { key: "meta:llama-4",            name: "LLaMA 4",            category: "ai_provider",          subcategory: "open_weights",   vendor: "Meta",          description: "Open-weights frontier model for self-hosted AI inference.", website: "https://ai.meta.com", licenseType: "open_source", pricingModel: "free", maturityLevel: "stable", openSourceUrl: "https://github.com/facebookresearch/llama" },
  { key: "mistral:large",           name: "Mistral Large",      category: "ai_provider",          subcategory: "language_model", vendor: "Mistral AI",    description: "High-performance European AI model with strong multilingual capabilities.", website: "https://mistral.ai", licenseType: "commercial", pricingModel: "usage_based", maturityLevel: "stable" },
  { key: "deepseek:r2",             name: "DeepSeek R2",        category: "ai_provider",          subcategory: "reasoning_model",vendor: "DeepSeek",      description: "Cost-efficient open-weights reasoning model with strong coding performance.", website: "https://deepseek.com", licenseType: "open_source", pricingModel: "usage_based", maturityLevel: "beta" },

  // Inference Providers
  { key: "openrouter:platform",     name: "OpenRouter",         category: "inference_provider",   subcategory: "model_router",   vendor: "OpenRouter",    description: "Unified AI model routing layer across 100+ providers with fallback chains.", website: "https://openrouter.ai", licenseType: "commercial", pricingModel: "usage_based", maturityLevel: "stable" },
  { key: "together:inference",      name: "Together AI",        category: "inference_provider",   subcategory: "inference_api",  vendor: "Together AI",   description: "High-speed open-source model inference with fine-tuning support.", website: "https://together.ai", licenseType: "commercial", pricingModel: "usage_based", maturityLevel: "stable" },
  { key: "groq:cloud",              name: "Groq Cloud",         category: "inference_provider",   subcategory: "hardware_inference", vendor: "Groq",       description: "LPU-based ultra-low-latency inference for open-weights models.", website: "https://groq.com", licenseType: "commercial", pricingModel: "usage_based", maturityLevel: "stable" },
  { key: "fireworks:ai",            name: "Fireworks AI",       category: "inference_provider",   subcategory: "inference_api",  vendor: "Fireworks AI",  description: "Production-grade open-model inference with structured output support.", website: "https://fireworks.ai", licenseType: "commercial", pricingModel: "usage_based", maturityLevel: "stable" },

  // Cloud Providers
  { key: "aws:platform",            name: "Amazon Web Services",category: "cloud_provider",       subcategory: "hyperscaler",    vendor: "Amazon",        description: "Global cloud platform with 200+ managed services.", website: "https://aws.amazon.com", licenseType: "commercial", pricingModel: "usage_based", maturityLevel: "mature" },
  { key: "gcp:platform",            name: "Google Cloud",       category: "cloud_provider",       subcategory: "hyperscaler",    vendor: "Google",        description: "Cloud platform with integrated AI/ML services and global fiber network.", website: "https://cloud.google.com", licenseType: "commercial", pricingModel: "usage_based", maturityLevel: "mature" },
  { key: "azure:platform",          name: "Microsoft Azure",    category: "cloud_provider",       subcategory: "hyperscaler",    vendor: "Microsoft",     description: "Enterprise-grade cloud with deep OpenAI integration and compliance offerings.", website: "https://azure.microsoft.com", licenseType: "commercial", pricingModel: "usage_based", maturityLevel: "mature" },
  { key: "replit:platform",         name: "Replit",             category: "cloud_provider",       subcategory: "developer_cloud",vendor: "Replit",        description: "Cloud-native development environment with built-in hosting and agent support.", website: "https://replit.com", licenseType: "freemium", pricingModel: "subscription", maturityLevel: "stable" },

  // Developer Tools
  { key: "github:platform",         name: "GitHub",             category: "developer_tool",       subcategory: "source_control", vendor: "Microsoft",     description: "World's largest code hosting platform with CI/CD and Copilot AI integration.", website: "https://github.com", licenseType: "freemium", pricingModel: "subscription", maturityLevel: "mature" },
  { key: "vscode:editor",           name: "VS Code",            category: "developer_tool",       subcategory: "code_editor",    vendor: "Microsoft",     description: "Open-source code editor with extensive extension ecosystem.", website: "https://code.visualstudio.com", licenseType: "open_source", pricingModel: "free", maturityLevel: "mature", openSourceUrl: "https://github.com/microsoft/vscode" },
  { key: "docker:platform",         name: "Docker",             category: "developer_tool",       subcategory: "containerization", vendor: "Docker Inc", description: "Container platform for building, shipping, and running applications.", website: "https://docker.com", licenseType: "freemium", pricingModel: "subscription", maturityLevel: "mature" },

  // Browser Technologies
  { key: "chromium:browser",        name: "Chromium",           category: "browser_technology",   subcategory: "browser_engine", vendor: "Google",        description: "Open-source browser project powering Chrome, Edge, and Playwright automation.", website: "https://chromium.org", licenseType: "open_source", pricingModel: "free", maturityLevel: "mature", openSourceUrl: "https://chromium.googlesource.com/chromium/src" },
  { key: "playwright:automation",   name: "Playwright",         category: "browser_technology",   subcategory: "browser_automation", vendor: "Microsoft",  description: "Cross-browser automation framework with CDP and multi-tab support.", website: "https://playwright.dev", licenseType: "open_source", pricingModel: "free", maturityLevel: "mature", openSourceUrl: "https://github.com/microsoft/playwright" },

  // Operating Systems
  { key: "linux:ubuntu",            name: "Ubuntu LTS",         category: "operating_system",     subcategory: "linux_distro",   vendor: "Canonical",     description: "Most widely deployed Linux distribution for server and cloud workloads.", website: "https://ubuntu.com", licenseType: "open_source", pricingModel: "free", maturityLevel: "mature" },
  { key: "nixos:platform",          name: "NixOS",              category: "operating_system",     subcategory: "declarative_os", vendor: "NixOS Foundation", description: "Declarative, reproducible Linux distribution — current ASH host OS.", website: "https://nixos.org", licenseType: "open_source", pricingModel: "free", maturityLevel: "stable", openSourceUrl: "https://github.com/NixOS/nixpkgs" },

  // Databases
  { key: "postgresql:database",     name: "PostgreSQL",         category: "database",             subcategory: "relational",     vendor: "PostgreSQL Global Development Group", description: "Advanced open-source relational database — current primary ASH datastore.", website: "https://postgresql.org", licenseType: "open_source", pricingModel: "free", maturityLevel: "mature", openSourceUrl: "https://github.com/postgres/postgres" },
  { key: "mysql:database",          name: "MySQL",              category: "database",             subcategory: "relational",     vendor: "Oracle",        description: "Widely deployed open-source relational database.", website: "https://mysql.com", licenseType: "open_source", pricingModel: "free", maturityLevel: "mature" },
  { key: "redis:cache",             name: "Redis",              category: "database",             subcategory: "in_memory",      vendor: "Redis Ltd",     description: "In-memory data structure store for caching, queues, and pub/sub.", website: "https://redis.io", licenseType: "open_source", pricingModel: "free", maturityLevel: "mature" },
  { key: "mongodb:database",        name: "MongoDB",            category: "database",             subcategory: "document",       vendor: "MongoDB Inc",   description: "Document-oriented database with flexible schema and Atlas cloud offering.", website: "https://mongodb.com", licenseType: "freemium", pricingModel: "subscription", maturityLevel: "mature" },

  // Vector Databases
  { key: "pgvector:extension",      name: "pgvector",           category: "vector_database",      subcategory: "pg_extension",   vendor: "pgvector community", description: "PostgreSQL extension for vector similarity search — current ASH vector store.", website: "https://github.com/pgvector/pgvector", licenseType: "open_source", pricingModel: "free", maturityLevel: "stable", openSourceUrl: "https://github.com/pgvector/pgvector" },
  { key: "pinecone:platform",       name: "Pinecone",           category: "vector_database",      subcategory: "managed_vector", vendor: "Pinecone Systems", description: "Managed vector database for production AI search at scale.", website: "https://pinecone.io", licenseType: "commercial", pricingModel: "subscription", maturityLevel: "stable" },
  { key: "weaviate:database",       name: "Weaviate",           category: "vector_database",      subcategory: "vector_search",  vendor: "Weaviate B.V.", description: "Open-source vector database with multimodal support and hybrid search.", website: "https://weaviate.io", licenseType: "open_source", pricingModel: "freemium", maturityLevel: "stable", openSourceUrl: "https://github.com/weaviate/weaviate" },
  { key: "qdrant:database",         name: "Qdrant",             category: "vector_database",      subcategory: "vector_search",  vendor: "Qdrant Solutions", description: "High-performance vector similarity search engine with filtering.", website: "https://qdrant.tech", licenseType: "open_source", pricingModel: "freemium", maturityLevel: "stable", openSourceUrl: "https://github.com/qdrant/qdrant" },

  // Search Technologies
  { key: "elasticsearch:search",    name: "Elasticsearch",      category: "search_technology",    subcategory: "full_text",      vendor: "Elastic",       description: "Distributed search and analytics engine with real-time indexing.", website: "https://elastic.co", licenseType: "freemium", pricingModel: "subscription", maturityLevel: "mature" },
  { key: "typesense:search",        name: "Typesense",          category: "search_technology",    subcategory: "full_text",      vendor: "Typesense Inc", description: "Typo-tolerant, open-source search engine designed for instant results.", website: "https://typesense.org", licenseType: "open_source", pricingModel: "freemium", maturityLevel: "stable", openSourceUrl: "https://github.com/typesense/typesense" },
  { key: "tavily:search_api",       name: "Tavily Search API",  category: "search_technology",    subcategory: "ai_search_api",  vendor: "Tavily",        description: "AI-optimized web search API built for LLM and agent applications.", website: "https://tavily.com", licenseType: "commercial", pricingModel: "usage_based", maturityLevel: "stable" },

  // Automation Platforms
  { key: "n8n:automation",          name: "n8n",                category: "automation_platform",  subcategory: "workflow_automation", vendor: "n8n GmbH",   description: "Open-source workflow automation with 400+ integrations and AI nodes.", website: "https://n8n.io", licenseType: "open_source", pricingModel: "freemium", maturityLevel: "stable", openSourceUrl: "https://github.com/n8n-io/n8n" },
  { key: "zapier:automation",       name: "Zapier",             category: "automation_platform",  subcategory: "no_code_automation", vendor: "Zapier Inc",  description: "No-code automation platform connecting 5000+ applications.", website: "https://zapier.com", licenseType: "commercial", pricingModel: "subscription", maturityLevel: "mature" },
  { key: "temporal:orchestration",  name: "Temporal",           category: "automation_platform",  subcategory: "workflow_engine",vendor: "Temporal Technologies", description: "Durable workflow orchestration platform for long-running processes.", website: "https://temporal.io", licenseType: "open_source", pricingModel: "freemium", maturityLevel: "stable", openSourceUrl: "https://github.com/temporalio/temporal" },

  // Business Software
  { key: "hubspot:crm",             name: "HubSpot",            category: "crm_system",           subcategory: "full_crm",       vendor: "HubSpot Inc",   description: "All-in-one CRM platform with marketing, sales, and service hubs.", website: "https://hubspot.com", licenseType: "freemium", pricingModel: "subscription", maturityLevel: "mature" },
  { key: "salesforce:crm",          name: "Salesforce",         category: "crm_system",           subcategory: "enterprise_crm", vendor: "Salesforce Inc",description: "Enterprise CRM leader with Einstein AI and extensive AppExchange ecosystem.", website: "https://salesforce.com", licenseType: "commercial", pricingModel: "subscription", maturityLevel: "mature" },

  // Security Platforms
  { key: "auth0:identity",          name: "Auth0",              category: "security_platform",    subcategory: "identity_platform", vendor: "Okta",        description: "Flexible identity platform with SSO, MFA, and social login.", website: "https://auth0.com", licenseType: "freemium", pricingModel: "subscription", maturityLevel: "mature" },
  { key: "clerk:auth",              name: "Clerk",              category: "security_platform",    subcategory: "auth_service",   vendor: "Clerk Inc",     description: "Modern authentication and user management designed for React and Next.js.", website: "https://clerk.com", licenseType: "commercial", pricingModel: "subscription", maturityLevel: "stable" },

  // Analytics Platforms
  { key: "posthog:analytics",       name: "PostHog",            category: "analytics_platform",   subcategory: "product_analytics", vendor: "PostHog Inc", description: "Open-source product analytics with feature flags, session replay, and A/B testing.", website: "https://posthog.com", licenseType: "open_source", pricingModel: "freemium", maturityLevel: "stable", openSourceUrl: "https://github.com/PostHog/posthog" },
  { key: "mixpanel:analytics",      name: "Mixpanel",           category: "analytics_platform",   subcategory: "event_analytics", vendor: "Mixpanel Inc", description: "Event-based product analytics with cohort analysis and funnel tracking.", website: "https://mixpanel.com", licenseType: "commercial", pricingModel: "subscription", maturityLevel: "mature" },

  // Payment Providers
  { key: "stripe:payments",         name: "Stripe",             category: "payment_provider",     subcategory: "payment_processing", vendor: "Stripe Inc", description: "Developer-first payment infrastructure with subscriptions, invoicing, and Connect.", website: "https://stripe.com", licenseType: "commercial", pricingModel: "usage_based", maturityLevel: "mature" },
  { key: "paddle:payments",         name: "Paddle",             category: "payment_provider",     subcategory: "merchant_of_record", vendor: "Paddle.com",description: "Merchant of record payments platform handling global tax compliance.", website: "https://paddle.com", licenseType: "commercial", pricingModel: "usage_based", maturityLevel: "stable" },

  // Communication Systems
  { key: "resend:email",            name: "Resend",             category: "communication_system", subcategory: "transactional_email", vendor: "Resend Inc", description: "Developer-first email API with React email component support.", website: "https://resend.com", licenseType: "commercial", pricingModel: "usage_based", maturityLevel: "stable" },
  { key: "twilio:communications",   name: "Twilio",             category: "communication_system", subcategory: "cpaas",           vendor: "Twilio Inc",    description: "Cloud communications platform for SMS, voice, video, and email.", website: "https://twilio.com", licenseType: "commercial", pricingModel: "usage_based", maturityLevel: "mature" },
  { key: "slack:platform",          name: "Slack",              category: "communication_system", subcategory: "team_messaging",  vendor: "Salesforce Inc",description: "Team collaboration platform with API for bot and workflow integration.", website: "https://slack.com", licenseType: "commercial", pricingModel: "subscription", maturityLevel: "mature" },

  // Storage Providers
  { key: "aws:s3",                  name: "Amazon S3",          category: "storage_provider",     subcategory: "object_storage",  vendor: "Amazon",        description: "Industry-standard object storage with 99.999999999% durability.", website: "https://aws.amazon.com/s3", licenseType: "commercial", pricingModel: "usage_based", maturityLevel: "mature" },
  { key: "cloudflare:r2",           name: "Cloudflare R2",      category: "storage_provider",     subcategory: "object_storage",  vendor: "Cloudflare",    description: "S3-compatible object storage with zero egress fees.", website: "https://cloudflare.com/r2", licenseType: "commercial", pricingModel: "usage_based", maturityLevel: "stable" },

  // Execution Environments
  { key: "nodejs:runtime",          name: "Node.js",            category: "execution_environment",subcategory: "js_runtime",      vendor: "OpenJS Foundation", description: "JavaScript runtime built on V8 — current ASH execution environment.", website: "https://nodejs.org", licenseType: "open_source", pricingModel: "free", maturityLevel: "mature", openSourceUrl: "https://github.com/nodejs/node" },
  { key: "deno:runtime",            name: "Deno 2",             category: "execution_environment",subcategory: "js_runtime",      vendor: "Deno Land Inc",  description: "Secure TypeScript-native runtime with built-in toolchain and npm compatibility.", website: "https://deno.com", licenseType: "open_source", pricingModel: "free", maturityLevel: "stable", openSourceUrl: "https://github.com/denoland/deno" },
  { key: "bun:runtime",             name: "Bun",                category: "execution_environment",subcategory: "js_runtime",      vendor: "Oven",           description: "Ultra-fast all-in-one JavaScript runtime with native bundler and test runner.", website: "https://bun.sh", licenseType: "open_source", pricingModel: "free", maturityLevel: "stable", openSourceUrl: "https://github.com/oven-sh/bun" },

  // Connector Ecosystems
  { key: "zapier:connect",          name: "Zapier Connect",     category: "connector_ecosystem",  subcategory: "integration_hub", vendor: "Zapier Inc",    description: "5000+ pre-built connectors for enterprise application integration.", website: "https://zapier.com", licenseType: "commercial", pricingModel: "subscription", maturityLevel: "mature" },
  { key: "make:platform",           name: "Make (Integromat)",  category: "connector_ecosystem",  subcategory: "integration_platform", vendor: "Celonis SE", description: "Visual workflow builder with 1500+ app connectors and advanced data routing.", website: "https://make.com", licenseType: "freemium", pricingModel: "subscription", maturityLevel: "stable" },

  // Platform
  { key: "vercel:platform",         name: "Vercel",             category: "platform",             subcategory: "edge_hosting",   vendor: "Vercel Inc",     description: "Frontend cloud platform with edge functions and Next.js optimization.", website: "https://vercel.com", licenseType: "commercial", pricingModel: "subscription", maturityLevel: "mature" },
  { key: "railway:platform",        name: "Railway",            category: "platform",             subcategory: "developer_cloud", vendor: "Railway Corp",  description: "Developer infrastructure platform for deploying full-stack applications.", website: "https://railway.app", licenseType: "commercial", pricingModel: "usage_based", maturityLevel: "stable" },
];

// ── Provider seed ──────────────────────────────────────────────────────────
export const PROVIDER_CATALOG: ProviderEntry[] = [
  { key: "openai",    name: "OpenAI",     type: "ai_lab",         website: "https://openai.com",      foundedYear: 2015, headquarters: "San Francisco, CA", vendorMaturityScore: 0.95, communityAdoptionScore: 0.98, supportTier: "commercial", isPublicCompany: false },
  { key: "anthropic", name: "Anthropic",  type: "ai_lab",         website: "https://anthropic.com",   foundedYear: 2021, headquarters: "San Francisco, CA", vendorMaturityScore: 0.90, communityAdoptionScore: 0.88, supportTier: "commercial", isPublicCompany: false },
  { key: "google",    name: "Google",     type: "enterprise",     website: "https://google.com",      foundedYear: 1998, headquarters: "Mountain View, CA",  vendorMaturityScore: 0.99, communityAdoptionScore: 0.99, supportTier: "enterprise", isPublicCompany: true },
  { key: "microsoft", name: "Microsoft",  type: "enterprise",     website: "https://microsoft.com",   foundedYear: 1975, headquarters: "Redmond, WA",        vendorMaturityScore: 0.99, communityAdoptionScore: 0.97, supportTier: "enterprise", isPublicCompany: true },
  { key: "amazon",    name: "Amazon",     type: "enterprise",     website: "https://amazon.com",      foundedYear: 1994, headquarters: "Seattle, WA",        vendorMaturityScore: 0.99, communityAdoptionScore: 0.96, supportTier: "enterprise", isPublicCompany: true },
  { key: "meta",      name: "Meta",       type: "enterprise",     website: "https://meta.com",        foundedYear: 2004, headquarters: "Menlo Park, CA",     vendorMaturityScore: 0.97, communityAdoptionScore: 0.90, supportTier: "community",  isPublicCompany: true },
  { key: "mistral",   name: "Mistral AI", type: "ai_lab",         website: "https://mistral.ai",      foundedYear: 2023, headquarters: "Paris, France",      vendorMaturityScore: 0.80, communityAdoptionScore: 0.75, supportTier: "commercial", isPublicCompany: false },
  { key: "openrouter",name: "OpenRouter", type: "startup",        website: "https://openrouter.ai",   foundedYear: 2023, headquarters: "San Francisco, CA", vendorMaturityScore: 0.78, communityAdoptionScore: 0.82, supportTier: "community",  isPublicCompany: false },
  { key: "cloudflare",name: "Cloudflare", type: "enterprise",     website: "https://cloudflare.com",  foundedYear: 2009, headquarters: "San Francisco, CA", vendorMaturityScore: 0.96, communityAdoptionScore: 0.92, supportTier: "commercial", isPublicCompany: true },
  { key: "stripe",    name: "Stripe",     type: "enterprise",     website: "https://stripe.com",      foundedYear: 2010, headquarters: "San Francisco, CA", vendorMaturityScore: 0.98, communityAdoptionScore: 0.97, supportTier: "commercial", isPublicCompany: false },
  { key: "replit",    name: "Replit",     type: "startup",        website: "https://replit.com",      foundedYear: 2016, headquarters: "San Francisco, CA", vendorMaturityScore: 0.82, communityAdoptionScore: 0.85, supportTier: "commercial", isPublicCompany: false },
  { key: "vercel",    name: "Vercel",     type: "startup",        website: "https://vercel.com",      foundedYear: 2015, headquarters: "San Francisco, CA", vendorMaturityScore: 0.92, communityAdoptionScore: 0.93, supportTier: "commercial", isPublicCompany: false },
];

// ── Discovery function ─────────────────────────────────────────────────────
export function discoverTechnologies(): TechnologyEntry[] {
  return TECHNOLOGY_CATALOG;
}

export function discoverProviders(): ProviderEntry[] {
  return PROVIDER_CATALOG;
}
