// ─────────────────────────────────────────────────────────────────────────────
// Build 053 — SEO Intelligence Engine
// Canonical URLs, meta tags, Open Graph, Schema.org, sitemaps, robots, diagnostics
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import { experienceSeo, experiencePages } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { SchemaType } from "./types";

export interface SeoProfileInput {
  experienceId:    string;
  siteTitle:       string;
  siteDescription: string;
  canonicalBase?:  string;
  ogTitle?:        string;
  ogDescription?:  string;
  ogImage?:        string;
  schemaType?:     SchemaType;
  schemaData?:     Record<string, unknown>;
  robotsMeta?:     string;
  analyticsId?:    string;
}

export interface SeoAuditResult {
  score:    number;   // 0–100
  issues:   string[];
  warnings: string[];
  passed:   string[];
}

export async function createSeoProfile(input: SeoProfileInput): Promise<any> {
  const seoId = `seo_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const audit = runSeoAudit(input);
  const rows = await db.insert(experienceSeo).values({
    experienceId:    input.experienceId,
    seoId,
    siteTitle:       input.siteTitle,
    siteDescription: input.siteDescription,
    canonicalBase:   input.canonicalBase ?? "",
    ogTitle:         input.ogTitle   ?? null,
    ogDescription:   input.ogDescription ?? null,
    ogImage:         input.ogImage   ?? null,
    twitterCard:     "summary_large_image",
    schemaType:      input.schemaType ?? "LocalBusiness",
    schemaData:      input.schemaData ?? {},
    robotsMeta:      input.robotsMeta ?? "index,follow",
    sitemapEnabled:  true,
    analyticsId:     input.analyticsId ?? null,
    score:           audit.score,
    issues:          audit.issues,
    metadata:        {},
  }).returning() as any[];
  return rows[0];
}

export async function listSeoProfiles(experienceId: string): Promise<any[]> {
  return db.select().from(experienceSeo).where(eq(experienceSeo.experienceId, experienceId));
}

export function runSeoAudit(input: Partial<SeoProfileInput>): SeoAuditResult {
  const issues:   string[] = [];
  const warnings: string[] = [];
  const passed:   string[] = [];
  let score = 100;

  // Title checks
  if (!input.siteTitle || input.siteTitle.length < 10) {
    issues.push("Site title is missing or too short (min 10 characters)"); score -= 20;
  } else if (input.siteTitle.length > 60) {
    warnings.push("Site title exceeds 60 characters — may be truncated in search results"); score -= 5;
  } else {
    passed.push("Site title length is optimal");
  }

  // Description checks
  if (!input.siteDescription || input.siteDescription.length < 50) {
    issues.push("Meta description is missing or too short (min 50 characters)"); score -= 15;
  } else if (input.siteDescription.length > 160) {
    warnings.push("Meta description exceeds 160 characters"); score -= 5;
  } else {
    passed.push("Meta description length is optimal");
  }

  // OG checks
  if (!input.ogTitle) {
    warnings.push("Open Graph title not set — social sharing will use site title"); score -= 5;
  } else { passed.push("Open Graph title is set"); }

  if (!input.ogImage) {
    warnings.push("Open Graph image not set — social previews will have no image"); score -= 5;
  } else { passed.push("Open Graph image is set"); }

  // Canonical
  if (!input.canonicalBase) {
    warnings.push("Canonical base URL not set — duplicate content risk"); score -= 5;
  } else { passed.push("Canonical base URL is set"); }

  // Schema
  if (!input.schemaType) {
    warnings.push("Schema.org type not configured"); score -= 5;
  } else { passed.push(`Schema.org type '${input.schemaType}' configured`); }

  return { score: Math.max(0, score), issues, warnings, passed };
}

export function generateStructuredData(schemaType: SchemaType, data: Record<string, unknown>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type":    schemaType,
    ...data,
  };
}

export function generateRobotsTxt(options: { allowAll?: boolean; disallowPaths?: string[]; sitemapUrl?: string } = {}): string {
  const lines = ["User-agent: *"];
  if (options.allowAll) {
    lines.push("Allow: /");
  }
  for (const path of options.disallowPaths ?? []) {
    lines.push(`Disallow: ${path}`);
  }
  if (options.sitemapUrl) {
    lines.push(`\nSitemap: ${options.sitemapUrl}`);
  }
  return lines.join("\n");
}

export function generateSitemapXml(baseUrl: string, pages: { slug: string; createdAt: Date; isHidden: boolean }[]): string {
  const urls = pages
    .filter((p) => !p.isHidden)
    .map((p) => {
      const loc = `${baseUrl.replace(/\/$/, "")}/${p.slug.replace(/^\//, "")}`;
      const lastmod = p.createdAt.toISOString().split("T")[0];
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
    });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
}

export async function getAverageSeoScore(): Promise<number> {
  const rows = await db.select({ score: experienceSeo.score }).from(experienceSeo);
  if (!rows.length) return 0;
  return Math.round(rows.reduce((s: number, r: any) => s + (r.score ?? 0), 0) / rows.length);
}
