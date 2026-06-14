import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, desc } from "drizzle-orm";
import { db, generatedFilesTable } from "@workspace/db";
import { requireAuthActive } from "../lib/auth";
import { complete } from "../lib/openrouter";
import { z } from "zod";

const router: IRouter = Router();

// ─── POST /api/ash/search — web search via Perplexity (OpenRouter) ─────────────

router.post("/ash/search", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({
    query: z.string().min(1).max(500),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const result = await complete({
      systemPrompt: `You are a business research assistant. Given a search query, provide concise, factual research results.
Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "query": "the search query",
  "summary": "2-3 sentence overview of findings",
  "findings": [
    {"point": "key finding", "source": "source name or URL if known"},
    {"point": "key finding", "source": "source name or URL if known"},
    {"point": "key finding", "source": "source name or URL if known"}
  ],
  "marketOpportunity": "1 sentence on the business opportunity or relevance"
}`,
      prompt: `Research this for a business automation context: ${parsed.data.query}`,
      model: "perplexity/llama-3.1-sonar-large-128k-online",
      userId,
    });

    let data: Record<string, unknown>;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      data = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        query: parsed.data.query,
        summary: result.content,
        findings: [],
        marketOpportunity: "",
      };
    } catch {
      data = {
        query: parsed.data.query,
        summary: result.content.slice(0, 500),
        findings: [],
        marketOpportunity: "",
      };
    }

    res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Search failed";
    res.status(500).json({ error: msg });
  }
});

// ─── POST /api/ash/image — image generation via Pollinations.ai ───────────────

router.post("/ash/image", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({
    prompt: z.string().min(1).max(500),
    aspectRatio: z.enum(["landscape", "portrait", "square"]).optional().default("landscape"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { prompt, aspectRatio } = parsed.data;
  const dims = aspectRatio === "portrait" ? "width=576&height=1024"
    : aspectRatio === "square" ? "width=1024&height=1024"
    : "width=1024&height=576";
  const seed = Math.floor(Math.random() * 999999);
  const encodedPrompt = encodeURIComponent(
    `${prompt}, professional, high quality, business marketing style, cinematic`
  );
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?${dims}&seed=${seed}&nologo=true&model=flux`;

  res.json({
    url: imageUrl,
    prompt,
    aspectRatio,
    seed,
  });
});

// ─── GET /api/ash/files — list user's generated files ─────────────────────────

router.get("/ash/files", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const rows = await db
    .select()
    .from(generatedFilesTable)
    .where(eq(generatedFilesTable.userId, userId))
    .orderBy(desc(generatedFilesTable.createdAt))
    .limit(200);

  res.json(serialize(rows));
});

// ─── POST /api/ash/files — create a generated file ────────────────────────────

router.post("/ash/files", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({
    name: z.string().min(1).max(255),
    content: z.string(),
    fileType: z.string().optional().default("text"),
    description: z.string().optional(),
    sessionId: z.string().optional(),
    systemInstanceId: z.number().int().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .insert(generatedFilesTable)
    .values({
      userId,
      name: parsed.data.name,
      content: parsed.data.content,
      fileType: parsed.data.fileType,
      description: parsed.data.description ?? null,
      sessionId: parsed.data.sessionId ?? null,
      systemInstanceId: parsed.data.systemInstanceId ?? null,
    })
    .returning();

  res.status(201).json(serialize(row));
});

// ─── PUT /api/ash/files/:id — update a generated file ────────────────────────

router.put("/ash/files/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const fileId = Number(req.params.id);
  if (!Number.isFinite(fileId)) {
    res.status(400).json({ error: "Invalid file id" });
    return;
  }

  const schema = z.object({
    content: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select({ id: generatedFilesTable.id })
    .from(generatedFilesTable)
    .where(eq(generatedFilesTable.id, fileId));

  if (!existing) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  const updates: Partial<typeof generatedFilesTable.$inferInsert> = {};
  if (parsed.data.content !== undefined) updates.content = parsed.data.content;
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;

  const [updated] = await db
    .update(generatedFilesTable)
    .set(updates)
    .where(eq(generatedFilesTable.id, fileId))
    .returning();

  res.json(serialize(updated));
});

// ─── DELETE /api/ash/files/:id — delete a generated file ─────────────────────

router.delete("/ash/files/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const fileId = Number(req.params.id);
  if (!Number.isFinite(fileId)) {
    res.status(400).json({ error: "Invalid file id" });
    return;
  }

  await db
    .delete(generatedFilesTable)
    .where(eq(generatedFilesTable.id, fileId));

  res.status(204).end();
});

export default router;
