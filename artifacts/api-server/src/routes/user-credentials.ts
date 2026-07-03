import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { encrypt, decrypt, isEncrypted } from "../lib/crypto";
import { eq, and, inArray, isNull } from "drizzle-orm";
import {
  db,
  userCredentialsTable,
  toolCredentialRequirementsTable,
  userToolSelectionsTable,
  systemInstancesTable,
} from "@workspace/db";
import { requireAuthActive, getTokenPayload, validateClientWorkspaceId } from "../lib/auth";
import {
  ListUserCredentialsResponse,
  ListUserCredentialsResponseItem,
  StoreUserCredentialBody,
  DeleteUserCredentialParams,
} from "@workspace/api-zod";
import { computeSystemHealth } from "../lib/health-monitor";
import { attemptSelfHeal } from "../lib/self-healing";
import { loadCredentials } from "../lib/runtime/worker";
import { logger } from "../lib/logger";
import { getConnector } from "../lib/connectors/registry";
import { CATALOG_CONNECTOR_MAP } from "../lib/connectors/catalog-map";

// Authoritative catalog credentialKey → connector map lives in
// lib/connectors/catalog-map.ts so the "Test" routing here and the honest
// catalog-status endpoint share one source of truth. Aliased locally to keep
// the existing call sites below unchanged.
const KEY_TO_CONNECTOR = CATALOG_CONNECTOR_MAP;

const router: IRouter = Router();

// Event-triggered recompute + self-heal (Task #246) for "integration
// disconnect" events: when a stored credential moves to a disconnected/
// expired/needs-reconnect state (or is deleted outright), every system
// instance owned by that user may now have a broken connector, so recompute
// health and let attemptSelfHeal decide whether to auto-fix or escalate —
// same fire-and-forget pattern as handleConnectorTest in runtime/worker.ts.
const DISCONNECT_STATUSES = new Set(["disconnected", "expired", "needs_reconnect", "invalid"]);

function triggerDisconnectRecompute(ownerUserId: number): void {
  (async () => {
    try {
      const instances = await db
        .select({ id: systemInstancesTable.id })
        .from(systemInstancesTable)
        .where(eq(systemInstancesTable.userId, ownerUserId));

      for (const { id } of instances) {
        await computeSystemHealth(id);
        await attemptSelfHeal(id, loadCredentials);
      }
    } catch (err) {
      logger.warn({ err, ownerUserId }, "Event-triggered health recompute failed (credential disconnect)");
    }
  })();
}

// ─── GET /api/user-credentials/summary ──────────────────────────────────────
// Returns credential metadata (no values) including Connection Hub fields.

router.get("/user-credentials/summary", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const rows = await db
    .select({
      id: userCredentialsTable.id,
      credentialKey: userCredentialsTable.credentialKey,
      toolId: userCredentialsTable.toolId,
      status: userCredentialsTable.status,
      connectedAt: userCredentialsTable.connectedAt,
      lastSyncAt: userCredentialsTable.lastSyncAt,
      expiresAt: userCredentialsTable.expiresAt,
      usageCount: userCredentialsTable.usageCount,
      metadata: userCredentialsTable.metadata,
      createdAt: userCredentialsTable.createdAt,
      updatedAt: userCredentialsTable.updatedAt,
    })
    .from(userCredentialsTable)
    // Connections Hub manages shared, user-level credentials only. Instance-scoped
    // build credentials (systemInstanceId set) belong to a specific system, not the Hub.
    .where(and(eq(userCredentialsTable.userId, userId), isNull(userCredentialsTable.systemInstanceId)))
    .orderBy(userCredentialsTable.credentialKey);

  // Compute per-credential usage count + which systems use each credential
  const usageMap = new Map<string, Set<number>>();
  const systemNamesMap = new Map<string, { id: number; name: string }[]>();

  if (rows.length > 0) {
    const credentialKeys = rows.map((r) => r.credentialKey);
    const usageRows = await db
      .select({
        credentialKey: toolCredentialRequirementsTable.credentialKey,
        systemInstanceId: userToolSelectionsTable.systemInstanceId,
        systemName: systemInstancesTable.name,
      })
      .from(toolCredentialRequirementsTable)
      .innerJoin(
        userToolSelectionsTable,
        eq(toolCredentialRequirementsTable.toolId, userToolSelectionsTable.toolId),
      )
      .innerJoin(
        systemInstancesTable,
        and(
          eq(userToolSelectionsTable.systemInstanceId, systemInstancesTable.id),
          eq(systemInstancesTable.userId, userId),
        ),
      )
      .where(inArray(toolCredentialRequirementsTable.credentialKey, credentialKeys));

    for (const row of usageRows) {
      if (!usageMap.has(row.credentialKey)) usageMap.set(row.credentialKey, new Set());
      usageMap.get(row.credentialKey)!.add(row.systemInstanceId);

      if (!systemNamesMap.has(row.credentialKey)) systemNamesMap.set(row.credentialKey, []);
      const existing = systemNamesMap.get(row.credentialKey)!;
      if (!existing.find((s) => s.id === row.systemInstanceId)) {
        existing.push({ id: row.systemInstanceId, name: row.systemName });
      }
    }
  }

  const summary = serialize(rows).map((r) => ({
    ...r,
    usedBySystemsCount: usageMap.get(r.credentialKey)?.size ?? 0,
    usedBySystems: systemNamesMap.get(r.credentialKey) ?? [],
    lastUsedAt: r.updatedAt,
  }));

  res.json(summary);
});

