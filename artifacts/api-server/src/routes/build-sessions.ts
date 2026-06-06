import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, inArray } from "drizzle-orm";
import { db, buildSessionsTable, systemInstancesTable } from "@workspace/db";
import { requireAuthActive, getTokenPayload, isAdminRole } from "../lib/auth";
import {
  ListBuildSessionsResponse,
  GetBuildSessionResponse,
  CreateBuildSessionBody,
  UpdateBuildSessionBody,
  GetBuildSessionParams,
  UpdateBuildSessionParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function verifySystemOwnership(systemInstanceId: number, userId: number): Promise<boolean> {
  const [sys] = await db
    .select({ userId: systemInstancesTable.userId })
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, systemInstanceId));
  return !!sys && sys.userId === userId;
}

router.get("/build-sessions", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const caller = getTokenPayload(req);
  const admin = caller && isAdminRole(caller.role);

  if (req.query.systemInstanceId) {
    const sysId = Number(req.query.systemInstanceId);
    if (!admin && !(await verifySystemOwnership(sysId, userId))) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    const rows = await db
      .select()
      .from(buildSessionsTable)
      .where(eq(buildSessionsTable.systemInstanceId, sysId))
      .orderBy(buildSessionsTable.startedAt);
    res.json(ListBuildSessionsResponse.parse(serialize(rows)));
    return;
  }

  if (admin) {
    const rows = await db.select().from(buildSessionsTable).orderBy(buildSessionsTable.startedAt);
    res.json(ListBuildSessionsResponse.parse(serialize(rows)));
    return;
  }

  const userSystems = await db
    .select({ id: systemInstancesTable.id })
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.userId, userId));
  const sysIds = userSystems.map((s) => s.id);
  if (sysIds.length === 0) {
    res.json(ListBuildSessionsResponse.parse([]));
    return;
  }
  const rows = await db
    .select()
    .from(buildSessionsTable)
    .where(inArray(buildSessionsTable.systemInstanceId, sysIds))
    .orderBy(buildSessionsTable.startedAt);
  res.json(ListBuildSessionsResponse.parse(serialize(rows)));
});

router.post("/build-sessions", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const parsed = CreateBuildSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const caller = getTokenPayload(req);
  const admin = caller && isAdminRole(caller.role);
  if (!admin && !(await verifySystemOwnership(parsed.data.systemInstanceId, userId))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const { completedAt, ...rest } = parsed.data;
  const insertData = {
    ...rest,
    ...(completedAt != null ? { completedAt: new Date(completedAt) } : {}),
  };
  const [row] = await db.insert(buildSessionsTable).values(insertData).returning();
  res.status(201).json(GetBuildSessionResponse.parse(serialize(row)));
});

router.get("/build-sessions/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const params = GetBuildSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(buildSessionsTable)
    .where(eq(buildSessionsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Build session not found" });
    return;
  }
  const caller = getTokenPayload(req);
  const admin = caller && isAdminRole(caller.role);
  if (!admin && !(await verifySystemOwnership(row.systemInstanceId, userId))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  res.json(GetBuildSessionResponse.parse(serialize(row)));
});

router.patch("/build-sessions/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
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
  const [existing] = await db
    .select()
    .from(buildSessionsTable)
    .where(eq(buildSessionsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Build session not found" });
    return;
  }
  const caller = getTokenPayload(req);
  const admin = caller && isAdminRole(caller.role);
  if (!admin && !(await verifySystemOwnership(existing.systemInstanceId, userId))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const { completedAt, ...rest } = parsed.data;
  const updateData = {
    ...rest,
    ...(completedAt != null ? { completedAt: new Date(completedAt) } : {}),
  };
  const [row] = await db
    .update(buildSessionsTable)
    .set(updateData)
    .where(eq(buildSessionsTable.id, params.data.id))
    .returning();
  res.json(GetBuildSessionResponse.parse(serialize(row)));
});

export default router;
