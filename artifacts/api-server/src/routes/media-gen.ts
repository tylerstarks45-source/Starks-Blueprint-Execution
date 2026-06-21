import { Router, type IRouter } from "express";
import { requireAuthActive } from "../lib/auth";
import { z } from "zod";
import { db, pool, userCredentialsTable, generatedFilesTable, runtimeJobsTable } from "@workspace/db";
import { eq, and, inArray, desc } from "drizzle-orm";
import { decrypt } from "../lib/crypto";
import { randomUUID } from "crypto";

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

// Insert a media gen job as "active" (already running externally; worker should not pick it up)
async function insertMediaJob(
  jobType: "media_gen_video" | "media_gen_audio",
  payload: Record<string, unknown>,
): Promise<string> {
  const jobId = randomUUID();
  await db.insert(runtimeJobsTable).values({
    jobId,
    systemInstanceId: null,
    jobType,
    status: "active",
    priority: 5,
    payload,
    attempt: 1,
    maxAttempts: 1,
    runAfter: new Date(),
  });
  return jobId;
}

// Save completed media to generated_files
async function saveMediaFile(
  userId: number,
  name: string,
  fileType: "video" | "audio" | "image",
  content: string,
  description: string,
  sessionId?: string,
): Promise<number> {
  const [row] = await db.insert(generatedFilesTable).values({
    userId,
    name,
    fileType,
    content,
    description,
    sessionId: sessionId ?? null,
  }).returning({ id: generatedFilesTable.id });
  return row!.id;
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

    // Save URL to generated_files so it appears in the media gallery
    await saveMediaFile(
      userId,
      `image-${Date.now()}.png`,
      "image",
      imageUrl,
      revisedPrompt ?? enhancedPrompt,
    );

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
    durationSeconds: z.number().int().min(4).max(10).optional().default(6),
    script: z.string().optional(),
    style: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { prompt, aspectRatio, durationSeconds, script } = parsed.data;
  const scriptText = script ?? prompt;

  const heygenKey = await getUserCredential(userId, "HEYGEN_API_KEY");
  const runwayKey = await getUserCredential(userId, "RUNWAY_API_KEY");

  if (!heygenKey && !runwayKey) {
    res.json({
      status: "needs_credentials",
      message: "To generate AI videos, connect HeyGen or Runway in the Connections Hub.",
      prompt,
      aspectRatio,
      durationSeconds,
      connectUrl: "/connections?category=video-ai",
      providers: [
        { name: "HeyGen", key: "HEYGEN_API_KEY", url: "https://app.heygen.com/settings", desc: "Best for AI avatar talking-head videos" },
        { name: "Runway Gen-3", key: "RUNWAY_API_KEY", url: "https://runwayml.com/", desc: "Best for cinematic text-to-video scenes" },
      ],
    });
    return;
  }

  // ── Try HeyGen ──────────────────────────────────────────────────────────────
  if (heygenKey) {
    try {
      // Fetch available avatars
      const avatarsRes = await fetch("https://api.heygen.com/v2/avatars", {
        headers: { "X-Api-Key": heygenKey },
      });

      if (avatarsRes.ok) {
        const avatarsData = (await avatarsRes.json()) as {
          data?: { avatars?: Array<{ avatar_id: string; avatar_name: string }> };
        };
        const avatars = avatarsData.data?.avatars ?? [];
        const avatar = avatars[0];

        if (avatar) {
          // Fetch available voices
          const voicesRes = await fetch("https://api.heygen.com/v2/voices", {
            headers: { "X-Api-Key": heygenKey },
          });
          const voicesData = voicesRes.ok
            ? ((await voicesRes.json()) as { data?: { voices?: Array<{ voice_id: string; name: string }> } })
            : null;
          const voices = voicesData?.data?.voices ?? [];
          const voice = voices.find(v => v.name?.toLowerCase().includes("english")) ?? voices[0];

          if (voice) {
            const dimension = aspectRatio === "9:16"
              ? { width: 720, height: 1280 }
              : { width: 1280, height: 720 };

            const genRes = await fetch("https://api.heygen.com/v2/video/generate", {
              method: "POST",
              headers: {
                "X-Api-Key": heygenKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                video_inputs: [{
                  character: {
                    type: "avatar",
                    avatar_id: avatar.avatar_id,
                    avatar_style: "normal",
                  },
                  voice: {
                    type: "text",
                    input_text: scriptText.slice(0, 1500),
                    voice_id: voice.voice_id,
                  },
                  background: { type: "color", value: "#1a1a2e" },
                }],
                dimension,
                test: true,
              }),
            });

            if (genRes.ok) {
              const genData = (await genRes.json()) as { data?: { video_id?: string }; code?: number };
              const providerJobId = genData.data?.video_id;
              if (providerJobId) {
                const jobId = await insertMediaJob("media_gen_video", {
                  provider: "heygen",
                  providerJobId,
                  userId,
                  prompt,
                  aspectRatio,
                  durationSeconds,
                  avatarId: avatar.avatar_id,
                  avatarName: avatar.avatar_name,
                });
                res.json({
                  status: "generating",
                  jobId,
                  provider: "HeyGen",
                  avatarName: avatar.avatar_name,
                  message: `HeyGen is creating your AI avatar video.`,
                  pollUrl: `/api/media-gen/jobs/${jobId}`,
                });
                return;
              }
            } else {
              const errText = await genRes.text();
              req.log.warn({ status: genRes.status, err: errText }, "HeyGen video create failed");
            }
          }
        }
      }
    } catch (err) {
      req.log.warn({ err }, "HeyGen video attempt failed, trying Runway");
    }
  }

  // ── Try Runway Gen-3 ────────────────────────────────────────────────────────
  if (runwayKey) {
    try {
      const ratio = aspectRatio === "9:16" ? "768:1280" : "1280:768";
      const genRes = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${runwayKey}`,
          "X-Runway-Version": "2024-11-06",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gen3a_turbo",
          promptText: prompt,
          ratio,
          duration: Math.min(durationSeconds, 10),
          watermark: false,
        }),
      });

      if (genRes.ok) {
        const genData = (await genRes.json()) as { id?: string; status?: string };
        const providerJobId = genData.id;
        if (providerJobId) {
          const jobId = await insertMediaJob("media_gen_video", {
            provider: "runway",
            providerJobId,
            userId,
            prompt,
            aspectRatio,
            durationSeconds,
          });
          res.json({
            status: "generating",
            jobId,
            provider: "Runway Gen-3",
            message: `Runway is generating your video.`,
            pollUrl: `/api/media-gen/jobs/${jobId}`,
          });
          return;
        }
      } else {
        const errText = await genRes.text();
        req.log.warn({ status: genRes.status, err: errText }, "Runway video create failed");
        res.status(502).json({ error: "Video generation failed", details: errText.slice(0, 300) });
        return;
      }
    } catch (err) {
      req.log.error({ err }, "Runway video attempt failed");
      res.status(500).json({ error: "Video generation failed" });
      return;
    }
  }

  res.status(503).json({ error: "Video generation unavailable — could not initialise provider" });
});

// ─── GET /api/media-gen/jobs/:jobId — poll provider + update DB ───────────────

router.get("/media-gen/jobs/:jobId", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const jobId = req.params["jobId"]!;

  const [job] = await db
    .select()
    .from(runtimeJobsTable)
    .where(eq(runtimeJobsTable.jobId, jobId))
    .limit(1);

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const payload = job.payload as Record<string, unknown>;

  if (payload.userId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Already settled — return stored result
  if (job.status === "completed" || job.status === "failed") {
    const result = job.result as Record<string, unknown> | null;
    res.json({
      jobId,
      status: job.status,
      provider: payload.provider,
      mediaUrl: result?.mediaUrl ?? null,
      thumbnailUrl: result?.thumbnailUrl ?? null,
      fileId: result?.fileId ?? null,
      error: job.error,
      completedAt: job.completedAt,
    });
    return;
  }

  // Poll provider for current status
  const provider = payload.provider as string;
  const providerJobId = payload.providerJobId as string;
  const mediaUserId = payload.userId as number;

  try {
    // ── HeyGen polling ──────────────────────────────────────────────────────
    if (provider === "heygen") {
      const heygenKey = await getUserCredential(mediaUserId, "HEYGEN_API_KEY");
      if (!heygenKey) {
        res.status(503).json({ error: "HeyGen key not found" });
        return;
      }

      const pollRes = await fetch(
        `https://api.heygen.com/v1/video_status.get?video_id=${providerJobId}`,
        { headers: { "X-Api-Key": heygenKey } },
      );

      if (!pollRes.ok) {
        res.json({ jobId, status: "active", provider: "HeyGen", progress: "Checking status…" });
        return;
      }

      const pollData = (await pollRes.json()) as {
        data?: { status?: string; video_url?: string; thumbnail_url?: string; error?: string };
      };

      const pStatus = pollData.data?.status;

      if (pStatus === "completed") {
        const videoUrl = pollData.data?.video_url ?? "";
        const thumbnailUrl = pollData.data?.thumbnail_url ?? null;
        const fileId = await saveMediaFile(
          mediaUserId,
          `heygen-video-${Date.now()}.mp4`,
          "video",
          videoUrl,
          `AI avatar video: ${(payload.prompt as string).slice(0, 100)}`,
        );
        await pool.query(
          `UPDATE runtime_jobs SET status = 'completed', result = $1, completed_at = NOW() WHERE job_id = $2`,
          [JSON.stringify({ mediaUrl: videoUrl, thumbnailUrl, fileId }), jobId],
        );
        res.json({ jobId, status: "completed", provider: "HeyGen", mediaUrl: videoUrl, thumbnailUrl, fileId });
        return;
      }

      if (pStatus === "failed") {
        await pool.query(
          `UPDATE runtime_jobs SET status = 'failed', error = $1, completed_at = NOW() WHERE job_id = $2`,
          [pollData.data?.error ?? "HeyGen generation failed", jobId],
        );
        res.json({ jobId, status: "failed", error: pollData.data?.error ?? "Generation failed" });
        return;
      }

      const progressMap: Record<string, string> = {
        pending: "Queued for generation…",
        processing: "Generating video…",
        waiting: "Waiting in queue…",
      };
      res.json({
        jobId,
        status: "active",
        provider: "HeyGen",
        providerStatus: pStatus,
        progress: progressMap[pStatus ?? ""] ?? "Generating…",
      });
      return;
    }

    // ── Runway polling ──────────────────────────────────────────────────────
    if (provider === "runway") {
      const runwayKey = await getUserCredential(mediaUserId, "RUNWAY_API_KEY");
      if (!runwayKey) {
        res.status(503).json({ error: "Runway key not found" });
        return;
      }

      const pollRes = await fetch(
        `https://api.dev.runwayml.com/v1/tasks/${providerJobId}`,
        {
          headers: {
            "Authorization": `Bearer ${runwayKey}`,
            "X-Runway-Version": "2024-11-06",
          },
        },
      );

      if (!pollRes.ok) {
        res.json({ jobId, status: "active", provider: "Runway", progress: "Checking status…" });
        return;
      }

      const pollData = (await pollRes.json()) as {
        id?: string;
        status?: string;
        output?: string[];
        failure?: string;
        progressRatio?: number;
      };

      if (pollData.status === "SUCCEEDED") {
        const videoUrl = pollData.output?.[0] ?? "";
        const fileId = await saveMediaFile(
          mediaUserId,
          `runway-video-${Date.now()}.mp4`,
          "video",
          videoUrl,
          `Runway Gen-3 video: ${(payload.prompt as string).slice(0, 100)}`,
        );
        await pool.query(
          `UPDATE runtime_jobs SET status = 'completed', result = $1, completed_at = NOW() WHERE job_id = $2`,
          [JSON.stringify({ mediaUrl: videoUrl, fileId }), jobId],
        );
        res.json({ jobId, status: "completed", provider: "Runway", mediaUrl: videoUrl, fileId });
        return;
      }

      if (pollData.status === "FAILED") {
        await pool.query(
          `UPDATE runtime_jobs SET status = 'failed', error = $1, completed_at = NOW() WHERE job_id = $2`,
          [pollData.failure ?? "Runway generation failed", jobId],
        );
        res.json({ jobId, status: "failed", error: pollData.failure ?? "Generation failed" });
        return;
      }

      const pct = pollData.progressRatio != null ? Math.round(pollData.progressRatio * 100) : null;
      res.json({
        jobId,
        status: "active",
        provider: "Runway",
        providerStatus: pollData.status,
        progress: pct != null ? `Generating… ${pct}%` : "Generating…",
        progressRatio: pollData.progressRatio ?? null,
      });
      return;
    }

    res.status(400).json({ error: `Unknown provider: ${provider}` });
  } catch (err) {
    req.log.error({ err }, "Media job poll error");
    res.status(500).json({ error: "Failed to poll job status" });
  }
});

