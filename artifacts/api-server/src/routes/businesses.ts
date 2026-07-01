import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, desc } from "drizzle-orm";
import { db, businessesTable, businessConnectionsTable, userCredentialsTable } from "@workspace/db";
import { getActiveCallerPayload, validateClientWorkspaceId } from "../lib/auth";
import {
  ListBusinessesResponse,
  CreateBusinessBody,
  GetBusinessParams,
  GetBusinessResponse,
  UpdateBusinessParams,
  UpdateBusinessBody,
  UpdateBusinessResponse,
  DeleteBusinessParams,
  AddBusinessConnectionParams,
  AddBusinessConnectionBody,
} from "@workspace/api-zod";

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

  await db.delete(businessesTable).where(eq(businessesTable.id, params.data.id));
  res.sendStatus(204);
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

  res.status(201).json(serialize(row));
});

export default router;
