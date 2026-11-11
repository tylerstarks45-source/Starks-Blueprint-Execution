import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, desc, and } from "drizzle-orm";
import {
  db,
  generatedFilesTable,
  userCredentialsTable,
  systemActivityEventsTable,
  systemInstancesTable,
  businessesTable,
  businessConnectionsTable,
  userDomainsTable,
  landingPagesTable,
  emailSequencesTable,
  usersTable,
  scheduledPostsTable,
  SOCIAL_PLATFORMS,
} from "@workspace/db";
import { broadcastSequenceStep } from "./email-marketing";
import { requireAuthActive, getTokenPayload, isAdminRole } from "../lib/auth";
import { deleteMediaForContent } from "../lib/media-store";
import { complete } from "../lib/openrouter";
import { MODELS } from "../lib/models";
import { decrypt } from "../lib/crypto";
import { getConnector, isKnownConnector, listConnectors } from "../lib/connectors/registry";
import { z } from "zod";

const SOCIAL_PLATFORM_KEYS = [
  { key: "TIKTOK_ACCESS_TOKEN",    name: "TikTok" },
  { key: "INSTAGRAM_ACCESS_TOKEN", name: "Instagram" },
  { key: "FACEBOOK_PAGE_TOKEN",    name: "Facebook" },
  { key: "META_ACCESS_TOKEN",      name: "Facebook/Meta" },
  { key: "TWITTER_BEARER_TOKEN",   name: "X (Twitter)" },
  { key: "LINKEDIN_API_KEY",       name: "LinkedIn" },
  { key: "SNAPCHAT_ACCESS_TOKEN",  name: "Snapchat" },
  { key: "YOUTUBE_API_KEY",        name: "YouTube" },
  { key: "THREADS_ACCESS_TOKEN",   name: "Threads" },
  { key: "PINTEREST_API_KEY",      name: "Pinterest" },
];

const router: IRouter = Router();

// ─── POST /api/ash/search — web search via Perplexity (OpenRouter) ─────────────

