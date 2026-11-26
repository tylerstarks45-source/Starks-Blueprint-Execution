/** Generated landing pages run in an opaque origin, away from signed-in sessions. */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import { db, usersTable, landingPagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

let ownerId: number;
let pageId: number;
const slug = `isolation-${Date.now()}`;
const auth = () => ({ Authorization: `Bearer ${jwt.sign({ sub: ownerId, email: "", role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!)}` });

beforeAll(async () => {
  const [u] = await db.insert(usersTable).values({ email: `gen_iso_${Date.now()}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" }).returning({ id: usersTable.id });
  ownerId = u!.id;
  const [p] = await db.insert(landingPagesTable).values({ userId: ownerId, title: "Isolation", slug, isPublished: true, htmlContent: "<html><body><form method='post'></form></body></html>" }).returning({ id: landingPagesTable.id });
  pageId = p!.id;
}, 120_000);
afterAll(async () => { await db.delete(usersTable).where(eq(usersTable.id, ownerId)); });

describe("generated content isolation", () => {
  it("sandboxes published pages and owner previews", async () => {
    const published = await request(app).get(`/api/pages/${slug}`);
    expect(published.status).toBe(200);
    expect(published.headers["content-security-policy"]).toMatch(/^sandbox allow-forms allow-scripts allow-popups allow-popups-to-escape-sandbox;/);
    expect(published.headers["content-security-policy"]).not.toContain("allow-same-origin");

    const preview = await request(app).get(`/api/landing-pages/${pageId}/preview-html`).set(auth());
    expect(preview.status).toBe(200);
    expect(preview.headers["content-security-policy"]).toMatch(/^sandbox allow-forms allow-scripts allow-popups allow-popups-to-escape-sandbox;/);
  });

  it("accepts form posts from the sandboxed page without sharing credentials", async () => {
    const res = await request(app).post(`/api/landing-pages/${pageId}/submit`).set("Origin", "null").set("Accept", "application/json").send({ email: "visitor@example.com" });
    expect(res.status).not.toBe(403);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
    expect(res.headers["access-control-allow-credentials"]).toBeUndefined();
  });

  it("still rejects opaque origins on signed-in API routes", async () => {
    const res = await request(app).get("/api/landing-pages").set("Origin", "null").set(auth());
    expect(res.status).toBe(403);
  });
});
