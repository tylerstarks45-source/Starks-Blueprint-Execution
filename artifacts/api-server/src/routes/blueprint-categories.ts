import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, blueprintCategoriesTable } from "@workspace/db";
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

router.get("/blueprint-categories", async (req, res): Promise<void> => {
  const rows = await db.select().from(blueprintCategoriesTable).orderBy(blueprintCategoriesTable.name);
  res.json(ListBlueprintCategoriesResponse.parse(rows));
});

router.post("/blueprint-categories", async (req, res): Promise<void> => {
  const parsed = CreateBlueprintCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(blueprintCategoriesTable).values(parsed.data).returning();
  res.status(201).json(GetBlueprintCategoryResponse.parse(row));
});

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
  res.json(GetBlueprintCategoryResponse.parse(row));
});

router.patch("/blueprint-categories/:id", async (req, res): Promise<void> => {
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
  res.json(GetBlueprintCategoryResponse.parse(row));
});

router.delete("/blueprint-categories/:id", async (req, res): Promise<void> => {
  const params = DeleteBlueprintCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(blueprintCategoriesTable).where(eq(blueprintCategoriesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
