// ─────────────────────────────────────────────────────────────────────────────
// Build 053 — BEB Types
// ─────────────────────────────────────────────────────────────────────────────

export const EXPERIENCE_TYPES = [
  "business_website", "landing_page", "sales_funnel", "product_page",
  "checkout_flow", "customer_portal", "member_portal", "knowledge_center",
  "documentation_site", "help_center", "blog_system", "resource_library",
  "booking_page", "contact_experience", "lead_generation_page", "event_page",
  "waitlist", "coming_soon_page", "community_portal", "future_experience",
] as const;
export type ExperienceType = typeof EXPERIENCE_TYPES[number];

export const EXPERIENCE_STATUSES = ["draft", "review", "published", "archived"] as const;
export type ExperienceStatus = typeof EXPERIENCE_STATUSES[number];

export const PAGE_TYPES = [
  "home", "standard", "landing", "checkout", "confirmation", "error",
  "search", "category", "detail", "auth", "portal", "future",
] as const;
export type PageType = typeof PAGE_TYPES[number];

export const SECTION_TYPES = [
  "hero", "features", "testimonials", "pricing", "cta", "faq",
  "gallery", "team", "blog", "contact", "footer", "header",
  "content", "comparison", "timeline", "stats", "partners", "future",
] as const;
export type SectionType = typeof SECTION_TYPES[number];

export const BREAKPOINTS = ["mobile", "tablet", "laptop", "desktop", "widescreen"] as const;
export type Breakpoint = typeof BREAKPOINTS[number];

export const THEME_TYPES = [
  "platform_default", "platform_dark", "platform_minimal",
  "platform_bold", "custom",
] as const;
export type ThemeType = typeof THEME_TYPES[number];

export const SCHEMA_TYPES = [
  "LocalBusiness", "Organization", "WebSite", "Product",
  "Article", "FAQPage", "Event", "Person", "Service",
] as const;
export type SchemaType = typeof SCHEMA_TYPES[number];

// Summary type surfaced to Executive Brain
export interface BEBSummary {
  totalExperiences:     number;
  publishedExperiences: number;
  draftExperiences:     number;
  totalPages:           number;
  totalSections:        number;
  totalThemes:          number;
  totalTemplates:       number;
  averageSeoScore:      number;
  typeBreakdown:        Record<string, number>;
  statusBreakdown:      Record<string, number>;
  recentDiagnostics:    number;
}
