import { Router, type IRouter } from "express";
import { desc, sql, eq } from "drizzle-orm";
import {
  db,
  adminUsersTable,
  adminActivityTable,
  systemHealthTable,
  usersTable,
  blueprintsTable,
  toolsTable,
  systemInstancesTable,
  affiliateLinksTable,
  openrouterUsageTable,
} from "@workspace/db";
import {
  ListAdminUsersResponse,
  CreateAdminUserBody,
  ListAdminActivityResponse,
  CreateAdminActivityBody,
  ListSystemHealthResponse,
  RecordSystemHealthBody,
  GetAdminDashboardResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/admin/users", async (req, res): Promise<void> => {
  const rows = await db.select().from(adminUsersTable).orderBy(adminUsersTable.createdAt);
  res.json(ListAdminUsersResponse.parse(rows));
});

router.post("/admin/users", async (req, res): Promise<void> => {
  const parsed = CreateAdminUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(adminUsersTable).values(parsed.data).returning();
  res.status(201).json(ListAdminUsersResponse.element.parse(row));
});

router.get("/admin/activity", async (req, res): Promise<void> => {
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  let query = db.select().from(adminActivityTable).orderBy(desc(adminActivityTable.createdAt)).limit(limit);

  if (req.query.adminId) {
    query = db
      .select()
      .from(adminActivityTable)
      .where(eq(adminActivityTable.adminId, Number(req.query.adminId)))
      .orderBy(desc(adminActivityTable.createdAt))
      .limit(limit) as typeof query;
  }

  const rows = await query;
  res.json(ListAdminActivityResponse.parse(rows));
});

router.post("/admin/activity", async (req, res): Promise<void> => {
  const parsed = CreateAdminActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(adminActivityTable).values(parsed.data).returning();
  res.status(201).json(ListAdminActivityResponse.element.parse(row));
});

router.get("/admin/system-health", async (req, res): Promise<void> => {
  const rows = await db.select().from(systemHealthTable).orderBy(desc(systemHealthTable.checkedAt)).limit(100);
  res.json(ListSystemHealthResponse.parse(rows));
});

router.post("/admin/system-health", async (req, res): Promise<void> => {
  const parsed = RecordSystemHealthBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(systemHealthTable).values(parsed.data).returning();
  res.status(201).json(ListSystemHealthResponse.element.parse(row));
});

router.get("/admin/dashboard", async (req, res): Promise<void> => {
  const [
    [userCount],
    [blueprintCount],
    [toolCount],
    [instanceCount],
    [activeInstanceCount],
    [clickSum],
    [tokenSum],
    recentActivity,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(usersTable),
    db.select({ count: sql<number>`count(*)::int` }).from(blueprintsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(toolsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(systemInstancesTable),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(systemInstancesTable)
      .where(eq(systemInstancesTable.buildStatus, "active")),
    db
      .select({ total: sql<number>`coalesce(sum(${affiliateLinksTable.clickCount}), 0)::int` })
      .from(affiliateLinksTable),
    db
      .select({ total: sql<number>`coalesce(sum(${openrouterUsageTable.totalTokens}), 0)::int` })
      .from(openrouterUsageTable),
    db.select().from(adminActivityTable).orderBy(desc(adminActivityTable.createdAt)).limit(10),
  ]);

  res.json(
    GetAdminDashboardResponse.parse({
      totalUsers: userCount.count,
      totalBlueprints: blueprintCount.count,
      totalTools: toolCount.count,
      totalSystemInstances: instanceCount.count,
      activeSystemInstances: activeInstanceCount.count,
      totalAffiliateClicks: clickSum.total,
      openrouterTotalTokens: tokenSum.total,
      recentActivity,
    }),
  );
});

export default router;
