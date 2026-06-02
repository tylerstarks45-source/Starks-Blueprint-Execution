import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and } from "drizzle-orm";
import { db, systemInstancesTable } from "@workspace/db";
import {
  ListSystemInstancesResponse,
  GetSystemInstanceResponse,
  CreateSystemInstanceBody,
  UpdateSystemInstanceBody,
  GetSystemInstanceParams,
  UpdateSystemInstanceParams,
  DeleteSystemInstanceParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/system-instances", async (req, res): Promise<void> => {
  const conditions = [];
  if (req.query.userId) conditions.push(eq(systemInstancesTable.userId, Number(req.query.userId)));
  if (req.query.blueprintId) conditions.push(eq(systemInstancesTable.blueprintId, Number(req.query.blueprintId)));

  const rows = conditions.length
    ? await db.select().from(systemInstancesTable).where(and(...conditions)).orderBy(systemInstancesTable.createdAt)
    : await db.select().from(systemInstancesTable).orderBy(systemInstancesTable.createdAt);

  res.json(ListSystemInstancesResponse.parse(serialize(rows)));
});

router.post("/system-instances", async (req, res): Promise<void> => {
  const parsed = CreateSystemInstanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(systemInstancesTable).values(parsed.data).returning();
  res.status(201).json(GetSystemInstanceResponse.parse(serialize(row)));
});

router.get("/system-instances/:id", async (req, res): Promise<void> => {
  const params = GetSystemInstanceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select().from(systemInstancesTable).where(eq(systemInstancesTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "System instance not found" });
    return;
  }
  res.json(GetSystemInstanceResponse.parse(serialize(row)));
});

router.patch("/system-instances/:id", async (req, res): Promise<void> => {
  const params = UpdateSystemInstanceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateSystemInstanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.update(systemInstancesTable).set(parsed.data).where(eq(systemInstancesTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "System instance not found" });
    return;
  }
  res.json(GetSystemInstanceResponse.parse(serialize(row)));
});

router.delete("/system-instances/:id", async (req, res): Promise<void> => {
  const params = DeleteSystemInstanceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(systemInstancesTable).where(eq(systemInstancesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
