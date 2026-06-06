import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, inArray } from "drizzle-orm";
import { db, userToolSelectionsTable, systemInstancesTable } from "@workspace/db";
import { requireAuthActive, getTokenPayload, isAdminRole } from "../lib/auth";
import { z } from "zod";

const router: IRouter = Router();

async function verifySystemOwnership(systemInstanceId: number, userId: number): Promise<boolean> {
  const [sys] = await db
    .select({ userId: systemInstancesTable.userId })
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, systemInstanceId));
  return !!sys && sys.userId === userId;
}

router.get("/user-tool-selections", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const caller = getTokenPayload(req);
  const admin = caller && isAdminRole(caller.role);

  let sysIdFilter: number[] | null = null;

  if (req.query.systemInstanceId) {
    const sysId = Number(req.query.systemInstanceId);
    if (!admin && !(await verifySystemOwnership(sysId, userId))) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    sysIdFilter = [sysId];
  } else if (!admin) {
    const userSystems = await db
      .select({ id: systemInstancesTable.id })
      .from(systemInstancesTable)
      .where(eq(systemInstancesTable.userId, userId));
    const sysIds = userSystems.map((s) => s.id);
    if (sysIds.length === 0) {
      res.json([]);
      return;
    }
    sysIdFilter = sysIds;
  }

  const toolId = req.query.toolId ? Number(req.query.toolId) : null;

  const sysCondition = sysIdFilter
    ? sysIdFilter.length === 1
      ? eq(userToolSelectionsTable.systemInstanceId, sysIdFilter[0])
      : inArray(userToolSelectionsTable.systemInstanceId, sysIdFilter)
    : null;
  const toolCondition = toolId !== null ? eq(userToolSelectionsTable.toolId, toolId) : null;
  const whereClause =
    sysCondition && toolCondition
      ? and(sysCondition, toolCondition)
      : sysCondition ?? toolCondition ?? undefined;

  const rows = whereClause
    ? await db.select().from(userToolSelectionsTable).where(whereClause)
    : await db.select().from(userToolSelectionsTable);
  res.json(serialize(rows));
});

router.post("/user-tool-selections", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const schema = z.object({
    systemInstanceId: z.number().int(),
    toolId: z.number().int(),
  });
  const parsed = schema.safeParse(req.body);
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
  const [row] = await db.insert(userToolSelectionsTable).values(parsed.data).returning();
  res.status(201).json(serialize(row));
});

router.delete("/user-tool-selections/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [existing] = await db
    .select()
    .from(userToolSelectionsTable)
    .where(eq(userToolSelectionsTable.id, id));
  if (!existing) {
    res.sendStatus(204);
    return;
  }
  const caller = getTokenPayload(req);
  const admin = caller && isAdminRole(caller.role);
  if (!admin && !(await verifySystemOwnership(existing.systemInstanceId, userId))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  await db.delete(userToolSelectionsTable).where(eq(userToolSelectionsTable.id, id));
  res.sendStatus(204);
});

export default router;
