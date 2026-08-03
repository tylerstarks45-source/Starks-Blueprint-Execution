// ─────────────────────────────────────────────────────────────────────────────
// Build 053 — BEB REST Routes
// 13 endpoints mounted at /api/experiences/*
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireAdmin } from "../lib/auth";
import {
  createExperience, createPage, listExperiences,
  listPages, listSections,
} from "../lib/business-experience-builder/experience-engine";
import { registerTheme, listThemes } from "../lib/business-experience-builder/theme-engine";
import {
  createSeoProfile, listSeoProfiles, runSeoAudit,
  generateSitemapXml, generateRobotsTxt,
} from "../lib/business-experience-builder/seo-engine";
import { runPublishingPreparation } from "../lib/business-experience-builder/publishing-engine";
import {
  buildBEBSummary, listSnapshots, captureBEBSnapshot,
} from "../lib/business-experience-builder/beb-orchestrator";
import {
  getRequiredComponents, buildPageTree,
} from "../lib/business-experience-builder/layout-composition-engine";
import { getResponsiveRecommendations } from "../lib/business-experience-builder/responsive-engine";
import {
  experienceRegistry, experienceNavigation,
  experienceTemplates, experienceDiagnostics,
} from "@workspace/db/schema";
import { db } from "@workspace/db";
import { eq, ilike, or, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export const businessExperienceBuilderRouter = Router();

// ── POST /experiences ─────────────────────────────────────────────────────────
businessExperienceBuilderRouter.post("/", (async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { title, experienceType, slug, businessId, domain, description, targetAudience, brandSummary } = req.body;
  if (!title || !experienceType || !slug) {
    return res.status(400).json({ error: "title, experienceType, slug required" });
  }
  const exp = await createExperience({
    title, experienceType, slug, businessId, userId,
    domain, description, targetAudience, brandSummary,
  });
  return res.status(201).json(exp);
}) as RequestHandler);

// ── POST /experiences/pages ───────────────────────────────────────────────────
businessExperienceBuilderRouter.post("/pages", (async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { experienceId, title, slug, pageType, isHomePage, seoTitle, seoDescription, sortOrder } = req.body;
  if (!experienceId || !title || !slug) {
    return res.status(400).json({ error: "experienceId, title, slug required" });
  }
  const page = await createPage({ experienceId, title, slug, pageType, isHomePage, seoTitle, seoDescription, sortOrder });
  return res.status(201).json(page);
}) as RequestHandler);

// ── POST /experiences/themes ──────────────────────────────────────────────────
businessExperienceBuilderRouter.post("/themes", (async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { title, themeType, colorPrimary, colorSecondary, colorBackground, colorSurface,
          colorText, colorAccent, fontHeading, fontBody, fontMono, borderRadius, spacing, darkMode } = req.body;
  if (!title) return res.status(400).json({ error: "title required" });
  const theme = await registerTheme({
    title, themeType, colorPrimary, colorSecondary, colorBackground,
    colorSurface, colorText, colorAccent, fontHeading, fontBody, fontMono,
    borderRadius, spacing, darkMode,
  });
  return res.status(201).json(theme);
}) as RequestHandler);

// ── POST /experiences/templates ───────────────────────────────────────────────
businessExperienceBuilderRouter.post("/templates", (async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { templateKey, title, templateType, experienceType, description, componentTree, defaultTheme, defaultSeo, tags } = req.body;
  if (!templateKey || !title) return res.status(400).json({ error: "templateKey, title required" });
  const rows = await db.insert(experienceTemplates).values({
    templateKey, title,
    templateType:  templateType  ?? "page",
    experienceType:experienceType ?? "business_website",
    description:   description ?? "",
    componentTree: componentTree ?? {},
    defaultTheme:  defaultTheme  ?? {},
    defaultSeo:    defaultSeo    ?? {},
    tags:          tags ?? [],
    isPlatform:    true,
    usageCount:    0,
    metadata:      {},
  }).returning() as any[];
  return res.status(201).json(rows[0]);
}) as RequestHandler);

