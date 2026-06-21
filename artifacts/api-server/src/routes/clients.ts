import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { db, clientWorkspacesTable, systemInstancesTable, systemActivityEventsTable, userCredentialsTable, usersTable } from "@workspace/db";
import { getActiveCallerPayload, isAdminRole } from "../lib/auth";
import { z } from "zod/v4";
import crypto from "crypto";

const router: IRouter = Router();

// Tier limits for agency workspaces
const AGENCY_TIERS = new Set(["operator", "empire", "pro", "enterprise"]);
const WORKSPACE_LIMITS: Record<string, number> = {
  operator:   10,
  pro:        10,
  empire:     9999,
  enterprise: 9999,
};

function generatePortalToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

const CreateWorkspaceBody = z.object({
  name:    z.string().min(1).max(100),
  logoUrl: z.string().url().optional().nullable(),
  notes:   z.string().max(500).optional().nullable(),
});

const UpdateWorkspaceBody = z.object({
  name:    z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().optional().nullable(),
  notes:   z.string().max(500).optional().nullable(),
});

const WorkspaceIdParam = z.object({ id: z.coerce.number().int().positive() });

// ── GET /api/clients ──────────────────────────────────────────────────────────
router.get("/clients", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const rows = await db
    .select()
    .from(clientWorkspacesTable)
    .where(eq(clientWorkspacesTable.agencyUserId, caller.id))
    .orderBy(clientWorkspacesTable.name);

  res.json(serialize(rows));
});

// ── POST /api/clients ─────────────────────────────────────────────────────────
router.post("/clients", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  // Tier check (admins bypass)
  if (!isAdminRole(caller.role)) {
    const [userRow] = await db
      .select({ membershipTier: usersTable.membershipTier })
      .from(usersTable)
      .where(eq(usersTable.id, caller.id));

    const tier = userRow?.membershipTier ?? "free";
    if (!AGENCY_TIERS.has(tier)) {
      res.status(403).json({
        error: "Client workspaces require an Operator plan or higher.",
        code: "tier_required",
        requiredTier: "operator",
      });
      return;
    }

    const limit = WORKSPACE_LIMITS[tier] ?? 10;
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(clientWorkspacesTable)
      .where(eq(clientWorkspacesTable.agencyUserId, caller.id));

    if (total >= limit) {
      res.status(403).json({
        error: `Your plan allows a maximum of ${limit} client workspace${limit === 1 ? "" : "s"}.`,
        code: "workspace_limit_reached",
        limit,
        current: total,
      });
      return;
    }
  }

  const parsed = CreateWorkspaceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .insert(clientWorkspacesTable)
    .values({
      agencyUserId: caller.id,
      name:         parsed.data.name,
      logoUrl:      parsed.data.logoUrl ?? null,
      notes:        parsed.data.notes ?? null,
      portalToken:  generatePortalToken(),
    })
    .returning();

  res.status(201).json(serialize(row));
});

// ── GET /api/clients/:id ──────────────────────────────────────────────────────
router.get("/clients/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = WorkspaceIdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select()
    .from(clientWorkspacesTable)
    .where(eq(clientWorkspacesTable.id, params.data.id));

  if (!row) { res.status(404).json({ error: "Client workspace not found" }); return; }

  if (!isAdminRole(caller.role) && row.agencyUserId !== caller.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(serialize(row));
});

// ── PATCH /api/clients/:id ────────────────────────────────────────────────────
router.patch("/clients/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = WorkspaceIdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db
    .select()
    .from(clientWorkspacesTable)
    .where(eq(clientWorkspacesTable.id, params.data.id));

  if (!existing) { res.status(404).json({ error: "Client workspace not found" }); return; }
  if (!isAdminRole(caller.role) && existing.agencyUserId !== caller.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const parsed = UpdateWorkspaceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name    !== undefined) updateData.name    = parsed.data.name;
  if (parsed.data.logoUrl !== undefined) updateData.logoUrl = parsed.data.logoUrl;
  if (parsed.data.notes   !== undefined) updateData.notes   = parsed.data.notes;

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "No updatable fields provided" });
    return;
  }

  const [row] = await db
    .update(clientWorkspacesTable)
    .set(updateData)
    .where(eq(clientWorkspacesTable.id, params.data.id))
    .returning();

  res.json(serialize(row));
});

// ── DELETE /api/clients/:id ───────────────────────────────────────────────────
router.delete("/clients/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = WorkspaceIdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db
    .select()
    .from(clientWorkspacesTable)
    .where(eq(clientWorkspacesTable.id, params.data.id));

  if (!existing) { res.status(404).json({ error: "Client workspace not found" }); return; }
  if (!isAdminRole(caller.role) && existing.agencyUserId !== caller.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  await db.delete(clientWorkspacesTable).where(eq(clientWorkspacesTable.id, params.data.id));
  res.sendStatus(204);
});

