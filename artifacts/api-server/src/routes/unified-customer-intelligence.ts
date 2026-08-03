import { Router } from "express";
import { requireAuth, requireAdmin } from "../lib/auth.js";
import { createCustomerProfile, listCustomerProfiles, searchCustomers } from "../lib/unified-customer-intelligence/identity-engine.js";
import { createOrganizationProfile, listOrganizations, createRelationship, listRelationships, buildRelationshipGraph } from "../lib/unified-customer-intelligence/relationship-engine.js";
import { initLifecycle, advanceLifecycle, getLifecycle, getLifecycleSummary } from "../lib/unified-customer-intelligence/lifecycle-engine.js";
import { createSegment, listSegments } from "../lib/unified-customer-intelligence/segmentation-engine.js";
import { createInteraction, listInteractions, computeEngagementScore, getEngagement } from "../lib/unified-customer-intelligence/engagement-engine.js";
import { analyzeDataQuality, listDuplicateFlags } from "../lib/unified-customer-intelligence/data-quality-engine.js";
import { buildUCIESummary, captureUCIESnapshot } from "../lib/unified-customer-intelligence/ucie-orchestrator.js";
import { db } from "@workspace/db";
import { customerRegistry, customerSnapshots } from "@workspace/db/schema";
import { sql } from "drizzle-orm";

const router = Router();

// ─── POST /customers/profiles ────────────────────────────────────────────────
router.post("/profiles", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const profile = await createCustomerProfile({ ...req.body, userId: Number(userId) });
    // Initialize lifecycle
    await initLifecycle(profile.customerId, Number(userId), req.body.businessId ? Number(req.body.businessId) : undefined);
    return res.status(201).json({ success: true, profile });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── POST /customers/organizations ──────────────────────────────────────────
router.post("/organizations", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const org = await createOrganizationProfile({ ...req.body, userId: Number(userId) });
    return res.status(201).json({ success: true, org });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── POST /customers/segments ────────────────────────────────────────────────
router.post("/segments", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const segment = await createSegment({ ...req.body, userId: Number(userId) });
    return res.status(201).json({ success: true, segment });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── POST /customers/interactions ────────────────────────────────────────────
router.post("/interactions", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const interaction = await createInteraction({ ...req.body, userId: Number(userId) });
    // Recompute engagement after each interaction
    await computeEngagementScore(req.body.customerId, Number(userId), req.body.businessId ? Number(req.body.businessId) : undefined).catch(() => null);
    return res.status(201).json({ success: true, interaction });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── GET /customers ──────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const limit  = Number(req.query.limit ?? 50);
    const offset = Number(req.query.offset ?? 0);
    const customers = await listCustomerProfiles(Number(userId), req.query.businessId ? Number(req.query.businessId) : undefined, limit, offset);
    return res.json({ success: true, customers, count: customers.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /customers/relationships ────────────────────────────────────────────
router.get("/relationships", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const customerId = String(req.query.customerId ?? "");
  if (!customerId) return res.status(400).json({ error: "customerId required" });
  try {
    const graph = await buildRelationshipGraph(customerId);
    return res.json({ success: true, ...graph });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /customers/lifecycle ────────────────────────────────────────────────
router.get("/lifecycle", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    if (req.query.customerId) {
      const records = await getLifecycle(String(req.query.customerId));
      return res.json({ success: true, lifecycle: records[0] ?? null });
    }
    const summary = await getLifecycleSummary(Number(userId), req.query.businessId ? Number(req.query.businessId) : undefined);
    return res.json({ success: true, stageBreakdown: summary });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /customers/engagement ───────────────────────────────────────────────
router.get("/engagement", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const customerId = String(req.query.customerId ?? "");
  if (!customerId) return res.status(400).json({ error: "customerId required" });
  try {
    const records = await getEngagement(customerId);
    return res.json({ success: true, engagement: records[0] ?? null });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /customers/registry ─────────────────────────────────────────────────
router.get("/registry", async (req, res) => {
  try {
    const summary = await buildUCIESummary();
    const recent  = await db.select().from(customerRegistry)
      .orderBy(sql`created_at DESC`).limit(10);
    return res.json({ success: true, summary, recentCustomers: recent });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /customers/quality ──────────────────────────────────────────────────
router.get("/quality", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    if (req.query.customerId) {
      const result = await analyzeDataQuality(
        String(req.query.customerId),
        Number(userId),
        req.query.businessId ? Number(req.query.businessId) : undefined,
      );
      return res.json({ success: true, quality: result });
    }
    const duplicates = await listDuplicateFlags(Number(userId));
    return res.json({ success: true, duplicates, count: duplicates.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /customers/search ───────────────────────────────────────────────────
router.get("/search", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const q = String(req.query.q ?? "");
  if (!q) return res.status(400).json({ error: "q required" });
  try {
    const results = await searchCustomers(Number(userId), q);
    return res.json({ success: true, results });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /customers/snapshots ────────────────────────────────────────────────
router.get("/snapshots", async (req, res) => {
  try {
    const snapshots = await db.select().from(customerSnapshots)
      .orderBy(sql`created_at DESC`).limit(20);
    return res.json({ success: true, snapshots });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /customers/organizations ────────────────────────────────────────────
router.get("/organizations", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const orgs = await listOrganizations(Number(userId), req.query.businessId ? Number(req.query.businessId) : undefined);
    return res.json({ success: true, orgs, count: orgs.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
