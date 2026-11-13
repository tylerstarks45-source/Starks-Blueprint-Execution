import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  db,
  businessesTable,
  businessConnectionsTable,
  businessHealthScoresTable,
  businessOperationsSettingsTable,
  systemActivityEventsTable,
  userCredentialsTable,
  revenueStreams,
  canonicalAssets,
  DEFAULT_OPERATIONS_PERMISSIONS,
} from "@workspace/db";
import { getActiveCallerPayload, validateClientWorkspaceId } from "../lib/auth";
import { requireOperationsTier } from "../lib/operations-gate";
import { enqueue } from "../lib/runtime/jobs";
import { logger } from "../lib/logger";
import { publishBusinessEvent } from "../lib/business-intelligence";
import { afterBusinessCreated } from "../lib/empire/after-create";
import {
  ListBusinessesResponse,
  CreateBusinessBody,
  GetBusinessParams,
  GetBusinessResponse,
  UpdateBusinessParams,
  UpdateBusinessBody,
  UpdateBusinessResponse,
  DeleteBusinessParams,
  GetBusinessOverviewParams,
  GetBusinessOverviewResponse,
  AddBusinessConnectionParams,
  AddBusinessConnectionBody,
  GetBusinessOperationsSettingsParams,
  GetBusinessOperationsSettingsResponse,
  UpdateBusinessOperationsSettingsParams,
  UpdateBusinessOperationsSettingsBody,
  UpdateBusinessOperationsSettingsResponse,
} from "@workspace/api-zod";

function healthStatusFromScore(score: number | null | undefined): "healthy" | "needs_attention" | "at_risk" | null {
  if (score == null) return null;
  if (score >= 70) return "healthy";
  if (score >= 40) return "needs_attention";
  return "at_risk";
}

const router: IRouter = Router();

// ─── GET /api/businesses ─────────────────────────────────────────────────────

router.get("/businesses", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const conditions = [eq(businessesTable.ownerId, caller.id)];

  const workspaceId = await validateClientWorkspaceId(req, caller.id);
  if (workspaceId !== null) {
    conditions.push(eq(businessesTable.clientWorkspaceId, workspaceId));
  }

  if (req.query.origin === "built" || req.query.origin === "imported") {
    conditions.push(eq(businessesTable.origin, req.query.origin));
  }

  const rows = await db
    .select()
    .from(businessesTable)
    .where(and(...conditions))
    .orderBy(desc(businessesTable.updatedAt));

  res.json(ListBusinessesResponse.parse(serialize(rows)));
});

// ─── POST /api/businesses ────────────────────────────────────────────────────

router.post("/businesses", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const parsed = CreateBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const clientWorkspaceId = await validateClientWorkspaceId(req, caller.id);

  // The user-facing create flow only produces imported businesses. `origin`
  // and `systemInstanceId` are internal-only (managed by ensureBuiltBusiness/
  // backfillBuiltBusinesses); never trust them from client input, otherwise a
  // caller could attach a business to another user's system instance (IDOR).
  const { systemInstanceId: _ignoredSystemInstanceId, origin: _ignoredOrigin, ...safeData } = parsed.data;

  const [row] = await db
    .insert(businessesTable)
    .values({
      ...safeData,
      ownerId: caller.id,
      origin: "imported",
      ...(clientWorkspaceId !== null ? { clientWorkspaceId } : {}),
    })
    .returning();

  afterBusinessCreated(row, caller.id);

  res.status(201).json(UpdateBusinessResponse.parse(serialize(row)));
});

// ─── GET /api/businesses/:id ─────────────────────────────────────────────────

router.get("/businesses/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = GetBusinessParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(and(eq(businessesTable.id, params.data.id), eq(businessesTable.ownerId, caller.id)));

  if (!business) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const connections = await db
    .select()
    .from(businessConnectionsTable)
    .where(eq(businessConnectionsTable.businessId, business.id))
    .orderBy(desc(businessConnectionsTable.createdAt));

  res.json(GetBusinessResponse.parse(serialize({ ...business, connections })));
});

// ─── PATCH /api/businesses/:id ────────────────────────────────────────────────

