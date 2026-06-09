import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, desc } from "drizzle-orm";
import { db, chatSessionsTable } from "@workspace/db";
import { requireAuthActive } from "../lib/auth";

const router: IRouter = Router();

// ── List all sessions for current user (summary — no stateJson) ───────────────
router.get("/chat-sessions", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const rows = await db
    .select({
      id: chatSessionsTable.id,
      title: chatSessionsTable.title,
      messageCount: chatSessionsTable.messageCount,
      phase: chatSessionsTable.phase,
      createdAt: chatSessionsTable.createdAt,
      updatedAt: chatSessionsTable.updatedAt,
    })
    .from(chatSessionsTable)
    .where(eq(chatSessionsTable.userId, userId))
    .orderBy(desc(chatSessionsTable.updatedAt))
    .limit(50);

  res.json(serialize(rows));
});

// ── Get single session (with full stateJson) ──────────────────────────────────
router.get("/chat-sessions/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const sessionId = Number(req.params.id);
  if (!sessionId) { res.status(400).json({ error: "Invalid session id" }); return; }

  const [row] = await db
    .select()
    .from(chatSessionsTable)
    .where(and(eq(chatSessionsTable.id, sessionId), eq(chatSessionsTable.userId, userId)))
    .limit(1);

  if (!row) { res.status(404).json({ error: "Session not found" }); return; }
  res.json(serialize(row));
});

// ── Create new session ────────────────────────────────────────────────────────
router.post("/chat-sessions", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const { title, stateJson, messageCount, phase } = req.body as {
    title?: string;
    stateJson?: string;
    messageCount?: number;
    phase?: string;
  };

  const [row] = await db
    .insert(chatSessionsTable)
    .values({
      userId,
      title: (title ?? "New Session").slice(0, 120),
      stateJson: stateJson ?? "{}",
      messageCount: messageCount ?? 0,
      phase: phase ?? "idle",
    })
    .returning();

  res.status(201).json(serialize(row));
});

// ── Update existing session ───────────────────────────────────────────────────
router.put("/chat-sessions/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const sessionId = Number(req.params.id);
  if (!sessionId) { res.status(400).json({ error: "Invalid session id" }); return; }

  const { title, stateJson, messageCount, phase } = req.body as {
    title?: string;
    stateJson?: string;
    messageCount?: number;
    phase?: string;
  };

  const [row] = await db
    .update(chatSessionsTable)
    .set({
      ...(title !== undefined && { title: title.slice(0, 120) }),
      ...(stateJson !== undefined && { stateJson }),
      ...(messageCount !== undefined && { messageCount }),
      ...(phase !== undefined && { phase }),
    })
    .where(and(eq(chatSessionsTable.id, sessionId), eq(chatSessionsTable.userId, userId)))
    .returning();

  if (!row) { res.status(404).json({ error: "Session not found" }); return; }
  res.json(serialize(row));
});

// ── Delete session ────────────────────────────────────────────────────────────
router.delete("/chat-sessions/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const sessionId = Number(req.params.id);
  if (!sessionId) { res.status(400).json({ error: "Invalid session id" }); return; }

  await db
    .delete(chatSessionsTable)
    .where(and(eq(chatSessionsTable.id, sessionId), eq(chatSessionsTable.userId, userId)));

  res.status(204).send();
});

export default router;
