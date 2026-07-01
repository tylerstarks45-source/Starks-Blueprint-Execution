import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, asc, sql, gte, lte } from "drizzle-orm";
import { db, scheduledPostsTable, systemInstancesTable, SOCIAL_PLATFORMS, SOCIAL_POST_STATUSES } from "@workspace/db";
import { z } from "zod/v4";
import { getActiveCallerPayload, requireAuthActive, isAdminRole } from "../lib/auth";

const router: IRouter = Router();

const CreateSocialPostBody = z.object({
  systemInstanceId: z.number().int().positive().nullable().optional(),
  platform: z.enum(SOCIAL_PLATFORMS),
  content: z.string().min(1).max(10000),
  mediaUrls: z.array(z.string()).max(10).default([]),
  linkUrl: z.string().url().max(2000).nullable().optional(),
  scheduledAt: z.coerce.date(),
  status: z.enum(SOCIAL_POST_STATUSES).default("scheduled"),
});

const UpdateSocialPostBody = z.object({
  platform: z.enum(SOCIAL_PLATFORMS).optional(),
  content: z.string().min(1).max(10000).optional(),
  mediaUrls: z.array(z.string()).max(10).optional(),
  linkUrl: z.string().url().max(2000).nullable().optional(),
  scheduledAt: z.coerce.date().optional(),
  status: z.enum(SOCIAL_POST_STATUSES).optional(),
});

// ─── GET /api/social/posts ─────────────────────────────────────────────────────
// Lists the caller's scheduled posts, optionally filtered to a month/date range.

router.get("/social/posts", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const status = req.query.status ? String(req.query.status) : undefined;

  const conditions = [eq(scheduledPostsTable.userId, caller.id)];
  if (from && !isNaN(from.getTime())) conditions.push(gte(scheduledPostsTable.scheduledAt, from));
  if (to && !isNaN(to.getTime())) conditions.push(lte(scheduledPostsTable.scheduledAt, to));
  if (status && (SOCIAL_POST_STATUSES as readonly string[]).includes(status)) {
    conditions.push(eq(scheduledPostsTable.status, status));
  }

  const rows = await db
    .select()
    .from(scheduledPostsTable)
    .where(and(...conditions))
    .orderBy(asc(scheduledPostsTable.scheduledAt));

  res.json(serialize(rows));
});

// ─── GET /api/social/posts/:id ──────────────────────────────────────────────────

router.get("/social/posts/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid post id" }); return; }

  const [row] = await db.select().from(scheduledPostsTable).where(eq(scheduledPostsTable.id, id));
  if (!row) { res.status(404).json({ error: "Post not found" }); return; }
  if (!isAdminRole(caller.role) && row.userId !== caller.id) { res.status(403).json({ error: "Forbidden" }); return; }

  res.json(serialize(row));
});

// ─── POST /api/social/posts ─────────────────────────────────────────────────────

router.post("/social/posts", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const parsed = CreateSocialPostBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  if (parsed.data.systemInstanceId != null) {
    const [instance] = await db
      .select({ userId: systemInstancesTable.userId })
      .from(systemInstancesTable)
      .where(eq(systemInstancesTable.id, parsed.data.systemInstanceId));
    if (!instance) { res.status(404).json({ error: "System instance not found" }); return; }
    if (instance.userId !== null && instance.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  }

  const [row] = await db
    .insert(scheduledPostsTable)
    .values({
      userId,
      systemInstanceId: parsed.data.systemInstanceId ?? null,
      platform: parsed.data.platform,
      content: parsed.data.content,
      mediaUrls: parsed.data.mediaUrls,
      linkUrl: parsed.data.linkUrl ?? null,
      scheduledAt: parsed.data.scheduledAt,
      status: parsed.data.status,
    })
    .returning();

  res.status(201).json(serialize(row));
});