// ─── POST /api/media-gen/music ────────────────────────────────────────────────

router.post("/media-gen/music", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({
    prompt: z.string().min(1).max(500),
    durationSeconds: z.number().int().min(5).max(300).optional().default(30),
    style: z.string().optional(),
    mood: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { prompt, durationSeconds, style, mood } = parsed.data;
  const elevenLabsKey = await getUserCredential(userId, "ELEVENLABS_API_KEY");

  if (!elevenLabsKey) {
    res.json({
      status: "needs_credentials",
      message: "Music generation requires an ElevenLabs API key. Connect it in the Connections Hub to unlock AI sound generation.",
      prompt,
      durationSeconds,
      style,
      connectUrl: "/connections?category=voice-ai",
      providers: [
        { name: "ElevenLabs", key: "ELEVENLABS_API_KEY", url: "https://elevenlabs.io/app/settings/api-keys", desc: "AI sound effects & music generation" },
      ],
    });
    return;
  }

  try {
    const parts = [prompt];
    if (style) parts.push(`${style} style`);
    if (mood) parts.push(`${mood} mood`);
    const fullPrompt = parts.join(", ");
    const cappedDuration = Math.min(durationSeconds, 300);

    // Create a tracked job before calling ElevenLabs so progress is observable
    let audioJobId: string | undefined;
    try {
      audioJobId = await insertMediaJob("media_gen_audio", {
        provider: "elevenlabs",
        userId,
        prompt: fullPrompt,
        durationSeconds: cappedDuration,
      });
    } catch { /* non-fatal — tracking failure must not block generation */ }

    const soundRes = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text: fullPrompt,
        duration_seconds: cappedDuration,
        prompt_influence: 0.3,
      }),
    });

    if (!soundRes.ok) {
      const errText = await soundRes.text();
      req.log.warn({ status: soundRes.status, err: errText }, "ElevenLabs sound gen failed");
      if (audioJobId) {
        try {
          await pool.query(
            `UPDATE runtime_jobs SET status = 'failed', error = $1, completed_at = NOW() WHERE job_id = $2`,
            [errText.slice(0, 500), audioJobId],
          );
        } catch { /* non-fatal */ }
      }
      res.status(502).json({ error: "Music generation failed", details: errText.slice(0, 300) });
      return;
    }

    const audioBuffer = await soundRes.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    // Store as data URI so it can be played in the browser
    const dataUri = `data:audio/mpeg;base64,${base64Audio}`;
    const fileId = await saveMediaFile(
      userId,
      `music-${Date.now()}.mp3`,
      "audio",
      dataUri,
      `AI music: ${fullPrompt.slice(0, 100)}`,
    );

    if (audioJobId) {
      try {
        await pool.query(
          `UPDATE runtime_jobs SET status = 'completed', result = $1, completed_at = NOW() WHERE job_id = $2`,
          [JSON.stringify({ fileId }), audioJobId],
        );
      } catch { /* non-fatal */ }
    }

    res.json({
      status: "success",
      jobId: audioJobId,
      audioBase64: base64Audio,
      mimeType: "audio/mpeg",
      prompt: fullPrompt,
      durationSeconds: cappedDuration,
      fileId,
    });
  } catch (err) {
    req.log.error({ err }, "Music generation error");
    res.status(500).json({ error: "Music generation failed" });
  }
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

    const dataUri = `data:audio/mpeg;base64,${base64Audio}`;
    const fileId = await saveMediaFile(
      userId,
      `tts-${Date.now()}.mp3`,
      "audio",
      dataUri,
      `TTS: ${text.slice(0, 80)}… (voice: ${match.name})`,
    );

    res.json({
      status: "success",
      audioBase64: base64Audio,
      mimeType: "audio/mpeg",
      voice: match.name,
      voiceId: match.voice_id,
      characterCount: text.length,
      fileId,
    });
  } catch (err) {
    req.log.error({ err }, "TTS generation error");
    res.status(500).json({ error: "TTS generation failed" });
  }
});

// ─── GET /api/media-gen/gallery — user's media files ─────────────────────────

router.get("/media-gen/gallery", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const rows = await db
    .select()
    .from(generatedFilesTable)
    .where(
      and(
        eq(generatedFilesTable.userId, userId),
        inArray(generatedFilesTable.fileType, ["image", "video", "audio"]),
      ),
    )
    .orderBy(desc(generatedFilesTable.createdAt))
    .limit(100);

  res.json(rows.map(r => ({
    id: r.id,
    name: r.name,
    fileType: r.fileType,
    content: r.content,
    description: r.description,
    createdAt: r.createdAt,
  })));
});

export default router;
