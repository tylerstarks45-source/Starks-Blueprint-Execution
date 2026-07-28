import type { BusinessDnaClaim, BusinessDnaTrustLevel } from "@workspace/db";

export const LIFECYCLE_STAGES = [
  "idea", "validation", "planning", "building", "branding", "website_development",
  "landing_pages", "marketing", "launch", "optimization", "growth", "scaling",
  "automation", "maintenance", "expansion", "maturity", "exit",
] as const;
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

// A defined promptText is what makes a field eligible for the single
// material-confirmation slot (see dna.ts `ensureSingleMaterialConfirmation`):
// fields with no prompt are either always user-supplied at creation time
// (business_name), purely derived/internal (execution_priorities,
// landing_pages), or not the kind of thing worth interrupting the user to
// ask about directly.
export interface DnaFieldPrompt {
  title: string;
  description: string;
  inputType?: "text" | "url" | "textarea";
}

export interface DnaFieldDefinition {
  key: string;
  label: string;
  importance: "critical" | "high" | "normal";
  inferable: boolean;
  promptText?: DnaFieldPrompt;
}

// Configuration, not code paths: adding an accepted DNA field does not alter
// truth resolution. The initializer simply maps available evidence into it.
//
// Coverage mirrors the spec's literal Business DNA list: identity, mission,
// vision, values, industry, business/revenue model, products, services,
// audience, brand attributes, strategies, tech/AI stack, integrations,
// constraints, rules, risks, goals, and success metrics.
export const DNA_FIELD_CATALOG: readonly DnaFieldDefinition[] = [
  // ── Identity ──
  { key: "business_name", label: "Business Name", importance: "critical", inferable: false },
  {
    key: "website_url", label: "Website", importance: "high", inferable: false,
    promptText: { title: "What is this business's public website?", description: "A website address materially improves how accurately I can research and operate this business.", inputType: "url" },
  },
  {
    key: "industry", label: "Industry", importance: "high", inferable: true,
    promptText: { title: "What industry is this business in?", description: "Knowing the industry sharpens every recommendation I make — strategy, competitors, and terminology all depend on it.", inputType: "text" },
  },
  // ── Business / revenue model ──
  { key: "business_type", label: "Business Type", importance: "high", inferable: true },
  { key: "business_model", label: "Business Model", importance: "high", inferable: true },
  { key: "revenue_model", label: "Revenue Model", importance: "high", inferable: true },
  // ── Mission, vision, values, brand ──
  {
    key: "mission", label: "Mission", importance: "normal", inferable: true,
    promptText: { title: "What is this business's mission?", description: "A clear mission statement keeps every plan and piece of content on-brand.", inputType: "textarea" },
  },
  { key: "vision", label: "Vision", importance: "normal", inferable: true },
  { key: "values", label: "Values", importance: "normal", inferable: true },
  {
    key: "brand_voice", label: "Brand Voice", importance: "normal", inferable: true,
    promptText: { title: "How would you describe this business's brand voice?", description: "Brand voice shapes the tone of every piece of copy and communication I generate.", inputType: "text" },
  },
  { key: "brand_attributes", label: "Brand Attributes", importance: "normal", inferable: true },
  // ── Audience, products, services ──
  {
    key: "target_audience", label: "Target Audience", importance: "high", inferable: true,
    promptText: { title: "Who is this business's target audience?", description: "Knowing the audience improves targeting for marketing, content, and product decisions.", inputType: "textarea" },
  },
  {
    key: "products", label: "Products", importance: "normal", inferable: true,
    promptText: { title: "What products does this business sell?", description: "Product details help me recommend accurate positioning, pricing, and marketing angles.", inputType: "textarea" },
  },
  {
    key: "services", label: "Services", importance: "normal", inferable: true,
    promptText: { title: "What services does this business offer?", description: "Service details help me recommend accurate positioning and go-to-market moves.", inputType: "textarea" },
  },
  // ── Goals & metrics ──
  {
    key: "revenue_goals", label: "Revenue Goals", importance: "high", inferable: true,
    promptText: { title: "What are this business's revenue goals?", description: "Revenue targets let me prioritize work that actually moves the number that matters.", inputType: "text" },
  },
  {
    key: "primary_goals", label: "Primary Goals", importance: "high", inferable: true,
    promptText: { title: "What are this business's top priorities right now?", description: "Knowing current priorities keeps planning and task suggestions focused on what matters most.", inputType: "textarea" },
  },
  { key: "success_metrics", label: "Success Metrics", importance: "normal", inferable: true },
  // ── Constraints, rules, risks ──
  { key: "constraints", label: "Constraints", importance: "normal", inferable: true },
  { key: "rules", label: "Operating Rules", importance: "normal", inferable: true },
  { key: "risks", label: "Risks", importance: "normal", inferable: true },
  // ── Strategies ──
  { key: "marketing_strategy", label: "Marketing Strategy", importance: "normal", inferable: true },
  { key: "seo_strategy", label: "SEO Strategy", importance: "normal", inferable: true },
  { key: "automation_strategy", label: "Automation Strategy", importance: "normal", inferable: true },
  // ── Technology / integrations ──
  { key: "technology_stack", label: "Technology Stack", importance: "normal", inferable: true },
  { key: "ai_stack", label: "AI Stack", importance: "normal", inferable: true },
  { key: "connected_platforms", label: "Connected Platforms", importance: "normal", inferable: true },
  { key: "connected_apis", label: "Connected APIs", importance: "normal", inferable: true },
  // ── Derived-only (never inferred, never prompted — evidence comes solely
  // from live system data during import/reconciliation) ──
  { key: "execution_priorities", label: "Execution Priorities", importance: "normal", inferable: false },
  { key: "landing_pages", label: "Landing Pages", importance: "normal", inferable: false },
] as const;

