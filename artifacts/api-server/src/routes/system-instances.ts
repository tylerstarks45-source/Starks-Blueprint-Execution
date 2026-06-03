import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and } from "drizzle-orm";
import { db, systemInstancesTable } from "@workspace/db";
import { getActiveCallerPayload, requireAuthActive } from "../lib/auth";
import {
  ListSystemInstancesResponse,
  GetSystemInstanceResponse,
  CreateSystemInstanceBody,
  UpdateSystemInstanceBody,
  GetSystemInstanceParams,
  UpdateSystemInstanceParams,
  DeleteSystemInstanceParams,
} from "@workspace/api-zod";

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "admin"]);

const router: IRouter = Router();

router.get("/system-instances", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const isAdmin = ADMIN_ROLES.has(caller.role);
  const conditions = [];

  if (isAdmin && req.query.userId) {
    conditions.push(eq(systemInstancesTable.userId, Number(req.query.userId)));
  } else {
    conditions.push(eq(systemInstancesTable.userId, caller.id));
  }

  if (req.query.blueprintId) {
    conditions.push(eq(systemInstancesTable.blueprintId, Number(req.query.blueprintId)));
  }

  const rows = await db
    .select()
    .from(systemInstancesTable)
    .where(and(...conditions))
    .orderBy(systemInstancesTable.createdAt);

  res.json(ListSystemInstancesResponse.parse(serialize(rows)));
});

router.post("/system-instances", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const parsed = CreateSystemInstanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(systemInstancesTable)
    .values({ ...parsed.data, userId })
    .returning();
  res.status(201).json(GetSystemInstanceResponse.parse(serialize(row)));
});

router.get("/system-instances/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = GetSystemInstanceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [row] = await db
    .select()
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "System instance not found" }); return; }

  const isAdmin = ADMIN_ROLES.has(caller.role);
  if (!isAdmin && row.userId !== null && row.userId !== caller.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(GetSystemInstanceResponse.parse(serialize(row)));
});

router.patch("/system-instances/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = UpdateSystemInstanceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdateSystemInstanceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db
    .select()
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "System instance not found" }); return; }

  const isAdmin = ADMIN_ROLES.has(caller.role);
  if (!isAdmin && existing.userId !== null && existing.userId !== caller.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [row] = await db
    .update(systemInstancesTable)
    .set(parsed.data)
    .where(eq(systemInstancesTable.id, params.data.id))
    .returning();
  res.json(GetSystemInstanceResponse.parse(serialize(row)));
});

router.delete("/system-instances/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = DeleteSystemInstanceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [existing] = await db
    .select()
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "System instance not found" }); return; }

  const isAdmin = ADMIN_ROLES.has(caller.role);
  if (!isAdmin && existing.userId !== null && existing.userId !== caller.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(systemInstancesTable).where(eq(systemInstancesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