// ─── GET /api/user-credentials ───────────────────────────────────────────────

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

router.get("/user-credentials", async (req, res): Promise<void> => {
  const callerId = await requireAuthActive(req, res);
  if (callerId === null) return;

  let targetUserId = callerId;

  if (req.query.userId) {
    const requestedId = Number(req.query.userId);
    if (requestedId !== callerId) {
      const payload = getTokenPayload(req);
      if (!payload || !ADMIN_ROLES.has(payload.role)) {
        res.status(403).json({ error: "Forbidden: cannot read another user's credentials" });
        return;
      }
      targetUserId = requestedId;
    }
  }

  // Scope to a specific client workspace when the header is present and valid.
  const workspaceId = await validateClientWorkspaceId(req, callerId);
  // Connections Hub lists shared, user-level credentials only (systemInstanceId IS NULL);
  // instance-scoped build credentials are managed via their owning system, not here.
  const credWhere = workspaceId !== null
    ? and(eq(userCredentialsTable.userId, targetUserId), eq(userCredentialsTable.clientWorkspaceId, workspaceId), isNull(userCredentialsTable.systemInstanceId))
    : and(eq(userCredentialsTable.userId, targetUserId), isNull(userCredentialsTable.systemInstanceId));

  const rows = await db
    .select({
      id: userCredentialsTable.id,
      userId: userCredentialsTable.userId,
      toolId: userCredentialsTable.toolId,
      credentialKey: userCredentialsTable.credentialKey,
      encryptedValue: userCredentialsTable.encryptedValue,
      status: userCredentialsTable.status,
      connectedAt: userCredentialsTable.connectedAt,
      lastSyncAt: userCredentialsTable.lastSyncAt,
      expiresAt: userCredentialsTable.expiresAt,
      usageCount: userCredentialsTable.usageCount,
      metadata: userCredentialsTable.metadata,
      clientWorkspaceId: userCredentialsTable.clientWorkspaceId,
      createdAt: userCredentialsTable.createdAt,
      updatedAt: userCredentialsTable.updatedAt,
    })
    .from(userCredentialsTable)
    .where(credWhere)
    .orderBy(userCredentialsTable.credentialKey);

  // Silently re-encrypt any rows still in legacy base64 format.
  const legacyRows = rows.filter((r) => !isEncrypted(r.encryptedValue));
  if (legacyRows.length > 0) {
    try {
      await db.transaction(async (tx) => {
        for (const r of legacyRows) {
          try {
            const plaintext = decrypt(r.encryptedValue);
            const reEncrypted = encrypt(plaintext);
            await tx
              .update(userCredentialsTable)
              .set({ encryptedValue: reEncrypted, updatedAt: new Date() })
              .where(eq(userCredentialsTable.id, r.id));
          } catch (err) {
            req.log.warn({ credentialId: r.id, err }, "Failed to re-encrypt legacy credential");
          }
        }
      });
    } catch (err) {
      req.log.warn({ err }, "Re-encryption transaction failed; skipping upgrade pass");
    }
  }

  const safeRows = rows.map(({ encryptedValue: _omit, ...rest }) => rest);
  res.json(ListUserCredentialsResponse.parse(serialize(safeRows)));
});

// ─── POST /api/user-credentials ──────────────────────────────────────────────
// Upsert. Sets status='connected' and connectedAt on first insert.

