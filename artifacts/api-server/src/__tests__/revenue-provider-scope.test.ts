import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import request from "supertest";
import { clientWorkspacesTable, db, systemInstancesTable, userCredentialsTable, usersTable } from "@workspace/db";
import app from "../app";
import { encrypt } from "../lib/crypto";
import { getRevenueProvider } from "../lib/revenue/registry";

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
  const key = "REVENUE_STRIPE";
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
    expect((await sync()).body).toMatchObject({ ok: true, synced: 0 });
    expect(fetchTransactions).toHaveBeenCalledExactlyOnceWith({ stripe_secret_key: "system-key" }, expect.any(Date));

    await updateCredential({ status: "disconnected" });
    expect((await sync()).body).toMatchObject({ ok: false, synced: 0, errors: [expect.stringContaining("Reconnect")] });
    expect(fetchTransactions).toHaveBeenCalledTimes(1);
  } finally {
    testCredentials.mockRestore();
    fetchTransactions.mockRestore();
  }
});
