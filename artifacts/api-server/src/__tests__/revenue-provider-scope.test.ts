import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import request from "supertest";
import { clientWorkspacesTable, db, milestoneEventsTable, systemActivityEventsTable, systemInstancesTable, systemRevenueProvidersTable, userCredentialsTable, usersTable } from "@workspace/db";
import app from "../app";
import { encrypt } from "../lib/crypto";
import { getRevenueProvider } from "../lib/revenue/registry";
import { syncProvider } from "../lib/revenue/sync";

let userId: number;

beforeAll(async () => {
  const [user] = await db.insert(usersTable).values({
    email: `revenue_scope_${Date.now()}@test.internal`, role: "USER", membershipStatus: "active",
  }).returning({ id: usersTable.id });
  userId = user!.id;
});

afterAll(async () => {
  await db.delete(usersTable).where(eq(usersTable.id, userId));
});

it("links and syncs only with active credentials in the system's workspace", async () => {
  const [workspace, otherWorkspace] = await db.insert(clientWorkspacesTable).values([
    { agencyUserId: userId, name: "First client", portalToken: `revenue-scope-${userId}-1` },
    { agencyUserId: userId, name: "Second client", portalToken: `revenue-scope-${userId}-2` },
  ]).returning({ id: clientWorkspacesTable.id });
  const [system, otherSystem] = await db.insert(systemInstancesTable).values([
    { userId, name: "Revenue system", clientWorkspaceId: workspace!.id },
    { userId, name: "Other system", clientWorkspaceId: workspace!.id },
  ]).returning({ id: systemInstancesTable.id });
  const key = "STRIPE_SECRET_KEY";
  const [credential] = await db.insert(userCredentialsTable).values([
    {
      userId, credentialKey: key, status: "connected", clientWorkspaceId: workspace!.id,
      systemInstanceId: system!.id, encryptedValue: encrypt("system-key"),
      expiresAt: new Date(Date.now() - 60_000),
    },
    {
      userId, credentialKey: key, status: "connected", clientWorkspaceId: workspace!.id,
      systemInstanceId: otherSystem!.id, encryptedValue: encrypt("other-system-key"),
    },
    {
      userId, credentialKey: key, status: "connected", clientWorkspaceId: otherWorkspace!.id,
      encryptedValue: encrypt("other-workspace-key"),
    },
    {
      userId, credentialKey: key, status: "connected", clientWorkspaceId: workspace!.id,
      encryptedValue: encrypt("workspace-key"),
    },
  ]).returning({ id: userCredentialsTable.id });
  const stripe = getRevenueProvider("stripe")!;
  const testCredentials = vi.spyOn(stripe, "testCredentials").mockResolvedValue({ ok: true, message: "Connected" });
  const fetchTransactions = vi.spyOn(stripe, "fetchTransactions").mockResolvedValue({ ok: true, transactions: [] });
  const token = jwt.sign({ sub: userId, role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!);
  const base = `/api/system-instances/${system!.id}/revenue-providers`;
  const link = () => request(app).post(base).auth(token, { type: "bearer" }).send({
    provider: "stripe", credentialKeys: { stripe_secret_key: key },
  });
  const updateCredential = (values: Partial<typeof userCredentialsTable.$inferInsert>) =>
    db.update(userCredentialsTable).set(values).where(eq(userCredentialsTable.id, credential!.id));

  try {
    expect((await link()).status).toBe(400);
    expect(testCredentials).not.toHaveBeenCalled();

    await updateCredential({ expiresAt: null });
    const linked = await link();
    expect(linked.status, JSON.stringify(linked.body)).toBe(201);
    expect(testCredentials).toHaveBeenCalledExactlyOnceWith({ stripe_secret_key: "system-key" });

    const sync = () => request(app).post(`${base}/${linked.body.id}/sync`).auth(token, { type: "bearer" });
    const probe = () => request(app).post(`/api/user-credentials/${credential!.id}/test`).auth(token, { type: "bearer" });
    const stripeProbe = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockRejectedValueOnce(new TypeError("Stripe network error"));
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        expect((await probe()).body).toMatchObject({ ok: false, status: "connected" });
      }
    } finally {
      stripeProbe.mockRestore();
    }

    expect((await sync()).body).toMatchObject({ ok: true, synced: 0 });
    expect(fetchTransactions).toHaveBeenCalledExactlyOnceWith({ stripe_secret_key: "system-key" }, expect.any(Date));

    await updateCredential({ status: "disconnected" });
    expect((await sync()).body).toMatchObject({ ok: false, synced: 0, errors: [expect.stringContaining("Reconnect")] });
    expect(fetchTransactions).toHaveBeenCalledTimes(1);

    await updateCredential({ status: "connected", encryptedValue: encrypt("pasted\u00a0key") });
    const invalidProbe = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Unexpected Stripe probe"));
    try {
      expect((await probe()).body).toMatchObject({ ok: false, status: "invalid" });
      expect(invalidProbe).not.toHaveBeenCalled();
    } finally {
      invalidProbe.mockRestore();
    }
    expect((await sync()).body).toMatchObject({ ok: false, synced: 0 });
    expect(fetchTransactions).toHaveBeenCalledTimes(1);
  } finally {
    testCredentials.mockRestore();
    fetchTransactions.mockRestore();
  }
});

