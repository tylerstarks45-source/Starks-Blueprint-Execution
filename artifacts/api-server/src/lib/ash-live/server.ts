// ASH Live: one realtime WebSocket session per connected ASH body (web
// simulator, Unreal character, desktop, mobile). The intelligence is the same
// tool-using ASH agent as chat; this layer adds turn-taking, interruption,
// sentence-by-sentence speech, constrained animation cues and live progress
// from background missions.
import { randomUUID } from "node:crypto";
import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, WebSocket } from "ws";
import { runAshTurn } from "../ash-agent";
import { ASH_TOOLS, getTool } from "../ash-agent/tools";
import { buildAshSystemPrompt } from "../ash-agent/context";
import { recordUserMessage } from "../ash-agent/persona";
import { listMissions } from "../ash-missions";
import { synthesizeSpeech, transcribeAudio, audioFormatFor } from "../openrouter-media";
import { OutOfCreditsError, DailyAiLimitError } from "../credits";
import { verifyActiveToken } from "../auth";
import { logger } from "../logger";
import {
  ASH_LIVE_PATH, ASH_LIVE_PROTOCOL, AVATAR_STATES, EMOTIONS, GESTURES, LIVE_VOICES, DEFAULT_VOICE,
  ClientMessage, cueForReply, splitSpeech, toSpokenText,
} from "./protocol";

const AUTH_TIMEOUT_MS = 10_000;
const HEARTBEAT_MS = 30_000;
const PROGRESS_POLL_MS = 5_000;
const MAX_CONNECTIONS = 500;
const MAX_CONNECTIONS_PER_USER = 5;
const MAX_TURNS_PER_MINUTE = 20;
const MAX_HISTORY = 20;
const MAX_PAYLOAD = 12 * 1024 * 1024;

type Settings = { surface: "live" | "unreal" | "desktop" | "mobile" | "web"; page: string | null; speak: boolean; voice: string };
type Turn = { id: string; controller: AbortController };
const LIVE_TOOLS = ASH_TOOLS.map((tool) => tool.function.name)
  .filter((name) => getTool(name)?.kind !== "client" || name === "navigate");

const connections = new Map<number, Set<WebSocket>>();

function errorCode(err: unknown): { code: string; message: string } {
  if (err instanceof DailyAiLimitError) return { code: "daily_ai_limit", message: err.message };
  if (err instanceof OutOfCreditsError) return { code: "out_of_credits", message: "Out of credits" };
  return { code: "unavailable", message: "ASH is unavailable right now" };
}

class LiveSession {
  readonly id = randomUUID();
  userId: number | null = null;
  private token: string | null = null;
  private authenticating = false;
  private polling = false;
  private busy = false;
  settings: Settings = { surface: "live", page: null, speak: true, voice: DEFAULT_VOICE };
  history: Array<{ role: "user" | "assistant"; content: string }> = [];
  turn: Turn | null = null;
  turnTimes: number[] = [];
  progress = new Map<number, string>();
  timers: NodeJS.Timeout[] = [];
  alive = true;

  constructor(private ws: WebSocket) {
    this.timers.push(setTimeout(() => { if (this.userId === null) this.close(4401, "Authentication timed out"); }, AUTH_TIMEOUT_MS));
    ws.on("message", (raw, isBinary) => {
      if (this.ws.readyState !== WebSocket.OPEN) return;
      if (this.userId === null && Buffer.byteLength(raw.toString()) > 8192) { this.close(4401, "Authenticate first"); return; }
      void this.onMessage(raw.toString(), isBinary).catch(() => this.close(1011, "Session failed"));
    });
    ws.on("pong", () => { this.alive = true; });
    ws.on("close", () => this.dispose());
    ws.on("error", () => this.dispose());
  }

