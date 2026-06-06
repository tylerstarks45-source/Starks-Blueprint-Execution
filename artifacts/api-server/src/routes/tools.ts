import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, ilike, and } from "drizzle-orm";
import { db, toolsTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import {
  ListToolsResponse,
  GetToolResponse,
  CreateToolBody,
  UpdateToolBody,
  GetToolParams,
  UpdateToolParams,
  DeleteToolParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ── GET /api/tools ──────────────────────────────────────────────────────────
// Public read — marketplace tools are visible to all users.
router.get("/tools", async (req, res): Promise<void> => {
  const conditions = [];
  if (req.query.categoryId) conditions.push(eq(toolsTable.categoryId, Number(req.query.categoryId)));
  if (req.query.search) conditions.push(ilike(toolsTable.name, `%${req.query.search}%`));
  if (req.query.activeOnly === "true") conditions.push(eq(toolsTable.activeStatus, true));

  const rows = conditions.length
    ? await db.select().from(toolsTable).where(and(...conditions)).orderBy(toolsTable.name)
    : await db.select().from(toolsTable).orderBy(toolsTable.name);

  res.json(ListToolsResponse.parse(serialize(rows)));
});

// ── POST /api/tools — ADMIN ONLY ───────────────────────────────────────────
router.post("/tools", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const parsed = CreateToolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(toolsTable).values(parsed.data).returning();
  res.status(201).json(GetToolResponse.parse(serialize(row)));
});

// ── GET /api/tools/:id ──────────────────────────────────────────────────────
// Public read.
router.get("/tools/:id", async (req, res): Promise<void> => {
  const params = GetToolParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select().from(toolsTable).where(eq(toolsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Tool not found" });
    return;
  }
  res.json(GetToolResponse.parse(serialize(row)));
});

// ── PATCH /api/tools/:id — ADMIN ONLY ──────────────────────────────────────
router.patch("/tools/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const params = UpdateToolParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateToolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.update(toolsTable).set(parsed.data).where(eq(toolsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Tool not found" });
    return;
  }
  res.json(GetToolResponse.parse(serialize(row)));
});

// ── DELETE /api/tools/:id — ADMIN ONLY ─────────────────────────────────────
router.delete("/tools/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const params = DeleteToolParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(toolsTable).where(eq(toolsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