export interface IncomingDnaEvidence {
  fieldKey: string;
  value: unknown;
  confidenceScore: number;
  trustLevel: BusinessDnaTrustLevel;
  source: string;
  reasoning?: string;
  observedAt?: Date;
}

export type TruthResolutionAction = "created" | "promoted" | "reinforced" | "preserved" | "conflict";

export interface TruthResolutionResult {
  action: TruthResolutionAction;
  claim: BusinessDnaClaim;
  conflictId: number | null;
}

export type RecommendedConflictAction = "keep_current" | "accept_new" | "edit_value" | "defer";

export interface RecommendedConflictDecision {
  action: RecommendedConflictAction;
  reason: string;
}

export interface BusinessCapability {
  key: string;
  label: string;
  available: boolean;
  trustLevel: BusinessDnaTrustLevel;
  confidenceScore: number;
  evidence: string[];
  relatedObjects: Record<string, unknown>;
  // Populated only when unavailable — a short, static explanation of what's
  // missing and, implicitly, what would unlock it. Null when available.
  gap: string | null;
}

export interface BusinessHealthDimension {
  overallScore: number | null;
  status: string | null;
  freshness: Date | null;
}

export interface BusinessRevenueContext {
  last30DaysCents: number | null;
  currency: string | null;
  connectedProviders: number;
  freshness: Date | null;
}

export interface BusinessState {
  lifecycleStage: LifecycleStage;
  currentObjective: string | null;
  currentMilestone: string | null;
  currentSprint: string | null;
  launchStatus: string;
  activeProjects: number;
  activeGoals: number;
  openTasks: number;
  completedTasks: number;
  failedTasks: number;
  connectedServices: number;
  websiteStatus: "present" | "missing" | "unknown";
  // Top-level fields kept for backward compatibility with existing consumers
  // (context.ts callers that read state.health.overallScore directly);
  // operational/narrative below expose the same two underlying health
  // systems distinctly, each labeled with its own source, per the spec's
  // "monitoring vs AI health are two different things" boundary.
  health: BusinessHealthDimension & {
    operational: (BusinessHealthDimension & { source: "business_health_metrics" }) | null;
    narrative: (BusinessHealthDimension & { summary: string | null; source: "business_health_scores" }) | null;
  };
  revenueContext: BusinessRevenueContext | null;
  activeCampaigns: number;
  activeAutomations: number;
  risks: string[];
  opportunities: string[];
  priorities: string[];
}

export interface BusinessContextRecommendation {
  id: number;
  title: string;
  category: string;
  confidence: number;
  status: string;
}

export interface BusinessContextPackage {
  businessId: number;
  businessName: string;
  generatedAt: Date;
  dna: Array<Pick<BusinessDnaClaim, "fieldKey" | "currentValue" | "confidenceScore" | "trustLevel" | "source" | "lastUpdatedAt">>;
  state: BusinessState;
  capabilities: BusinessCapability[];
  unresolvedConflicts: Array<{ id: number; fieldKey: string; impactScore: number; impactReason: string }>;
  reviewCount: number;
  recommendations: BusinessContextRecommendation[];
  contextNote: string;
}

// ─── Cross-Business Analysis (opt-in only, never automatic) ────────────────
// Deliberately a separate, distinctly-shaped type from BusinessContextPackage
// so it can never be mistaken for (or accidentally substituted into) a
// single-business context. Only ever produced by assembleCrossBusinessSummary,
// which is only ever called when a caller explicitly opts in.
export interface CrossBusinessSummaryEntry {
  businessId: number;
  businessName: string;
  lifecycleStage: LifecycleStage;
  healthScore: number | null;
  openTasks: number;
  activeGoals: number;
}

export interface CrossBusinessSummary {
  userId: number;
  generatedAt: Date;
  businessCount: number;
  businesses: CrossBusinessSummaryEntry[];
  contextNote: string;
}
