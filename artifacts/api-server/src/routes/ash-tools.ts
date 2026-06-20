import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, desc, and } from "drizzle-orm";
import { db, generatedFilesTable, userCredentialsTable, systemActivityEventsTable, systemInstancesTable } from "@workspace/db";
import { requireAuthActive } from "../lib/auth";
import { complete } from "../lib/openrouter";
import { decrypt } from "../lib/crypto";
import { getConnector, isKnownConnector, listConnectors } from "../lib/connectors/registry";
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

// ─── POST /api/ash/connector-action — execute a real connector action ─────────
// Fetches the user's stored credentials, decrypts them, calls the connector's
// execute() method, logs the result to the activity feed, and returns the result.

router.post("/ash/connector-action", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({
    connectorId: z.string().min(1).max(64),
    action: z.string().min(1).max(64),
    params: z.record(z.unknown()).optional().default({}),
    systemInstanceId: z.number().int().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { connectorId, action, params, systemInstanceId } = parsed.data;

  if (!isKnownConnector(connectorId)) {
    res.status(404).json({ error: `Unknown connector: ${connectorId}` });
    return;
  }

  // Fetch all credentials for this user, decrypt them
  const credRows = await db
    .select({ credentialKey: userCredentialsTable.credentialKey, encryptedValue: userCredentialsTable.encryptedValue })
    .from(userCredentialsTable)
    .where(eq(userCredentialsTable.userId, userId));

  const creds: Record<string, string> = {};
  for (const row of credRows) {
    if (row.encryptedValue) {
      try {
        creds[row.credentialKey] = await decrypt(row.encryptedValue);
      } catch {
        // Skip malformed entries — connector will report missing cred gracefully
      }
    }
  }

  const connector = getConnector(connectorId, creds);
  if (!connector) {
    res.status(404).json({ error: `Connector ${connectorId} not available` });
    return;
  }

  const startMs = Date.now();
  let execResult: { ok: boolean; data?: unknown; error?: string };

  try {
    execResult = await connector.execute(action, params as Record<string, unknown>);
  } catch (err: unknown) {
    execResult = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  const latencyMs = Date.now() - startMs;

  // Log to activity feed only when we have a system instance to attach to
  // (systemActivityEventsTable.systemInstanceId is NOT NULL).
  // First verify the instance belongs to the authenticated user to prevent
  // cross-instance event injection.
  if (systemInstanceId != null) {
    const [ownedInstance] = await db
      .select({ id: systemInstancesTable.id })
      .from(systemInstancesTable)
      .where(
        and(
          eq(systemInstancesTable.id, systemInstanceId),
          eq(systemInstancesTable.userId, userId),
        )
      )
      .limit(1);

    if (ownedInstance) {
      const eventDescription = execResult.ok
        ? `Connector action executed: ${connector.displayName} → ${action} (${latencyMs}ms)`
        : `Connector action failed: ${connector.displayName} → ${action} — ${(execResult.error ?? "unknown error").slice(0, 200)}`;

      db.insert(systemActivityEventsTable).values({
        systemInstanceId,
        eventType: execResult.ok ? "action" : "warning",
        description: eventDescription,
        metadata: JSON.stringify({
          connectorId,
          connectorName: connector.displayName,
          action,
          ok: execResult.ok,
          latencyMs,
          ...(execResult.ok ? { data: execResult.data } : { error: execResult.error }),
        }),
      }).catch(() => { /* non-critical — never crash the response */ });
    }
  }

  res.json({
    connectorId,
    connectorName: connector.displayName,
    action,
    ok: execResult.ok,
    data: execResult.ok ? execResult.data : undefined,
    error: execResult.ok ? undefined : execResult.error,
    latencyMs,
  });
});

// ─── GET /api/ash/connectors — list connected connectors for the current user ──

router.get("/ash/connectors", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  // Get all credential keys stored for this user
  const credRows = await db
    .select({ credentialKey: userCredentialsTable.credentialKey, status: userCredentialsTable.status })
    .from(userCredentialsTable)
    .where(eq(userCredentialsTable.userId, userId));

  const storedKeys = new Set(credRows.map(r => r.credentialKey));

  // listConnectors is statically imported from registry above
  const allConnectors = listConnectors();

  const connected = allConnectors
    .filter(c => !c.stubOnly && c.requiredCredentials.length > 0)
    .map(c => ({
      ...c,
      isConnected: c.requiredCredentials.every(key => storedKeys.has(key)),
      missingCredentials: c.requiredCredentials.filter(key => !storedKeys.has(key)),
    }));

  res.json({ connectors: connected });
});

export default router;
