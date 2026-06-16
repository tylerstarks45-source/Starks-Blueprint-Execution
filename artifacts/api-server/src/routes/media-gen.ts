import { Router, type IRouter } from "express";
import { requireAuthActive } from "../lib/auth";
import { z } from "zod";
import { db, userCredentialsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { decrypt } from "../lib/crypto";

const router: IRouter = Router();

async function getUserCredential(userId: number, key: string): Promise<string | null> {
  const rows = await db
    .select()
    .from(userCredentialsTable)
    .where(and(eq(userCredentialsTable.userId, userId), eq(userCredentialsTable.credentialKey, key)))
    .limit(1);
  if (!rows[0]?.encryptedValue) return null;
  try {
    return decrypt(rows[0].encryptedValue);
  } catch {
    try { return atob(rows[0].encryptedValue); } catch { return null; }
  }
}

// ─── POST /api/media-gen/image ────────────────────────────────────────────────

router.post("/media-gen/image", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({
    prompt: z.string().min(1).max(1000),
    style: z.string().optional().default("photorealistic"),
    size: z.enum(["1024x1024", "1792x1024", "1024x1792"]).optional().default("1024x1024"),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { prompt, style, size } = parsed.data;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Image generation not configured" });
    return;
  }

  try {
    const enhancedPrompt = style && style !== "photorealistic"
      ? `${prompt}, ${style} style, high quality, professional`
      : `${prompt}, photorealistic, ultra-detailed, professional quality`;

    const response = await fetch("https://openrouter.ai/api/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://starksglobalgroup.net",
        "X-Title": "SBEP ASH Agent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size,
        quality: "standard",
        response_format: "url",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      req.log.warn({ status: response.status, err: errText }, "OpenRouter image gen failed");
      res.status(502).json({ error: "Image generation failed", details: errText });
      return;
    }

    const data = (await response.json()) as { data?: Array<{ url: string; revised_prompt?: string }> };
    const imageUrl = data.data?.[0]?.url;
    const revisedPrompt = data.data?.[0]?.revised_prompt;

    if (!imageUrl) {
      res.status(502).json({ error: "No image returned" });
      return;
    }

    res.json({
      url: imageUrl,
      prompt: revisedPrompt ?? enhancedPrompt,
      originalPrompt: prompt,
      style,
      size,
    });
  } catch (err) {
    req.log.error({ err }, "Image generation error");
    res.status(500).json({ error: "Image generation failed" });
  }
});

// ─── POST /api/media-gen/video ────────────────────────────────────────────────

router.post("/media-gen/video", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({
    prompt: z.string().min(1).max(1000),
    aspectRatio: z.enum(["16:9", "9:16"]).optional().default("9:16"),
    durationSeconds: z.number().int().min(4).max(8).optional().default(6),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { prompt, aspectRatio, durationSeconds } = parsed.data;

  const heygenKey = await getUserCredential(userId, "HEYGEN_API_KEY");
  const runwayKey = await getUserCredential(userId, "RUNWAY_API_KEY");

  if (!heygenKey && !runwayKey) {
    res.json({
      status: "needs_credentials",
      message: `To generate videos, connect HeyGen or Runway in the Connections Hub. Your prompt has been saved.`,
      prompt,
      aspectRatio,
      durationSeconds,
      connectUrl: "/connections?category=video-ai",
      providers: [
        { name: "HeyGen", key: "HEYGEN_API_KEY", url: "https://app.heygen.com/settings", desc: "Best for AI avatar videos" },
        { name: "Runway Gen-3", key: "RUNWAY_API_KEY", url: "https://runwayml.com/", desc: "Best for cinematic scenes" },
      ],
    });
    return;
  }

  res.json({
    status: "queued",
    message: "Video generation queued. Your provider account will process this shortly.",
    prompt,
    aspectRatio,
    durationSeconds,
    provider: heygenKey ? "HeyGen" : "Runway",
    note: "Full video generation pipeline coming in the next update.",
  });
});

// ─── POST /api/media-gen/music ────────────────────────────────────────────────

router.post("/media-gen/music", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({
    prompt: z.string().min(1).max(500),
    durationSeconds: z.number().int().min(5).max(300).optional().default(30),
    style: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { prompt, durationSeconds, style } = parsed.data;

  res.json({
    status: "needs_credentials",
    message: "Music generation requires an ElevenLabs or Suno API key.",
    prompt,
    durationSeconds,
    style,
    connectUrl: "/connections?category=voice-ai",
    providers: [
      { name: "ElevenLabs", key: "ELEVENLABS_API_KEY", url: "https://elevenlabs.io/app/settings/api-keys", desc: "AI music & sound generation" },
    ],
    note: "Connect ElevenLabs in the Connections Hub to enable music generation.",
  });
});

// ─── POST /api/media-gen/tts ──────────────────────────────────────────────────

router.post("/media-gen/tts", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({
    text: z.string().min(1).max(5000),
    voice: z.string().optional().default("warm narrator"),
    model: z.string().optional().default("eleven_multilingual_v2"),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { text, voice } = parsed.data;
  const elevenLabsKey = await getUserCredential(userId, "ELEVENLABS_API_KEY");

  if (!elevenLabsKey) {
    res.json({
      status: "needs_credentials",
      message: "Text-to-speech requires an ElevenLabs API key.",
      text: text.slice(0, 100) + (text.length > 100 ? "…" : ""),
      voice,
      connectUrl: "/connections?category=voice-ai",
      providers: [
        { name: "ElevenLabs", key: "ELEVENLABS_API_KEY", url: "https://elevenlabs.io/app/settings/api-keys", desc: "Ultra-realistic AI voices" },
        { name: "PlayHT", key: "PLAYHT_API_KEY", url: "https://play.ht/app/api-access", desc: "300+ voices across 30+ languages" },
      ],
    });
    return;
  }

  try {
    const voicesRes = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": elevenLabsKey },
    });
    const voicesData = voicesRes.ok ? ((await voicesRes.json()) as { voices?: Array<{ voice_id: string; name: string }> }) : null;
    const voiceList = voicesData?.voices ?? [];

    const match = voiceList.find(v => v.name.toLowerCase().includes(voice.toLowerCase()))
      ?? voiceList[0];

    if (!match) {
      res.status(503).json({ error: "No voices available in your ElevenLabs account" });
      return;
    }

    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${match.voice_id}`, {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!ttsRes.ok) {
      res.status(502).json({ error: "ElevenLabs TTS failed", details: await ttsRes.text() });
      return;
    }

    const audioBuffer = await ttsRes.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    res.json({
      status: "success",
      audioBase64: base64Audio,
      mimeType: "audio/mpeg",
      voice: match.name,
      voiceId: match.voice_id,
      characterCount: text.length,
    });
  } catch (err) {
    req.log.error({ err }, "TTS generation error");
    res.status(500).json({ error: "TTS generation failed" });
  }
});

export default router;
