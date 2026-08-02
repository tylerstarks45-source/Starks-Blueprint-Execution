// ── Build 047: Unified Workspace & Project System — REST API ─────────────────
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../lib/auth";
import {
  createBusinessWorkspace,
  listBusinessWorkspaces,
} from "../lib/unified-workspace/business-org-engine";
import {
  createProject,
  listProjects,
  archiveProject,
  listTemplates,
  seedProjectTemplates,
  getProjectRegistry,
} from "../lib/unified-workspace/project-lifecycle-engine";
import {
  registerAsset,
  listUserAssets,
  listProjectAssets,
} from "../lib/unified-workspace/asset-registry-engine";
import {
  getRecentActivity,
} from "../lib/unified-workspace/workspace-activity-engine";
import {
  getAllProjectHealth,
  computeProjectHealth,
} from "../lib/unified-workspace/project-health-engine";
import {
  buildUWPSSummary,
  workspaceSearch,
  fetchLatestSnapshot,
  captureWorkspaceSnapshot,
} from "../lib/unified-workspace/uwps-orchestrator";
import { appendActivity } from "../lib/unified-workspace/workspace-activity-engine";
import { upsertProjectRegistry } from "../lib/unified-workspace/project-lifecycle-engine";

export const unifiedWorkspaceRouter = Router();
unifiedWorkspaceRouter.use(requireAuth);

// ── POST /workspace/businesses — create a business workspace ─────────────────
const CreateWorkspaceSchema = z.object({
  businessId:    z.number().optional(),
  orgId:         z.number().optional(),
  workspaceName: z.string().min(1).max(200),
  workspaceType: z.enum(["business", "personal", "team"]).optional(),
  configuration: z.record(z.unknown()).optional(),
});

unifiedWorkspaceRouter.post("/businesses", async (req, res) => {
  const userId = (req as any).user?.id;
  const parsed = CreateWorkspaceSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() }); return; }
  const workspace = await createBusinessWorkspace({ userId, ...parsed.data });
  await appendActivity(userId, "workspace_created",
    { workspaceName: workspace.workspaceName, workspaceId: workspace.id },
    { workspaceId: workspace.id, actor: "user" });
  res.json({ success: true, workspace });
});

// ── GET /workspace/businesses — list workspaces ───────────────────────────────
unifiedWorkspaceRouter.get("/businesses", async (req, res) => {
  const userId     = (req as any).user?.id;
  const businessId = req.query.businessId ? Number(req.query.businessId) : undefined;
  const workspaces = await listBusinessWorkspaces(userId, businessId);
  res.json({ success: true, workspaces, count: workspaces.length });
});

// ── POST /workspace/projects — create a project ───────────────────────────────
const CreateProjectSchema = z.object({
  workspaceId: z.number().optional(),
  businessId:  z.number().optional(),
  projectName: z.string().min(1).max(200),
  projectType: z.enum(["website", "crm", "automation", "dashboard", "saas", "custom"]),
  description: z.string().optional(),
  tags:        z.array(z.string()).optional(),
  templateId:  z.number().optional(),
  metadata:    z.record(z.unknown()).optional(),
});

unifiedWorkspaceRouter.post("/projects", async (req, res) => {
  const userId = (req as any).user?.id;
  const parsed = CreateProjectSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() }); return; }
  const project = await createProject({ userId, ...parsed.data });
  await appendActivity(userId, "project_created",
    { projectName: project.projectName, projectId: project.id, projectType: project.projectType },
    { projectId: project.id, workspaceId: project.workspaceId ?? undefined, businessId: project.businessId ?? undefined, actor: "user" });
  res.json({ success: true, project });
});

// ── GET /workspace/projects — list projects ───────────────────────────────────
unifiedWorkspaceRouter.get("/projects", async (req, res) => {
  const userId     = (req as any).user?.id;
  const businessId = req.query.businessId ? Number(req.query.businessId) : undefined;
  const workspaceId = req.query.workspaceId ? Number(req.query.workspaceId) : undefined;
  const projects   = await listProjects(userId, businessId, workspaceId);
  res.json({ success: true, projects, count: projects.length });
});

// ── POST /workspace/assets — register an asset ────────────────────────────────
const RegisterAssetSchema = z.object({
  projectId:   z.number(),
  businessId:  z.number().optional(),
  workspaceId: z.number().optional(),
  assetName:   z.string().min(1).max(300),
  assetType:   z.enum([
    "website", "landing_page", "saas", "workflow", "automation",
    "knowledge_base", "crm", "api", "database", "dashboard",
    "ai_agent", "prompt_library", "documentation", "marketing_campaign",
    "brand_kit", "logo", "image", "video", "document", "source_code",
  ]),
  externalRef: z.string().optional(),
  metadata:    z.record(z.unknown()).optional(),
});

