// ── Build 048: UBAF domain types ──────────────────────────────────────────────

export const UBAF_THROTTLE_CYCLES = 340;

export const UBAF_EP_IDS = {
  CLASSIFICATION:   "ubaf.asset_classification",
  METADATA:         "ubaf.metadata_normalization",
  MANIFEST:         "ubaf.asset_manifest",
  RELATIONSHIPS:    "ubaf.asset_relationships",
  CAPABILITIES:     "ubaf.asset_capabilities",
  TRANSLATION:      "ubaf.builder_translation",
  REGISTRY:         "ubaf.asset_registry",
  ADVISORY:         "ubaf.ash_advisory",
} as const;

// ── Canonical Asset Classes ───────────────────────────────────────────────────
export const BUILTIN_ASSET_CLASSES = [
  // ── Product
  { classKey: "business",          displayName: "Business",           category: "product",        parentClassKey: null,          supportsDeployment: false, description: "A business entity with goals, assets, and customers" },
  { classKey: "application",       displayName: "Application",        category: "product",        parentClassKey: null,          supportsDeployment: true,  description: "A deployable application or software product" },
  { classKey: "website",           displayName: "Website",            category: "product",        parentClassKey: "application", supportsDeployment: true,  description: "A public-facing web presence" },
  { classKey: "page",              displayName: "Page",               category: "product",        parentClassKey: "website",     supportsDeployment: true,  description: "An individual web page" },
  { classKey: "component",         displayName: "Component",          category: "product",        parentClassKey: "website",     supportsDeployment: false, description: "A reusable UI component" },
  // ── Infrastructure
  { classKey: "workflow",          displayName: "Workflow",           category: "infrastructure", parentClassKey: null,          supportsDeployment: true,  description: "A sequence of automated steps" },
  { classKey: "automation",        displayName: "Automation",         category: "infrastructure", parentClassKey: "workflow",    supportsDeployment: true,  description: "An automation rule or trigger-action pair" },
  { classKey: "database",          displayName: "Database",           category: "infrastructure", parentClassKey: null,          supportsDeployment: true,  description: "A structured data store" },
  { classKey: "table",             displayName: "Table",              category: "infrastructure", parentClassKey: "database",    supportsDeployment: false, description: "A database table or collection" },
  { classKey: "api",               displayName: "API",                category: "infrastructure", parentClassKey: null,          supportsDeployment: true,  description: "An API surface for external or internal access" },
  { classKey: "endpoint",          displayName: "Endpoint",           category: "infrastructure", parentClassKey: "api",         supportsDeployment: false, description: "A single API route or endpoint" },
  { classKey: "integration",       displayName: "Integration",        category: "infrastructure", parentClassKey: null,          supportsDeployment: true,  description: "A connection to an external platform or service" },
  { classKey: "deployment",        displayName: "Deployment",         category: "infrastructure", parentClassKey: null,          supportsDeployment: false, description: "A deployment event or deployed artifact" },
  // ── Intelligence
  { classKey: "ai_agent",          displayName: "AI Agent",           category: "intelligence",   parentClassKey: null,          supportsDeployment: true,  description: "An autonomous AI agent" },
  { classKey: "prompt",            displayName: "Prompt",             category: "intelligence",   parentClassKey: "ai_agent",    supportsDeployment: false, description: "A reusable prompt template" },
  { classKey: "knowledge_base",    displayName: "Knowledge Base",     category: "intelligence",   parentClassKey: null,          supportsDeployment: false, description: "A curated collection of knowledge for AI or search" },
  // ── Content
  { classKey: "document",          displayName: "Document",           category: "content",        parentClassKey: null,          supportsDeployment: false, description: "A document, report, or file" },
  { classKey: "brand_asset",       displayName: "Brand Asset",        category: "content",        parentClassKey: null,          supportsDeployment: false, description: "A logo, image, font, or other brand element" },
  { classKey: "campaign",          displayName: "Campaign",           category: "content",        parentClassKey: null,          supportsDeployment: true,  description: "A marketing campaign" },
  // ── Commerce
  { classKey: "customer",          displayName: "Customer",           category: "commerce",       parentClassKey: null,          supportsDeployment: false, description: "A real or potential customer" },
  { classKey: "lead",              displayName: "Lead",               category: "commerce",       parentClassKey: "customer",    supportsDeployment: false, description: "A prospective customer contact" },
  { classKey: "product",           displayName: "Product",            category: "commerce",       parentClassKey: null,          supportsDeployment: true,  description: "A sellable product" },
  { classKey: "service",           displayName: "Service",            category: "commerce",       parentClassKey: null,          supportsDeployment: true,  description: "A deliverable service offering" },
  { classKey: "offer",             displayName: "Offer",              category: "commerce",       parentClassKey: null,          supportsDeployment: true,  description: "A specific offer combining product, price, and terms" },
  { classKey: "revenue_stream",    displayName: "Revenue Stream",     category: "commerce",       parentClassKey: null,          supportsDeployment: false, description: "A defined source of revenue" },
  { classKey: "marketing_funnel",  displayName: "Marketing Funnel",   category: "commerce",       parentClassKey: null,          supportsDeployment: true,  description: "A multi-stage customer acquisition funnel" },
  // ── Data
  { classKey: "analytics_dashboard", displayName: "Analytics Dashboard", category: "data",       parentClassKey: null,          supportsDeployment: true,  description: "A business intelligence or analytics dashboard" },
  // ── Process
  { classKey: "task",              displayName: "Task",               category: "process",        parentClassKey: null,          supportsDeployment: false, description: "A unit of work" },
  { classKey: "process",           displayName: "Process",            category: "process",        parentClassKey: null,          supportsDeployment: false, description: "A repeatable business process" },
  // ── Future
  { classKey: "future_asset",      displayName: "Future Asset",       category: "future",         parentClassKey: null,          supportsDeployment: false, description: "A planned asset not yet created" },
] as const;