// ── GET /experiences ──────────────────────────────────────────────────────────
businessExperienceBuilderRouter.get("/", (async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const businessId = req.query.businessId ? parseInt(req.query.businessId as string, 10) : undefined;
  const all = req.query.all === "true";
  const experiences = await listExperiences(all ? undefined : userId, businessId);
  return res.json({ experiences, total: experiences.length });
}) as RequestHandler);

// ── GET /experiences/pages ────────────────────────────────────────────────────
businessExperienceBuilderRouter.get("/pages", (async (req, res) => {
  const experienceId = req.query.experienceId as string | undefined;
  if (!experienceId) return res.status(400).json({ error: "experienceId query param required" });
  const pages = await listPages(experienceId);
  return res.json({ pages, total: pages.length });
}) as RequestHandler);

// ── GET /experiences/navigation ───────────────────────────────────────────────
businessExperienceBuilderRouter.get("/navigation", (async (req, res) => {
  const experienceId = req.query.experienceId as string | undefined;
  if (!experienceId) return res.status(400).json({ error: "experienceId query param required" });
  const nav = await db.select().from(experienceNavigation)
    .where(eq(experienceNavigation.experienceId, experienceId));
  return res.json({ navigation: nav[0] ?? null });
}) as RequestHandler);

// ── GET /experiences/seo ──────────────────────────────────────────────────────
businessExperienceBuilderRouter.get("/seo", (async (req, res) => {
  const experienceId = req.query.experienceId as string | undefined;
  if (!experienceId) return res.status(400).json({ error: "experienceId query param required" });
  const seoProfiles = await listSeoProfiles(experienceId);
  const audit = runSeoAudit(seoProfiles[0] ?? {});
  return res.json({ seo: seoProfiles[0] ?? null, audit });
}) as RequestHandler);

// ── GET /experiences/registry ─────────────────────────────────────────────────
businessExperienceBuilderRouter.get("/registry", (async (_req, res) => {
  const summary = await buildBEBSummary();
  const registry = await db.select().from(experienceRegistry);
  res.json({ ...summary, registry });
}) as RequestHandler);

// ── GET /experiences/diagnostics ──────────────────────────────────────────────
businessExperienceBuilderRouter.get("/diagnostics", (async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string ?? "50", 10), 100);
  const diags = await db.select().from(experienceDiagnostics)
    .orderBy(desc(experienceDiagnostics.createdAt)).limit(limit);
  res.json({ diagnostics: diags, total: diags.length });
}) as RequestHandler);

// ── GET /experiences/search ───────────────────────────────────────────────────
businessExperienceBuilderRouter.get("/search", (async (req, res) => {
  const q = (req.query.q as string) ?? "";
  if (!q.trim()) return res.status(400).json({ error: "query parameter 'q' required" });
  const results = await db.select().from(experienceRegistry)
    .where(or(
      ilike(experienceRegistry.title, `%${q}%`),
      ilike(experienceRegistry.experienceType, `%${q}%`),
    ));
  return res.json({ results, total: results.length });
}) as RequestHandler);

// ── GET /experiences/snapshots ────────────────────────────────────────────────
businessExperienceBuilderRouter.get("/snapshots", (async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string ?? "10", 10), 50);
  const snaps = await listSnapshots(limit);
  res.json({ snapshots: snaps, total: snaps.length });
}) as RequestHandler);

// ── GET /experiences/templates ────────────────────────────────────────────────
businessExperienceBuilderRouter.get("/templates", (async (req, res) => {
  const type = req.query.type as string | undefined;
  let templates = await db.select().from(experienceTemplates)
    .orderBy(desc(experienceTemplates.usageCount));
  if (type) templates = templates.filter((t: any) => t.experienceType === type || t.templateType === type);
  res.json({ templates, total: templates.length });
}) as RequestHandler);