router.post("/user-credentials", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const parsed = StoreUserCredentialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Attach to a client workspace if the agency header is present and valid.
  const clientWorkspaceId = await validateClientWorkspaceId(req, userId);
  const safeData = { ...parsed.data, userId, ...(clientWorkspaceId !== null ? { clientWorkspaceId } : {}) };

  // Upsert keyed on (userId, credentialKey, clientWorkspaceId) to keep each
  // client workspace's credentials isolated from each other and from the
  // agency owner's own credentials.
  const upsertConditions = [
    eq(userCredentialsTable.userId, userId),
    eq(userCredentialsTable.credentialKey, safeData.credentialKey),
    // Only ever touch shared, user-level rows — never an instance-scoped build copy.
    isNull(userCredentialsTable.systemInstanceId),
  ];
  if (clientWorkspaceId !== null) {
    upsertConditions.push(eq(userCredentialsTable.clientWorkspaceId, clientWorkspaceId));
  } else {
    upsertConditions.push(isNull(userCredentialsTable.clientWorkspaceId));
  }

  const [existing] = await db
    .select({ id: userCredentialsTable.id, connectedAt: userCredentialsTable.connectedAt })
    .from(userCredentialsTable)
    .where(and(...upsertConditions));

  const responseShape = {
    id: userCredentialsTable.id,
    userId: userCredentialsTable.userId,
    toolId: userCredentialsTable.toolId,
    credentialKey: userCredentialsTable.credentialKey,
    status: userCredentialsTable.status,
    connectedAt: userCredentialsTable.connectedAt,
    lastSyncAt: userCredentialsTable.lastSyncAt,
    createdAt: userCredentialsTable.createdAt,
    updatedAt: userCredentialsTable.updatedAt,
  };

  const rawSecret = Buffer.from(safeData.encryptedValue, "base64").toString("utf8");
  const encryptedValue = encrypt(rawSecret);
  const now = new Date();

  if (existing) {
    const [row] = await db
      .update(userCredentialsTable)
      .set({
        encryptedValue,
        status: "connected",
        lastSyncAt: now,
        updatedAt: now,
      })
      .where(eq(userCredentialsTable.id, existing.id))
      .returning(responseShape);
    res.json(ListUserCredentialsResponseItem.parse(serialize(row)));
  } else {
    const [row] = await db
      .insert(userCredentialsTable)
      .values({
        ...safeData,
        encryptedValue,
        status: "connected",
        connectedAt: now,
        lastSyncAt: now,
      })
      .returning(responseShape);
    res.status(201).json(ListUserCredentialsResponseItem.parse(serialize(row)));
  }
});

// ─── POST /api/user-credentials/:id/test ─────────────────────────────────────
// Attempts to validate a stored credential by making a live API call (where
// supported). Updates status + lastSyncAt. Returns { ok, message, status }.

