import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq } from "drizzle-orm";
import { db, toolCategoriesTable } from "@workspace/db";
import {
  ListToolCategoriesResponse,
  UpdateToolCategoryResponse,
  CreateToolCategoryBody,
  UpdateToolCategoryBody,
  UpdateToolCategoryParams,
  DeleteToolCategoryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tool-categories", async (req, res): Promise<void> => {
  const rows = await db.select().from(toolCategoriesTable).orderBy(toolCategoriesTable.name);
  res.json(ListToolCategoriesResponse.parse(serialize(rows)));
});

router.post("/tool-categories", async (req, res): Promise<void> => {
  const parsed = CreateToolCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(toolCategoriesTable).values(parsed.data).returning();
  res.status(201).json(UpdateToolCategoryResponse.parse(serialize(row)));
});

router.patch("/tool-categories/:id", async (req, res): Promise<void> => {
  const params = UpdateToolCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateToolCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.update(toolCategoriesTable).set(parsed.data).where(eq(toolCategoriesTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Tool category not found" });
    return;
  }
  res.json(UpdateToolCategoryResponse.parse(serialize(row)));
});

router.delete("/tool-categories/:id", async (req, res): Promise<void> => {
  const params = DeleteToolCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(toolCategoriesTable).where(eq(toolCategoriesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
