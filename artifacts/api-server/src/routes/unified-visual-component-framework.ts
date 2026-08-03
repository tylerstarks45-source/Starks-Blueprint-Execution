// ─────────────────────────────────────────────────────────────────────────────
// Build 051 — UVCF REST Routes
// 13 endpoints mounted at /api/components/*
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireAdmin } from "../lib/auth";
import {
  registerComponent, listComponents, searchComponents,
  getRegistryStats, listFamilies, registerFamily,
} from "../lib/unified-visual-component-framework/registry-engine";
import { registerToken, listTokens, getToken } from "../lib/unified-visual-component-framework/token-engine";
import { registerVariant, listVariants } from "../lib/unified-visual-component-framework/variant-engine";
import { listAccessibilityProfiles } from "../lib/unified-visual-component-framework/accessibility-engine";
import { listSemanticProfiles } from "../lib/unified-visual-component-framework/semantic-engine";
import { listDiagnostics, listUsage, recordDiagnostic } from "../lib/unified-visual-component-framework/diagnostics-engine";
import { buildUVCFSummary, captureUVCFSnapshot, listSnapshots } from "../lib/unified-visual-component-framework/uvcf-orchestrator";
import { componentRegistry } from "@workspace/db/schema";
import { db } from "@workspace/db";

export const unifiedVisualComponentFrameworkRouter = Router();

// ── POST /components/register ─────────────────────────────────────────────────
unifiedVisualComponentFrameworkRouter.post("/register", (async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { familyId, componentKey, title, description, category, accessibilityRole, ariaLabelTemplate, semanticMeaning, semanticIntent, ashSemanticTag } = req.body;
  if (!familyId || !componentKey || !title) return res.status(400).json({ error: "familyId, componentKey, title required" });
  const result = await registerComponent({
    familyId, componentKey, title, description: description ?? "", category: category ?? "display",
    accessibilityRole, ariaLabelTemplate, semanticMeaning, semanticIntent, ashSemanticTag,
  });
  return res.status(201).json(result);
}) as RequestHandler);

// ── POST /components/variants ─────────────────────────────────────────────────
unifiedVisualComponentFrameworkRouter.post("/variants", (async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { componentId, componentKey, variantKey, title, description, propsOverrides, tokenOverrides, isDefault } = req.body;
  if (!componentId || !componentKey || !variantKey || !title) return res.status(400).json({ error: "componentId, componentKey, variantKey, title required" });
  const result = await registerVariant({ componentId, componentKey, variantKey, title, description, propsOverrides: propsOverrides ?? {}, tokenOverrides: tokenOverrides ?? {}, isDefault });
  return res.status(201).json(result);
}) as RequestHandler);

// ── POST /components/themes ───────────────────────────────────────────────────
unifiedVisualComponentFrameworkRouter.post("/themes", (async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { tokenKey, tokenName, category, valueLight, valueDark, description, isSemantic, semanticRole } = req.body;
  if (!tokenKey || !tokenName || !category || !valueLight) return res.status(400).json({ error: "tokenKey, tokenName, category, valueLight required" });
  const result = await registerToken({ tokenKey, tokenName, category, valueLight, valueDark, description, isSemantic, semanticRole });
  return res.status(201).json(result);
}) as RequestHandler);

// ── POST /components/manifests ────────────────────────────────────────────────
unifiedVisualComponentFrameworkRouter.post("/manifests", (async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { familyKey, title, description, category, sortOrder } = req.body;
  if (!familyKey || !title) return res.status(400).json({ error: "familyKey and title required" });
  const result = await registerFamily({ familyKey, title, description, category: category ?? "general", sortOrder });
  return res.status(201).json(result);
}) as RequestHandler);

// ── GET /components ───────────────────────────────────────────────────────────
unifiedVisualComponentFrameworkRouter.get("/", (async (req, res) => {
  const comps = await listComponents(req.query.category as string | undefined);
  res.json({ components: comps, total: comps.length });
}) as RequestHandler);

// ── GET /components/families ──────────────────────────────────────────────────
unifiedVisualComponentFrameworkRouter.get("/families", (async (_req, res) => {
  const families = await listFamilies();
  res.json({ families, total: families.length });
}) as RequestHandler);

// ── GET /components/tokens ────────────────────────────────────────────────────
unifiedVisualComponentFrameworkRouter.get("/tokens", (async (req, res) => {
  const tokens = await listTokens(req.query.category as any);
  res.json({ tokens, total: tokens.length });
}) as RequestHandler);

// ── GET /components/registry ──────────────────────────────────────────────────
unifiedVisualComponentFrameworkRouter.get("/registry", (async (_req, res) => {
  const rows = await db.select().from(componentRegistry);
  const stats = await getRegistryStats();
  res.json({ ...stats, registry: rows });
}) as RequestHandler);

// ── GET /components/usage ─────────────────────────────────────────────────────
unifiedVisualComponentFrameworkRouter.get("/usage", (async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string ?? "50", 10), 100);
  const usage = await listUsage(limit);
  res.json({ usage, total: usage.length });
}) as RequestHandler);

// ── GET /components/diagnostics ───────────────────────────────────────────────
unifiedVisualComponentFrameworkRouter.get("/diagnostics", (async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string ?? "50", 10), 100);
  const diags = await listDiagnostics(req.query.componentKey as string | undefined, limit);
  res.json({ diagnostics: diags, total: diags.length });
}) as RequestHandler);

// ── GET /components/search ────────────────────────────────────────────────────
unifiedVisualComponentFrameworkRouter.get("/search", (async (req, res) => {
  const q = (req.query.q as string) ?? "";
  if (!q.trim()) return res.status(400).json({ error: "query parameter 'q' required" });
  const results = await searchComponents(q);
  return res.json({ results, total: results.length });
}) as RequestHandler);

// ── GET /components/snapshots ─────────────────────────────────────────────────
unifiedVisualComponentFrameworkRouter.get("/snapshots", (async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string ?? "10", 10), 50);
  const snaps = await listSnapshots(limit);
  res.json({ snapshots: snaps, total: snaps.length });
}) as RequestHandler);

// ── GET /components/accessibility ─────────────────────────────────────────────
unifiedVisualComponentFrameworkRouter.get("/accessibility", (async (_req, res) => {
  const profiles = await listAccessibilityProfiles();
  res.json({ profiles, total: profiles.length });
}) as RequestHandler);

// ── GET /components/semantic ──────────────────────────────────────────────────
unifiedVisualComponentFrameworkRouter.get("/semantic", (async (_req, res) => {
  const profiles = await listSemanticProfiles();
  res.json({ profiles, total: profiles.length });
}) as RequestHandler);