router.patch("/businesses/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = UpdateBusinessParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateBusinessBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db
    .select({ ownerId: businessesTable.ownerId })
    .from(businessesTable)
    .where(eq(businessesTable.id, params.data.id));

  if (!existing || existing.ownerId !== caller.id) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  // `systemInstanceId` is internal-only; never let a client rewrite the
  // built/imported linkage via PATCH (IDOR / integrity).
  const { systemInstanceId: _ignoredSystemInstanceId, ...safeUpdate } = body.data;

  const [row] = await db
    .update(businessesTable)
    .set({ ...safeUpdate, updatedAt: new Date() })
    .where(eq(businessesTable.id, params.data.id))
    .returning();
  publishBusinessEvent({
    businessId: row.id,
    eventType: "business.updated",
    source: "businesses_route",
    payload: { description: `Business "${row.name}" was updated.`, relatedObjects: { businessId: row.id } },
    dedupeKey: `business.updated:${row.id}:${row.updatedAt.getTime()}`,
  }).catch((err) => logger.warn({ err, businessId: row.id }, "Business Intelligence: business update event failed (non-fatal)"));

  res.json(UpdateBusinessResponse.parse(serialize(row)));
});

// ─── DELETE /api/businesses/:id ───────────────────────────────────────────────

router.delete("/businesses/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = DeleteBusinessParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select({ ownerId: businessesTable.ownerId })
    .from(businessesTable)
    .where(eq(businessesTable.id, params.data.id));

  if (!existing || existing.ownerId !== caller.id) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db.transaction(async (tx) => {
    // revenue_streams and canonical_assets have no FK to businesses: drop the
    // business's streams and move its assets to "unassigned" in the vault.
    await tx.delete(revenueStreams).where(and(eq(revenueStreams.businessId, params.data.id), eq(revenueStreams.userId, caller.id)));
    await tx.update(canonicalAssets).set({ businessId: null, updatedAt: new Date() })
      .where(and(eq(canonicalAssets.businessId, params.data.id), eq(canonicalAssets.userId, caller.id)));
    await tx.delete(businessesTable).where(eq(businessesTable.id, params.data.id));
  });
  res.sendStatus(204);
});

// ─── GET /api/businesses/:id/overview ────────────────────────────────────────
// Lightweight aggregate stats used by the portfolio cards and the command
// center header: connection count, lifetime revenue (from the linked system
// instance, if any), last-activity timestamp, and a health status bucket.