router.post("/user-credentials/:id/test", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const credId = Number(req.params.id);
  if (!credId) { res.status(400).json({ error: "Invalid id" }); return; }

  const [cred] = await db
    .select()
    .from(userCredentialsTable)
    .where(and(eq(userCredentialsTable.id, credId), eq(userCredentialsTable.userId, userId)));

  if (!cred) { res.status(404).json({ error: "Not found" }); return; }

  let testOk = false;
  let testMessage = "Credential stored and format valid";
  let newStatus: string = "connected";

  try {
    const plaintext = decrypt(cred.encryptedValue);

    if (cred.credentialKey === "OPENROUTER_API_KEY") {
      const r = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${plaintext}` },
      });
      if (r.ok) {
        testOk = true;
        testMessage = "OpenRouter API reachable — authentication valid";
      } else if (r.status === 401) {
        testOk = false;
        testMessage = "Invalid API key — authentication rejected";
        newStatus = "invalid";
      } else if (r.status === 429) {
        testOk = false;
        testMessage = "Rate limited — key is valid but quota exceeded";
        newStatus = "rate_limited";
      } else {
        testOk = false;
        testMessage = `API returned ${r.status}`;
        newStatus = "needs_reconnect";
      }
    } else if (cred.credentialKey === "STRIPE_SECRET_KEY") {
      const r = await fetch("https://api.stripe.com/v1/account", {
        headers: { Authorization: `Bearer ${plaintext}` },
      });
      if (r.ok) {
        testOk = true;
        testMessage = "Stripe API reachable — authentication valid";
      } else if (r.status === 401) {
        testOk = false;
        testMessage = "Invalid Stripe key";
        newStatus = "invalid";
      } else {
        testOk = false;
        testMessage = `Stripe returned ${r.status}`;
        newStatus = "needs_reconnect";
      }
    } else if (KEY_TO_CONNECTOR[cred.credentialKey]) {
      // Route through the real connector implementation for anything with
      // one registered (gmail, youtube, twitter, meta, tiktok, linkedin) so
      // "Test" in the Connections Hub reflects the same health signal ASH
      // and self-healing rely on, not just a "looks non-empty" placeholder.
      const { connectorId, keyMap } = KEY_TO_CONNECTOR[cred.credentialKey]!;

      // Multi-key connectors (gmail/youtube) need sibling credentials too —
      // gather every stored credential for this user and build the creds
      // record the connector constructor expects.
      // Connection tests reflect shared, Hub-level connection state — read only
      // NULL-scoped rows so a test never evaluates against an unrelated system's
      // instance-scoped build credentials.
      const allRows = await db
        .select()
        .from(userCredentialsTable)
        .where(and(eq(userCredentialsTable.userId, userId), isNull(userCredentialsTable.systemInstanceId)));

      const creds: Record<string, string> = {};
      for (const row of allRows) {
        try {
          const decrypted = decrypt(row.encryptedValue);
          const mappedKey = keyMap?.[row.credentialKey] ?? row.credentialKey;
          creds[mappedKey] = decrypted;
        } catch {
          // Skip rows that fail to decrypt; connector will report missing creds.
        }
      }

      const connector = getConnector(connectorId, creds);
      if (!connector) {
        testOk = false;
        testMessage = `No connector registered for ${connectorId}`;
        newStatus = "needs_reconnect";
      } else {
        const result = await connector.testConnection();
        testOk = result.ok;
        testMessage = result.message;
        newStatus = result.ok ? "connected" : "needs_reconnect";
      }
    } else {
      // For other keys: verify non-empty and reasonable length
      if (plaintext && plaintext.trim().length >= 8) {
        testOk = true;
        testMessage = "Credential stored and format valid";
        newStatus = "connected";
      } else {
        testOk = false;
        testMessage = "Credential appears empty or too short";
        newStatus = "invalid";
      }
    }
  } catch (err) {
    req.log.warn({ credId, err }, "Credential test failed");
    testOk = false;
    testMessage = "Test failed — could not decrypt credential";
    newStatus = "needs_reconnect";
  }

  const now = new Date();
  await db
    .update(userCredentialsTable)
    .set({ status: newStatus, lastSyncAt: now, updatedAt: now })
    .where(eq(userCredentialsTable.id, credId));

  res.json({ ok: testOk, message: testMessage, status: newStatus });
});

// ─── PATCH /api/user-credentials/:id ─────────────────────────────────────────
// Update status / metadata fields without touching the secret value.

router.patch("/user-credentials/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const credId = Number(req.params.id);
  if (!credId) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db
    .select({ userId: userCredentialsTable.userId })
    .from(userCredentialsTable)
    .where(and(eq(userCredentialsTable.id, credId), eq(userCredentialsTable.userId, userId)));

  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const { status, metadata, expiresAt } = req.body as {
    status?: string;
    metadata?: string;
    expiresAt?: string;
  };

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (status) updates.status = status;
  if (metadata !== undefined) updates.metadata = metadata;
  if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;

  await db.update(userCredentialsTable).set(updates).where(eq(userCredentialsTable.id, credId));

  if (status && DISCONNECT_STATUSES.has(status)) {
    triggerDisconnectRecompute(existing.userId);
  }

  res.sendStatus(204);
});

// ─── DELETE /api/user-credentials/:id ────────────────────────────────────────

router.delete("/user-credentials/:id", async (req, res): Promise<void> => {
  const params = DeleteUserCredentialParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const caller = getTokenPayload(req);
  if (!caller) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [existing] = await db
    .select({ userId: userCredentialsTable.userId })
    .from(userCredentialsTable)
    .where(eq(userCredentialsTable.id, params.data.id));

  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (existing.userId !== caller.id) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(userCredentialsTable).where(eq(userCredentialsTable.id, params.data.id));
  triggerDisconnectRecompute(existing.userId);
  res.sendStatus(204);
});

export default router;