// ─── PATCH /api/social/posts/:id ─────────────────────────────────────────────────
// Supports editing content/media/link and rescheduling (drag-to-reschedule on the calendar).

router.patch("/social/posts/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid post id" }); return; }

  const [existing] = await db.select().from(scheduledPostsTable).where(eq(scheduledPostsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Post not found" }); return; }

  const isAdmin = isAdminRole(caller.role);
  if (!isAdmin && existing.userId !== caller.id) { res.status(403).json({ error: "Forbidden" }); return; }

  const parsed = UpdateSocialPostBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  if (existing.status === "published" && (parsed.data.status === undefined || parsed.data.status === "published")) {
    // Allow retry (status -> scheduled) but block silent content edits on already-published posts
    if (parsed.data.content !== undefined || parsed.data.scheduledAt !== undefined) {
      res.status(400).json({ error: "Cannot edit content or schedule of an already-published post." });
      return;
    }
  }

  const [row] = await db
    .update(scheduledPostsTable)
    .set({
      ...(parsed.data.platform !== undefined ? { platform: parsed.data.platform } : {}),
      ...(parsed.data.content !== undefined ? { content: parsed.data.content } : {}),
      ...(parsed.data.mediaUrls !== undefined ? { mediaUrls: parsed.data.mediaUrls } : {}),
      ...(parsed.data.linkUrl !== undefined ? { linkUrl: parsed.data.linkUrl } : {}),
      ...(parsed.data.scheduledAt !== undefined ? { scheduledAt: parsed.data.scheduledAt } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status, errorMessage: parsed.data.status === "scheduled" ? null : existing.errorMessage } : {}),
      updatedAt: new Date(),
    })
    .where(eq(scheduledPostsTable.id, id))
    .returning();

  res.json(serialize(row));
});

// ─── DELETE /api/social/posts/:id ────────────────────────────────────────────────

router.delete("/social/posts/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid post id" }); return; }

  const [existing] = await db.select().from(scheduledPostsTable).where(eq(scheduledPostsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Post not found" }); return; }

  const isAdmin = isAdminRole(caller.role);
  if (!isAdmin && existing.userId !== caller.id) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(scheduledPostsTable).where(eq(scheduledPostsTable.id, id));
  res.sendStatus(204);
});

// ─── GET /api/social/analytics ───────────────────────────────────────────────────
// Aggregate click-through stats for the caller's posts, grouped by platform.

router.get("/social/analytics", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const rows = await db
    .select({
      platform: scheduledPostsTable.platform,
      totalPosts: sql<number>`count(*)::int`,
      published: sql<number>`count(*) filter (where ${scheduledPostsTable.status} = 'published')::int`,
      failed: sql<number>`count(*) filter (where ${scheduledPostsTable.status} = 'failed')::int`,
      totalClicks: sql<number>`coalesce(sum(${scheduledPostsTable.clickCount}), 0)::int`,
    })
    .from(scheduledPostsTable)
    .where(eq(scheduledPostsTable.userId, caller.id))
    .groupBy(scheduledPostsTable.platform);

  res.json(serialize(rows));
});

// ─── GET /api/r/:postId ───────────────────────────────────────────────────────────
// Public click-tracking redirect for links shared in scheduled posts. Not auth-gated
// (recipients clicking the link from social platforms are anonymous).

router.get("/r/:postId", async (req, res): Promise<void> => {
  const id = Number(req.params.postId);
  if (isNaN(id)) { res.status(404).send("Not found"); return; }

  const [row] = await db.select().from(scheduledPostsTable).where(eq(scheduledPostsTable.id, id));
  if (!row || !row.linkUrl) { res.status(404).send("Not found"); return; }

  db.update(scheduledPostsTable)
    .set({ clickCount: sql`${scheduledPostsTable.clickCount} + 1` })
    .where(eq(scheduledPostsTable.id, id))
    .catch(() => { /* non-critical */ });

  res.redirect(302, row.linkUrl);
});

export default router;
