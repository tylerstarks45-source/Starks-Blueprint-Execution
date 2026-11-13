import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { and, eq, inArray } from "drizzle-orm";
import { db, usersTable, businessesTable, userMemoryTable, openrouterUsageTable, creditTransactionsTable } from "@workspace/db";
import app from "../app";
import { ASH_STYLE_KEY, emptyProfile, familiarity, loadStyleProfile, personaNote, recordUserMessage, updateProfile } from "../lib/ash-agent/persona";
import { level } from "../routes/ash-insights";

const fetchSpy = vi.spyOn(globalThis, "fetch");
let userId: number;
let otherId: number;
let token: string;

const reply = (message: Record<string, unknown>) =>
  new Response(JSON.stringify({ model: "test/model", choices: [{ message }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

beforeAll(async () => {
  process.env["OPENROUTER_API_KEY"] = "test-key";
  const stamp = Date.now();
  const [u, o] = await db
    .insert(usersTable)
    .values([
      { email: `insights_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter", creditsBalance: 100 },
      { email: `insights_other_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" },
    ])
    .returning({ id: usersTable.id });
  userId = u.id;
  otherId = o.id;
  await db.insert(businessesTable).values({ ownerId: otherId, name: "Other Co", businessType: "agency" });
  await db.insert(userMemoryTable).values([
    { userId, memoryKey: "goal", memoryValue: "grow to 10k/mo" },
    { userId: otherId, memoryKey: "secret", memoryValue: "x" },
    { userId: otherId, memoryKey: "secret2", memoryValue: "y" },
  ]);
  token = jwt.sign({ sub: userId, email: "", role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!);
});
afterEach(() => fetchSpy.mockReset());
afterAll(async () => {
  await db.delete(businessesTable).where(eq(businessesTable.ownerId, otherId));
  for (const id of [userId, otherId]) {
    await db.delete(creditTransactionsTable).where(eq(creditTransactionsTable.userId, id));
    await db.delete(openrouterUsageTable).where(eq(openrouterUsageTable.userId, id));
  }
  await db.delete(usersTable).where(inArray(usersTable.id, [userId, otherId]));
});

describe("ASH persona", () => {
  it("learns a casual, short, emoji style and mirrors more strongly with familiarity", () => {
    let p = emptyProfile();
    expect(personaNote(p)).toContain("Personality: you are ASH");
    expect(personaNote(p)).not.toContain("This user");
    for (let i = 0; i < 5; i++) p = updateProfile(p, "yo gonna launch it 🔥!");
    const note = personaNote(p);
    expect(note).toContain("short, punchy");
    expect(note).toContain("casually");
    expect(note).toContain("emojis");
    expect(note).toContain("Adapt lightly");
    for (let i = 0; i < 40; i++) p = updateProfile(p, "yo gonna launch it 🔥!");
    expect(familiarity(p)).toBe(90);
    expect(personaNote(p)).toContain("Mirror their style closely");
  });

  it("detects a formal, detailed writer", () => {
    let p = emptyProfile();
    const long = "Please prepare a detailed analysis of the quarterly revenue figures ".repeat(8);
    for (let i = 0; i < 4; i++) p = updateProfile(p, long);
    expect(personaNote(p)).toContain("thorough replies");
    expect(personaNote(p)).toContain("formally");
  });

  it("caps activity levels at 100", () => {
    expect(level(0, 10)).toBe(0);
    expect(level(5, 10)).toBe(50);
    expect(level(50, 10)).toBe(100);
  });
});

describe("POST /api/ash/agent personality + page context", () => {
  it("adds personality, current page and navigate tool, then records the user's style", async () => {
    fetchSpy.mockResolvedValueOnce(reply({ role: "assistant", content: "On it." }));
    const res = await request(app)
      .post("/api/ash/agent")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "yo take me to my stats", page: "/builder" });
    expect(res.status).toBe(200);
    const body = JSON.parse(String(fetchSpy.mock.calls[0]![1]!.body));
    const system = body.messages[0].content as string;
    expect(system).toContain("Personality: you are ASH");
    expect(system).toContain("currently on the /builder page");
    const nav = body.tools.find((t: { function: { name: string } }) => t.function.name === "navigate");
    expect(nav.function.parameters.properties.path.enum).toContain("/stats");

    let row: { value: string } | undefined;
    for (let i = 0; i < 20 && !row; i++) {
      [row] = await db
        .select({ value: userMemoryTable.memoryValue })
        .from(userMemoryTable)
        .where(and(eq(userMemoryTable.userId, userId), eq(userMemoryTable.memoryKey, ASH_STYLE_KEY)));
      if (!row) await new Promise((r) => setTimeout(r, 25));
    }
    expect(JSON.parse(row!.value).messages).toBe(1);
  });

  it("returns navigate as a client action", async () => {
    fetchSpy
      .mockResolvedValueOnce(reply({ role: "assistant", content: null, tool_calls: [{ id: "n1", type: "function", function: { name: "navigate", arguments: JSON.stringify({ path: "/stats" }) } }] }))
      .mockResolvedValueOnce(reply({ role: "assistant", content: "Here are your stats." }));
    const res = await request(app).post("/api/ash/agent").set("Authorization", `Bearer ${token}`).send({ message: "stats please" });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).toContain("/stats");
  });

  it("dock surface only offers navigation among client tools", async () => {
    fetchSpy.mockResolvedValueOnce(reply({ role: "assistant", content: "Sure." }));
    const res = await request(app).post("/api/ash/agent").set("Authorization", `Bearer ${token}`).send({ message: "hi", surface: "dock" });
    expect(res.status).toBe(200);
    const body = JSON.parse(String(fetchSpy.mock.calls[0]![1]!.body));
    const names = body.tools.map((t: { function: { name: string } }) => t.function.name);
    expect(names).toContain("navigate");
    expect(names).toContain("list_businesses");
    expect(names).not.toContain("image");
    expect(body.messages[0].content).toContain("quick-access dock");
  });

  it("rejects a malformed page value", async () => {
    const res = await request(app).post("/api/ash/agent").set("Authorization", `Bearer ${token}`).send({ message: "hi", page: "javascript:alert(1)" });
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("style profile writes", () => {
  it("overlapping updates keep every message in a single row", async () => {
    const before = (await loadStyleProfile(otherId))?.messages ?? 0;
    await Promise.all(Array.from({ length: 5 }, () => recordUserMessage(otherId, "hello there")));
    const rows = await db.select().from(userMemoryTable).where(and(eq(userMemoryTable.userId, otherId), eq(userMemoryTable.memoryKey, ASH_STYLE_KEY)));
    expect(rows).toHaveLength(1);
    expect(JSON.parse(rows[0]!.memoryValue).messages).toBe(before + 5);
  });
});

describe("insight endpoints", () => {
  it("require authentication", async () => {
    expect((await request(app).get("/api/ash/brain-activity")).status).toBe(401);
    expect((await request(app).get("/api/ash/stats")).status).toBe(401);
  });

  it("brain activity only counts the caller's own data", async () => {
    const res = await request(app).get("/api/ash/brain-activity").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    const memory = res.body.subsystems.find((s: { key: string }) => s.key === "memory");
    // own "goal" row + the style profile written by the agent test above
    expect(memory.total).toBe(2);
    expect(res.body.subsystems.map((s: { key: string }) => s.key)).toEqual(
      expect.arrayContaining(["reasoning", "memory", "knowledge", "research", "planning", "recommendations", "learning"]),
    );
    expect(res.body.persona.messages).toBeGreaterThanOrEqual(1);
    expect(res.body.health).toHaveProperty("overall");
    expect(typeof res.body.health.generatedAt).toBe("string");
    expect(Array.isArray(res.body.health.brains)).toBe(true);
  });

  it("stats are scoped to the caller", async () => {
    const res = await request(app).get("/api/ash/stats").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.portfolio.businesses).toBe(0);
    expect(res.body.account.credits).toBeGreaterThan(0);
    expect(res.body.ash.memories).toBe(2);
  });
});
