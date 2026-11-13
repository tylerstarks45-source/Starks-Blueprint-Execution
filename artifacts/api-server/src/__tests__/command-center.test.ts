/**
 * Command-center contract: owner-scoped scene snapshot and spoken ASH turns.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { db, usersTable, businessesTable, openrouterUsageTable, creditTransactionsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import app from "../app";
import { toSpokenText } from "../routes/command-center";
import { MODELS } from "../lib/models";

const fetchSpy = vi.spyOn(globalThis, "fetch");
let userId: number;
let otherId: number;
let bizIds: number[] = [];
let token: string;

const chat = (content: string) =>
  new Response(JSON.stringify({ model: "test/model", choices: [{ message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
const audio = () => new Response(Buffer.from("ID3fake"), { status: 200, headers: { "Content-Type": "audio/mpeg" } });

beforeAll(async () => {
  process.env["OPENROUTER_API_KEY"] = "test-key";
  const stamp = Date.now();
  const [u, o] = await db
    .insert(usersTable)
    .values([
      { email: `cc_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "free", creditsBalance: 100 },
      { email: `cc_other_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "free" },
    ])
    .returning({ id: usersTable.id });
  userId = u.id;
  otherId = o.id;
  const rows = await db
    .insert(businessesTable)
    .values([
      { ownerId: userId, name: "Own Shop", businessType: "ecommerce" },
      { ownerId: otherId, name: "Someone Else Co", businessType: "agency" },
    ])
    .returning({ id: businessesTable.id });
  bizIds = rows.map((r) => r.id);
  token = jwt.sign({ sub: userId, email: "", role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!);
});
afterEach(() => fetchSpy.mockReset());
afterAll(async () => {
  await db.delete(businessesTable).where(inArray(businessesTable.id, bizIds));
  for (const id of [userId, otherId]) {
    await db.delete(creditTransactionsTable).where(eq(creditTransactionsTable.userId, id));
    await db.delete(openrouterUsageTable).where(eq(openrouterUsageTable.userId, id));
    await db.delete(usersTable).where(eq(usersTable.id, id));
  }
});

const turn = (body: Record<string, unknown>) => request(app).post("/api/command-center/turn").set("Authorization", `Bearer ${token}`).send(body);

describe("command center", () => {
  it("context lists only the caller's businesses", async () => {
    const res = await request(app).get("/api/command-center/context").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.protocol).toBe(1);
    expect(res.body.businesses.map((b: { name: string }) => b.name)).toEqual(["Own Shop"]);
    expect(JSON.stringify(res.body)).not.toContain("Someone Else Co");
  });

  it("turn returns ASH's answer with OpenRouter speech of the plain text", async () => {
    fetchSpy.mockResolvedValueOnce(chat("**Revenue** is not measured yet.")).mockResolvedValueOnce(audio());
    const res = await turn({ message: "How is revenue?" });
    expect(res.status).toBe(200);
    expect(res.body.text).toBe("**Revenue** is not measured yet.");
    expect(res.body.spokenText).toBe("Revenue is not measured yet.");
    expect(res.body.speech).toEqual({ audioBase64: Buffer.from("ID3fake").toString("base64"), mimeType: "audio/mpeg", voice: "onyx" });
    expect(String(fetchSpy.mock.calls[1]![0])).toBe("https://openrouter.ai/api/v1/audio/speech");
    expect(JSON.parse(String(fetchSpy.mock.calls[1]![1]!.body)).input).toBe("Revenue is not measured yet.");
  });

  it("keeps the text answer when speech fails, and skips speech when speak=false", async () => {
    fetchSpy.mockResolvedValueOnce(chat("Hello.")).mockResolvedValueOnce(new Response("boom", { status: 500 }));
    const failed = await turn({ message: "hi" });
    expect(failed.status).toBe(200);
    expect(failed.body).toMatchObject({ text: "Hello.", speech: null, speechError: "unavailable" });

    fetchSpy.mockResolvedValueOnce(chat("Hello."));
    const silent = await turn({ message: "hi", speak: false });
    expect(silent.body).toMatchObject({ text: "Hello.", speech: null, speechError: null });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("applies the membership-tier gate to premium modes", async () => {
    fetchSpy.mockResolvedValueOnce(chat("ok"));
    await turn({ message: "hi", mode: "empire", speak: false });
    expect(JSON.parse(String(fetchSpy.mock.calls[0]![1]!.body)).model).not.toBe(MODELS.flagship);
  });

  it("requires login", async () => {
    expect((await request(app).get("/api/command-center/context")).status).toBe(401);
    expect((await request(app).post("/api/command-center/turn").send({ message: "hi" })).status).toBe(401);
  });
});

describe("toSpokenText", () => {
  it("strips markdown, links and code", () => {
    expect(toSpokenText("# Plan\n- see [docs](http://x)\n```js\ncode\n```\n`a` done")).toBe("Plan see docs a done");
  });
});
