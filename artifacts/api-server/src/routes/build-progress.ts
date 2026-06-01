import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, buildProgressTable } from "@workspace/db";
import {
  ListBuildProgressResponse,
  UpdateBuildProgressResponse,
  CreateBuildProgressBody,
  UpdateBuildProgressBody,
  UpdateBuildProgressParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/build-progress", async (req, res): Promise<void> => {
  const rows = req.query.buildSessionId
    ? await db.select().from(buildProgressTable).where(eq(buildProgressTable.buildSessionId, Number(req.query.buildSessionId))).orderBy(buildProgressTable.stepNumber)
    : await db.select().from(buildProgressTable).orderBy(buildProgressTable.stepNumber);
  res.json(ListBuildProgressResponse.parse(rows));
});

router.post("/build-progress", async (req, res): Promise<void> => {
  const parsed = CreateBuildProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { completedAt, ...rest } = parsed.data;
  const insertData = {
    ...rest,
    ...(completedAt != null ? { completedAt: new Date(completedAt) } : {}),
  };
  const [row] = await db.insert(buildProgressTable).values(insertData).returning();
  res.status(201).json(UpdateBuildProgressResponse.parse(row));
});

router.patch("/build-progress/:id", async (req, res): Promise<void> => {
  const params = UpdateBuildProgressParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBuildProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { completedAt, ...rest } = parsed.data;
  const updateData = {
    ...rest,
    ...(completedAt != null ? { completedAt: new Date(completedAt) } : {}),
  };
  const [row] = await db.update(buildProgressTable).set(updateData).where(eq(buildProgressTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Build progress record not found" });
    return;
  }
  res.json(UpdateBuildProgressResponse.parse(row));
});

export default router;
