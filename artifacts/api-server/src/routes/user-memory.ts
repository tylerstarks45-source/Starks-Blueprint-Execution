import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, userMemoryTable } from "@workspace/db";
import {
  ListUserMemoryResponse,
  UpsertUserMemoryResponse,
  UpsertUserMemoryBody,
  DeleteUserMemoryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/user-memory", async (req, res): Promise<void> => {
  if (!req.query.userId) {
    res.status(400).json({ error: "userId query parameter is required" });
    return;
  }
  const conditions = [eq(userMemoryTable.userId, Number(req.query.userId))];
  if (req.query.systemInstanceId) conditions.push(eq(userMemoryTable.systemInstanceId, Number(req.query.systemInstanceId)));

  const rows = await db.select().from(userMemoryTable).where(and(...conditions)).orderBy(userMemoryTable.memoryKey);
  res.json(ListUserMemoryResponse.parse(rows));
});

router.post("/user-memory", async (req, res): Promise<void> => {
  const parsed = UpsertUserMemoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId, systemInstanceId, memoryKey, memoryValue } = parsed.data;

  const conditions = [eq(userMemoryTable.userId, userId), eq(userMemoryTable.memoryKey, memoryKey)];
  if (systemInstanceId != null) conditions.push(eq(userMemoryTable.systemInstanceId, systemInstanceId));

  const [existing] = await db.select().from(userMemoryTable).where(and(...conditions));

  let row;
  if (existing) {
    [row] = await db.update(userMemoryTable).set({ memoryValue }).where(eq(userMemoryTable.id, existing.id)).returning();
  } else {
    [row] = await db.insert(userMemoryTable).values(parsed.data).returning();
  }

  res.json(UpsertUserMemoryResponse.parse(row));
});

router.delete("/user-memory/:id", async (req, res): Promise<void> => {
  const params = DeleteUserMemoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(userMemoryTable).where(eq(userMemoryTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
