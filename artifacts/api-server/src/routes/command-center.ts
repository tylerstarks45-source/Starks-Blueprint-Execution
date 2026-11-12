// Command-center contract for 3D / Unreal clients. Auth: Bearer JWT or X-API-Key.
// The avatar only speaks what ASH returns, grounded in the caller's own data.
import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, businessesTable } from "@workspace/db";
import { requireAuthActive } from "../lib/auth";
import { runAshTurn } from "../lib/ash-agent";
import { synthesizeSpeech } from "../lib/openrouter-media";
import { assembleCrossBusinessSummary } from "../lib/business-intelligence/context";
import { OutOfCreditsError, DailyAiLimitError } from "../lib/credits";

const router: IRouter = Router();

export const COMMAND_CENTER_PROTOCOL = 1;
const VOICES = ["alloy", "ash", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"] as const;
const MAX_SPOKEN_CHARS = 4000;

/** Plain text for TTS: drop markdown so the voice doesn't read symbols aloud. */
export function toSpokenText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>|~]+/g, "")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SPOKEN_CHARS);
}

// ─── GET /api/command-center/context — scene snapshot ────────────────────────
router.get("/command-center/context", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const [businesses, portfolio] = await Promise.all([
    db
      .select({ id: businessesTable.id, name: businessesTable.name, businessType: businessesTable.businessType, status: businessesTable.status })
      .from(businessesTable)
      .where(eq(businessesTable.ownerId, userId)),
    assembleCrossBusinessSummary(userId),
  ]);
  res.json({ protocol: COMMAND_CENTER_PROTOCOL, generatedAt: new Date().toISOString(), businesses, portfolio });
});

// ─── POST /api/command-center/turn — one spoken ASH turn ─────────────────────
router.post("/command-center/turn", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const parsed = z
    .object({
      message: z.string().min(1).max(8000),
      history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) })).max(20).optional().default([]),
      mode: z.string().optional(),
      speak: z.boolean().optional().default(true),
      voice: z.enum(VOICES).optional().default("onyx"),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const { message, history, mode, speak, voice } = parsed.data;

  try {
    const result = await runAshTurn({ userId, message, history, mode });
    let speech: { audioBase64: string; mimeType: string; voice: string } | null = null;
    let speechError: string | null = null;
    const spoken = toSpokenText(result.content);
    if (speak && spoken) {
      try {
        const audio = await synthesizeSpeech({ text: spoken, voice, userId });
        speech = { audioBase64: audio.toString("base64"), mimeType: "audio/mpeg", voice };
      } catch (err) {
        // The text answer is still useful; the client shows it as a caption.
        speechError = err instanceof OutOfCreditsError ? "out_of_credits" : err instanceof DailyAiLimitError ? "daily_ai_limit" : "unavailable";
      }
    }
    res.json({
      protocol: COMMAND_CENTER_PROTOCOL,
      text: result.content,
      spokenText: spoken,
      speech,
      speechError,
      actions: result.clientCalls,
      steps: result.steps,
      model: result.model,
    });
  } catch (err) {
    if (err instanceof DailyAiLimitError) {
      res.status(429).json({ error: err.message, code: "daily_ai_limit" });
      return;
    }
    if (err instanceof OutOfCreditsError) {
      res.status(402).json({ error: "Out of credits" });
      return;
    }
    req.log.error({ err: err instanceof Error ? err.message : String(err) }, "Command-center turn failed");
    res.status(502).json({ error: "ASH is unavailable right now" });
  }
});

export default router;
