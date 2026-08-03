// ─────────────────────────────────────────────────────────────────────────────
// Build 050 — Unified Application Framework REST Routes
// 13 endpoints mounted at /api/applications/*
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth } from "../lib/auth";
import { requireAdmin } from "../lib/auth";
import {
  registerApplication,
  listAllApplications,
  searchApplications,
  getApplicationRegistry,
} from "../lib/unified-application-framework/registry-engine";
import { createManifest } from "../lib/unified-application-framework/manifest-engine";
import { registerCapability, listCapabilities, listAshInvocableCapabilities } from "../lib/unified-application-framework/capability-engine";
import { registerPage, listPages, listWidgets, registerWidget } from "../lib/unified-application-framework/navigation-engine";
import { listSnapshots } from "../lib/unified-application-framework/uaf-orchestrator";
import { listDiagnostics, runPlatformHealthCheck } from "../lib/unified-application-framework/diagnostics-engine";
import { platformServices } from "@workspace/db/schema";
import { db } from "@workspace/db";

export const unifiedApplicationFrameworkRouter = Router();

// ── POST /applications/register ───────────────────────────────────────────────
unifiedApplicationFrameworkRouter.post("/register", (async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { appId, title, version = "1.0.0", description = "", icon, category = "general", developer = "platform" } = req.body;
  if (!appId || !title) return res.status(400).json({ error: "appId and title required" });
  const result = await registerApplication({ appId, title, version, description, icon, category, developer });
  return res.status(201).json(result);
}) as RequestHandler);

// ── POST /applications/manifest ───────────────────────────────────────────────
unifiedApplicationFrameworkRouter.post("/manifest", (async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const body = req.body;
  if (!body.appId || !body.title) return res.status(400).json({ error: "appId and title required" });
  const manifest = await createManifest({
    appId:                  body.appId,
    version:                body.version ?? "1.0.0",
    title:                  body.title,
    description:            body.description ?? "",
    icon:                   body.icon,
    category:               body.category ?? "general",
    developer:              body.developer ?? "platform",
    homepageUrl:            body.homepageUrl,
    supportedPermissions:   body.supportedPermissions ?? [],
    minPlatformVersion:     body.minPlatformVersion ?? "1.0.0",
    compatibleAssetClasses: body.compatibleAssetClasses ?? [],
    compatibleBuilderTypes: body.compatibleBuilderTypes ?? [],
    metadata:               body.metadata ?? {},
  });
  return res.status(201).json(manifest);
}) as RequestHandler);

// ── POST /applications/pages ──────────────────────────────────────────────────
unifiedApplicationFrameworkRouter.post("/pages", (async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { appId, pageKey, title, route, isDefault, menuPlacement, menuGroup, sortOrder, icon, description } = req.body;
  if (!appId || !pageKey || !title || !route) return res.status(400).json({ error: "appId, pageKey, title, route required" });
  const page = await registerPage({ appId, pageKey, title, route, isDefault, menuPlacement, menuGroup, sortOrder, icon, description });
  return res.status(201).json(page);
}) as RequestHandler);

// ── POST /applications/capabilities ──────────────────────────────────────────
unifiedApplicationFrameworkRouter.post("/capabilities", (async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { appId, capabilityKey, title, description, capabilityType, requiresPermissions, isPlatformCapability, ashCanInvoke } = req.body;
  if (!appId || !capabilityKey || !title) return res.status(400).json({ error: "appId, capabilityKey, title required" });
  const cap = await registerCapability({
    appId,
    capabilityKey,
    title,
    description: description ?? "",
    capabilityType: capabilityType ?? "read",
    requiresPermissions: requiresPermissions ?? [],
    isPlatformCapability: isPlatformCapability ?? false,
    ashCanInvoke: ashCanInvoke ?? true,
  });
  return res.status(201).json(cap);
}) as RequestHandler);

// ── GET /applications ─────────────────────────────────────────────────────────
unifiedApplicationFrameworkRouter.get("/", (async (_req, res) => {
  const apps = await listAllApplications();
  res.json({ applications: apps, total: apps.length });
}) as RequestHandler);

// ── GET /applications/pages ───────────────────────────────────────────────────
unifiedApplicationFrameworkRouter.get("/pages", (async (req, res) => {
  const pages = await listPages(req.query.appId as string | undefined);
  res.json({ pages, total: pages.length });
}) as RequestHandler);

// ── GET /applications/widgets ─────────────────────────────────────────────────
unifiedApplicationFrameworkRouter.get("/widgets", (async (req, res) => {
  const widgets = await listWidgets(req.query.appId as string | undefined);
  res.json({ widgets, total: widgets.length });
}) as RequestHandler);

// ── GET /applications/services ────────────────────────────────────────────────
unifiedApplicationFrameworkRouter.get("/services", (async (req, res) => {
  const { eq } = await import("drizzle-orm");
  let rows: any[];
  if (req.query.appId) {
    rows = await db.select().from(platformServices).where(eq(platformServices.appId, req.query.appId as string));
  } else {
    rows = await db.select().from(platformServices);
  }
  res.json({ services: rows, total: rows.length });
}) as RequestHandler);

// ── GET /applications/registry ────────────────────────────────────────────────
unifiedApplicationFrameworkRouter.get("/registry", (async (_req, res) => {
  const registry = await getApplicationRegistry();
  res.json(registry);
}) as RequestHandler);

// ── GET /applications/health ──────────────────────────────────────────────────
unifiedApplicationFrameworkRouter.get("/health", (async (_req, res) => {
  const result = await runPlatformHealthCheck();
  res.json(result);
}) as RequestHandler);

// ── GET /applications/search ──────────────────────────────────────────────────
unifiedApplicationFrameworkRouter.get("/search", (async (req, res) => {
  const q = (req.query.q as string) ?? "";
  if (!q.trim()) return res.status(400).json({ error: "query parameter 'q' required" });
  const results = await searchApplications(q);
  return res.json({ results, total: results.length });
}) as RequestHandler);

// ── GET /applications/snapshots ───────────────────────────────────────────────
unifiedApplicationFrameworkRouter.get("/snapshots", (async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string ?? "10", 10), 50);
  const snaps = await listSnapshots(limit);
  res.json({ snapshots: snaps, total: snaps.length });
}) as RequestHandler);

// ── GET /applications/diagnostics ─────────────────────────────────────────────
unifiedApplicationFrameworkRouter.get("/diagnostics", (async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string ?? "50", 10), 100);
  const diags = await listDiagnostics(req.query.appId as string | undefined, limit);
  res.json({ diagnostics: diags, total: diags.length });
}) as RequestHandler);

// ── GET /applications/capabilities ────────────────────────────────────────────
unifiedApplicationFrameworkRouter.get("/capabilities", (async (req, res) => {
  const caps = req.query.ash === "true"
    ? await listAshInvocableCapabilities()
    : await listCapabilities(req.query.appId as string | undefined);
  res.json({ capabilities: caps, total: caps.length });
}) as RequestHandler);
