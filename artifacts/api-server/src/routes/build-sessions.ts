import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, buildSessionsTable } from "@workspace/db";
import {
  ListBuildSessionsResponse,
  GetBuildSessionResponse,
  CreateBuildSessionBody,
  UpdateBuildSessionBody,
  GetBuildSessionParams,
  UpdateBuildSessionParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/build-sessions", async (req, res): Promise<void> => {
  const rows = req.query.systemInstanceId
    ? await db.select().from(buildSessionsTable).where(eq(buildSessionsTable.systemInstanceId, Number(req.query.systemInstanceId))).orderBy(buildSessionsTable.startedAt)
    : await db.select().from(buildSessionsTable).orderBy(buildSessionsTable.startedAt);
  res.json(ListBuildSessionsResponse.parse(rows));
});

router.post("/build-sessions", async (req, res): Promise<void> => {
  const parsed = CreateBuildSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { completedAt, ...rest } = parsed.data;
  const insertData = {
    ...rest,
    ...(completedAt != null ? { completedAt: new Date(completedAt) } : {}),
  };
  const [row] = await db.insert(buildSessionsTable).values(insertData).returning();
  res.status(201).json(GetBuildSessionResponse.parse(row));
});

router.get("/build-sessions/:id", async (req, res): Promise<void> => {
  const params = GetBuildSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select().from(buildSessionsTable).where(eq(buildSessionsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Build session not found" });
    return;
  }
  res.json(GetBuildSessionResponse.parse(row));
});

router.patch("/build-sessions/:id", async (req, res): Promise<void> => {
  const params = UpdateBuildSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBuildSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { completedAt, ...rest } = parsed.data;
  const updateData = {
    ...rest,
    ...(completedAt != null ? { completedAt: new Date(completedAt) } : {}),
  };
  const [row] = await db.update(buildSessionsTable).set(updateData).where(eq(buildSessionsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Build session not found" });
    return;
  }
  res.json(GetBuildSessionResponse.parse(row));
});

export default router;