router.get("/businesses/:id/overview", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = GetBusinessOverviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [business] = await db
    .select({ id: businessesTable.id, updatedAt: businessesTable.updatedAt, systemInstanceId: businessesTable.systemInstanceId })
    .from(businessesTable)
    .where(and(eq(businessesTable.id, params.data.id), eq(businessesTable.ownerId, caller.id)));

  if (!business) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [connectionAgg] = await db
    .select({
      count: sql<number>`count(*)`,
      lastUpdatedAt: sql<string | null>`max(${businessConnectionsTable.updatedAt})`,
    })
    .from(businessConnectionsTable)
    .where(eq(businessConnectionsTable.businessId, business.id));

  const [latestHealth] = await db
    .select({ overallHealth: businessHealthScoresTable.overallHealth, createdAt: businessHealthScoresTable.createdAt })
    .from(businessHealthScoresTable)
    .where(eq(businessHealthScoresTable.businessId, business.id))
    .orderBy(desc(businessHealthScoresTable.createdAt))
    .limit(1);

  let revenueCents = 0;
  let latestActivityAt: Date | null = null;
  if (business.systemInstanceId != null) {
    const [revenueAgg] = await db
      .select({
        total: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)`,
      })
      .from(systemActivityEventsTable)
      .where(
        and(
          eq(systemActivityEventsTable.systemInstanceId, business.systemInstanceId),
          eq(systemActivityEventsTable.eventType, "revenue"),
        ),
      );
    revenueCents = Number(revenueAgg?.total ?? 0);

    const [latestActivity] = await db
      .select({ createdAt: systemActivityEventsTable.createdAt })
      .from(systemActivityEventsTable)
      .where(eq(systemActivityEventsTable.systemInstanceId, business.systemInstanceId))
      .orderBy(desc(systemActivityEventsTable.createdAt))
      .limit(1);
    latestActivityAt = latestActivity?.createdAt ?? null;
  }

  const candidates = [
    business.updatedAt,
    connectionAgg?.lastUpdatedAt ? new Date(connectionAgg.lastUpdatedAt) : null,
    latestHealth?.createdAt ?? null,
    latestActivityAt,
  ].filter((d): d is Date => d != null);
  const lastActivityAt = candidates.length > 0 ? new Date(Math.max(...candidates.map((d) => d.getTime()))) : null;

  res.json(
    GetBusinessOverviewResponse.parse(
      serialize({
        connectionsCount: Number(connectionAgg?.count ?? 0),
        revenueCents,
        lastActivityAt,
        healthStatus: healthStatusFromScore(latestHealth?.overallHealth),
      }),
    ),
  );
});

// ─── POST /api/businesses/:id/connections ─────────────────────────────────────

router.post("/businesses/:id/connections", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = AddBusinessConnectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = AddBusinessConnectionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [business] = await db
    .select({ ownerId: businessesTable.ownerId })
    .from(businessesTable)
    .where(eq(businessesTable.id, params.data.id));

  if (!business || business.ownerId !== caller.id) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  // If a vault credential is being linked, ensure it belongs to the caller.
  if (body.data.userCredentialId != null) {
    const [credential] = await db
      .select({ userId: userCredentialsTable.userId })
      .from(userCredentialsTable)
      .where(eq(userCredentialsTable.id, body.data.userCredentialId));

    if (!credential || credential.userId !== caller.id) {
      res.status(404).json({ error: "Credential not found" });
      return;
    }
  }

  const [row] = await db
    .insert(businessConnectionsTable)
    .values({
      ...body.data,
      businessId: params.data.id,
      status: body.data.status ?? "pending",
    })
    .returning();
  publishBusinessEvent({
    businessId: params.data.id,
    eventType: "integration.connected",
    source: "businesses_route",
    payload: { description: `Integration "${row.platformName}" was added to the business.`, relatedObjects: { connectionId: row.id, platformName: row.platformName } },
    dedupeKey: `integration.connected:${row.id}`,
  }).catch((err) => logger.warn({ err, businessId: params.data.id, connectionId: row.id }, "Business Intelligence: integration event failed (non-fatal)"));

  res.status(201).json(serialize(row));
});

// ─── GET /api/businesses/:id/operations-settings ─────────────────────────────
// ASH Operations Mode — per-business toggle + permission grants. Gated to
// Operator/Empire tiers (FOUNDER_ADMIN bypasses). Returns default (disabled,
// all-but-monitorOnly-denied) settings if none have been saved yet.

router.get("/businesses/:id/operations-settings", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = GetBusinessOperationsSettingsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [business] = await db
    .select({ ownerId: businessesTable.ownerId })
    .from(businessesTable)
    .where(eq(businessesTable.id, params.data.id));

  if (!business || business.ownerId !== caller.id) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (!(await requireOperationsTier(req, res, caller.id))) return;

  const [existing] = await db
    .select()
    .from(businessOperationsSettingsTable)
    .where(eq(businessOperationsSettingsTable.businessId, params.data.id));

  if (existing) {
    res.json(GetBusinessOperationsSettingsResponse.parse(serialize(existing)));
    return;
  }

  // No row yet — return sensible defaults without persisting until the user
  // actually saves a change via PATCH.
  res.json(
    GetBusinessOperationsSettingsResponse.parse(
      serialize({
        id: 0,
        businessId: params.data.id,
        enabled: false,
        permissions: DEFAULT_OPERATIONS_PERMISSIONS,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
  );
});

// ─── PATCH /api/businesses/:id/operations-settings ───────────────────────────

router.patch("/businesses/:id/operations-settings", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = UpdateBusinessOperationsSettingsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateBusinessOperationsSettingsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [business] = await db
    .select({ ownerId: businessesTable.ownerId })
    .from(businessesTable)
    .where(eq(businessesTable.id, params.data.id));

  if (!business || business.ownerId !== caller.id) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (!(await requireOperationsTier(req, res, caller.id))) return;

  const [existing] = await db
    .select()
    .from(businessOperationsSettingsTable)
    .where(eq(businessOperationsSettingsTable.businessId, params.data.id));

  const patch: { enabled?: boolean; permissions?: Record<string, boolean> } = {};
  if (body.data.enabled !== undefined) patch.enabled = body.data.enabled;
  if (body.data.permissions !== undefined) patch.permissions = body.data.permissions;

  let row;
  if (existing) {
    [row] = await db
      .update(businessOperationsSettingsTable)
      .set(patch)
      .where(eq(businessOperationsSettingsTable.businessId, params.data.id))
      .returning();
  } else {
    [row] = await db
      .insert(businessOperationsSettingsTable)
      .values({
        businessId: params.data.id,
        enabled: patch.enabled ?? false,
        permissions: patch.permissions ?? DEFAULT_OPERATIONS_PERMISSIONS,
      })
      .returning();
  }

  res.json(UpdateBusinessOperationsSettingsResponse.parse(serialize(row)));
});

export default router;
