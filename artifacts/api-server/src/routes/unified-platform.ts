// ── Build 046: Unified Platform Operating System — REST Routes ────────────────
import { Router }        from "express";
import { z }             from "zod";
import { requireAuthActive, requireAdmin } from "../lib/auth";
import {
  createWorkspace,
  listWorkspaces,
  archiveWorkspace,
}                        from "../lib/unified-platform/workspace-engine";
import {
  platformProjects,
  platformNotifications,
  platformActivity,
  platformSnapshots,
  platformRegistry,
}                        from "@workspace/db/schema";
import { db }            from "@workspace/db";
import { eq, and, desc, lt } from "drizzle-orm";
import {
  registerApplication,
  listApplications,
  getApplication,
}                        from "../lib/unified-platform/application-registry-engine";
import {
  registerCommands,
  listCommands,
  getCommand,
  validateCommandAuthority,
}                        from "../lib/unified-platform/global-command-engine";
import { globalSearch }  from "../lib/unified-platform/global-search-engine";
import {
  getContext,
  upsertContext,
}                        from "../lib/unified-platform/context-engine";
import {
  buildSummary,
  initializeUPOS,
  runUPOSMaintenance,
}                        from "../lib/unified-platform/upos-orchestrator";
import {
  startPlatformSession,
  getActiveSessions,
  appendActivity,
}                        from "../lib/unified-platform/platform-runtime-engine";

export const unifiedPlatformRouter = Router();

// ── POST /platform/workspaces ─────────────────────────────────────────────────
const CreateWorkspaceSchema = z.object({
  workspaceName:  z.string().min(1).max(200),
  workspaceType:  z.enum(["personal", "team", "organization"]).optional(),
  configuration:  z.record(z.unknown()).optional(),
});

unifiedPlatformRouter.post("/workspaces", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const parsed = CreateWorkspaceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }
    const workspace = await createWorkspace({ userId, ...parsed.data });
    res.json({ success: true, workspace });
  } catch {
    res.status(500).json({ error: "workspace creation failed" });
  }
});

// ── POST /platform/projects ───────────────────────────────────────────────────
const CreateProjectSchema = z.object({
  workspaceId:  z.number().int().optional(),
  appId:        z.string().optional(),
  projectName:  z.string().min(1).max(200),
  projectType:  z.enum(["website", "crm", "automation", "dashboard", "custom"]),
  metadata:     z.record(z.unknown()).optional(),
});

unifiedPlatformRouter.post("/projects", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const parsed = CreateProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }
    const projectRows: any[] = await db
      .insert(platformProjects as any)
      .values({
        userId,
        workspaceId: parsed.data.workspaceId ?? null,
        appId:       parsed.data.appId       ?? null,
        projectName: parsed.data.projectName,
        projectType: parsed.data.projectType,
        metadata:    parsed.data.metadata    ?? {},
      })
      .returning() as any;
    const project = projectRows[0];
    await appendActivity(userId, "project_created", { projectId: project.id }, {
      projectId:  project.id,
      appId:      parsed.data.appId,
      workspaceId:parsed.data.workspaceId,
      actor:      "user",
      summary:    `Project created: ${parsed.data.projectName}`,
    });
    res.json({ success: true, project });
  } catch {
    res.status(500).json({ error: "project creation failed" });
  }
});

// ── POST /platform/applications ───────────────────────────────────────────────
const RegisterAppSchema = z.object({
  appId:        z.string().min(1).max(100),
  appName:      z.string().min(1).max(200),
  appDomain:    z.string().min(1),
  version:      z.string().max(20).optional(),
  description:  z.string().max(500).optional(),
  capabilities: z.array(z.string()).optional(),
  commands:     z.array(z.unknown()).optional(),
  permissions:  z.array(z.string()).optional(),
  projectTypes: z.array(z.string()).optional(),
  assetTypes:   z.array(z.string()).optional(),
  manifest:     z.record(z.unknown()).optional(),
});

unifiedPlatformRouter.post("/applications", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const parsed = RegisterAppSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }
    const app = await registerApplication({
      appId:        parsed.data.appId,
      appName:      parsed.data.appName,
      appDomain:    parsed.data.appDomain,
      version:      parsed.data.version      ?? "1.0.0",
      description:  parsed.data.description  ?? "",
      capabilities: (parsed.data.capabilities ?? []) as string[],
      commands:     (parsed.data.commands     ?? []) as any[],
      permissions:  (parsed.data.permissions  ?? []) as string[],
      projectTypes: (parsed.data.projectTypes ?? []) as string[],
      assetTypes:   (parsed.data.assetTypes   ?? []) as string[],
      manifest:     parsed.data.manifest      ?? {},
    });
    res.json({ success: true, app });
  } catch {
    res.status(500).json({ error: "application registration failed" });
  }
});

// ── POST /platform/commands ───────────────────────────────────────────────────
const RegisterCommandsSchema = z.object({
  appId:    z.string().min(1),
  commands: z.array(z.object({
    commandId:          z.string().min(1),
    commandName:        z.string().min(1),
    description:        z.string().optional(),
    requiredPermissions:z.array(z.string()).optional(),
    route:              z.string().optional(),
    method:             z.enum(["GET","POST","PUT","PATCH","DELETE"]).optional(),
    parameters:         z.record(z.unknown()).optional(),
  })).min(1),
});

