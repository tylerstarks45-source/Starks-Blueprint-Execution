import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, ilike, and } from "drizzle-orm";
import { db, blueprintsTable, blueprintStepsTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import {
  ListBlueprintsResponse,
  GetBlueprintResponse,
  UpdateBlueprintResponse,
  CreateBlueprintBody,
  UpdateBlueprintBody,
  GetBlueprintParams,
  UpdateBlueprintParams,
  DeleteBlueprintParams,
  ListBlueprintStepsResponse,
  UpdateBlueprintStepResponse,
  CreateBlueprintStepParams,
  CreateBlueprintStepBody,
  UpdateBlueprintStepBody,
  UpdateBlueprintStepParams,
  DeleteBlueprintStepParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ── GET /api/blueprints ─────────────────────────────────────────────────────
// Public read — all authenticated and unauthenticated callers may list blueprints.
router.get("/blueprints", async (req, res): Promise<void> => {
  const conditions = [];
  if (req.query.status) conditions.push(eq(blueprintsTable.status, String(req.query.status)));
  if (req.query.categoryId) conditions.push(eq(blueprintsTable.categoryId, Number(req.query.categoryId)));
  if (req.query.slug) conditions.push(eq(blueprintsTable.slug, String(req.query.slug)));
  if (req.query.search) conditions.push(ilike(blueprintsTable.name, `%${req.query.search}%`));

  const rows = conditions.length
    ? await db.select().from(blueprintsTable).where(and(...conditions)).orderBy(blueprintsTable.name)
    : await db.select().from(blueprintsTable).orderBy(blueprintsTable.name);

  res.json(ListBlueprintsResponse.parse(serialize(rows)));
});

// ── POST /api/blueprints — ADMIN ONLY ──────────────────────────────────────
router.post("/blueprints", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const parsed = CreateBlueprintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(blueprintsTable).values(parsed.data).returning();
  res.status(201).json(GetBlueprintResponse.parse(serialize(row)));
});

// ── GET /api/blueprints/:id ─────────────────────────────────────────────────
// Public read.
router.get("/blueprints/:id", async (req, res): Promise<void> => {
  const params = GetBlueprintParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select().from(blueprintsTable).where(eq(blueprintsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Blueprint not found" });
    return;
  }
  res.json(GetBlueprintResponse.parse(serialize(row)));
});

// ── PATCH /api/blueprints/:id — ADMIN ONLY ─────────────────────────────────
router.patch("/blueprints/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const params = UpdateBlueprintParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBlueprintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.update(blueprintsTable).set(parsed.data).where(eq(blueprintsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Blueprint not found" });
    return;
  }
  res.json(UpdateBlueprintResponse.parse(serialize(row)));
});

// ── DELETE /api/blueprints/:id — ADMIN ONLY ────────────────────────────────
router.delete("/blueprints/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const params = DeleteBlueprintParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(blueprintsTable).where(eq(blueprintsTable.id, params.data.id));
  res.sendStatus(204);
});

// ── GET /api/blueprints/:id/steps ───────────────────────────────────────────
// Public read.
router.get("/blueprints/:id/steps", async (req, res): Promise<void> => {
  const params = GetBlueprintParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db.select().from(blueprintStepsTable).where(eq(blueprintStepsTable.blueprintId, params.data.id)).orderBy(blueprintStepsTable.stepNumber);
  res.json(ListBlueprintStepsResponse.parse(serialize(rows)));
});

// ── POST /api/blueprints/:id/steps — ADMIN ONLY ────────────────────────────
router.post("/blueprints/:id/steps", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const params = CreateBlueprintStepParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateBlueprintStepBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(blueprintStepsTable).values({ ...parsed.data, blueprintId: params.data.id }).returning();
  res.status(201).json(UpdateBlueprintStepResponse.parse(serialize(row)));
});

// ── PATCH /api/blueprint-steps/:id — ADMIN ONLY ────────────────────────────
router.patch("/blueprint-steps/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const params = UpdateBlueprintStepParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBlueprintStepBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.update(blueprintStepsTable).set(parsed.data).where(eq(blueprintStepsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Blueprint step not found" });
    return;
  }
  res.json(UpdateBlueprintStepResponse.parse(serialize(row)));
});

// ── DELETE /api/blueprint-steps/:id — ADMIN ONLY ───────────────────────────
router.delete("/blueprint-steps/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const params = DeleteBlueprintStepParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(blueprintStepsTable).where(eq(blueprintStepsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
