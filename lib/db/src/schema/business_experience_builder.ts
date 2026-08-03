// ─────────────────────────────────────────────────────────────────────────────
// Build 053 — Business Experience Builder (BEB) — DB Schema
// 10 tables; experience_registry is the only mutable table (UNIQUE on experience_id)
// All others are append-only / insert-only
// ─────────────────────────────────────────────────────────────────────────────
import {
  pgTable, serial, text, integer, boolean, jsonb, timestamp,
} from "drizzle-orm/pg-core";

// 1. business_experiences — append-only experience definitions
export const businessExperiences = pgTable("business_experiences", {
  id:               serial("id").primaryKey(),
  experienceId:     text("experience_id").notNull(),
  businessId:       integer("business_id"),
  userId:           integer("user_id"),
  title:            text("title").notNull(),
  experienceType:   text("experience_type").notNull().default("business_website"),
  slug:             text("slug").notNull(),
  domain:           text("domain"),
  themeId:          text("theme_id"),
  canvasId:         text("canvas_id"),
  status:           text("status").notNull().default("draft"),
  publishedAt:      timestamp("published_at"),
  seoProfileId:     text("seo_profile_id"),
  navigationId:     text("navigation_id"),
  pageCount:        integer("page_count").notNull().default(0),
  sectionCount:     integer("section_count").notNull().default(0),
  description:      text("description").notNull().default(""),
  targetAudience:   text("target_audience").notNull().default(""),
  brandSummary:     text("brand_summary").notNull().default(""),
  metadata:         jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

// 2. experience_pages — append-only page definitions
export const experiencePages = pgTable("experience_pages", {
  id:                serial("id").primaryKey(),
  experienceId:      text("experience_id").notNull(),
  pageId:            text("page_id").notNull(),
  title:             text("title").notNull(),
  slug:              text("slug").notNull(),
  pageType:          text("page_type").notNull().default("standard"),
  layoutTemplate:    text("layout_template").notNull().default("blank"),
  componentTree:     jsonb("component_tree").$type<Record<string, unknown>>().notNull().default({}),
  sectionIds:        jsonb("section_ids").$type<string[]>().notNull().default([]),
  seoTitle:          text("seo_title"),
  seoDescription:    text("seo_description"),
  ogImage:           text("og_image"),
  canonicalUrl:      text("canonical_url"),
  isHomePage:        boolean("is_home_page").notNull().default(false),
  isHidden:          boolean("is_hidden").notNull().default(false),
  sortOrder:         integer("sort_order").notNull().default(0),
  breakpoints:       jsonb("breakpoints").$type<Record<string, unknown>>().notNull().default({}),
  metadata:          jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
});

// 3. experience_sections — append-only reusable section blocks
export const experienceSections = pgTable("experience_sections", {
  id:            serial("id").primaryKey(),
  experienceId:  text("experience_id").notNull(),
  sectionId:     text("section_id").notNull(),
  title:         text("title").notNull(),
  sectionType:   text("section_type").notNull().default("content"),
  componentTree: jsonb("component_tree").$type<Record<string, unknown>>().notNull().default({}),
  isReusable:    boolean("is_reusable").notNull().default(false),
  isGlobal:      boolean("is_global").notNull().default(false),
  sortOrder:     integer("sort_order").notNull().default(0),
  styles:        jsonb("styles").$type<Record<string, unknown>>().notNull().default({}),
  metadata:      jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

// 4. experience_themes — append-only theme definitions
export const experienceThemes = pgTable("experience_themes", {
  id:             serial("id").primaryKey(),
  themeId:        text("theme_id").notNull(),
  title:          text("title").notNull(),
  themeType:      text("theme_type").notNull().default("custom"),
  colorPrimary:   text("color_primary").notNull().default("#3366ff"),
  colorSecondary: text("color_secondary").notNull().default("#6c757d"),
  colorBackground:text("color_background").notNull().default("#ffffff"),
  colorSurface:   text("color_surface").notNull().default("#f8f9fa"),
  colorText:      text("color_text").notNull().default("#212529"),
  colorAccent:    text("color_accent").notNull().default("#22c55e"),
  fontHeading:    text("font_heading").notNull().default("Inter"),
  fontBody:       text("font_body").notNull().default("Inter"),
  fontMono:       text("font_mono").notNull().default("JetBrains Mono"),
  borderRadius:   text("border_radius").notNull().default("0.5rem"),
  spacing:        text("spacing").notNull().default("1rem"),
  darkMode:       jsonb("dark_mode").$type<Record<string, unknown>>().notNull().default({}),
  tokens:         jsonb("tokens").$type<Record<string, unknown>>().notNull().default({}),
  isPlatform:     boolean("is_platform").notNull().default(false),
  metadata:       jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
});

// 5. experience_navigation — append-only navigation models
export const experienceNavigation = pgTable("experience_navigation", {
  id:           serial("id").primaryKey(),
  experienceId: text("experience_id").notNull(),
  navigationId: text("navigation_id").notNull(),
  title:        text("title").notNull(),
  navType:      text("nav_type").notNull().default("primary"),
  items:        jsonb("items").$type<unknown[]>().notNull().default([]),
  footerItems:  jsonb("footer_items").$type<unknown[]>().notNull().default([]),
  logoUrl:      text("logo_url"),
  logoText:     text("logo_text"),
  sticky:       boolean("sticky").notNull().default(true),
  transparent:  boolean("transparent").notNull().default(false),
  metadata:     jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

// 6. experience_seo — append-only SEO profiles
export const experienceSeo = pgTable("experience_seo", {
  id:              serial("id").primaryKey(),
  experienceId:    text("experience_id").notNull(),
  seoId:           text("seo_id").notNull(),
  siteTitle:       text("site_title").notNull().default(""),
  siteDescription: text("site_description").notNull().default(""),
  canonicalBase:   text("canonical_base").notNull().default(""),
  ogTitle:         text("og_title"),
  ogDescription:   text("og_description"),
  ogImage:         text("og_image"),
  twitterCard:     text("twitter_card").notNull().default("summary_large_image"),
  schemaType:      text("schema_type").notNull().default("LocalBusiness"),
  schemaData:      jsonb("schema_data").$type<Record<string, unknown>>().notNull().default({}),
  robotsMeta:      text("robots_meta").notNull().default("index,follow"),
  sitemapEnabled:  boolean("sitemap_enabled").notNull().default(true),
  analyticsId:     text("analytics_id"),
  score:           integer("score").notNull().default(0),
  issues:          jsonb("issues").$type<string[]>().notNull().default([]),
  metadata:        jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});

// 7. experience_registry — MUTABLE, UNIQUE on experience_id
export const experienceRegistry = pgTable("experience_registry", {
  id:             serial("id").primaryKey(),
  experienceId:   text("experience_id").notNull(),
  title:          text("title").notNull(),
  experienceType: text("experience_type").notNull().default("business_website"),
  businessId:     integer("business_id"),
  userId:         integer("user_id"),
  status:         text("status").notNull().default("draft"),
  isPublished:    boolean("is_published").notNull().default(false),
  pageCount:      integer("page_count").notNull().default(0),
  seoScore:       integer("seo_score").notNull().default(0),
  healthStatus:   text("health_status").notNull().default("healthy"),
  lastPublishedAt:timestamp("last_published_at"),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
});

// 8. experience_snapshots — append-only platform snapshots
export const experienceSnapshots = pgTable("experience_snapshots", {
  id:                    serial("id").primaryKey(),
  totalExperiences:      integer("total_experiences").notNull().default(0),
  publishedExperiences:  integer("published_experiences").notNull().default(0),
  totalPages:            integer("total_pages").notNull().default(0),
  totalSections:         integer("total_sections").notNull().default(0),
  totalThemes:           integer("total_themes").notNull().default(0),
  totalTemplates:        integer("total_templates").notNull().default(0),
  averageSeoScore:       integer("average_seo_score").notNull().default(0),
  typeBreakdown:         jsonb("type_breakdown").$type<Record<string, number>>().notNull().default({}),
  statusBreakdown:       jsonb("status_breakdown").$type<Record<string, number>>().notNull().default({}),
  lawApplied:            boolean("law_applied").notNull().default(true),
  snapshotData:          jsonb("snapshot_data").$type<Record<string, unknown>>().notNull().default({}),
  createdAt:             timestamp("created_at").notNull().defaultNow(),
});

// 9. experience_templates — append-only reusable page/experience templates
export const experienceTemplates = pgTable("experience_templates", {
  id:              serial("id").primaryKey(),
  templateKey:     text("template_key").notNull(),
  title:           text("title").notNull(),
  templateType:    text("template_type").notNull().default("page"),
  experienceType:  text("experience_type").notNull().default("business_website"),
  description:     text("description").notNull().default(""),
  thumbnail:       text("thumbnail"),
  componentTree:   jsonb("component_tree").$type<Record<string, unknown>>().notNull().default({}),
  defaultTheme:    jsonb("default_theme").$type<Record<string, unknown>>().notNull().default({}),
  defaultSeo:      jsonb("default_seo").$type<Record<string, unknown>>().notNull().default({}),
  tags:            jsonb("tags").$type<string[]>().notNull().default([]),
  isPlatform:      boolean("is_platform").notNull().default(true),
  usageCount:      integer("usage_count").notNull().default(0),
  metadata:        jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});

// 10. experience_diagnostics — append-only diagnostics
export const experienceDiagnostics = pgTable("experience_diagnostics", {
  id:              serial("id").primaryKey(),
  experienceId:    text("experience_id"),
  diagnosticType:  text("diagnostic_type").notNull(),
  severity:        text("severity").notNull().default("info"),
  category:        text("category").notNull().default("general"),
  title:           text("title").notNull(),
  details:         jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  resolvedAt:      timestamp("resolved_at"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});