unifiedPlatformRouter.post("/commands", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const parsed = RegisterCommandsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }
    const registered = await registerCommands(
      parsed.data.appId,
      parsed.data.commands.map((c) => ({
        commandId:           c.commandId,
        commandName:         c.commandName,
        description:         c.description         ?? "",
        requiredPermissions: c.requiredPermissions  ?? [],
        route:               c.route,
        method:              (c.method             ?? "POST") as any,
        parameters:          c.parameters          ?? {},
      })),
    );
    res.json({ success: true, registered });
  } catch {
    res.status(500).json({ error: "command registration failed" });
  }
});

// ── GET /platform/runtime ─────────────────────────────────────────────────────
unifiedPlatformRouter.get("/runtime", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const summary  = await buildSummary(userId);
    const sessions = await getActiveSessions(userId);
    res.json({ success: true, runtime: summary, sessions, sessionCount: sessions.length });
  } catch {
    res.status(500).json({ error: "runtime fetch failed" });
  }
});

// ── GET /platform/context ─────────────────────────────────────────────────────
unifiedPlatformRouter.get("/context", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const context = await getContext(userId);
    res.json({ success: true, context });
  } catch {
    res.status(500).json({ error: "context fetch failed" });
  }
});

// PATCH /platform/context — update current context
const UpdateContextSchema = z.object({
  currentPage:        z.string().optional(),
  currentAppId:       z.string().optional(),
  currentProjectId:   z.number().int().optional(),
  currentWorkspaceId: z.number().int().optional(),
  currentOrgId:       z.number().int().optional(),
  permissions:        z.array(z.string()).optional(),
  availableCommands:  z.array(z.unknown()).optional(),
  breadcrumb:         z.array(z.unknown()).optional(),
});

unifiedPlatformRouter.patch("/context", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const parsed = UpdateContextSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }
    const ctx = await upsertContext({ userId, ...parsed.data as any });
    res.json({ success: true, context: ctx });
  } catch {
    res.status(500).json({ error: "context update failed" });
  }
});

// ── GET /platform/search ──────────────────────────────────────────────────────
unifiedPlatformRouter.get("/search", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const query = String(req.query.q ?? "");
    if (!query.trim()) {
      res.json({ success: true, results: [], count: 0 });
      return;
    }
    const kindsParam = req.query.kinds as string | undefined;
    const kinds      = kindsParam ? kindsParam.split(",") as any[] : undefined;
    const limit      = req.query.limit ? Math.min(parseInt(String(req.query.limit), 10), 50) : 20;
    const results    = await globalSearch({ query, userId, kinds, limit });
    await appendActivity(userId, "search_performed", { query }, {
      actor:   "user",
      summary: `Search: "${query}"`,
    });
    res.json({ success: true, results, count: results.length });
  } catch {
    res.status(500).json({ error: "search failed" });
  }
});

// ── GET /platform/activity ────────────────────────────────────────────────────
unifiedPlatformRouter.get("/activity", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const limit = req.query.limit ? Math.min(parseInt(String(req.query.limit), 10), 100) : 50;
    const rows  = await db
      .select()
      .from(platformActivity)
      .where(eq(platformActivity.userId, userId))
      .orderBy(desc(platformActivity.createdAt))
      .limit(limit);
    res.json({ success: true, activity: rows, count: rows.length });
  } catch {
    res.status(500).json({ error: "activity fetch failed" });
  }
});

// ── GET /platform/registry ────────────────────────────────────────────────────
unifiedPlatformRouter.get("/registry", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const registry = await db
      .select()
      .from(platformRegistry)
      .orderBy(desc(platformRegistry.updatedAt));
    res.json({ success: true, registry, count: registry.length });
  } catch {
    res.status(500).json({ error: "registry fetch failed" });
  }
});

// ── GET /platform/snapshots ───────────────────────────────────────────────────
unifiedPlatformRouter.get("/snapshots", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const limit = req.query.limit ? Math.min(parseInt(String(req.query.limit), 10), 50) : 20;
    const snapshots = await db
      .select()
      .from(platformSnapshots)
      .orderBy(desc(platformSnapshots.createdAt))
      .limit(limit);
    res.json({ success: true, snapshots, count: snapshots.length });
  } catch {
    res.status(500).json({ error: "snapshots fetch failed" });
  }
});

// ── GET /platform/applications ────────────────────────────────────────────────
unifiedPlatformRouter.get("/applications", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const apps = await listApplications();
    res.json({ success: true, applications: apps, count: apps.length });
  } catch {
    res.status(500).json({ error: "application list failed" });
  }
});

// ── GET /platform/commands ────────────────────────────────────────────────────
unifiedPlatformRouter.get("/commands", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const appId = req.query.appId as string | undefined;
    const cmds  = await listCommands(appId);
    res.json({ success: true, commands: cmds, count: cmds.length });
  } catch {
    res.status(500).json({ error: "command list failed" });
  }
});

// ── POST /platform/runtime/initialize — admin only ───────────────────────────
unifiedPlatformRouter.post("/runtime/initialize", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const result = await initializeUPOS(caller.id);
    res.json({ success: true, ...result });
  } catch {
    res.status(500).json({ error: "UPOS initialization failed" });
  }
});
