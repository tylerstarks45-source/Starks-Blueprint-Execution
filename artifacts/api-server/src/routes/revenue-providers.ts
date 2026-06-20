import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, systemInstancesTable, systemRevenueProvidersTable, systemActivityEventsTable, userCredentialsTable } from "@workspace/db";
import { z } from "zod/v4";
import { getActiveCallerPayload } from "../lib/auth";
import { isAdminRole } from "../lib/auth";
import { getRevenueProvider, listRevenueProviders } from "../lib/revenue/registry";
import { syncProvider } from "../lib/revenue/sync";
import { decrypt } from "../lib/crypto";

const router: IRouter = Router();

// ─── helpers ──────────────────────────────────────────────────────────────────

async function checkSystemAccess(
  instanceId: number,
  callerId: number,
  callerRole: string,
): Promise<{ allowed: boolean; instance?: typeof systemInstancesTable.$inferSelect }> {
  const [instance] = await db
    .select()
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, instanceId));
  if (!instance) return { allowed: false };
  if (isAdminRole(callerRole)) return { allowed: true, instance };
  if (instance.userId !== callerId) return { allowed: false };
  return { allowed: true, instance };
}

// ─── GET /api/revenue-providers — list all supported providers ────────────────

router.get("/revenue-providers", async (_req, res): Promise<void> => {
  res.json(listRevenueProviders());
});

// ─── GET /api/system-instances/:id/revenue-providers ─────────────────────────