router.post("/ai-orchestrator/search", async (req, res): Promise<void> => {
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
      model: MODELS.research,
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

router.post("/ai-orchestrator/image", async (req, res): Promise<void> => {
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

router.get("/ai-orchestrator/files", async (req, res): Promise<void> => {
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

router.post("/ai-orchestrator/files", async (req, res): Promise<void> => {
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

router.put("/ai-orchestrator/files/:id", async (req, res): Promise<void> => {
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

router.delete("/ai-orchestrator/files/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const fileId = Number(req.params.id);
  if (!Number.isFinite(fileId)) {
    res.status(400).json({ error: "Invalid file id" });
    return;
  }

  const [existing] = await db
    .select({ id: generatedFilesTable.id, userId: generatedFilesTable.userId, content: generatedFilesTable.content })
    .from(generatedFilesTable)
    .where(eq(generatedFilesTable.id, fileId));

  if (!existing) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  const caller = getTokenPayload(req);
  const admin = caller && isAdminRole(caller.role);
  if (!admin && existing.userId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  await db
    .delete(generatedFilesTable)
    .where(eq(generatedFilesTable.id, fileId));
  // Blob URLs are public, so the bytes must go too.
  await deleteMediaForContent(existing.content);

  res.status(204).end();
});

// ─── POST /api/ash/connector-action — execute a real connector action ─────────
// Fetches the user's stored credentials, decrypts them, calls the connector's
// execute() method, logs the result to the activity feed, and returns the result.

router.post("/ai-orchestrator/connector-action", async (req, res): Promise<void> => {
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

router.get("/ai-orchestrator/connectors", async (req, res): Promise<void> => {
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

// ─── GET /api/ash/platform-context — full platform snapshot for ASH awareness ──
// Returns systems, businesses, domains, landing pages, email sequences, social
// accounts, and credit balance in a single parallel-fetched response.

router.get("/ai-orchestrator/platform-context", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const [systems, businesses, domains, pages, sequences, credRows, userRows] = await Promise.all([
    db.select({
      id:          systemInstancesTable.id,
      name:        systemInstancesTable.name,
      buildStatus: systemInstancesTable.buildStatus,
      status:      systemInstancesTable.buildStatus,
      blueprintId: systemInstancesTable.blueprintId,
    })
      .from(systemInstancesTable)
      .where(eq(systemInstancesTable.userId, userId))
      .orderBy(desc(systemInstancesTable.updatedAt))
      .limit(20),

    db.select({ id: businessesTable.id, name: businessesTable.name })
      .from(businessesTable)
      .where(eq(businessesTable.ownerId, userId))
      .orderBy(desc(businessesTable.updatedAt))
      .limit(20),

    db.select({ id: userDomainsTable.id, domain: userDomainsTable.domain, status: userDomainsTable.status })
      .from(userDomainsTable)
      .where(eq(userDomainsTable.userId, userId))
      .orderBy(desc(userDomainsTable.createdAt))
      .limit(20),

    db.select({
      id:          landingPagesTable.id,
      title:       landingPagesTable.title,
      isPublished: landingPagesTable.isPublished,
      published:   landingPagesTable.isPublished,
      slug:        landingPagesTable.slug,
    })
      .from(landingPagesTable)
      .where(eq(landingPagesTable.userId, userId))
      .orderBy(desc(landingPagesTable.updatedAt))
      .limit(20),

    db.select({ id: emailSequencesTable.id, name: emailSequencesTable.name, status: emailSequencesTable.status })
      .from(emailSequencesTable)
      .where(eq(emailSequencesTable.userId, userId))
      .orderBy(desc(emailSequencesTable.createdAt))
      .limit(20),

    db.select({ credentialKey: userCredentialsTable.credentialKey })
      .from(userCredentialsTable)
      .where(eq(userCredentialsTable.userId, userId)),

    db.select({ creditsBalance: usersTable.creditsBalance })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1),
  ]);

  const storedKeySet = new Set(credRows.map((r) => r.credentialKey));
  const socialAccounts = SOCIAL_PLATFORM_KEYS
    .map((p) => ({
      platform:  p.name,
      username:  null,         // key-based auth, no username available
      connected: storedKeySet.has(p.key),
    }))
    .filter((a) => a.connected);

  const creditBalance = userRows[0]?.creditsBalance ?? 0;
  res.json(serialize({
    systems:            systems.map((s) => ({ ...s, status: s.buildStatus })),
    businesses:         businesses.map((b) => ({ ...b, healthScore: null })),
    domains,
    landingPages:       pages.map((p) => ({ ...p, published: p.isPublished })),
    landingPageCount:   pages.length,
    emailSequences:     sequences,
    emailSequenceCount: sequences.length,
    socialAccounts,
    creditBalance,
    fetchedAt:          new Date(),
  }));
});

// ─── POST /api/ash/platform-action — ASH mutating platform tool calls ──────────
// Supported tools: update_system_status, trigger_system_rebuild, create_business_note

router.post("/ai-orchestrator/platform-action", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({
    tool:   z.enum(["update_system_status", "trigger_system_rebuild", "create_business_note", "schedule_social_post", "send_email_blast"]),
    params: z.record(z.unknown()),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { tool, params } = parsed.data;

  if (tool === "update_system_status") {
    const p = z.object({
      id:     z.number().int(),
      status: z.enum(["active", "paused", "building", "error"]),
    }).safeParse(params);
    if (!p.success) { res.status(400).json({ error: p.error.message }); return; }

    const [owned] = await db.select({ id: systemInstancesTable.id })
      .from(systemInstancesTable)
      .where(and(eq(systemInstancesTable.id, p.data.id), eq(systemInstancesTable.userId, userId)));
    if (!owned) { res.status(404).json({ error: "System not found" }); return; }

    const [updated] = await db.update(systemInstancesTable)
      .set({ buildStatus: p.data.status, updatedAt: new Date() })
      .where(eq(systemInstancesTable.id, p.data.id))
      .returning({ id: systemInstancesTable.id, name: systemInstancesTable.name, buildStatus: systemInstancesTable.buildStatus });

    res.json({ ok: true, tool, result: serialize(updated) });
    return;
  }

  if (tool === "trigger_system_rebuild") {
    const p = z.object({ id: z.number().int() }).safeParse(params);
    if (!p.success) { res.status(400).json({ error: p.error.message }); return; }

    const [owned] = await db.select({ id: systemInstancesTable.id, name: systemInstancesTable.name })
      .from(systemInstancesTable)
      .where(and(eq(systemInstancesTable.id, p.data.id), eq(systemInstancesTable.userId, userId)));
    if (!owned) { res.status(404).json({ error: "System not found" }); return; }

    const [updated] = await db.update(systemInstancesTable)
      .set({ buildStatus: "building", updatedAt: new Date() })
      .where(eq(systemInstancesTable.id, p.data.id))
      .returning({ id: systemInstancesTable.id, name: systemInstancesTable.name, buildStatus: systemInstancesTable.buildStatus });

    db.insert(systemActivityEventsTable).values({
      systemInstanceId: p.data.id,
      eventType:        "action",
      description:      "ASH triggered a system rebuild via platform tools",
      metadata:         JSON.stringify({ tool: "trigger_system_rebuild", triggeredAt: new Date().toISOString() }),
    }).catch(() => { /* non-critical */ });

    res.json({ ok: true, tool, result: serialize(updated) });
    return;
  }

  if (tool === "create_business_note") {
    const p = z.object({
      businessId: z.number().int(),
      note:       z.string().min(1).max(2000),
    }).safeParse(params);
    if (!p.success) { res.status(400).json({ error: p.error.message }); return; }

    const [owned] = await db.select({ id: businessesTable.id, name: businessesTable.name })
      .from(businessesTable)
      .where(and(eq(businessesTable.id, p.data.businessId), eq(businessesTable.ownerId, userId)));
    if (!owned) { res.status(404).json({ error: "Business not found" }); return; }

    const [conn] = await db.insert(businessConnectionsTable).values({
      businessId:     p.data.businessId,
      connectionType: "other",
      platformName:   "ASH Note",
      metadata:       p.data.note,
      status:         "active",
    }).returning({ id: businessConnectionsTable.id });

    res.json({
      ok:   true,
      tool,
      result: {
        businessId:   p.data.businessId,
        businessName: owned.name,
        note:         p.data.note,
        connectionId: conn.id,
      },
    });
    return;
  }

  if (tool === "schedule_social_post") {
    const p = z.object({
      platform:         z.enum(SOCIAL_PLATFORMS),
      content:          z.string().min(1).max(10000),
      scheduledAt:      z.string().min(1),
      linkUrl:          z.string().url().max(2000).nullable().optional(),
      mediaUrls:        z.array(z.string()).max(10).optional(),
      systemInstanceId: z.number().int().positive().nullable().optional(),
    }).safeParse(params);
    if (!p.success) { res.status(400).json({ error: p.error.message }); return; }

    const scheduledAt = new Date(p.data.scheduledAt);
    if (isNaN(scheduledAt.getTime())) {
      res.status(400).json({ error: `Invalid scheduledAt: ${p.data.scheduledAt}` });
      return;
    }

    // If tied to a system, verify the caller owns it before attaching.
    let verifiedInstanceId: number | null = null;
    if (p.data.systemInstanceId != null) {
      const [owned] = await db.select({ id: systemInstancesTable.id })
        .from(systemInstancesTable)
        .where(and(eq(systemInstancesTable.id, p.data.systemInstanceId), eq(systemInstancesTable.userId, userId)));
      if (!owned) { res.status(404).json({ error: "System not found" }); return; }
      verifiedInstanceId = p.data.systemInstanceId;
    }

    const [row] = await db.insert(scheduledPostsTable).values({
      userId,
      systemInstanceId: verifiedInstanceId,
      platform:         p.data.platform,
      content:          p.data.content,
      mediaUrls:        p.data.mediaUrls ?? [],
      linkUrl:          p.data.linkUrl ?? null,
      scheduledAt,
      status:           "scheduled",
    }).returning({ id: scheduledPostsTable.id });

    if (verifiedInstanceId != null) {
      db.insert(systemActivityEventsTable).values({
        systemInstanceId: verifiedInstanceId,
        eventType:        "action",
        description:      `ASH scheduled a ${p.data.platform} post for ${scheduledAt.toLocaleString()}`,
        metadata:         JSON.stringify({ tool: "schedule_social_post", scheduledPostId: row.id, platform: p.data.platform }),
      }).catch(() => { /* non-critical */ });
    }

    res.json({
      ok:   true,
      tool,
      result: {
        postId:      row.id,
        platform:    p.data.platform,
        scheduledAt: scheduledAt.toISOString(),
        content:     p.data.content,
      },
    });
    return;
  }

  if (tool === "send_email_blast") {
    const p = z.object({
      sequenceId: z.number().int(),
      stepNumber: z.number().int().min(1).optional(),
    }).safeParse(params);
    if (!p.success) { res.status(400).json({ error: p.error.message }); return; }

    const result = await broadcastSequenceStep({
      userId,
      seqId:      p.data.sequenceId,
      stepNumber: p.data.stepNumber ?? 1,
      log:        req.log,
    });

    if (!result.ok) { res.status(result.status).json({ error: result.error }); return; }

    res.json({
      ok:   true,
      tool,
      result: {
        sequenceId: p.data.sequenceId,
        stepNumber: p.data.stepNumber ?? 1,
        ...(result.queued !== undefined ? { queued: result.queued } : { sent: result.sent, failed: result.failed }),
        message:    result.message,
      },
    });
    return;
  }

  res.status(400).json({ error: "Unknown tool" });
});

export default router;
