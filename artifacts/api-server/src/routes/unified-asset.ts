// ── Build 048: UBAF REST routes ───────────────────────────────────────────────
import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth, requireAdmin } from "../lib/auth";
import {
  registerCanonicalAsset,
  listCanonicalAssets,
  searchAssets,
  getAssetLifecycle,
  getAssetRegistry,
  computeUBAFSummary,
  initializeUBAF,
  captureUBAFSnapshot,
} from "../lib/unified-asset/ubaf-orchestrator";
import { classifyBuilderObject, listAssetClasses } from "../lib/unified-asset/asset-classification-engine";
import { translateBuilderObject } from "../lib/unified-asset/translation-engine";
import { produceManifest, getLatestManifest } from "../lib/unified-asset/asset-manifest-engine";
import { listCapabilitiesForUser } from "../lib/unified-asset/capability-engine";
import { getRelationshipsForUser, getRelationshipsForAsset } from "../lib/unified-asset/relationship-engine";
import { db } from "@workspace/db";
import { assetSnapshots } from "@workspace/db/schema";
import { desc } from "drizzle-orm";

const router = Router();

// ── POST /assets/register ─────────────────────────────────────────────────────
router.post("/register", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { classKey, canonicalName, description, businessId, projectId, workspaceId, tags, externalUrl } = req.body;
  if (!classKey || !canonicalName) {
    res.status(400).json({ error: "classKey and canonicalName are required" });
    return;
  }
  const result = await registerCanonicalAsset({
    userId,
    classKey,
    canonicalName,
    description,
    businessId: businessId ? Number(businessId) : undefined,
    projectId:  projectId  ? Number(projectId)  : undefined,
    workspaceId: workspaceId ? Number(workspaceId) : undefined,
    tags,
    externalUrl,
  });
  res.status(201).json(result);
});

// ── POST /assets/classify ─────────────────────────────────────────────────────
router.post("/classify", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { builderObjectType } = req.body;
  if (!builderObjectType) {
    res.status(400).json({ error: "builderObjectType is required" });
    return;
  }
  const classKey = classifyBuilderObject(builderObjectType);
  res.json({ classKey, builderObjectType });
});

// ── POST /assets/translate ────────────────────────────────────────────────────
router.post("/translate", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { builderSource, builderObjectId, builderObjectType, rawPayload, businessId, projectId, workspaceId } = req.body;
  if (!builderSource || !builderObjectId || !builderObjectType || !rawPayload) {
    res.status(400).json({ error: "builderSource, builderObjectId, builderObjectType, rawPayload are required" });
    return;
  }
  const result = await translateBuilderObject({
    userId,
    builderSource,
    builderObjectId: String(builderObjectId),
    builderObjectType,
    rawPayload,
    businessId: businessId ? Number(businessId) : undefined,
    projectId:  projectId  ? Number(projectId)  : undefined,
    workspaceId: workspaceId ? Number(workspaceId) : undefined,
  });
  res.status(result.isNew ? 201 : 200).json(result);
});

// ── POST /assets/manifest ─────────────────────────────────────────────────────
router.post("/manifest", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { assetId } = req.body;
  if (!assetId) {
    res.status(400).json({ error: "assetId is required" });
    return;
  }
  const result = await produceManifest(Number(assetId), userId);
  res.status(201).json(result);
});

// ── GET /assets ───────────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { classKey, status } = req.query;
  const assets = await listCanonicalAssets(userId, classKey as string | undefined, status as string | undefined);
  res.json(assets);
});

// ── GET /assets/classes ───────────────────────────────────────────────────────
router.get("/classes", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { category } = req.query;
  const classes = await listAssetClasses(category as string | undefined);
  res.json(classes);
});

// ── GET /assets/relationships ─────────────────────────────────────────────────
router.get("/relationships", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { assetId } = req.query;
  if (assetId) {
    const rels = await getRelationshipsForAsset(Number(assetId));
    res.json(rels);
    return;
  }
  const rels = await getRelationshipsForUser(userId);
  res.json(rels);
});

// ── GET /assets/capabilities ──────────────────────────────────────────────────
router.get("/capabilities", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const caps = await listCapabilitiesForUser(userId);
  res.json(caps);
});

// ── GET /assets/registry ──────────────────────────────────────────────────────
router.get("/registry", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const registry = await getAssetRegistry(userId);
  res.json(registry);
});

// ── GET /assets/search ────────────────────────────────────────────────────────
router.get("/search", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { q } = req.query;
  if (!q) {
    res.status(400).json({ error: "q query parameter is required" });
    return;
  }
  const results = await searchAssets(userId, String(q));
  res.json(results);
});

// ── GET /assets/snapshots ─────────────────────────────────────────────────────
router.get("/snapshots", async (_req: Request, res: Response) => {
  const rows = await db.select().from(assetSnapshots).orderBy(desc(assetSnapshots.createdAt)).limit(20);
  res.json(rows);
});

// ── GET /assets/lifecycle ─────────────────────────────────────────────────────
router.get("/lifecycle", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { assetId } = req.query;
  if (!assetId) {
    res.status(400).json({ error: "assetId query parameter is required" });
    return;
  }
  const events = await getAssetLifecycle(Number(assetId));
  res.json(events);
});

// ── GET /assets/summary ───────────────────────────────────────────────────────
router.get("/summary", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const summary = await computeUBAFSummary(userId);
  res.json(summary);
});

// ── POST /assets/initialize (admin) ──────────────────────────────────────────
router.post("/initialize", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  await initializeUBAF();
  await captureUBAFSnapshot(admin.id);
  res.json({ success: true, message: "UBAF initialized: 30 asset classes seeded and snapshot captured" });
});

export { router as unifiedAssetRouter };
