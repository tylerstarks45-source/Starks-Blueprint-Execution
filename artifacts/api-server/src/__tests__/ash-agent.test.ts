/**
 * ASH native tool calling: server tools run scoped to the caller and feed back
 * to the model; workspace tools come back as SBEP_DATA tool_calls.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { db, usersTable, businessesTable, openrouterUsageTable, creditTransactionsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import app from "../app";

const fetchSpy = vi.spyOn(globalThis, "fetch");
let userId: number;
let otherId: number;
let ownBiz: number;
let otherBiz: number;
let token: string;

const reply = (message: Record<string, unknown>) =>
  new Response(JSON.stringify({ model: "test/model", choices: [{ message }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
const call = (id: string, name: string, args: unknown) => ({ id, type: "function", function: { name, arguments: JSON.stringify(args) } });
const sentBody = (i: number) => JSON.parse(String(fetchSpy.mock.calls[i]![1]!.body));

beforeAll(async () => {
  process.env["OPENROUTER_API_KEY"] = "test-key";
  const stamp = Date.now();
  const [u, o] = await db
    .insert(usersTable)
    .values([
      { email: `agent_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter", creditsBalance: 100 },
      { email: `agent_other_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" },
    ])
    .returning({ id: usersTable.id });
  userId = u.id;
  otherId = o.id;
  const [b1, b2] = await db
    .insert(businessesTable)
    .values([
      { ownerId: userId, name: "Own Shop", businessType: "ecommerce" },
      { ownerId: otherId, name: "Someone Else Co", businessType: "agency" },
    ])
    .returning({ id: businessesTable.id });
  ownBiz = b1.id;
  otherBiz = b2.id;
  token = jwt.sign({ sub: userId, email: "", role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!);
});
afterEach(() => fetchSpy.mockReset());
afterAll(async () => {
  await db.delete(businessesTable).where(inArray(businessesTable.id, [ownBiz, otherBiz]));
  for (const id of [userId, otherId]) {
    await db.delete(creditTransactionsTable).where(eq(creditTransactionsTable.userId, id));
    await db.delete(openrouterUsageTable).where(eq(openrouterUsageTable.userId, id));
    await db.delete(usersTable).where(eq(usersTable.id, id));
  }
});

const ask = (message: string) => request(app).post("/api/ash/agent").set("Authorization", `Bearer ${token}`).send({ message });

describe("POST /api/ash/agent", () => {
  it("runs server tools for the caller only and returns workspace tools as tool_calls", async () => {
    fetchSpy
      .mockResolvedValueOnce(reply({ content: null, tool_calls: [call("c1", "list_businesses", {}), call("c2", "image", { prompt: "logo" })] }))
      .mockResolvedValueOnce(reply({ content: "You have one business, Own Shop." }));

    const res = await ask("What businesses do I have? Also make a logo.");
    expect(res.status).toBe(200);
    expect(res.body.content).toBe("You have one business, Own Shop.");
    expect(res.body.structuredData).toEqual({ action: "tool_calls", calls: [{ type: "image", prompt: "logo" }] });
    expect(res.body.steps).toEqual([{ tool: "list_businesses", ok: true }, { tool: "image", ok: true }]);

    const first = sentBody(0);
    expect(first.tools.map((t: { function: { name: string } }) => t.function.name)).toContain("get_business_context");
    expect(first.tool_choice).toBe("auto");
    const toolMsgs = sentBody(1).messages.filter((m: { role: string }) => m.role === "tool");
    expect(toolMsgs[0].tool_call_id).toBe("c1");
    expect(toolMsgs[0].content).toContain("Own Shop");
    expect(toolMsgs[0].content).not.toContain("Someone Else Co");
  });

  it("does not expose another user's business through get_business_context", async () => {
    fetchSpy
      .mockResolvedValueOnce(reply({ content: null, tool_calls: [call("c1", "get_business_context", { businessId: otherBiz })] }))
      .mockResolvedValueOnce(reply({ content: "Not found." }));
    const res = await ask(`Tell me about business ${otherBiz}`);
    expect(res.status).toBe(200);
    const toolMsg = sentBody(1).messages.find((m: { role: string }) => m.role === "tool");
    expect(toolMsg.content).toContain("Business not found");
    expect(toolMsg.content).not.toContain("Someone Else Co");
  });

  it("reports bad arguments and unknown tools back to the model instead of failing", async () => {
    fetchSpy
      .mockResolvedValueOnce(reply({ content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "research", arguments: "{oops" } }, call("c2", "drop_tables", {})] }))
      .mockResolvedValueOnce(reply({ content: "ok" }));
    const res = await ask("hi");
    expect(res.body.steps).toEqual([{ tool: "research", ok: false }, { tool: "drop_tables", ok: false }]);
  });

  it("stops offering tools after maxSteps so the loop always ends", async () => {
    for (let i = 0; i < 6; i++) fetchSpy.mockResolvedValueOnce(reply({ content: null, tool_calls: [call(`c${i}`, "list_businesses", {})] }));
    fetchSpy.mockResolvedValueOnce(reply({ content: "done" }));
    const res = await ask("loop");
    expect(res.body.content).toBe("done");
    expect(fetchSpy).toHaveBeenCalledTimes(7);
    expect(sentBody(6).tools).toBeUndefined();
  });

  it("sends schedule_post as the platform_action the workspace runs", async () => {
    fetchSpy
      .mockResolvedValueOnce(reply({ content: null, tool_calls: [call("c1", "schedule_post", { platform: "twitter", content: "hi", scheduledAt: "2030-01-01T00:00:00Z" })] }))
      .mockResolvedValueOnce(reply({ content: "Scheduled." }));
    const res = await ask("post hi tomorrow");
    expect(res.body.structuredData.calls).toEqual([
      { type: "platform_action", tool: "schedule_social_post", params: { platform: "twitter", content: "hi", scheduledAt: "2030-01-01T00:00:00Z" } },
    ]);
  });

  it("requires login", async () => {
    const res = await request(app).post("/api/ash/agent").send({ message: "hi" });
    expect(res.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