  send(type: string, data: Record<string, unknown> = {}): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type, ...data }));
  }
  state(state: (typeof AVATAR_STATES)[number]): void { this.send("avatar.state", { state }); }
  close(code: number, reason: string): void {
    this.turn?.controller.abort();
    this.ws.close(code, reason);
  }

  dispose(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    this.turn?.controller.abort();
    this.token = null;
    if (this.userId !== null) {
      const open = connections.get(this.userId);
      open?.delete(this.ws);
      if (open?.size === 0) connections.delete(this.userId);
    }
  }

  async onMessage(raw: string, isBinary: boolean): Promise<void> {
    let json: unknown;
    try { json = isBinary ? null : JSON.parse(raw); } catch { json = null; }
    const parsed = ClientMessage.safeParse(json);
    if (!parsed.success) { this.send("error", { code: "bad_message", message: "Unrecognised message" }); return; }
    const msg = parsed.data;
    if (this.userId === null) {
      if (msg.type !== "auth") { this.close(4401, "Authenticate first"); return; }
      await this.authenticate(msg.token);
      return;
    }
    switch (msg.type) {
      case "auth": return;
      case "ping": this.send("pong", { at: new Date().toISOString() }); return;
      case "session.start":
        this.settings = {
          surface: msg.surface ?? this.settings.surface,
          page: msg.page ?? this.settings.page,
          speak: msg.speak ?? this.settings.speak,
          voice: msg.voice ?? this.settings.voice,
        };
        this.send("session.updated", { settings: this.settings });
        return;
      case "user.speech_start":
        // Barge-in: the user started talking, so ASH stops speaking at once.
        if (this.turn) this.interrupt();
        this.state("listening");
        return;
      case "user.interrupt":
        if (this.turn) this.interrupt("idle"); else this.state("idle");
        return;
      case "user.text":
        return this.runTurn(msg.turnId ?? randomUUID(), { text: msg.text });
      case "user.audio":
        return this.runTurn(msg.turnId ?? randomUUID(), { audio: Buffer.from(msg.audioBase64, "base64"), mimeType: msg.mimeType });
    }
  }

  async authenticate(token: string): Promise<void> {
    if (this.authenticating) return;
    this.authenticating = true;
    const userId = await verifyActiveToken(token);
    if (this.ws.readyState !== WebSocket.OPEN) return;
    if (userId === null) { this.close(4401, "Unauthorized"); return; }
    const open = connections.get(userId) ?? new Set<WebSocket>();
    if (open.size >= MAX_CONNECTIONS_PER_USER) { this.close(4429, "Too many ASH Live sessions"); return; }
    open.add(this.ws);
    connections.set(userId, open);
    this.userId = userId;
    this.token = token;
    this.send("session.ready", {
      protocol: ASH_LIVE_PROTOCOL, sessionId: this.id, settings: this.settings,
      vocabulary: { states: AVATAR_STATES, emotions: EMOTIONS, gestures: GESTURES, voices: LIVE_VOICES },
    });
    this.state("idle");
    this.timers.push(setInterval(() => { void this.pollProgress(false); }, PROGRESS_POLL_MS));
    await this.pollProgress(true);
  }

  interrupt(state: "listening" | "idle" = "listening"): void {
    const turn = this.turn!;
    if (turn.controller.signal.aborted) return;
    turn.controller.abort();
    this.send("ash.turn.end", { turnId: turn.id, interrupted: true });
    this.state(state);
  }

  async runTurn(turnId: string, input: { text?: string; audio?: Buffer; mimeType?: string }): Promise<void> {
    const userId = this.userId!;
    if (this.busy) { this.send("error", { code: "turn_busy", message: "The previous turn is still finishing. Try again in a moment.", turnId }); return; }
    const now = Date.now();
    this.turnTimes = this.turnTimes.filter((t) => now - t < 60_000);
    if (this.turnTimes.length >= MAX_TURNS_PER_MINUTE) { this.send("error", { code: "rate_limited", message: "Slow down a little", turnId }); return; }
    this.turnTimes.push(now);
    this.busy = true;
    const turn: Turn = { id: turnId, controller: new AbortController() };
    const { signal } = turn.controller;
    const providerSignal = AbortSignal.any([signal, AbortSignal.timeout(90_000)]);
    const settings = this.settings;
    this.turn = turn;
    this.state("thinking");
    this.send("avatar.cue", { turnId, emotion: "focused", gesture: "think" });
    try {
      if (!this.token || await verifyActiveToken(this.token) !== userId) {
        this.close(4401, "Unauthorized");
        return;
      }
      signal.throwIfAborted();
      let text = input.text ?? "";
      if (input.audio) {
        text = (await transcribeAudio({ audio: input.audio, format: audioFormatFor(input.mimeType, input.audio), userId, signal: providerSignal })).trim();
        if (turn.controller.signal.aborted) return;
        if (!text) { this.finish(turn, { code: "no_speech", message: "I didn't catch that." }); return; }
        this.send("transcript.user", { turnId, text });
      }
      const systemPrompt = await buildAshSystemPrompt({ userId, message: text, surface: settings.surface, page: settings.page, spoken: settings.speak });
      signal.throwIfAborted();
      const result = await runAshTurn({ userId, message: text, history: this.history, systemPrompt, toolNames: LIVE_TOOLS, signal: providerSignal });
      if (turn.controller.signal.aborted) return;
      this.history = [...this.history, { role: "user" as const, content: text }, { role: "assistant" as const, content: result.content }].slice(-MAX_HISTORY);
      recordUserMessage(userId, text).catch(() => {});
      const spokenText = toSpokenText(result.content);
      this.send("ash.text", { turnId, text: result.content, spokenText, actions: result.clientCalls, steps: result.steps });
      this.send("avatar.cue", { turnId, ...cueForReply(result.content, result.steps) });
      if (settings.speak && spokenText) await this.speak(turn, spokenText, settings.voice, providerSignal);
      this.finish(turn);
    } catch (err) {
      if (turn.controller.signal.aborted) return;
      if (!(err instanceof OutOfCreditsError || err instanceof DailyAiLimitError)) {
        logger.warn({ err: err instanceof Error ? err.message : String(err), userId }, "ASH Live turn failed");
      }
      this.finish(turn, errorCode(err));
    } finally {
      this.busy = false;
      if (this.turn === turn) this.turn = null;
    }
  }

  /** Speaks sentence by sentence, synthesizing the next chunk while the client plays the current one. */
  async speak(turn: Turn, spokenText: string, voice: string, signal: AbortSignal): Promise<void> {
    const chunks = splitSpeech(spokenText);
    const synth = (text: string) => synthesizeSpeech({ text, voice, userId: this.userId!, signal });
    let next: Promise<Buffer> | null = synth(chunks[0]!);
    this.state("speaking");
    for (let seq = 0; seq < chunks.length; seq++) {
      let audio: Buffer;
      try {
        audio = await next!;
      } catch (err) {
        if (!turn.controller.signal.aborted) this.send("ash.speech.error", { turnId: turn.id, ...errorCode(err) });
        return;
      }
      if (turn.controller.signal.aborted) return;
      next = seq + 1 < chunks.length ? synth(chunks[seq + 1]!) : null;
      next?.catch(() => {});
      this.send("ash.speech", { turnId: turn.id, seq, last: seq === chunks.length - 1, text: chunks[seq], mimeType: "audio/mpeg", audioBase64: audio.toString("base64") });
    }
  }

  finish(turn: Turn, error?: { code: string; message: string }): void {
    if (turn.controller.signal.aborted) return;
    if (error) this.send("error", { turnId: turn.id, ...error });
    this.send("ash.turn.end", { turnId: turn.id, interrupted: false });
    if (this.turn === turn) this.turn = null;
    // Speech may still be playing on the client; it reports user.speech_start or sends the next turn.
    this.state("idle");
  }

  async pollProgress(initial: boolean): Promise<void> {
    if (this.userId === null || !this.token || this.polling) return;
    this.polling = true;
    try {
      if (!initial && await verifyActiveToken(this.token) !== this.userId) {
        this.close(4401, "Unauthorized");
        return;
      }
      const missions = await listMissions(this.userId, 10);
      const tasks = missions.map((m) => ({
        missionId: m.id, goal: m.goal, status: m.status, businessId: m.businessId,
        stepsDone: m.steps.filter((s) => s.status === "done").length, stepsTotal: m.steps.length,
        currentStep: m.steps.find((s) => s.status === "pending")?.title ?? null, waitingFor: m.waitingFor,
        updatedAt: m.updatedAt.toISOString(),
      }));
      if (initial) this.send("tasks.snapshot", { tasks });
      for (const t of tasks) {
        const sig = JSON.stringify(t);
        if (!initial && this.progress.get(t.missionId) !== sig) this.send("task.progress", t);
        this.progress.set(t.missionId, sig);
      }
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : String(err) }, "ASH Live progress poll failed");
    } finally {
      this.polling = false;
    }
  }
}