unifiedWorkspaceRouter.post("/assets", async (req, res) => {
  const userId = (req as any).user?.id;
  const parsed = RegisterAssetSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() }); return; }
  const asset = await registerAsset({ userId, ...parsed.data });
  await appendActivity(userId, "asset_added",
    { assetName: asset.assetName, assetId: asset.id, assetType: asset.assetType },
    { projectId: asset.projectId, assetId: asset.id, businessId: asset.businessId ?? undefined, actor: "user" });
  res.json({ success: true, asset });
});

// ── GET /workspace/assets — list assets ──────────────────────────────────────
unifiedWorkspaceRouter.get("/assets", async (req, res) => {
  const userId    = (req as any).user?.id;
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const assetType = req.query.assetType as any;
  const assets    = projectId
    ? await listProjectAssets(projectId, userId, assetType)
    : await listUserAssets(userId, assetType);
  res.json({ success: true, assets, count: assets.length });
});

// ── POST /workspace/templates — create a template (admin) ────────────────────
unifiedWorkspaceRouter.post("/templates", requireAdmin, async (req, res) => {
  const seeded = await seedProjectTemplates();
  const all    = await listTemplates();
  res.json({ success: true, seeded, templates: all, count: all.length });
});

// ── GET /workspace/activity — activity timeline ───────────────────────────────
unifiedWorkspaceRouter.get("/activity", async (req, res) => {
  const userId    = (req as any).user?.id;
  const limit     = req.query.limit ? Number(req.query.limit) : 50;
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const activity  = await getRecentActivity(userId, limit, projectId);
  res.json({ success: true, activity, count: activity.length });
});

// ── GET /workspace/health — project health scores ─────────────────────────────
unifiedWorkspaceRouter.get("/health", async (req, res) => {
  const userId = (req as any).user?.id;
  const health  = await getAllProjectHealth(userId);
  res.json({ success: true, health, count: health.length });
});

// ── POST /workspace/health/compute — trigger health computation ───────────────
unifiedWorkspaceRouter.post("/health/compute", async (req, res) => {
  const userId    = (req as any).user?.id;
  const { projectId } = req.body;
  if (!projectId) { res.status(400).json({ error: "projectId required" }); return; }
  const projectRows = await listProjects(userId);
  const project = projectRows.find(p => p.id === Number(projectId));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const score = await computeProjectHealth(project);
  await appendActivity(userId, "health_computed",
    { score: score.overallScore, projectId: project.id },
    { projectId: project.id, actor: "system" });
  res.json({ success: true, health: score });
});

// ── GET /workspace/registry — project registry ────────────────────────────────
unifiedWorkspaceRouter.get("/registry", async (req, res) => {
  const userId   = (req as any).user?.id;
  const registry = await getProjectRegistry(userId);
  res.json({ success: true, registry, count: registry.length });
});

// ── GET /workspace/search — cross-object search ───────────────────────────────
unifiedWorkspaceRouter.get("/search", async (req, res) => {
  const userId = (req as any).user?.id;
  const q      = req.query.q as string;
  const kinds  = req.query.kinds ? String(req.query.kinds).split(",") : undefined;
  const limit  = req.query.limit ? Number(req.query.limit) : 20;
  if (!q) { res.status(400).json({ error: "q (query) is required" }); return; }
  const results = await workspaceSearch(userId, q, kinds, limit);
  res.json({ success: true, results, count: results.length });
});

// ── GET /workspace/snapshots — workspace snapshots (admin) ───────────────────
unifiedWorkspaceRouter.get("/snapshots", requireAdmin, async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const rows  = await db_snapshotsAdmin(limit);
  res.json({ success: true, snapshots: rows, count: rows.length });
});

async function db_snapshotsAdmin(limit: number): Promise<any[]> {
  const { db } = await import("@workspace/db");
  const { workspaceSnapshots } = await import("@workspace/db/schema");
  const { sql } = await import("drizzle-orm");
  return db
    .select()
    .from(workspaceSnapshots as any)
    .orderBy(sql`created_at DESC`)
    .limit(limit) as any;
}

// ── GET /workspace/summary — UWPS summary ────────────────────────────────────
unifiedWorkspaceRouter.get("/summary", async (req, res) => {
  const userId  = (req as any).user?.id;
  const summary = await buildUWPSSummary(userId);
  res.json({ success: true, summary });
});

// ── POST /workspace/initialize — admin re-seed ───────────────────────────────
unifiedWorkspaceRouter.post("/initialize", requireAdmin, async (req, res) => {
  const { initializeUWPS } = await import("../lib/unified-workspace/uwps-orchestrator");
  const result = await initializeUWPS();
  res.json({ success: true, ...result });
});