export type CanonicalClassKey = typeof BUILTIN_ASSET_CLASSES[number]["classKey"];

// ── Relationship types ────────────────────────────────────────────────────────
export const SEMANTIC_RELATIONSHIP_TYPES = [
  "feeds_into",       // source sends data into target
  "requires",         // source cannot function without target
  "extends",          // source builds on top of target
  "replaces",         // source supersedes target
  "generates",        // source creates target
  "displays",         // source renders or shows target
  "manages",          // source controls or administers target
  "triggers",         // source causes target to execute
  "consumes",         // source uses target's output
  "documents",        // source describes target
  "monetizes",        // source generates revenue from target
  "qualifies",        // source validates or scores target
  "belongs_to",       // source is a member/child of target
  "duplicates",       // source is a semantic duplicate of target
  "references",       // source links to target for informational purposes
] as const;

export type SemanticRelType = typeof SEMANTIC_RELATIONSHIP_TYPES[number];

// ── Capability categories ────────────────────────────────────────────────────
export const CAPABILITY_CATEGORIES = [
  "revenue", "data", "communication", "automation",
  "analytics", "content", "integration", "ai", "ecommerce", "identity",
] as const;

// ── Metadata types ────────────────────────────────────────────────────────────
export const METADATA_TYPES = ["semantic", "operational", "technical", "business"] as const;

// ── Lifecycle stages ─────────────────────────────────────────────────────────
export const LIFECYCLE_STAGES = ["draft", "active", "deprecated", "archived"] as const;
export type LifecycleStage = typeof LIFECYCLE_STAGES[number];

// ── Summary DTOs ──────────────────────────────────────────────────────────────
export interface UBAFSummary {
  totalAssets:       number;
  activeAssets:      number;
  totalClasses:      number;
  totalRelationships: number;
  totalCapabilities: number;
  totalTranslations: number;
  classBreakdown:    Record<string, number>;
  topCapabilities:   string[];
  revenueAssets:     number;   // assets with a "revenue" capability
  missingClasses:    string[]; // canonical classes the user has 0 of
  duplicateSlugs:    string[]; // canonical names that appear more than once
  computedAt:        string;
}
