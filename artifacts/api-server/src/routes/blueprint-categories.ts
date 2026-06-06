import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq } from "drizzle-orm";
import { db, blueprintCategoriesTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import {
  ListBlueprintCategoriesResponse,
  GetBlueprintCategoryResponse,
  CreateBlueprintCategoryBody,
  UpdateBlueprintCategoryBody,
  GetBlueprintCategoryParams,
  UpdateBlueprintCategoryParams,
  DeleteBlueprintCategoryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ── GET /api/blueprint-categories ──────────────────────────────────────────
// Public read — category list is needed for the public marketplace UI.
router.get("/blueprint-categories", async (req, res): Promise<void> => {
  const rows = await db.select().from(blueprintCategoriesTable).orderBy(blueprintCategoriesTable.name);
  res.json(ListBlueprintCategoriesResponse.parse(serialize(rows)));
});

// ── POST /api/blueprint-categories — ADMIN ONLY ────────────────────────────
router.post("/blueprint-categories", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const parsed = CreateBlueprintCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(blueprintCategoriesTable).values(parsed.data).returning();
  res.status(201).json(GetBlueprintCategoryResponse.parse(serialize(row)));
});

// ── GET /api/blueprint-categories/:id ──────────────────────────────────────
// Public read.
router.get("/blueprint-categories/:id", async (req, res): Promise<void> => {
  const params = GetBlueprintCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select().from(blueprintCategoriesTable).where(eq(blueprintCategoriesTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Blueprint category not found" });
    return;
  }
  res.json(GetBlueprintCategoryResponse.parse(serialize(row)));
});

// ── PATCH /api/blueprint-categories/:id — ADMIN ONLY ───────────────────────
router.patch("/blueprint-categories/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const params = UpdateBlueprintCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBlueprintCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.update(blueprintCategoriesTable).set(parsed.data).where(eq(blueprintCategoriesTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Blueprint category not found" });
    return;
  }
  res.json(GetBlueprintCategoryResponse.parse(serialize(row)));
});

// ── DELETE /api/blueprint-categories/:id — ADMIN ONLY ──────────────────────
router.delete("/blueprint-categories/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const params = DeleteBlueprintCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(blueprintCategoriesTable).where(eq(blueprintCategoriesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
