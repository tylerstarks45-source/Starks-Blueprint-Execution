/** ASH Live realtime sessions: auth, turns, speech chunks, barge-in, mission progress, memory isolation. */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import { WebSocket } from "ws";

const { turn, speak, hear } = vi.hoisted(() => ({ turn: vi.fn(), speak: vi.fn(), hear: vi.fn() }));
vi.mock("../lib/ash-agent", async (orig) => ({ ...(await orig<typeof import("../lib/ash-agent")>()), runAshTurn: (o: unknown) => turn(o) }));
vi.mock("../lib/openrouter-media", async (orig) => ({
  ...(await orig<typeof import("../lib/openrouter-media")>()),
  synthesizeSpeech: (o: { text: string }) => speak(o),
  transcribeAudio: (o: unknown) => hear(o),
}));

import app, { isAllowedOrigin } from "../app";
import { attachAshLive } from "../lib/ash-live/server";
import { cueForReply, toSpokenText } from "../lib/ash-live/protocol";
import { getTool } from "../lib/ash-agent/tools";
import { toolActionKind } from "../lib/ash-control/policy";
import { db, usersTable, userMemoryTable, ashMissionsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

let server: http.Server;
let close: () => void;
let url: string;
let ownerId: number;
let otherId: number;
let missionId: number;
const tokenFor = (id: number) => jwt.sign({ sub: id, email: "", role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!);
const reply = (content: string, steps: unknown[] = []) => ({ content, clientCalls: [], steps, model: "test" });

type Msg = { type: string; [k: string]: unknown };
function client(token = tokenFor(ownerId)) {
  const ws = new WebSocket(url, ['ash-live.v1', `auth.${token}`]);
  const got: Msg[] = [];
  const waiters: Array<() => void> = [];
  ws.on("message", (raw) => { got.push(JSON.parse(raw.toString())); waiters.splice(0).forEach((w) => w()); });
  const closed = new Promise<{ code: number }>((resolve) => ws.on("close", (code) => resolve({ code })));
  const opened = new Promise<void>((resolve, reject) => { ws.on("open", () => resolve()); ws.on("error", reject); });
  const next = (pred: (m: Msg) => boolean, ms = 8000) => new Promise<Msg>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out; got ${got.map((m) => m.type).join(",")}`)), ms);
    const check = () => { const m = got.find(pred); if (m) { clearTimeout(timer); resolve(m); } else waiters.push(check); };
    check();
  });
  const send = (m: Record<string, unknown>) => ws.send(JSON.stringify(m));
  return { ws, got, next, send, closed, opened };
}
async function signedIn(id = ownerId) {
  const c = client(tokenFor(id));
  await c.opened;
  expect(c.ws.protocol).toBe('ash-live.v1');
  await c.next((m) => m.type === "session.ready");
  return c;
}

beforeAll(async () => {
  const stamp = Date.now();
  const [o, x] = await db.insert(usersTable).values([
    { email: `live_owner_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" },
    { email: `live_other_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" },
  ]).returning({ id: usersTable.id });
  ownerId = o!.id; otherId = x!.id;
  await db.insert(userMemoryTable).values([
    { userId: ownerId, memoryKey: "favorite niche", memoryValue: "Owner loves pet products" },
    { userId: otherId, memoryKey: "favorite niche", memoryValue: "Other user secret: crypto courses" },
  ]);
  const [m] = await db.insert(ashMissionsTable).values({ userId: ownerId, goal: "Launch the pet store", status: "running", steps: [{ title: "Build the store", status: "pending" }] }).returning();
  missionId = m!.id;
  await db.insert(ashMissionsTable).values({ userId: otherId, goal: "Other user's mission", status: "running" });
  server = http.createServer(app);
  close = attachAshLive(server, { isAllowedOrigin });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  url = `ws://127.0.0.1:${(server.address() as AddressInfo).port}/api/ash-live`;
}, 120_000);
afterAll(async () => {
  close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await db.delete(usersTable).where(inArray(usersTable.id, [ownerId, otherId]));
});

describe("ASH Live protocol helpers", () => {
  it("pronounces ASH as a name and picks cues from fixed rules", () => {
    expect(toSpokenText("**ASH** here, from STARKS.")).toBe("Ash here, from Starks.");
    expect(cueForReply("Done.", [{ ok: true, approvalId: 3 }])).toEqual({ emotion: "focused", gesture: "explain" });
    expect(cueForReply("Congratulations on the first sale!", [])).toEqual({ emotion: "happy", gesture: "celebrate" });
    expect(cueForReply("Which store should I start with?", [])).toEqual({ emotion: "curious", gesture: "none" });
  });
});

describe("ASH Live sessions", () => {
  it("requires a valid token before anything else", async () => {
    const missing = new WebSocket(url);
    await expect(new Promise((resolve, reject) => { missing.on("open", resolve); missing.on("error", reject); })).rejects.toThrow(/401/);
    await expect(client("not-a-token").opened).rejects.toThrow(/401/);
    const foreign = new WebSocket(url, { headers: { Origin: "https://evil.example" } });
    await expect(new Promise((resolve, reject) => { foreign.on("open", resolve); foreign.on("error", reject); })).rejects.toThrow(/403/);
  });

  it("runs a turn with the owner's memory and missions only, then synthesizes the entire reply once", async () => {
    turn.mockResolvedValueOnce(reply("Hey! Your pet store is being built. I'll tell you when it's live."));
    speak.mockImplementation(async (o: { text: string }) => Buffer.from(`mp3:${o.text}`));
    const c = await signedIn();
    const snapshot = await c.next((m) => m.type === "tasks.snapshot");
    expect((snapshot.tasks as Array<{ goal: string }>).map((t) => t.goal)).toEqual(["Launch the pet store"]);

    c.send({ type: "user.text", text: "how is my pet niche going?", turnId: "t1" });
    await c.next((m) => m.type === "ash.turn.end" && m.turnId === "t1");
    const prompt = (turn.mock.calls[0]![0] as { systemPrompt: string }).systemPrompt;
    expect(prompt).toContain("Owner loves pet products");
    expect(prompt).toContain("Launch the pet store");
    expect(prompt).not.toContain("crypto courses");
    expect(prompt).not.toContain("Other user's mission");
    expect(prompt).toContain("You are speaking out loud");

    const types = c.got.filter((m) => m.turnId === "t1" || m.type === "avatar.state").map((m) => m.type === "avatar.state" ? `state:${m.state}` : m.type);
    expect(types).toEqual(["state:idle", "state:thinking", "avatar.cue", "transcript.user", "ash.text", "avatar.cue", "state:speaking", "ash.speech", "ash.turn.end", "state:idle"]);
    const speech = c.got.filter((m) => m.type === "ash.speech");
    expect(speech.map((m) => [m.seq, m.text, m.last])).toEqual([[0, "Hey! Your pet store is being built. I'll tell you when it's live.", true]]);
    expect(Buffer.from(String(speech[0]!.audioBase64), "base64").toString()).toBe(`mp3:${speech[0]!.text}`);
    expect(speak).toHaveBeenCalledTimes(1);
    c.ws.close();
  });

  it("stops speaking the moment the user starts talking", async () => {
    turn.mockResolvedValueOnce(reply("First sentence. Second sentence that is long enough to stay separate."));
    let release!: () => void;
    speak.mockImplementationOnce(() => new Promise<Buffer>((resolve) => { release = () => resolve(Buffer.from("b")); }));
    const c = await signedIn();
    c.send({ type: "user.text", text: "tell me something", turnId: "t2" });
    await c.next((m) => m.type === "ash.text" && m.turnId === "t2");
    c.send({ type: "user.speech_start" });
    const end = await c.next((m) => m.type === "ash.turn.end" && m.turnId === "t2");
    expect(end.interrupted).toBe(true);
    release();
    await new Promise((r) => setTimeout(r, 200));
    expect(c.got.filter((m) => m.type === "ash.speech" && m.turnId === "t2")).toHaveLength(0);
    expect(c.got.filter((m) => m.type === "ash.turn.end" && m.turnId === "t2")).toHaveLength(1);
    expect(c.got.at(-1)).toMatchObject({ type: "avatar.state", state: "listening" });
    c.ws.close();
  });

  it("transcribes voice turns and pushes mission progress while connected", async () => {
    hear.mockResolvedValueOnce("what are you working on");
    turn.mockResolvedValueOnce(reply("Building your store."));
    const c = await signedIn();
    c.send({ type: "session.start", speak: false });
    await c.next((m) => m.type === "session.updated");
    c.send({ type: "user.audio", audioBase64: Buffer.from("webm").toString("base64"), mimeType: "audio/webm", turnId: "t3" });
    expect((await c.next((m) => m.type === "transcript.user")).text).toBe("what are you working on");
    await c.next((m) => m.type === "ash.turn.end" && m.turnId === "t3");
    expect(c.got.some((m) => m.type === "ash.speech")).toBe(false);

    await db.update(ashMissionsTable).set({ status: "waiting_owner", waitingFor: "Connect Shopify", steps: [{ title: "Build the store", status: "done" }] }).where(eq(ashMissionsTable.id, missionId));
    const progress = await c.next((m) => m.type === "task.progress", 9000);
    expect(progress).toMatchObject({ missionId, status: "waiting_owner", stepsDone: 1, stepsTotal: 1, waitingFor: "Connect Shopify" });
    c.ws.close();
  }, 20_000);

  it("stops accepting turns after the authorization token is revoked", async () => {
    const c = await signedIn();
    try {
      await db.update(usersTable).set({ tokenVersion: 2 }).where(eq(usersTable.id, ownerId));
      const calls = turn.mock.calls.length;
      c.send({ type: "user.text", text: "What are you doing?", turnId: "revoked" });
      expect((await c.closed).code).toBe(4401);
      expect(turn.mock.calls).toHaveLength(calls);
    } finally {
      await db.update(usersTable).set({ tokenVersion: 1 }).where(eq(usersTable.id, ownerId));
      c.ws.close();
    }
  });
});

describe("ASH memory tools", () => {
  it("remembers, recalls and forgets only the caller's own memories", async () => {
    const run = (name: string, userId: number, args: Record<string, unknown>) => getTool(name)!.run!(userId, args);
    expect(await run("remember", ownerId, { topic: "Answer style", fact: "Prefers short spoken answers" })).toMatchObject({ remembered: true });
    const found = (await run("recall_memory", ownerId, { query: "answer style short" })) as Array<{ id: number; topic: string; fact: string }>;
    const saved = found.find((m) => m.fact === "Prefers short spoken answers")!;
    expect(saved.topic).toBe("answer style");
    const theirs = (await run("recall_memory", otherId, { query: "answer style short pet" })) as Array<{ fact: string }>;
    expect(theirs.map((m) => m.fact)).not.toContain("Prefers short spoken answers");
    expect(theirs.map((m) => m.fact)).not.toContain("Owner loves pet products");
    const manual = found.find((m) => m.fact === "Owner loves pet products")!;
    expect(await run("remember", otherId, { memoryId: manual.id, fact: "Not mine" })).toEqual({ error: "Memory not found" });
    expect(await run("remember", ownerId, { memoryId: manual.id, fact: "Owner now prefers garden products" })).toMatchObject({ corrected: true });
    const [record] = await db.select().from(userMemoryTable).where(eq(userMemoryTable.id, manual.id));
    expect(record?.memoryValue).toBe("Owner now prefers garden products");
    expect(await run("forget_memory", otherId, { memoryId: saved.id })).toEqual({ error: "Memory not found" });
    expect(await run("forget_memory", ownerId, { memoryId: saved.id })).toEqual({ forgotten: true });
    expect(toolActionKind("forget_memory")).toBe("delete");
    expect(toolActionKind("remember")).toBe("build");
  });
});
