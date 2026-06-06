import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq } from "drizzle-orm";
import { db, buildOutputsTable, buildSessionsTable, systemInstancesTable } from "@workspace/db";
import { requireAuthActive, getTokenPayload, isAdminRole } from "../lib/auth";
import {
  ListBuildOutputsResponse,
  CreateBuildOutputBody,
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

router.get("/build-outputs", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const caller = getTokenPayload(req);
  const admin = caller && isAdminRole(caller.role);

  if (!req.query.buildSessionId) {
    if (!admin) {
      res.status(400).json({ error: "buildSessionId query parameter is required" });
      return;
    }
    const rows = await db.select().from(buildOutputsTable).orderBy(buildOutputsTable.createdAt);
    res.json(ListBuildOutputsResponse.parse(serialize(rows)));
    return;
  }

  const sessionId = Number(req.query.buildSessionId);
  if (!admin && !(await verifySessionOwnership(sessionId, userId))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const rows = await db
    .select()
    .from(buildOutputsTable)
    .where(eq(buildOutputsTable.buildSessionId, sessionId))
    .orderBy(buildOutputsTable.createdAt);
  res.json(ListBuildOutputsResponse.parse(serialize(rows)));
});

router.post("/build-outputs", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const parsed = CreateBuildOutputBody.safeParse(req.body);
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
  const [row] = await db.insert(buildOutputsTable).values(parsed.data).returning();
  res.status(201).json(ListBuildOutputsResponse.element.parse(serialize(row)));
});

export default router;