// ── GET /api/clients/:id/overview ─────────────────────────────────────────────
// Returns systems count, total revenue, credentials count, and last activity.
router.get("/clients/:id/overview", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = WorkspaceIdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [workspace] = await db
    .select()
    .from(clientWorkspacesTable)
    .where(eq(clientWorkspacesTable.id, params.data.id));

  if (!workspace) { res.status(404).json({ error: "Client workspace not found" }); return; }
  if (!isAdminRole(caller.role) && workspace.agencyUserId !== caller.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const [systemsRow, credsRow, revenueRow, lastActivityRow] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(systemInstancesTable)
      .where(and(
        eq(systemInstancesTable.userId, caller.id),
        eq(systemInstancesTable.clientWorkspaceId, params.data.id),
      )),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(userCredentialsTable)
      .where(and(
        eq(userCredentialsTable.userId, caller.id),
        eq(userCredentialsTable.clientWorkspaceId, params.data.id),
      )),
    db
      .select({ totalCents: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)` })
      .from(systemActivityEventsTable)
      .innerJoin(
        systemInstancesTable,
        and(
          eq(systemActivityEventsTable.systemInstanceId, systemInstancesTable.id),
          eq(systemInstancesTable.clientWorkspaceId, params.data.id),
          eq(systemInstancesTable.userId, caller.id),
        ),
      )
      .where(eq(systemActivityEventsTable.eventType, "revenue")),
    db
      .select({ lastAt: systemActivityEventsTable.createdAt })
      .from(systemActivityEventsTable)
      .innerJoin(
        systemInstancesTable,
        and(
          eq(systemActivityEventsTable.systemInstanceId, systemInstancesTable.id),
          eq(systemInstancesTable.clientWorkspaceId, params.data.id),
          eq(systemInstancesTable.userId, caller.id),
        ),
      )
      .orderBy(desc(systemActivityEventsTable.createdAt))
      .limit(1),
  ]);

  res.json(serialize({
    workspaceId:       params.data.id,
    systemsCount:      systemsRow[0]?.total ?? 0,
    credentialsCount:  credsRow[0]?.total ?? 0,
    totalRevenueCents: Number(revenueRow[0]?.totalCents ?? 0),
    lastActivityAt:    lastActivityRow[0]?.lastAt ?? null,
  }));
});

// ── POST /api/clients/:id/portal-invite ───────────────────────────────────────
// Regenerates the portal token and returns the portal URL.
router.post("/clients/:id/portal-invite", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = WorkspaceIdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db
    .select()
    .from(clientWorkspacesTable)
    .where(eq(clientWorkspacesTable.id, params.data.id));

  if (!existing) { res.status(404).json({ error: "Client workspace not found" }); return; }
  if (!isAdminRole(caller.role) && existing.agencyUserId !== caller.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const newToken = generatePortalToken();
  await db
    .update(clientWorkspacesTable)
    .set({ portalToken: newToken })
    .where(eq(clientWorkspacesTable.id, params.data.id));

  const domain = process.env["REPLIT_DOMAINS"]?.split(",")[0];
  const baseUrl = domain ? `https://${domain}` : "http://localhost:80";

  res.json({ portalToken: newToken, portalUrl: `${baseUrl}/portal/${newToken}` });
});

// ── GET /api/portal/:token ────────────────────────────────────────────────────
// Public read-only endpoint — no auth required.
// Returns workspace name + systems list for client portal.
router.get("/portal/:token", async (req, res): Promise<void> => {
  const { token } = req.params;
  if (!token) { res.status(400).json({ error: "Missing token" }); return; }

  const [workspace] = await db
    .select()
    .from(clientWorkspacesTable)
    .where(eq(clientWorkspacesTable.portalToken, token));

  if (!workspace) { res.status(404).json({ error: "Portal not found or link has expired" }); return; }

  // Fetch the agency user's name for display
  const [agencyUser] = await db
    .select({ name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, workspace.agencyUserId));

  // Fetch systems for this workspace (no sensitive data)
  const systems = await db
    .select({
      id:          systemInstancesTable.id,
      name:        systemInstancesTable.name,
      buildStatus: systemInstancesTable.buildStatus,
      healthStatus: systemInstancesTable.healthStatus,
      createdAt:   systemInstancesTable.createdAt,
      updatedAt:   systemInstancesTable.updatedAt,
    })
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.clientWorkspaceId, workspace.id))
    .orderBy(desc(systemInstancesTable.updatedAt));

  // Revenue per system
  const systemIds = systems.map(s => s.id);
  let revenueMap: Record<number, number> = {};
  if (systemIds.length > 0) {
    const { inArray } = await import("drizzle-orm");
    const revenueRows = await db
      .select({
        systemInstanceId: systemActivityEventsTable.systemInstanceId,
        totalCents: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)`,
      })
      .from(systemActivityEventsTable)
      .where(and(
        inArray(systemActivityEventsTable.systemInstanceId, systemIds),
        eq(systemActivityEventsTable.eventType, "revenue"),
      ))
      .groupBy(systemActivityEventsTable.systemInstanceId);

    for (const r of revenueRows) {
      if (r.systemInstanceId !== null) revenueMap[r.systemInstanceId] = Number(r.totalCents);
    }
  }

  res.json(serialize({
    workspace: {
      id:      workspace.id,
      name:    workspace.name,
      logoUrl: workspace.logoUrl,
    },
    agencyUserId: workspace.agencyUserId,
    agencyName: agencyUser?.name || agencyUser?.email || "Agency",
    systems: systems.map(s => ({
      ...s,
      lifetimeRevenueCents: revenueMap[s.id] ?? 0,
    })),
  }));
});

export default router;