it("replays a partial sync window and imports each transaction once across overlapping syncs", async () => {
  const [system] = await db.insert(systemInstancesTable).values({ userId, name: "Import retry system" }).returning();
  const lastSyncAt = new Date(Date.now() - 60_000);
  const credentialKey = "IMPORT_STRIPE";
  await db.insert(userCredentialsTable).values({
    userId, systemInstanceId: system!.id, credentialKey, encryptedValue: encrypt("import-key"), status: "connected",
  });
  const [provider] = await db.insert(systemRevenueProvidersTable)
    .values({ userId, systemInstanceId: system!.id, provider: "stripe", credentialKey, lastSyncAt }).returning();
  const payment = { externalId: "stripe_paid", amountCents: 500, currency: "usd", description: "Test", occurredAt: new Date() };
  const recoveredPayment = { ...payment, externalId: "stripe_recovered" };
  let overlappingFetches = 0;
  let releaseFetches!: () => void;
  const ready = new Promise<void>(resolve => { releaseFetches = resolve; });
  const fetchTransactions = vi.spyOn(getRevenueProvider("stripe")!, "fetchTransactions")
    .mockResolvedValueOnce({ ok: true, transactions: [payment, { ...recoveredPayment, amountCents: 2 ** 31 }] })
    .mockImplementation(async () => {
      if (++overlappingFetches === 2) releaseFetches();
      await ready;
      return { ok: true, transactions: [payment, recoveredPayment] };
    });
  const sync = () => syncProvider(provider!.id);
  const status = async () => {
    const [updated] = await db.select().from(systemRevenueProvidersTable).where(eq(systemRevenueProvidersTable.id, provider!.id));
    return updated;
  };

  try {
    expect(await sync()).toMatchObject({ synced: 1, errors: [expect.any(String)] });
    expect(await status()).toMatchObject({ lastSyncAt, syncStatus: "error" });

    const results = await Promise.all([sync(), sync()]);
    expect(results.flatMap(result => result.errors)).toEqual([]);
    expect(results.reduce((total, result) => total + result.synced, 0)).toBe(1);
    expect(fetchTransactions.mock.calls.map(([, since]) => since)).toEqual([lastSyncAt, lastSyncAt, lastSyncAt]);
    const events = await db.select({ externalTxId: systemActivityEventsTable.externalTxId })
      .from(systemActivityEventsTable).where(eq(systemActivityEventsTable.systemInstanceId, system!.id));
    expect(events.map(event => event.externalTxId).sort()).toEqual(["stripe_paid", "stripe_recovered"]);
    expect(await status()).toMatchObject({ lastSyncAt: expect.any(Date), syncStatus: "ok" });
    expect((await status())!.lastSyncAt!.getTime()).toBeGreaterThan(lastSyncAt.getTime());

    // A payment in another currency is recorded but stays out of USD revenue totals.
    fetchTransactions.mockReset().mockResolvedValue({ ok: true, transactions: [{ ...payment, externalId: "stripe_eur", currency: "eur" }] });
    expect(await sync()).toMatchObject({ synced: 1, errors: [] });
    expect((await status())!.syncMessage).toContain("excluded from USD totals");
    const [eur] = await db.select({ eventType: systemActivityEventsTable.eventType })
      .from(systemActivityEventsTable).where(eq(systemActivityEventsTable.externalTxId, "stripe_eur"));
    expect(eur!.eventType).toBe("revenue_unconverted");

    fetchTransactions.mockResolvedValue({ ok: true, transactions: [
      { ...payment, externalId: "stripe_later_sale", amountCents: 15_000 },
      { ...payment, externalId: "stripe_later_refund", amountCents: -15_000 },
    ] });
    expect(await sync()).toMatchObject({ synced: 2, errors: [] });
    const milestones = await db.select({ amountCents: milestoneEventsTable.amountCents })
      .from(milestoneEventsTable).where(eq(milestoneEventsTable.userId, userId));
    expect(milestones.map(row => row.amountCents)).not.toContain(10_000);
  } finally {
    fetchTransactions.mockRestore();
  }
});
