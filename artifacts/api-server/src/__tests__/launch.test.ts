/** Launch tools: allow-listed server-side connector actions with owner credentials, vault registration. */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import { db, usersTable, userCredentialsTable, canonicalAssets, businessesTable } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { encrypt } from "../lib/crypto";
import { runLaunchAction, launchActionKind } from "../lib/launch";
import { WordPressConnector } from "../lib/connectors/wordpress-connector";
import { BeehiivConnector } from "../lib/connectors/beehiiv-connector";

let ownerId: number;
let otherId: number;
let bizId: number;
const as = (id: number) => ({ Authorization: `Bearer ${jwt.sign({ sub: id, email: "", role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!)}` });

beforeAll(async () => {
  const stamp = Date.now();
  const [o, x] = await db.insert(usersTable).values([
    { email: `launch_owner_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" },
    { email: `launch_other_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" },
  ]).returning({ id: usersTable.id });
  ownerId = o!.id; otherId = x!.id;
  const [b] = await db.insert(businessesTable).values({ ownerId, name: "Launch Co", businessType: "other", origin: "imported" }).returning();
  bizId = b!.id;
  await db.insert(userCredentialsTable).values([
    { userId: ownerId, credentialKey: "WORDPRESS_SITE_URL", encryptedValue: encrypt("https://blog.example.com"), status: "connected" },
    { userId: ownerId, credentialKey: "WORDPRESS_USERNAME", encryptedValue: encrypt("owner"), status: "connected" },
    { userId: ownerId, credentialKey: "WORDPRESS_APP_PASSWORD", encryptedValue: encrypt("app-pass"), status: "connected" },
  ]);
}, 120_000);
afterAll(async () => { vi.restoreAllMocks(); await db.delete(usersTable).where(inArray(usersTable.id, [ownerId, otherId])); });

describe("launch tools", () => {
  it("runs an allow-listed action with the owner's credentials and saves it to the vault", async () => {
    const spy = vi.spyOn(WordPressConnector.prototype, "execute").mockImplementation(async function (this: WordPressConnector) {
      expect((this as unknown as { creds: Record<string, string> }).creds["WORDPRESS_APP_PASSWORD"]).toBe("app-pass");
      return { ok: true, data: { id: 7, url: "https://blog.example.com/launch", title: "Launch" } };
    });
    const r = await runLaunchAction(ownerId, { connectorId: "wordpress", action: "createPage", params: { title: "Launch", content: "<p>Hi</p>" }, businessId: bizId });
    expect(r).toMatchObject({ launched: true, url: "https://blog.example.com/launch" });
    expect(spy).toHaveBeenCalledWith("createPage", { title: "Launch", content: "<p>Hi</p>" });
    const [asset] = await db.select().from(canonicalAssets).where(eq(canonicalAssets.id, (r as { assetId: number }).assetId));
    expect(asset).toMatchObject({ userId: ownerId, businessId: bizId, classKey: "page", canonicalName: "Launch", externalUrl: "https://blog.example.com/launch", status: "draft" });
    const live = await runLaunchAction(ownerId, { connectorId: "wordpress", action: "createPage", params: { title: "Live", status: "publish" } });
    expect(live).toMatchObject({ launched: true, status: "active" });
    await db.update(userCredentialsTable).set({ encryptedValue: encrypt("https://other.example.com") })
      .where(and(eq(userCredentialsTable.userId, ownerId), eq(userCredentialsTable.credentialKey, "WORDPRESS_SITE_URL")));
    const otherSite = await runLaunchAction(ownerId, { connectorId: "wordpress", action: "createPage", params: { title: "Other" } }) as { assetId: number };
    expect(otherSite.assetId).not.toBe((r as { assetId: number }).assetId);
    await db.update(userCredentialsTable).set({ encryptedValue: encrypt("https://blog.example.com") })
      .where(and(eq(userCredentialsTable.userId, ownerId), eq(userCredentialsTable.credentialKey, "WORDPRESS_SITE_URL")));
  });

  it("keeps one vault entry when a newsletter draft is later sent", async () => {
    await db.insert(userCredentialsTable).values([
      { userId: ownerId, credentialKey: "BEEHIIV_API_KEY", encryptedValue: encrypt("k"), status: "connected" },
      { userId: ownerId, credentialKey: "BEEHIIV_PUBLICATION_ID", encryptedValue: encrypt("pub_1"), status: "connected" },
    ]);
    vi.spyOn(BeehiivConnector.prototype, "validateCredentials").mockReturnValue(true);
    vi.spyOn(BeehiivConnector.prototype, "execute").mockImplementation(async (action: string) =>
      action === "createPost" ? { ok: true, data: { id: "post_9", title: "Issue 1", status: "draft" } } : { ok: true, data: { id: "post_9", status: "confirmed" } });
    const draft = await runLaunchAction(ownerId, { connectorId: "beehiiv", action: "createPost", params: { title: "Issue 1" } }) as { assetId: number; status: string };
    const sent = await runLaunchAction(ownerId, { connectorId: "beehiiv", action: "sendPost", params: { postId: "post_9" } }) as { assetId: number; status: string };
    expect(draft.status).toBe("draft");
    expect(sent.assetId).toBe(draft.assetId);
    const [asset] = await db.select().from(canonicalAssets).where(eq(canonicalAssets.id, draft.assetId));
    expect(asset).toMatchObject({ canonicalName: "Issue 1", status: "active" });
  });

  it("refuses unlisted actions, missing connections, other owners' businesses and oversized content", async () => {
    expect(await runLaunchAction(ownerId, { connectorId: "wordpress", action: "updatePost", params: {} })).toHaveProperty("error");
    expect(await runLaunchAction(ownerId, { connectorId: "stripe", action: "createPaymentLink", params: {} })).toHaveProperty("error");
    expect(await runLaunchAction(otherId, { connectorId: "wordpress", action: "createPage", params: { title: "x" } })).toMatchObject({ needsConnection: "wordpress" });
    expect(await runLaunchAction(otherId, { connectorId: "wordpress", action: "createPage", params: {}, businessId: bizId })).toEqual({ error: "Business not found" });
    await db.update(userCredentialsTable).set({ status: "disconnected" }).where(and(eq(userCredentialsTable.userId, ownerId), eq(userCredentialsTable.credentialKey, "WORDPRESS_APP_PASSWORD")));
    expect(await runLaunchAction(ownerId, { connectorId: "wordpress", action: "createPage", params: { title: "x" } })).toMatchObject({ needsConnection: "wordpress" });
    await db.update(userCredentialsTable).set({ status: "connected" }).where(and(eq(userCredentialsTable.userId, ownerId), eq(userCredentialsTable.credentialKey, "WORDPRESS_APP_PASSWORD")));
    expect(await runLaunchAction(ownerId, { connectorId: "wordpress", action: "createPage", params: { content: "x".repeat(100_001) } })).toHaveProperty("error");
  });

  it("maps customer emails to the email approval kind and lists options per owner", async () => {
    expect(launchActionKind({ connectorId: "mailchimp", action: "sendCampaign" })).toBe("email_customers");
    expect(launchActionKind({ connectorId: "wordpress", action: "createPage" })).toBe("publish");
    expect(launchActionKind({ connectorId: "nope", action: "x" })).toBe("publish");
    const mine = (await request(app).get("/api/launch-options").set(as(ownerId))).body.options;
    const theirs = (await request(app).get("/api/launch-options").set(as(otherId))).body.options;
    expect(mine.find((o: { action: string }) => o.action === "createPage").ready).toBe(true);
    expect(theirs.find((o: { action: string }) => o.action === "createPage").ready).toBe(false);
  });
});