router.get("/system-instances/:id/revenue-providers", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const instanceId = Number(req.params["id"]);
  if (!Number.isInteger(instanceId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { allowed } = await checkSystemAccess(instanceId, caller.id, caller.role);
  if (!allowed) { res.status(403).json({ error: "Forbidden" }); return; }

  const rows = await db
    .select()
    .from(systemRevenueProvidersTable)
    .where(eq(systemRevenueProvidersTable.systemInstanceId, instanceId))
    .orderBy(systemRevenueProvidersTable.createdAt);

  res.json(serialize(rows));
});

// ─── POST /api/system-instances/:id/revenue-providers ────────────────────────

const LinkProviderBody = z.object({
  provider: z.enum(["stripe", "gumroad", "paypal"]),
  credentialKey: z.string().min(1),
});

router.post("/system-instances/:id/revenue-providers", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const instanceId = Number(req.params["id"]);
  if (!Number.isInteger(instanceId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { allowed } = await checkSystemAccess(instanceId, caller.id, caller.role);
  if (!allowed) { res.status(403).json({ error: "Forbidden" }); return; }

  const parsed = LinkProviderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { provider, credentialKey } = parsed.data;

  // Verify the credential exists and belongs to the user, and test it
  const [credRow] = await db
    .select()
    .from(userCredentialsTable)
    .where(and(
      eq(userCredentialsTable.userId, caller.id),
      eq(userCredentialsTable.credentialKey, credentialKey),
    ));

  if (!credRow) {
    res.status(400).json({ error: `Credential '${credentialKey}' not found in your Connections Hub` });
    return;
  }

  const revenueProvider = getRevenueProvider(provider);
  if (!revenueProvider) { res.status(400).json({ error: `Unknown provider: ${provider}` }); return; }

  // Decrypt the credential and test it
  let decrypted = "";
  try {
    decrypted = await decrypt(credRow.encryptedValue);
  } catch {
    res.status(400).json({ error: "Failed to decrypt credential" });
    return;
  }

  const creds: Record<string, string> = { [credentialKey]: decrypted };
  const testResult = await revenueProvider.testCredentials(creds);
  if (!testResult.ok) {
    res.status(400).json({ error: `Provider test failed: ${testResult.message}` });
    return;
  }

  const [existing] = await db
    .select({ id: systemRevenueProvidersTable.id })
    .from(systemRevenueProvidersTable)
    .where(and(
      eq(systemRevenueProvidersTable.systemInstanceId, instanceId),
      eq(systemRevenueProvidersTable.provider, provider),
    ));

  let row;
  if (existing) {
    [row] = await db
      .update(systemRevenueProvidersTable)
      .set({ credentialKey, enabled: true, syncStatus: "idle", syncMessage: null })
      .where(eq(systemRevenueProvidersTable.id, existing.id))
      .returning();
  } else {
    [row] = await db
      .insert(systemRevenueProvidersTable)
      .values({
        systemInstanceId: instanceId,
        userId: caller.id,
        provider,
        credentialKey,
        enabled: true,
      })
      .returning();
  }

  res.status(existing ? 200 : 201).json(serialize(row));
});

// ─── DELETE /api/system-instances/:id/revenue-providers/:providerId ───────────

router.delete("/system-instances/:id/revenue-providers/:providerId", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const instanceId = Number(req.params["id"]);
  const providerId = Number(req.params["providerId"]);
  if (!Number.isInteger(instanceId) || !Number.isInteger(providerId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const { allowed } = await checkSystemAccess(instanceId, caller.id, caller.role);
  if (!allowed) { res.status(403).json({ error: "Forbidden" }); return; }

  const [existing] = await db
    .select()
    .from(systemRevenueProvidersTable)
    .where(and(
      eq(systemRevenueProvidersTable.id, providerId),
      eq(systemRevenueProvidersTable.systemInstanceId, instanceId),
    ));
  if (!existing) { res.status(404).json({ error: "Provider link not found" }); return; }

  await db.delete(systemRevenueProvidersTable).where(eq(systemRevenueProvidersTable.id, providerId));
  res.sendStatus(204);
});

// ─── POST /api/system-instances/:id/revenue-providers/:providerId/sync ────────

router.post("/system-instances/:id/revenue-providers/:providerId/sync", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const instanceId = Number(req.params["id"]);
  const providerId = Number(req.params["providerId"]);
  if (!Number.isInteger(instanceId) || !Number.isInteger(providerId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const { allowed } = await checkSystemAccess(instanceId, caller.id, caller.role);
  if (!allowed) { res.status(403).json({ error: "Forbidden" }); return; }

  const [existing] = await db
    .select()
    .from(systemRevenueProvidersTable)
    .where(and(
      eq(systemRevenueProvidersTable.id, providerId),
      eq(systemRevenueProvidersTable.systemInstanceId, instanceId),
    ));
  if (!existing) { res.status(404).json({ error: "Provider link not found" }); return; }

  try {
    const { synced, errors } = await syncProvider(providerId);
    res.json({ ok: true, synced, errors });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// ─── GET /api/system-instances/:id/real-revenue ───────────────────────────────
// Returns live-synced revenue totals sourced only from linked payment providers.

router.get("/system-instances/:id/real-revenue", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const instanceId = Number(req.params["id"]);
  if (!Number.isInteger(instanceId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { allowed } = await checkSystemAccess(instanceId, caller.id, caller.role);
  if (!allowed) { res.status(403).json({ error: "Forbidden" }); return; }

  const providers = await db
    .select()
    .from(systemRevenueProvidersTable)
    .where(and(
      eq(systemRevenueProvidersTable.systemInstanceId, instanceId),
      eq(systemRevenueProvidersTable.enabled, true),
    ));

  if (providers.length === 0) {
    res.json({ linked: false, providers: [], stats: null });
    return;
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const revenueCondition = and(
    eq(systemActivityEventsTable.systemInstanceId, instanceId),
    eq(systemActivityEventsTable.eventType, "revenue"),
    sql`${systemActivityEventsTable.revenueProvider} is not null`,
  );

  const [todayRows, weekRows, monthRows, lifetimeRows, trendRows] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)` })
      .from(systemActivityEventsTable)
      .where(and(revenueCondition, sql`${systemActivityEventsTable.createdAt} >= ${startOfToday}`)),
    db.select({ total: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)` })
      .from(systemActivityEventsTable)
      .where(and(revenueCondition, sql`${systemActivityEventsTable.createdAt} >= ${startOfWeek}`)),
    db.select({ total: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)` })
      .from(systemActivityEventsTable)
      .where(and(revenueCondition, sql`${systemActivityEventsTable.createdAt} >= ${startOfMonth}`)),
    db.select({ total: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)` })
      .from(systemActivityEventsTable)
      .where(revenueCondition),
    db.select({
        date: sql<string>`date_trunc('day', ${systemActivityEventsTable.createdAt})::date::text`,
        amountCents: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)`,
      })
      .from(systemActivityEventsTable)
      .where(and(revenueCondition, sql`${systemActivityEventsTable.createdAt} >= ${sevenDaysAgo}`))
      .groupBy(sql`date_trunc('day', ${systemActivityEventsTable.createdAt})`)
      .orderBy(sql`date_trunc('day', ${systemActivityEventsTable.createdAt})`),
  ]);

  const trendMap = new Map<string, number>();
  for (const row of trendRows) trendMap.set(row.date, Number(row.amountCents));

  const trend: { date: string; amountCents: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    trend.push({ date: key, amountCents: trendMap.get(key) ?? 0 });
  }

  res.json({
    linked: true,
    providers: serialize(providers),
    stats: {
      todayCents: Number(todayRows[0]?.total ?? 0),
      weekCents: Number(weekRows[0]?.total ?? 0),
      monthCents: Number(monthRows[0]?.total ?? 0),
      lifetimeCents: Number(lifetimeRows[0]?.total ?? 0),
      trend,
    },
  });
});

export default router;
