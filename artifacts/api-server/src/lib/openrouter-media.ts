// Speech-to-text, text-to-speech and image generation through OpenRouter's media
// endpoints, with the same credit gate, deduction and usage logging as chat completions.
import { db, usersTable, openrouterUsageTable, creditUsageEventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { getBalance, deductForUsage, creditsForUsd, OutOfCreditsError } from "./credits";
import { MEDIA_MODELS } from "./models";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// Used when OpenRouter does not report a cost for the call.
const FALLBACK_USD = { transcription: 0.01, speech: 0.015, image: 0.04 } as const;
type MediaKind = keyof typeof FALLBACK_USD;

export class MediaProviderError extends Error {
  constructor(public status: number) {
    super(`OpenRouter media request failed (${status})`);
  }
}

async function assertCanSpend(userId: number | undefined): Promise<void> {
  if (userId == null) return;
  const [row] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
  if (row?.role === "FOUNDER_ADMIN") return;
  if ((await getBalance(userId)).total <= 0) throw new OutOfCreditsError();
}

async function post(path: string, body: unknown): Promise<Response> {
  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) throw new Error("OPENROUTER_API_KEY environment variable is not set");
  const response = await fetch(`${OPENROUTER_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env["APP_URL"] ?? "https://sbep.replit.app",
      "X-Title": "SBEP - Starks Blueprint Execution Platform",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    // Provider error bodies can echo request details; log the status only.
    logger.warn({ path, status: response.status }, "OpenRouter media request failed");
    throw new MediaProviderError(response.status);
  }
  return response;
}

async function record(kind: MediaKind, model: string, userId: number | undefined, usd: number | undefined, success: boolean): Promise<void> {
  const cost = usd ?? FALLBACK_USD[kind];
  if (userId != null && success) {
    const credits = creditsForUsd(cost);
    try {
      await deductForUsage(userId, 0, model, credits);
      db.insert(creditUsageEventsTable)
        .values({ userId, eventType: `ai_${kind}`, creditsConsumed: credits, tokensUsed: 0, model })
        .catch(() => {});
    } catch (err) {
      logger.error({ alert: "CREDIT_DEDUCTION_FAILED", err, userId, model, kind }, "Media credit deduction failed");
    }
  }
  await db
    .insert(openrouterUsageTable)
    .values({ userId: userId ?? null, model, promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: success ? String(cost) : null, success: success ? "true" : "false", errorMessage: success ? null : `${kind} failed` })
    .catch((err) => logger.error({ err }, "Failed to log OpenRouter media usage"));
}

async function run<T>(kind: MediaKind, model: string, userId: number | undefined, call: () => Promise<{ value: T; usd?: number }>): Promise<T> {
  await assertCanSpend(userId);
  try {
    const { value, usd } = await call();
    await record(kind, model, userId, usd, true);
    return value;
  } catch (err) {
    await record(kind, model, userId, undefined, false);
    throw err;
  }
}

/** Container format from the file's leading bytes, for uploads sent as octet-stream. */
function sniffAudioFormat(audio: Buffer): string | null {
  const ascii = (start: number, end: number) => audio.subarray(start, end).toString("latin1");
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE") return "wav";
  if (audio.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return "webm";
  if (ascii(0, 4) === "OggS") return "ogg";
  if (ascii(0, 4) === "fLaC") return "flac";
  if (ascii(4, 8) === "ftyp") return "m4a";
  if (ascii(0, 3) === "ID3" || (audio[0] === 0xff && ((audio[1] ?? 0) & 0xe0) === 0xe0)) {
    // 0xFFF1/0xFFF9 is an ADTS AAC frame; other 0xFFEx/0xFFFx syncs are MPEG audio.
    return ((audio[1] ?? 0) & 0xf6) === 0xf0 ? "aac" : "mp3";
  }
  return null;
}

/** Maps an uploaded audio MIME type (or, failing that, its bytes) to OpenRouter's `input_audio.format`. */
export function audioFormatFor(mimeType: string | undefined, audio?: Buffer): string {
  const m = (mimeType ?? "").toLowerCase();
  if (!m.startsWith("audio/") && audio) {
    const sniffed = sniffAudioFormat(audio);
    if (sniffed) return sniffed;
  }
  if (m.includes("webm")) return "webm";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("wav")) return "wav";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("flac")) return "flac";
  if (m.includes("aac")) return "aac";
  return "m4a";
}

export function transcribeAudio(opts: { audio: Buffer; format: string; userId?: number; language?: string }): Promise<string> {
  const model = MEDIA_MODELS.transcription;
  return run("transcription", model, opts.userId, async () => {
    const res = await post("/audio/transcriptions", {
      model,
      input_audio: { data: opts.audio.toString("base64"), format: opts.format },
      ...(opts.language ? { language: opts.language } : {}),
    });
    const data = (await res.json()) as { text?: string; usage?: { cost?: number } };
    return { value: data.text ?? "", usd: data.usage?.cost };
  });
}

export function synthesizeSpeech(opts: { text: string; voice: string; userId?: number; instructions?: string }): Promise<Buffer> {
  const model = MEDIA_MODELS.speech;
  return run("speech", model, opts.userId, async () => {
    const res = await post("/audio/speech", {
      model,
      input: opts.text,
      voice: opts.voice,
      response_format: "mp3",
      ...(opts.instructions ? { instructions: opts.instructions } : {}),
    });
    return { value: Buffer.from(await res.arrayBuffer()) };
  });
}

export function generateImage(opts: { prompt: string; aspectRatio?: string; userId?: number }): Promise<{ b64: string; revisedPrompt?: string }> {
  const model = MEDIA_MODELS.image;
  return run("image", model, opts.userId, async () => {
    const res = await post("/images", { model, prompt: opts.prompt, n: 1, ...(opts.aspectRatio ? { aspect_ratio: opts.aspectRatio } : {}) });
    const data = (await res.json()) as { data?: Array<{ b64_json?: string; revised_prompt?: string }>; usage?: { cost?: number } };
    const image = data.data?.[0];
    if (!image?.b64_json) throw new MediaProviderError(502);
    return { value: { b64: image.b64_json, revisedPrompt: image.revised_prompt }, usd: data.usage?.cost };
  });
}
