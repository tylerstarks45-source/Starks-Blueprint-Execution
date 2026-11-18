/**
 * Custom API integrations: validation (no private hosts or odd paths), read-only sandbox test,
 * owner approval gate, auth from the owner's saved credential, capability registry, isolation.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

const { resolved } = vi.hoisted(() => ({ resolved: { address: "93.184.216.34", family: 4 } }));
vi.mock("node:dns/promises", () => ({ lookup: vi.fn(async () => [resolved]) }));

import app from "../app";
import { db, usersTable, userCredentialsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { encrypt } from "../lib/crypto";
import { runIntegrationAction } from "../lib/custom-integrations";

let ownerId: number;
let otherId: number;
const as = (id: number) => ({ Authorization: `Bearer ${jwt.sign({ sub: id, email: "", role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!)}` });
const def = {
  name: "Acme Podcasts",
  docsUrl: "https://docs.acme.example/api",
  baseUrl: "https://api.acme.example/v1",
  auth: { type: "bearer", credentialKey: "ACME_API_KEY" },
  actions: [
    { name: "listShows", method: "GET", path: "/shows", query: ["limit"] },
    { name: "createEpisode", method: "POST", path: "/shows/{showId}/episodes" },
  ],
  capabilities: ["Podcast hosting"],
};
const fetchSpy = vi.spyOn(globalThis, "fetch");
const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeAll(async () => {
  const stamp = Date.now();
  const [owner, other] = await db.insert(usersTable).values([
    { email: `ci_owner_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" },
    { email: `ci_other_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" },
  ]).returning({ id: usersTable.id });
  ownerId = owner!.id;
  otherId = other!.id;
  await db.insert(userCredentialsTable).values({ userId: ownerId, credentialKey: "ACME_API_KEY", encryptedValue: encrypt("sk_owner"), status: "connected" });
}, 120_000);

afterEach(() => { fetchSpy.mockReset(); resolved.address = "93.184.216.34"; });
afterAll(async () => { await db.delete(usersTable).where(inArray(usersTable.id, [ownerId, otherId])); });

describe("custom integrations", () => {
  it("rejects private hosts, plain http and paths that escape the host", async () => {
    for (const bad of [
      { ...def, baseUrl: "http://api.acme.example" },
      { ...def, baseUrl: "https://127.0.0.1/v1" },
      { ...def, baseUrl: "https://user:pw@api.acme.example" },
      { ...def, actions: [{ name: "x", method: "GET", path: "//evil.example/x" }] },
      { ...def, actions: [{ name: "x", method: "GET", path: "/../admin" }] },
      { ...def, auth: { type: "bearer" } },
    ]) expect((await request(app).post("/api/custom-integrations").set(as(ownerId)).send(bad)).status).toBe(400);
  });

  it("goes draft -> tested -> approved, then ASH can run actions with the owner's credential", async () => {
    const c = await request(app).post("/api/custom-integrations").set(as(ownerId)).send(def);
    expect(c.status).toBe(201);
    expect(c.body).toMatchObject({ key: "acme_podcasts", status: "draft", capabilities: ["podcast_hosting"] });
    const id = c.body.id;

    expect((await request(app).post(`/api/custom-integrations/${id}/approve`).set(as(ownerId))).status).toBe(409);
    expect(await runIntegrationAction(ownerId, "acme_podcasts", "listShows", {})).toMatchObject({ error: expect.stringContaining("isn't approved") });

    // The sandbox test refuses write actions and never calls the API for them.
    const w = await request(app).post(`/api/custom-integrations/${id}/test`).set(as(ownerId)).send({ action: "createEpisode" });
    expect(w.body.result.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockResolvedValueOnce(ok({ shows: [] }));
    const t = await request(app).post(`/api/custom-integrations/${id}/test`).set(as(ownerId)).send({ params: { limit: 5 } });
    expect(t.body.result).toMatchObject({ ok: true, status: 200 });
    expect(t.body.integration.status).toBe("tested");
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("https://api.acme.example/v1/shows?limit=5");
    expect((init as RequestInit).redirect).toBe("manual");
    expect(((init as RequestInit).headers as Record<string, string>)["authorization"]).toBe("Bearer sk_owner");

    // Other accounts can't see, test, approve or delete it.
    expect((await request(app).get("/api/custom-integrations").set(as(otherId))).body).toEqual([]);
    expect((await request(app).post(`/api/custom-integrations/${id}/test`).set(as(otherId))).status).toBe(404);
    expect((await request(app).post(`/api/custom-integrations/${id}/approve`).set(as(otherId))).status).toBe(404);
    expect((await request(app).delete(`/api/custom-integrations/${id}`).set(as(otherId))).status).toBe(404);

    const a = await request(app).post(`/api/custom-integrations/${id}/approve`).set(as(ownerId));
    expect(a.body.status).toBe("approved");
    const caps = await request(app).get("/api/capabilities").set(as(ownerId));
    expect(caps.body.capabilities.find((x: { key: string }) => x.key === "podcast_hosting")).toMatchObject({ status: "ready" });
    expect((await request(app).get("/api/capabilities").set(as(otherId))).body.capabilities.find((x: { key: string }) => x.key === "podcast_hosting")).toBeUndefined();

    fetchSpy.mockResolvedValueOnce(ok({ id: 9 }, 201));
    expect(await runIntegrationAction(ownerId, "acme_podcasts", "createEpisode", { showId: "a/b", body: { title: "Ep 1" } })).toEqual({ status: 201, data: { id: 9 } });
    const [u2, i2] = fetchSpy.mock.calls[1]!;
    expect(String(u2)).toBe("https://api.acme.example/v1/shows/a%2Fb/episodes");
    expect((i2 as RequestInit).body).toBe(JSON.stringify({ title: "Ep 1" }));
    expect(await runIntegrationAction(ownerId, "acme_podcasts", "deleteEverything", {})).toMatchObject({ error: expect.stringContaining("Unknown action") });
    expect(await runIntegrationAction(otherId, "acme_podcasts", "listShows", {})).toMatchObject({ error: expect.stringContaining("No custom integration") });

    // Redirects aren't followed, and a host that resolves to a private address is refused.
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "http://169.254.169.254/" } }));
    expect(await runIntegrationAction(ownerId, "acme_podcasts", "listShows", {})).toMatchObject({ error: expect.stringContaining("redirect") });
    resolved.address = "10.0.0.5";
    expect(await runIntegrationAction(ownerId, "acme_podcasts", "listShows", {})).toMatchObject({ error: expect.stringContaining("private") });
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    // Editing sends it back to draft, so it needs a new test and approval.
    const e = await request(app).post("/api/custom-integrations").set(as(ownerId)).send({ ...def, actions: [...def.actions, { name: "getShow", method: "GET", path: "/shows/{id}" }] });
    expect(e.body).toMatchObject({ id, status: "draft", lastTest: null });
    expect(await runIntegrationAction(ownerId, "acme_podcasts", "listShows", {})).toMatchObject({ error: expect.stringContaining("isn't approved") });
    expect((await request(app).delete(`/api/custom-integrations/${id}`).set(as(ownerId))).status).toBe(204);
  });
});
