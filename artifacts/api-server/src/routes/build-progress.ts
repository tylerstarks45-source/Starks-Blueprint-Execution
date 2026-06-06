import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq } from "drizzle-orm";
import { db, buildProgressTable, buildSessionsTable, systemInstancesTable } from "@workspace/db";
import { requireAuthActive, getTokenPayload, isAdminRole } from "../lib/auth";
import {
  ListBuildProgressResponse,
  UpdateBuildProgressResponse,
  CreateBuildProgressBody,
  UpdateBuildProgressBody,
  UpdateBuildProgressParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function verifySessionOwnership(buildSessionId: number, userId: number): Promise<boolean> {
  const [row] = await db
    .select({ ownerUserId: systemInstancesTable.userId })
    .from(buildSessionsTable)
    .innerJoin(
      systemInstancesTable,
      eq(buildSessionsTable.systemInstanceId, systemInstancesTable.id),
    )
    .where(eq(buildSessionsTable.id, buildSessionId));
  return !!row && row.ownerUserId === userId;
}

async function verifyProgressOwnership(progressId: number, userId: number): Promise<boolean> {
  const [row] = await db
    .select({ ownerUserId: systemInstancesTable.userId })
    .from(buildProgressTable)
    .innerJoin(buildSessionsTable, eq(buildProgressTable.buildSessionId, buildSessionsTable.id))
    .innerJoin(
      systemInstancesTable,
      eq(buildSessionsTable.systemInstanceId, systemInstancesTable.id),
    )
    .where(eq(buildProgressTable.id, progressId));
  return !!row && row.ownerUserId === userId;
}

router.get("/build-progress", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const caller = getTokenPayload(req);
  const admin = caller && isAdminRole(caller.role);

  if (!req.query.buildSessionId) {
    if (!admin) {
      res.status(400).json({ error: "buildSessionId query parameter is required" });
      return;
    }
    const rows = await db.select().from(buildProgressTable).orderBy(buildProgressTable.stepNumber);
    res.json(ListBuildProgressResponse.parse(serialize(rows)));
    return;
  }

  const sessionId = Number(req.query.buildSessionId);
  if (!admin && !(await verifySessionOwnership(sessionId, userId))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const rows = await db
    .select()
    .from(buildProgressTable)
    .where(eq(buildProgressTable.buildSessionId, sessionId))
    .orderBy(buildProgressTable.stepNumber);
  res.json(ListBuildProgressResponse.parse(serialize(rows)));
});

router.post("/build-progress", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const parsed = CreateBuildProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const caller = getTokenPayload(req);
  const admin = caller && isAdminRole(caller.role);
  if (!admin && !(await verifySessionOwnership(parsed.data.buildSessionId, userId))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const { completedAt, ...rest } = parsed.data;
  const insertData = {
    ...rest,
    ...(completedAt != null ? { completedAt: new Date(completedAt) } : {}),
  };
  const [row] = await db.insert(buildProgressTable).values(insertData).returning();
  res.status(201).json(UpdateBuildProgressResponse.parse(serialize(row)));
});

router.patch("/build-progress/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
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
  const caller = getTokenPayload(req);
  const admin = caller && isAdminRole(caller.role);
  if (!admin && !(await verifyProgressOwnership(params.data.id, userId))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const { completedAt, ...rest } = parsed.data;
  const updateData = {
    ...rest,
    ...(completedAt != null ? { completedAt: new Date(completedAt) } : {}),
  };
  const [row] = await db
    .update(buildProgressTable)
    .set(updateData)
    .where(eq(buildProgressTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Build progress record not found" });
    return;
  }
  res.json(UpdateBuildProgressResponse.parse(serialize(row)));
});

export default router;
