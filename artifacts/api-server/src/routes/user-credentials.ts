import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, count } from "drizzle-orm";
import { db, userCredentialsTable, systemInstancesTable } from "@workspace/db";
import { requireAuthActive, getTokenPayload } from "../lib/auth";
import {
  ListUserCredentialsResponse,
  ListUserCredentialsResponseItem,
  StoreUserCredentialBody,
  DeleteUserCredentialParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ─── GET /api/user-credentials/summary ──────────────────────────────────────
// Auth-protected. Returns credential metadata (no values) for the caller.
// Includes a count of the caller's system instances as "usedBySystemsCount".

router.get("/user-credentials/summary", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const [rows, [sysCount]] = await Promise.all([
    db
      .select({
        id: userCredentialsTable.id,
        credentialKey: userCredentialsTable.credentialKey,
        toolId: userCredentialsTable.toolId,
        createdAt: userCredentialsTable.createdAt,
        updatedAt: userCredentialsTable.updatedAt,
      })
      .from(userCredentialsTable)
      .where(eq(userCredentialsTable.userId, userId))
      .orderBy(userCredentialsTable.credentialKey),
    db
      .select({ count: count() })
      .from(systemInstancesTable)
      .where(eq(systemInstancesTable.userId, userId)),
  ]);

  const systemsCount = sysCount?.count ?? 0;

  const summary = serialize(rows).map((r) => ({
    ...r,
    usedBySystemsCount: systemsCount,
  }));

  res.json(summary);
});

// ─── GET /api/user-credentials ───────────────────────────────────────────────
// Returns metadata (no values) filtered by userId query param (legacy support).

router.get("/user-credentials", async (req, res): Promise<void> => {
  if (!req.query.userId) {
    res.status(400).json({ error: "userId query parameter is required" });
    return;
  }
  const rows = await db
    .select({
      id: userCredentialsTable.id,
      userId: userCredentialsTable.userId,
      toolId: userCredentialsTable.toolId,
      credentialKey: userCredentialsTable.credentialKey,
      createdAt: userCredentialsTable.createdAt,
      updatedAt: userCredentialsTable.updatedAt,
    })
    .from(userCredentialsTable)
    .where(eq(userCredentialsTable.userId, Number(req.query.userId)))
    .orderBy(userCredentialsTable.credentialKey);
  res.json(ListUserCredentialsResponse.parse(serialize(rows)));
});

// ─── POST /api/user-credentials ──────────────────────────────────────────────
// Upsert: if a credential with the same (userId, credentialKey) already exists,
// update its encryptedValue; otherwise insert a new row.
// NOTE: userId is ALWAYS taken from the auth token — the body's userId is ignored
// to prevent one user from writing credentials for another.

router.post("/user-credentials", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const parsed = StoreUserCredentialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Force userId from token regardless of what the body sent
  const safeData = { ...parsed.data, userId };

  // Check for an existing record with the same (token userId) + credentialKey
  const [existing] = await db
    .select({ id: userCredentialsTable.id })
    .from(userCredentialsTable)
    .where(
      and(
        eq(userCredentialsTable.userId, userId),
        eq(userCredentialsTable.credentialKey, safeData.credentialKey),
      ),
    );

  const responseShape = {
    id: userCredentialsTable.id,
    userId: userCredentialsTable.userId,
    toolId: userCredentialsTable.toolId,
    credentialKey: userCredentialsTable.credentialKey,
    createdAt: userCredentialsTable.createdAt,
    updatedAt: userCredentialsTable.updatedAt,
  };

  if (existing) {
    const [row] = await db
      .update(userCredentialsTable)
      .set({ encryptedValue: safeData.encryptedValue, updatedAt: new Date() })
      .where(eq(userCredentialsTable.id, existing.id))
      .returning(responseShape);
    res.json(ListUserCredentialsResponseItem.parse(serialize(row)));
  } else {
    const [row] = await db
      .insert(userCredentialsTable)
      .values(safeData)
      .returning(responseShape);
    res.status(201).json(ListUserCredentialsResponseItem.parse(serialize(row)));
  }
});

// ─── DELETE /api/user-credentials/:id ────────────────────────────────────────

router.delete("/user-credentials/:id", async (req, res): Promise<void> => {
  const params = DeleteUserCredentialParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Verify caller owns the credential
  const caller = getTokenPayload(req);
  if (!caller) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [existing] = await db
    .select({ userId: userCredentialsTable.userId })
    .from(userCredentialsTable)
    .where(eq(userCredentialsTable.id, params.data.id));

  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (existing.userId !== caller.id) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(userCredentialsTable).where(eq(userCredentialsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
