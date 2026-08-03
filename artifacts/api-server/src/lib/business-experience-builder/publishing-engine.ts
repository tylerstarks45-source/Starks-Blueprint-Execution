// ─────────────────────────────────────────────────────────────────────────────
// Build 053 — Publishing Preparation Engine
// Validates every experience before deployment — NO deployment occurs here
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import {
  experienceRegistry, experiencePages, experienceSeo,
  experienceThemes, experienceNavigation, experienceDiagnostics,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export interface PublishingCheckResult {
  checkId:     string;
  title:       string;
  status:      "pass" | "warn" | "fail";
  detail:      string;
  blocking:    boolean;
}

export interface PublishingReadinessReport {
  experienceId:  string;
  overallStatus: "ready" | "warnings" | "blocked";
  score:         number;   // 0–100
  checks:        PublishingCheckResult[];
  blockers:      PublishingCheckResult[];
  warnings:      PublishingCheckResult[];
}

export async function runPublishingPreparation(experienceId: string): Promise<PublishingReadinessReport> {
  const checks: PublishingCheckResult[] = [];

  // 1. Registry check
  const reg = await db.select().from(experienceRegistry)
    .where(eq(experienceRegistry.experienceId, experienceId)).limit(1);
  if (!reg.length) {
    return {
      experienceId, overallStatus: "blocked", score: 0,
      checks: [{ checkId: "registry", title: "Experience exists", status: "fail", detail: "Experience not found in registry", blocking: true }],
      blockers: [], warnings: [],
    };
  }

  checks.push({ checkId: "registry", title: "Experience registered", status: "pass", detail: "Experience found in registry", blocking: false });

  // 2. Home page check
  const pages = await db.select().from(experiencePages)
    .where(eq(experiencePages.experienceId, experienceId));
  if (!pages.length) {
    checks.push({ checkId: "pages", title: "Has pages", status: "fail", detail: "No pages found — add at least a home page", blocking: true });
  } else {
    const hasHome = pages.some((p: any) => p.isHomePage);
    checks.push({
      checkId: "home_page", title: "Home page exists", blocking: !hasHome,
      status: hasHome ? "pass" : "fail",
      detail: hasHome ? "Home page configured" : "No home page set — users will land on a 404",
    });
    checks.push({ checkId: "page_count", title: "Page count", status: "pass", detail: `${pages.length} page(s) configured`, blocking: false });
  }

  // 3. SEO check
  const seo = await db.select().from(experienceSeo)
    .where(eq(experienceSeo.experienceId, experienceId)).limit(1);
  if (!seo.length) {
    checks.push({ checkId: "seo", title: "SEO profile", status: "warn", detail: "No SEO profile — experience will not rank in search engines", blocking: false });
  } else {
    const s = seo[0] as any;
    checks.push({ checkId: "seo_score", title: "SEO score", blocking: s.score < 30,
      status: s.score >= 70 ? "pass" : s.score >= 40 ? "warn" : "fail",
      detail: `SEO score: ${s.score}/100`,
    });
  }

  // 4. Theme check
  const r = reg[0] as any;
  checks.push({
    checkId: "theme", title: "Theme configured", blocking: false,
    status: r.themeId ? "pass" : "warn",
    detail: r.themeId ? "Custom theme applied" : "Using default platform theme",
  });

  // 5. Domain check
  const exp = await db.select().from(experienceRegistry)
    .where(eq(experienceRegistry.experienceId, experienceId)).limit(1);
  const domain = (exp[0] as any)?.domain;
  checks.push({
    checkId: "domain", title: "Custom domain", blocking: false,
    status: domain ? "pass" : "warn",
    detail: domain ? `Domain configured: ${domain}` : "No custom domain — experience will be served at platform subdomain",
  });

  // Compute score and status
  const blockers = checks.filter((c) => c.status === "fail" && c.blocking);
  const warnings = checks.filter((c) => c.status === "warn" || (c.status === "fail" && !c.blocking));
  const passCount = checks.filter((c) => c.status === "pass").length;
  const score = Math.round((passCount / checks.length) * 100);
  const overallStatus = blockers.length > 0 ? "blocked" : warnings.length > 0 ? "warnings" : "ready";

  // Record diagnostic if blocked
  if (overallStatus === "blocked") {
    await db.insert(experienceDiagnostics).values({
      experienceId,
      diagnosticType: "publishing_blocked",
      severity:       "error",
      category:       "publishing",
      title:          `Publishing blocked — ${blockers.length} blocker(s)`,
      details:        { blockers: blockers.map((b) => b.detail) },
    });
  }

  return { experienceId, overallStatus, score, checks, blockers, warnings };
}
