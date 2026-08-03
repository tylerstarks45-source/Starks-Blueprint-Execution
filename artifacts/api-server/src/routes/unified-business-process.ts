import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import { requireAdmin } from "../lib/auth.js";
import { createProcess, listProcesses, searchProcesses } from "../lib/unified-business-process/process-definition-engine.js";
import { createStage, advanceStage, listStages, createStep } from "../lib/unified-business-process/stage-orchestration-engine.js";
import { createRule, listRules, getPendingApprovals } from "../lib/unified-business-process/approval-engine.js";
import { createDependency, listDependencies } from "../lib/unified-business-process/dependency-engine.js";
import { computeProcessMetrics, getMetrics, getDiagnostics } from "../lib/unified-business-process/optimization-engine.js";
import { buildUBPESummary, captureUBPESnapshot } from "../lib/unified-business-process/ubpe-orchestrator.js";
import { db } from "@workspace/db";
import { processRegistry, processSnapshots, processTemplates } from "@workspace/db/schema";
import { sql } from "drizzle-orm";

const router = Router();

// ─── POST /processes ─────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const process = await createProcess({ ...req.body, userId: Number(userId) });
    return res.status(201).json({ success: true, process });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── POST /processes/stages ───────────────────────────────────────────────────
router.post("/stages", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { advanceStageId, status, blockedReason, ...stageInput } = req.body;
    if (advanceStageId) {
      const result = await advanceStage(advanceStageId, status, blockedReason);
      return res.json({ success: true, ...result });
    }
    const stage = await createStage({ ...stageInput, userId: Number(userId) });
    return res.status(201).json({ success: true, stage });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── POST /processes/templates ────────────────────────────────────────────────
router.post("/templates", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const { randomUUID } = await import("crypto");
    const templateId = `tmpl_${randomUUID().replace(/-/g, "").slice(0, 18)}`;
    const rows = (await db.insert(processTemplates).values({
      templateId,
      userId:          Number(userId),
      title:           req.body.title,
      description:     req.body.description ?? null,
      processDomain:   req.body.processDomain,
      processType:     req.body.processType,
      isPlatform:      req.body.isPlatform ?? false,
      stageSchema:     req.body.stageSchema ?? [],
      ruleSchema:      req.body.ruleSchema ?? [],
      estimatedHours:  req.body.estimatedHours ?? null,
    }).returning()) as any[];
    return res.status(201).json({ success: true, template: rows[0] });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── POST /processes/rules ────────────────────────────────────────────────────
router.post("/rules", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const rule = await createRule({ ...req.body, userId: Number(userId) });
    return res.status(201).json({ success: true, rule });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── GET /processes ───────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const limit  = Number(req.query.limit  ?? 50);
    const offset = Number(req.query.offset ?? 0);
    const domain = req.query.domain as any ?? undefined;
    const processes = await listProcesses(Number(userId), req.query.businessId ? Number(req.query.businessId) : undefined, domain, limit, offset);
    return res.json({ success: true, processes, count: processes.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /processes/stages ────────────────────────────────────────────────────
router.get("/stages", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const processId = String(req.query.processId ?? "");
  if (!processId) return res.status(400).json({ error: "processId required" });
  try {
    const stages = await listStages(processId);
    return res.json({ success: true, stages });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /processes/templates ─────────────────────────────────────────────────
router.get("/templates", async (req, res) => {
  try {
    const domain = req.query.domain ? String(req.query.domain) : null;
    let templates;
    if (domain) {
      templates = await db.execute(sql`SELECT * FROM process_templates WHERE process_domain = ${domain} ORDER BY usage_count DESC`);
    } else {
      templates = await db.execute(sql`SELECT * FROM process_templates ORDER BY usage_count DESC`);
    }
    return res.json({ success: true, templates: (templates as any).rows ?? [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /processes/dependencies ──────────────────────────────────────────────
router.get("/dependencies", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const processId = String(req.query.processId ?? "");
  if (!processId) return res.status(400).json({ error: "processId required" });
  try {
    const deps = await listDependencies(processId);
    return res.json({ success: true, dependencies: deps });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /processes/registry ──────────────────────────────────────────────────
router.get("/registry", async (req, res) => {
  try {
    const summary = await buildUBPESummary();
    const recent  = await db.select().from(processRegistry)
      .orderBy(sql`created_at DESC`).limit(10);
    return res.json({ success: true, summary, recentProcesses: recent });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /processes/metrics ───────────────────────────────────────────────────
router.get("/metrics", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const processId = String(req.query.processId ?? "");
  if (!processId) return res.status(400).json({ error: "processId required" });
  try {
    if (req.query.recompute === "true") {
      const result = await computeProcessMetrics(processId, Number(userId));
      return res.json({ success: true, ...result });
    }
    const metrics = await getMetrics(processId);
    return res.json({ success: true, metrics: metrics[0] ?? null });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /processes/search ────────────────────────────────────────────────────
router.get("/search", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const q = String(req.query.q ?? "");
  if (!q) return res.status(400).json({ error: "q required" });
  try {
    const results = await searchProcesses(Number(userId), q);
    return res.json({ success: true, results });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /processes/snapshots ─────────────────────────────────────────────────
router.get("/snapshots", async (req, res) => {
  try {
    const snapshots = await db.select().from(processSnapshots)
      .orderBy(sql`created_at DESC`).limit(20);
    return res.json({ success: true, snapshots });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /processes/diagnostics ───────────────────────────────────────────────
router.get("/diagnostics", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const diags = await getDiagnostics(
      req.query.processId ? String(req.query.processId) : undefined,
      Number(userId),
    );
    return res.json({ success: true, diagnostics: diags });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
