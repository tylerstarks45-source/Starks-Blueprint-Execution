/**
 * Generated images are stored durably and served at a public, unguessable URL
 * (not data: URIs), so the gallery stays small and social posts can attach them.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { db, usersTable, generatedFilesTable, mediaBlobsTable, openrouterUsageTable, creditTransactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import app from "../app";

const fetchSpy = vi.spyOn(globalThis, "fetch");
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
let userId: number;
let token: string;

beforeAll(async () => {
  process.env["OPENROUTER_API_KEY"] = "test-key";
  const [u] = await db
    .insert(usersTable)
    .values({ email: `media_${Date.now()}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter", creditsBalance: 100 })
    .returning({ id: usersTable.id });
  userId = u.id;
  token = jwt.sign({ sub: userId, email: "", role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!);
});
afterEach(() => fetchSpy.mockReset());
afterAll(async () => {
  await db.delete(generatedFilesTable).where(eq(generatedFilesTable.userId, userId));
  await db.delete(mediaBlobsTable).where(eq(mediaBlobsTable.userId, userId));
  await db.delete(creditTransactionsTable).where(eq(creditTransactionsTable.userId, userId));
  await db.delete(openrouterUsageTable).where(eq(openrouterUsageTable.userId, userId));
  await db.delete(usersTable).where(eq(usersTable.id, userId));
});

describe("generated media storage", () => {
  it("stores generated images and serves them publicly by token", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [{ b64_json: png.toString("base64") }] }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    const res = await request(app).post("/api/media-gen/image").set("Authorization", `Bearer ${token}`).send({ prompt: "a fox" });
    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/^\/api\/media\/blob\/[0-9a-f]{32}$/);

    const blob = await request(app).get(res.body.url).buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = [];
      r.on("data", (c: Buffer) => chunks.push(c));
      r.on("end", () => cb(null, Buffer.concat(chunks)));
    });
    expect(blob.status).toBe(200);
    expect(blob.headers["content-type"]).toBe("image/png");
    expect(blob.headers["x-content-type-options"]).toBe("nosniff");
    expect(Buffer.compare(blob.body as Buffer, png)).toBe(0);

    const gallery = await request(app).get("/api/media-gen/gallery").set("Authorization", `Bearer ${token}`);
    expect(gallery.body[0].content).toBe(res.body.url);

    const del = await request(app).delete(`/api/ai-orchestrator/files/${gallery.body[0].id}`).set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(204);
    expect((await request(app).get(res.body.url)).status).toBe(404);
  });

  it("uses APP_URL, then REPLIT_DOMAINS, for absolute links", async () => {
    const { mediaUrlFor } = await import("../lib/media-store");
    process.env["APP_URL"] = "https://starksglobalgroup.net/";
    expect(mediaUrlFor("ab")).toBe("https://starksglobalgroup.net/api/media/blob/ab");
    delete process.env["APP_URL"];
    process.env["REPLIT_DOMAINS"] = "sbep.replit.app,other.example";
    expect(mediaUrlFor("ab")).toBe("https://sbep.replit.app/api/media/blob/ab");
    delete process.env["REPLIT_DOMAINS"];
  });

  it("deleting a file that points at another account's blob leaves the blob alone", async () => {
    const [other] = await db
      .insert(usersTable)
      .values({ email: `media_other_${Date.now()}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" })
      .returning({ id: usersTable.id });
    const { storeMedia } = await import("../lib/media-store");
    const url = await storeMedia(other.id, png, "image/png");
    const [file] = await db.insert(generatedFilesTable).values({ userId, name: "x", fileType: "image", content: url }).returning({ id: generatedFilesTable.id });
    expect((await request(app).delete(`/api/ai-orchestrator/files/${file!.id}`).set("Authorization", `Bearer ${token}`)).status).toBe(204);
    expect((await request(app).get(url)).status).toBe(200);
    await db.delete(mediaBlobsTable).where(eq(mediaBlobsTable.userId, other.id));
    await db.delete(usersTable).where(eq(usersTable.id, other.id));
  });

  it("404s on unknown or malformed tokens", async () => {
    expect((await request(app).get(`/api/media/blob/${"0".repeat(32)}`)).status).toBe(404);
    expect((await request(app).get("/api/media/blob/not-a-token")).status).toBe(404);
  });
});