/** Adds the ASH Live WebSocket endpoint to the HTTP server. Returns a function that closes every session. */
export function attachAshLive(server: Server, opts: { isAllowedOrigin: (origin: string) => boolean }): () => void {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD });
  const sessions = new Map<WebSocket, LiveSession>();
  wss.on("connection", (ws) => {
    sessions.set(ws, new LiveSession(ws));
    ws.on("close", () => sessions.delete(ws));
  });
  const onUpgrade = (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const path = (req.url ?? "").split("?")[0];
    if (path !== ASH_LIVE_PATH) { socket.destroy(); return; }
    if (sessions.size >= MAX_CONNECTIONS) { socket.destroy(); return; }
    const origin = req.headers.origin;
    // Browsers send Origin; native clients (Unreal, desktop, mobile) don't and still need a valid token.
    if (origin && !opts.isAllowedOrigin(origin)) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  };
  server.on("upgrade", onUpgrade);
  const heartbeat = setInterval(() => {
    for (const [ws, session] of sessions) {
      if (!session.alive) { ws.terminate(); continue; }
      session.alive = false;
      ws.ping();
    }
  }, HEARTBEAT_MS);
  return () => {
    clearInterval(heartbeat);
    server.off("upgrade", onUpgrade);
    for (const session of sessions.values()) session.close(1001, "Server shutting down");
    wss.close();
  };
}
