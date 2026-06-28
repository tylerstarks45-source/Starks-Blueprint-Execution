import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, isNull } from "drizzle-orm";
import { db, userMemoryTable } from "@workspace/db";
import { requireAuthActive, getTokenPayload, isAdminRole } from "../lib/auth";
import {
  ListUserMemoryResponse,
  UpsertUserMemoryResponse,
  UpsertUserMemoryBody,
  UpdateUserMemoryBody,
  UpdateUserMemoryParams,
  UpdateUserMemoryResponse,
  DeleteUserMemoryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/user-memory", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const caller = getTokenPayload(req);
  const admin = caller && isAdminRole(caller.role);

  if (!req.query.userId) {
    res.status(400).json({ error: "userId query parameter is required" });
    return;
  }
  const targetUserId = Number(req.query.userId);
  if (!admin && targetUserId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const conditions = [eq(userMemoryTable.userId, targetUserId)];
  if (req.query.systemInstanceId) {
    conditions.push(eq(userMemoryTable.systemInstanceId, Number(req.query.systemInstanceId)));
  }
  const rows = await db
    .select()
    .from(userMemoryTable)
    .where(and(...conditions))
    .orderBy(userMemoryTable.memoryKey);
  res.json(ListUserMemoryResponse.parse(serialize(rows)));
});

router.post("/user-memory", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const parsed = UpsertUserMemoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const caller = getTokenPayload(req);
  const admin = caller && isAdminRole(caller.role);
  if (!admin && parsed.data.userId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { userId: memUserId, systemInstanceId, memoryKey, memoryValue } = parsed.data;
  const conditions = [eq(userMemoryTable.userId, memUserId), eq(userMemoryTable.memoryKey, memoryKey)];
  if (systemInstanceId != null) {
    conditions.push(eq(userMemoryTable.systemInstanceId, systemInstanceId));
  } else {
    conditions.push(isNull(userMemoryTable.systemInstanceId));
  }
  const [existing] = await db.select().from(userMemoryTable).where(and(...conditions));

  let row;
  if (existing) {
    [row] = await db
      .update(userMemoryTable)
      .set({ memoryValue })
      .where(eq(userMemoryTable.id, existing.id))
      .returning();
  } else {
    [row] = await db.insert(userMemoryTable).values(parsed.data).returning();
  }
  res.json(UpsertUserMemoryResponse.parse(serialize(row)));
});

router.put("/user-memory/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const params = UpdateUserMemoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateUserMemoryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(userMemoryTable)
    .where(eq(userMemoryTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const caller = getTokenPayload(req);
  const admin = caller && isAdminRole(caller.role);
  if (!admin && existing.userId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const [updated] = await db
    .update(userMemoryTable)
    .set({ memoryKey: body.data.memoryKey, memoryValue: body.data.memoryValue })
    .where(eq(userMemoryTable.id, params.data.id))
    .returning();
  res.json(UpdateUserMemoryResponse.parse(serialize(updated)));
});

router.delete("/user-memory/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const params = DeleteUserMemoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(userMemoryTable)
    .where(eq(userMemoryTable.id, params.data.id));
  if (!existing) {
    res.sendStatus(204);
    return;
  }
  const caller = getTokenPayload(req);
  const admin = caller && isAdminRole(caller.role);
  if (!admin && existing.userId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  await db.delete(userMemoryTable).where(eq(userMemoryTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
