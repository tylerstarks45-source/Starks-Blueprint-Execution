import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { db, pool, emailListsTable, emailSubscribersTable, emailSequencesTable, emailSequenceStepsTable, emailDeliveriesTable, emailCampaignsTable, usersTable } from "@workspace/db";
import { requireAuthActive } from "../lib/auth";
import { complete } from "../lib/openrouter";
import { sendEmailViaCredentials, batchSend, generateUnsubscribeToken, buildUnsubscribeUrl, verifyWebhookSignature, getBaseUrl } from "../lib/sendgrid";
import { z } from "zod";
import type { Request, Response } from "express";

const router: IRouter = Router();

const CreateListBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
});

const CreateSubscriberBody = z.object({
  email: z.string().email("Must be a valid email"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
});

const BulkImportBody = z.object({
  subscribers: z.array(z.object({
    email: z.string().email(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })).min(1).max(500),
});

const CreateSequenceBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  listId: z.number().int().optional(),
});

const CreateSequenceStepBody = z.object({
  subject: z.string().min(1).max(300),
  body: z.string().min(1),
  delayDays: z.number().int().min(0).default(0),
  stepNumber: z.number().int().min(1),
});

const GenerateSequenceBody = z.object({
  sequenceId: z.number().int(),
  niche: z.string().min(1).max(200),
  goal: z.string().min(1).max(500),
  tone: z.enum(["professional", "casual", "urgent", "educational", "inspirational"]).optional(),
  numberOfEmails: z.number().int().min(3).max(10).default(5),
});

// ── EMAIL LISTS ──────────────────────────────────────────────────────────────

router.get("/email/lists", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const rows = await db.select().from(emailListsTable)
    .where(eq(emailListsTable.userId, userId))
    .orderBy(desc(emailListsTable.createdAt));
  res.json(serialize(rows));
});

router.post("/email/lists", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const parsed = CreateListBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(emailListsTable).values({ userId, ...parsed.data }).returning();
  res.status(201).json(serialize(row));
});

router.get("/email/lists/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [row] = await db.select().from(emailListsTable)
    .where(and(eq(emailListsTable.id, id), eq(emailListsTable.userId, userId)));
  if (!row) {
    res.status(404).json({ error: "List not found" });
    return;
  }
  res.json(serialize(row));
});

router.patch("/email/lists/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const parsed = CreateListBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.update(emailListsTable).set(parsed.data)
    .where(and(eq(emailListsTable.id, id), eq(emailListsTable.userId, userId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "List not found" });
    return;
  }
  res.json(serialize(row));
});

router.delete("/email/lists/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [row] = await db.delete(emailListsTable)
    .where(and(eq(emailListsTable.id, id), eq(emailListsTable.userId, userId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "List not found" });
    return;
  }
  res.sendStatus(204);
});

// ── SUBSCRIBERS ──────────────────────────────────────────────────────────────

router.get("/email/lists/:id/subscribers", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const listId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [list] = await db.select().from(emailListsTable)
    .where(and(eq(emailListsTable.id, listId), eq(emailListsTable.userId, userId)));
  if (!list) {
    res.status(404).json({ error: "List not found" });
    return;
  }
  const rows = await db.select().from(emailSubscribersTable)
    .where(eq(emailSubscribersTable.listId, listId))
    .orderBy(desc(emailSubscribersTable.createdAt));
  res.json(serialize(rows));
});

router.post("/email/lists/:id/subscribers", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const listId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [list] = await db.select().from(emailListsTable)
    .where(and(eq(emailListsTable.id, listId), eq(emailListsTable.userId, userId)));
  if (!list) {
    res.status(404).json({ error: "List not found" });
    return;
  }
  const parsed = CreateSubscriberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(emailSubscribersTable)
    .values({ listId, ...parsed.data })
    .onConflictDoNothing()
    .returning();
  if (!row) {
    res.status(409).json({ error: "Subscriber already exists in this list" });
    return;
  }
  await db.update(emailListsTable)
    .set({ subscriberCount: sql`${emailListsTable.subscriberCount} + 1` })
    .where(eq(emailListsTable.id, listId));
  res.status(201).json(serialize(row));
});

router.post("/email/lists/:id/subscribers/bulk", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const listId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [list] = await db.select().from(emailListsTable)
    .where(and(eq(emailListsTable.id, listId), eq(emailListsTable.userId, userId)));
  if (!list) {
    res.status(404).json({ error: "List not found" });
    return;
  }
  const parsed = BulkImportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const rows = await db.insert(emailSubscribersTable)
    .values(parsed.data.subscribers.map(s => ({ listId, ...s })))
    .onConflictDoNothing()
    .returning();
  await db.update(emailListsTable)
    .set({ subscriberCount: sql`${emailListsTable.subscriberCount} + ${rows.length}` })
    .where(eq(emailListsTable.id, listId));
  res.status(201).json({ imported: rows.length, total: parsed.data.subscribers.length });
});

router.patch("/email/subscribers/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const UpdateBody = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    status: z.enum(["active", "unsubscribed", "bounced"]).optional(),
    tags: z.array(z.string()).optional(),
  });
  const parsed = UpdateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [sub] = await db.select({ id: emailSubscribersTable.id, listId: emailSubscribersTable.listId })
    .from(emailSubscribersTable).where(eq(emailSubscribersTable.id, id));
  if (!sub) {
    res.status(404).json({ error: "Subscriber not found" });
    return;
  }
  const [list] = await db.select().from(emailListsTable)
    .where(and(eq(emailListsTable.id, sub.listId), eq(emailListsTable.userId, userId)));
  if (!list) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [row] = await db.update(emailSubscribersTable).set(parsed.data)
    .where(eq(emailSubscribersTable.id, id)).returning();
  res.json(serialize(row));
});

router.delete("/email/subscribers/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [sub] = await db.select({ id: emailSubscribersTable.id, listId: emailSubscribersTable.listId })
    .from(emailSubscribersTable).where(eq(emailSubscribersTable.id, id));
  if (!sub) {
    res.status(404).json({ error: "Subscriber not found" });
    return;
  }
  const [list] = await db.select().from(emailListsTable)
    .where(and(eq(emailListsTable.id, sub.listId), eq(emailListsTable.userId, userId)));
  if (!list) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await db.delete(emailSubscribersTable).where(eq(emailSubscribersTable.id, id));
  await db.update(emailListsTable)
    .set({ subscriberCount: sql`GREATEST(${emailListsTable.subscriberCount} - 1, 0)` })
    .where(eq(emailListsTable.id, sub.listId));
  res.sendStatus(204);
});

// ── EMAIL SEQUENCES ──────────────────────────────────────────────────────────

router.get("/email/sequences", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const rows = await db.select().from(emailSequencesTable)
    .where(eq(emailSequencesTable.userId, userId))
    .orderBy(desc(emailSequencesTable.createdAt));
  res.json(serialize(rows));
});

router.post("/email/sequences", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const parsed = CreateSequenceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(emailSequencesTable).values({ userId, ...parsed.data }).returning();
  res.status(201).json(serialize(row));
});

router.patch("/email/sequences/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const seqId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [seq] = await db.select().from(emailSequencesTable)
    .where(and(eq(emailSequencesTable.id, seqId), eq(emailSequencesTable.userId, userId)));
  if (!seq) { res.status(404).json({ error: "Sequence not found" }); return; }
  const parsed = CreateSequenceBody.partial().extend({ status: z.enum(["draft", "active", "paused"]).optional() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(emailSequencesTable).set(parsed.data)
    .where(and(eq(emailSequencesTable.id, seqId), eq(emailSequencesTable.userId, userId)))
    .returning();
  res.json(serialize(row));
});

router.delete("/email/sequences/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const seqId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [row] = await db.delete(emailSequencesTable)
    .where(and(eq(emailSequencesTable.id, seqId), eq(emailSequencesTable.userId, userId)))
    .returning();
  if (!row) { res.status(404).json({ error: "Sequence not found" }); return; }
  res.sendStatus(204);
});

router.get("/email/sequences/:id/steps", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const seqId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [seq] = await db.select().from(emailSequencesTable)
    .where(and(eq(emailSequencesTable.id, seqId), eq(emailSequencesTable.userId, userId)));
  if (!seq) {
    res.status(404).json({ error: "Sequence not found" });
    return;
  }
  const rows = await db.select().from(emailSequenceStepsTable)
    .where(eq(emailSequenceStepsTable.sequenceId, seqId))
    .orderBy(emailSequenceStepsTable.stepNumber);
  res.json(serialize(rows));
});

router.post("/email/sequences/:id/steps", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const seqId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [seq] = await db.select().from(emailSequencesTable)
    .where(and(eq(emailSequencesTable.id, seqId), eq(emailSequencesTable.userId, userId)));
  if (!seq) {
    res.status(404).json({ error: "Sequence not found" });
    return;
  }
  const parsed = CreateSequenceStepBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(emailSequenceStepsTable)
    .values({ sequenceId: seqId, ...parsed.data }).returning();
  res.status(201).json(serialize(row));
});

// ── GET /api/email/sequences/:id/stats ───────────────────────────────────────
router.get("/email/sequences/:id/stats", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const seqId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [seq] = await db.select().from(emailSequencesTable)
    .where(and(eq(emailSequencesTable.id, seqId), eq(emailSequencesTable.userId, userId)));
  if (!seq) { res.status(404).json({ error: "Sequence not found" }); return; }

  const statsRow = await pool.query<{
    total: string; sent: string; delivered: string; opened: string;
    clicked: string; bounced: string; unsubscribed: string; failed: string;
  }>(
    `SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status != 'failed') AS sent,
      COUNT(*) FILTER (WHERE delivered_at IS NOT NULL) AS delivered,
      COUNT(*) FILTER (WHERE opened_at IS NOT NULL) AS opened,
      COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) AS clicked,
      COUNT(*) FILTER (WHERE bounced_at IS NOT NULL OR status = 'bounced') AS bounced,
      COUNT(*) FILTER (WHERE unsubscribed_at IS NOT NULL OR status = 'unsubscribed') AS unsubscribed,
      COUNT(*) FILTER (WHERE status = 'failed') AS failed
     FROM email_deliveries WHERE sequence_id = $1`,
    [seqId],
  );
  const r = statsRow.rows[0] ?? { total: "0", sent: "0", delivered: "0", opened: "0", clicked: "0", bounced: "0", unsubscribed: "0", failed: "0" };
  const total     = parseInt(r.total, 10);
  const sent      = parseInt(r.sent, 10);
  const delivered = parseInt(r.delivered, 10);
  const opened    = parseInt(r.opened, 10);
  const clicked   = parseInt(r.clicked, 10);
  const unsubscribed = parseInt(r.unsubscribed, 10);
  // Use sent as denominator (delivered may be 0 when webhook not yet configured).
  const denom = sent > 0 ? sent : 1;

  res.json({
    total,
    sent,
    delivered,
    opened,
    clicked,
    bounced: parseInt(r.bounced, 10),
    unsubscribed,
    failed: parseInt(r.failed, 10),
    openRate:   Math.round((opened      / denom) * 1000) / 10,
    clickRate:  Math.round((clicked     / denom) * 1000) / 10,
    unsubRate:  Math.round((unsubscribed/ denom) * 1000) / 10,
  });
});

// ── POST /api/email/sequences/generate ───────────────────────────────────────
router.post("/email/sequences/generate", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const parsed = GenerateSequenceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [seq] = await db.select().from(emailSequencesTable)
    .where(and(eq(emailSequencesTable.id, parsed.data.sequenceId), eq(emailSequencesTable.userId, userId)));
  if (!seq) {
    res.status(404).json({ error: "Sequence not found" });
    return;
  }

  req.log.info({ seqId: parsed.data.sequenceId, niche: parsed.data.niche }, "ASH generating email sequence");

  const result = await complete({
    systemPrompt: `You are ASH, an expert email marketer and copywriter. Generate a high-converting email sequence.
Return ONLY valid JSON, no markdown, no code blocks:
{
  "emails": [
    {
      "stepNumber": 1,
      "delayDays": 0,
      "subject": "email subject line",
      "body": "full email body in plain text with paragraphs"
    }
  ]
}`,
    prompt: `Generate a ${parsed.data.numberOfEmails}-email sequence for this context:
Niche: ${parsed.data.niche}
Goal: ${parsed.data.goal}
Tone: ${parsed.data.tone ?? "professional"}

Make each email valuable, build trust, and drive the goal. Use proven email marketing formulas.`,
    model: "openai/gpt-4o",
    userId,
  });

  let emails: Array<{ stepNumber: number; delayDays: number; subject: string; body: string }> = [];
  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    emails = data.emails ?? [];
  } catch {
    res.status(500).json({ error: "Failed to parse AI response. Please try again." });
    return;
  }

  const steps = await db.insert(emailSequenceStepsTable)
    .values(emails.map(e => ({
      sequenceId: parsed.data.sequenceId,
      stepNumber: e.stepNumber,
      delayDays: e.delayDays,
      subject: e.subject,
      body: e.body,
    })))
    .returning();

  res.json({ steps: serialize(steps) });
});

// ── POST /api/email/sequences/:id/preview ────────────────────────────────────
// Sends step 1 (or the specified stepNumber) to the authenticated user's own email.
router.post("/email/sequences/:id/preview", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const seqId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { stepNumber = 1 } = req.body as { stepNumber?: number };

  const [seq] = await db.select().from(emailSequencesTable)
    .where(and(eq(emailSequencesTable.id, seqId), eq(emailSequencesTable.userId, userId)));
  if (!seq) { res.status(404).json({ error: "Sequence not found" }); return; }

  const [step] = await db.select().from(emailSequenceStepsTable)
    .where(and(eq(emailSequenceStepsTable.sequenceId, seqId), eq(emailSequenceStepsTable.stepNumber, stepNumber)));
  if (!step) { res.status(404).json({ error: `Step ${stepNumber} not found` }); return; }

  const [user] = await db.select({ email: usersTable.email, name: usersTable.name })
    .from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const result = await sendEmailViaCredentials({
    userId,
    to: user.email,
    subject: `[PREVIEW] ${step.subject}`,
    body: step.body,
    fromName: "SBEP Preview",
    vars: { firstName: user.name?.split(" ")[0] ?? "Subscriber", lastName: "", email: user.email },
    unsubscribeUrl: `${getBaseUrl()}/api/email/unsubscribe?preview=1`,
  });

  if (!result.ok) {
    res.status(502).json({ error: result.error ?? "Send failed" });
    return;
  }

  res.json({ ok: true, sentTo: user.email, subject: step.subject });
});

// ── POST /api/email/sequences/:id/broadcast ───────────────────────────────────
// Sends the specified step to all active subscribers in the linked list.
// Performs actual delivery via SendGrid and records each send in email_deliveries.
const BroadcastBody = z.object({
  stepNumber: z.number().int().min(1).default(1),
});

router.post("/email/sequences/:id/broadcast", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const seqId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (!Number.isFinite(seqId)) {
    res.status(400).json({ error: "Invalid sequence id" });
    return;
  }

  const parsed = BroadcastBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { stepNumber } = parsed.data;

  const [seq] = await db.select().from(emailSequencesTable)
    .where(and(eq(emailSequencesTable.id, seqId), eq(emailSequencesTable.userId, userId)));
  if (!seq) {
    res.status(404).json({ error: "Sequence not found" });
    return;
  }

  const [step] = await db.select().from(emailSequenceStepsTable)
    .where(and(
      eq(emailSequenceStepsTable.sequenceId, seqId),
      eq(emailSequenceStepsTable.stepNumber, stepNumber),
    ));
  if (!step) {
    res.status(404).json({ error: `Step ${stepNumber} not found in sequence` });
    return;
  }

  if (!seq.listId) {
    res.status(400).json({ error: "Sequence has no linked list. Attach a list before broadcasting." });
    return;
  }

  const subscribers = await db.select({
    id: emailSubscribersTable.id,
    email: emailSubscribersTable.email,
    firstName: emailSubscribersTable.firstName,
    lastName: emailSubscribersTable.lastName,
  }).from(emailSubscribersTable)
    .where(and(
      eq(emailSubscribersTable.listId, seq.listId),
      eq(emailSubscribersTable.status, "active"),
    ));

  if (subscribers.length === 0) {
    res.json({ sent: 0, failed: 0, message: "No active subscribers in list" });
    return;
  }

  // ── A/B subject split ────────────────────────────────────────────────────────
  const abRows = await pool.query<{ id: number; token: string }>(
    `SELECT id, token FROM ab_tests
     WHERE status = 'running' AND type = 'email_subject'
       AND (config->>'sequenceId')::int = $1
     LIMIT 1`,
    [seqId],
  );
  const abTestInfo = abRows.rowCount && abRows.rowCount > 0 ? (abRows.rows[0] ?? null) : null;

  let subjectFor: (sub: { id: number }) => string = () => step.subject;

  if (abTestInfo) {
    const variantRows = await pool.query<{ id: number; visits: number; contentRef: string }>(
      `SELECT id, visits, content_ref AS "contentRef" FROM ab_variants WHERE test_id = $1 AND status = 'active' ORDER BY id`,
      [abTestInfo.id],
    );
    const variants = variantRows.rows;
    if (variants.length >= 2) {
      const runningVisits = new Map<number, number>(variants.map(v => [v.id, v.visits]));
      const assignMap = new Map<number, string>();
      for (const sub of subscribers) {
        let chosen = variants[0]!;
        for (const v of variants) {
          if ((runningVisits.get(v.id) ?? 0) < (runningVisits.get(chosen.id) ?? 0)) chosen = v;
        }
        runningVisits.set(chosen.id, (runningVisits.get(chosen.id) ?? 0) + 1);
        assignMap.set(sub.id, (chosen.contentRef && chosen.contentRef.trim()) ? chosen.contentRef : step.subject);
      }
      await Promise.all(variants.map(v => {
        const delta = (runningVisits.get(v.id) ?? 0) - v.visits;
        if (delta <= 0) return Promise.resolve();
        return pool.query(`UPDATE ab_variants SET visits = visits + $1 WHERE id = $2`, [delta, v.id]);
      }));
      subjectFor = (sub) => assignMap.get(sub.id) ?? step.subject;
    }
  }

  // Respond immediately with 202 — sending happens in background.
  res.status(202).json({ queued: subscribers.length, message: "Broadcast started in background" });

  // Fire-and-forget delivery
  setImmediate(async () => {
    let sentCount = 0;
    let failedCount = 0;
    const CONCURRENCY = 10;

    for (let i = 0; i < subscribers.length; i += CONCURRENCY) {
      const chunk = subscribers.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(async (sub) => {
        const subject = subjectFor(sub);
        try {
          const result = await sendEmailViaCredentials({
            userId,
            to: sub.email,
            subject,
            body: step.body,
            vars: { firstName: sub.firstName ?? "", lastName: sub.lastName ?? "", email: sub.email },
            unsubscribeUrl: buildUnsubscribeUrl(getBaseUrl(), sub.id, sub.email),
          });
          await db.insert(emailDeliveriesTable).values({
            userId,
            subscriberId: sub.id,
            sequenceId: seqId,
            stepId: step.id,
            toEmail: sub.email,
            subject,
            status: result.ok ? "sent" : "failed",
            messageId: result.messageId ?? null,
            sentAt: result.ok ? new Date() : null,
            errorMessage: result.error ?? null,
          }).onConflictDoNothing();
          if (result.ok) sentCount++; else failedCount++;
        } catch (err) {
          failedCount++;
          await db.insert(emailDeliveriesTable).values({
            userId,
            subscriberId: sub.id,
            sequenceId: seqId,
            stepId: step.id,
            toEmail: sub.email,
            subject,
            status: "failed",
            errorMessage: err instanceof Error ? err.message : String(err),
          }).onConflictDoNothing().catch(() => { /* non-fatal */ });
        }
      }));
    }
    req.log?.info({ seqId, stepNumber, sentCount, failedCount }, "Broadcast complete");
  });
});

// ── CAMPAIGNS ────────────────────────────────────────────────────────────────

const CreateCampaignBody = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(300),
  body: z.string().min(1),
  fromName: z.string().optional(),
  listId: z.number().int().optional(),
});

router.get("/email/campaigns", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const rows = await db.select().from(emailCampaignsTable)
    .where(eq(emailCampaignsTable.userId, userId))
    .orderBy(desc(emailCampaignsTable.createdAt));
  res.json(serialize(rows));
});

router.post("/email/campaigns", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const parsed = CreateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(emailCampaignsTable).values({ userId, ...parsed.data }).returning();
  res.status(201).json(serialize(row));
});

router.patch("/email/campaigns/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [camp] = await db.select().from(emailCampaignsTable)
    .where(and(eq(emailCampaignsTable.id, id), eq(emailCampaignsTable.userId, userId)));
  if (!camp) { res.status(404).json({ error: "Campaign not found" }); return; }
  if (camp.status === "sent") { res.status(409).json({ error: "Cannot edit a sent campaign" }); return; }
  const parsed = CreateCampaignBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(emailCampaignsTable).set(parsed.data)
    .where(and(eq(emailCampaignsTable.id, id), eq(emailCampaignsTable.userId, userId)))
    .returning();
  res.json(serialize(row));
});

router.delete("/email/campaigns/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [row] = await db.delete(emailCampaignsTable)
    .where(and(eq(emailCampaignsTable.id, id), eq(emailCampaignsTable.userId, userId)))
    .returning();
  if (!row) { res.status(404).json({ error: "Campaign not found" }); return; }
  res.sendStatus(204);
});

// ── POST /api/email/campaigns/:id/send ───────────────────────────────────────
// Blast a campaign to all active subscribers in its linked list.
router.post("/email/campaigns/:id/send", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

  const [camp] = await db.select().from(emailCampaignsTable)
    .where(and(eq(emailCampaignsTable.id, id), eq(emailCampaignsTable.userId, userId)));
  if (!camp) { res.status(404).json({ error: "Campaign not found" }); return; }
  if (camp.status !== "draft") { res.status(409).json({ error: `Campaign is already ${camp.status} — cannot re-send` }); return; }
  if (!camp.listId) { res.status(400).json({ error: "Campaign has no linked list" }); return; }

  const subscribers = await db.select({
    id: emailSubscribersTable.id,
    email: emailSubscribersTable.email,
    firstName: emailSubscribersTable.firstName,
    lastName: emailSubscribersTable.lastName,
  }).from(emailSubscribersTable)
    .where(and(eq(emailSubscribersTable.listId, camp.listId), eq(emailSubscribersTable.status, "active")));

  if (subscribers.length === 0) {
    res.json({ sent: 0, failed: 0, message: "No active subscribers" });
    return;
  }

  // Atomic draft→sending — prevents duplicate blasts from concurrent requests.
  // Only succeeds when status is still 'draft'; if another request already claimed it, returns nothing.
  const [claimed] = await db.update(emailCampaignsTable)
    .set({ status: "sending", sentAt: new Date() })
    .where(and(eq(emailCampaignsTable.id, id), eq(emailCampaignsTable.status, "draft")))
    .returning({ id: emailCampaignsTable.id });

  if (!claimed) {
    res.status(409).json({ error: "Campaign send already in progress" }); return;
  }

  res.status(202).json({ queued: subscribers.length, message: "Campaign send started in background" });

  // Fire-and-forget delivery
  setImmediate(async () => {
    let sentCount = 0;
    let failedCount = 0;
    const CONCURRENCY = 10;

    for (let i = 0; i < subscribers.length; i += CONCURRENCY) {
      const chunk = subscribers.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(async (sub) => {
        try {
          const result = await sendEmailViaCredentials({
            userId,
            to: sub.email,
            subject: camp.subject,
            body: camp.body,
            fromName: camp.fromName ?? undefined,
            vars: { firstName: sub.firstName ?? "", lastName: sub.lastName ?? "", email: sub.email },
            unsubscribeUrl: buildUnsubscribeUrl(getBaseUrl(), sub.id, sub.email),
          });
          await db.insert(emailDeliveriesTable).values({
            userId,
            subscriberId: sub.id,
            campaignId: id,
            toEmail: sub.email,
            subject: camp.subject,
            status: result.ok ? "sent" : "failed",
            messageId: result.messageId ?? null,
            sentAt: result.ok ? new Date() : null,
            errorMessage: result.error ?? null,
          }).onConflictDoNothing();
          if (result.ok) sentCount++; else failedCount++;
        } catch (err) {
          failedCount++;
          await db.insert(emailDeliveriesTable).values({
            userId,
            subscriberId: sub.id,
            campaignId: id,
            toEmail: sub.email,
            subject: camp.subject,
            status: "failed",
            errorMessage: err instanceof Error ? err.message : String(err),
          }).onConflictDoNothing().catch(() => { /* non-fatal */ });
        }
      }));
    }

    // Update campaign counters
    await db.update(emailCampaignsTable)
      .set({
        status: "sent",
        sentCount,
        failedCount,
      })
      .where(eq(emailCampaignsTable.id, id));

    req.log?.info({ campaignId: id, sentCount, failedCount }, "Campaign send complete");
  });
});

// ── GET /api/email/campaigns/:id/stats ───────────────────────────────────────
router.get("/email/campaigns/:id/stats", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [camp] = await db.select().from(emailCampaignsTable)
    .where(and(eq(emailCampaignsTable.id, id), eq(emailCampaignsTable.userId, userId)));
  if (!camp) { res.status(404).json({ error: "Campaign not found" }); return; }

  const statsRow = await pool.query<{
    total: string; delivered: string; opened: string; clicked: string;
    bounced: string; unsubscribed: string; failed: string;
  }>(
    `SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE delivered_at IS NOT NULL) AS delivered,
      COUNT(*) FILTER (WHERE opened_at IS NOT NULL) AS opened,
      COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) AS clicked,
      COUNT(*) FILTER (WHERE bounced_at IS NOT NULL OR status = 'bounced') AS bounced,
      COUNT(*) FILTER (WHERE unsubscribed_at IS NOT NULL OR status = 'unsubscribed') AS unsubscribed,
      COUNT(*) FILTER (WHERE status = 'failed') AS failed
     FROM email_deliveries WHERE campaign_id = $1`,
    [id],
  );
  const r = statsRow.rows[0] ?? { total: "0", delivered: "0", opened: "0", clicked: "0", bounced: "0", unsubscribed: "0", failed: "0" };
  const sent         = camp.sentCount;
  const delivered    = parseInt(r.delivered, 10);
  const opened       = parseInt(r.opened, 10);
  const clicked      = parseInt(r.clicked, 10);
  const unsubscribed = parseInt(r.unsubscribed, 10);
  const denom = sent > 0 ? sent : 1;

  res.json({
    ...serialize(camp),
    delivered,
    opened,
    clicked,
    bounced: parseInt(r.bounced, 10),
    unsubscribed,
    failed: parseInt(r.failed, 10),
    openRate:  Math.round((opened      / denom) * 1000) / 10,
    clickRate: Math.round((clicked     / denom) * 1000) / 10,
    unsubRate: Math.round((unsubscribed/ denom) * 1000) / 10,
  });
});

// ── GET /api/email/unsubscribe ────────────────────────────────────────────────
// Public one-click unsubscribe endpoint. No auth required.
// Link format: /api/email/unsubscribe?sub=<id>&token=<hmac>
router.get("/email/unsubscribe", async (req, res): Promise<void> => {
  const subId = parseInt((req.query["sub"] as string) ?? "", 10);
  const token = (req.query["token"] as string) ?? "";

  // Preview emails use a placeholder URL — just show a friendly page.
  if (req.query["preview"] === "1") {
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#09090b;color:#d4d4d8;">
      <h2 style="color:#8844E0;">Unsubscribe Preview</h2>
      <p>This was a preview email. No action was taken.</p>
    </body></html>`);
    return;
  }

  if (!Number.isFinite(subId) || !token) {
    res.status(400).setHeader("Content-Type", "text/html").end(
      `<html><body style="font-family:sans-serif;padding:60px;background:#09090b;color:#d4d4d8;"><h2>Invalid unsubscribe link.</h2></body></html>`,
    );
    return;
  }

  const [sub] = await db.select({ id: emailSubscribersTable.id, email: emailSubscribersTable.email, status: emailSubscribersTable.status })
    .from(emailSubscribersTable).where(eq(emailSubscribersTable.id, subId));

  if (!sub) {
    res.status(404).setHeader("Content-Type", "text/html").end(
      `<html><body style="font-family:sans-serif;padding:60px;background:#09090b;color:#d4d4d8;"><h2>Subscriber not found.</h2></body></html>`,
    );
    return;
  }

  const expectedToken = generateUnsubscribeToken(sub.id, sub.email);
  if (token !== expectedToken) {
    res.status(403).setHeader("Content-Type", "text/html").end(
      `<html><body style="font-family:sans-serif;padding:60px;background:#09090b;color:#d4d4d8;"><h2>Invalid unsubscribe token.</h2></body></html>`,
    );
    return;
  }

  if (sub.status !== "unsubscribed") {
    await db.update(emailSubscribersTable)
      .set({ status: "unsubscribed" })
      .where(eq(emailSubscribersTable.id, sub.id));
  }

  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:60px 20px;background:#09090b;color:#d4d4d8;">
  <div style="max-width:480px;margin:0 auto;background:#18181b;border-radius:16px;padding:48px 32px;border:1px solid #27272a;">
    <h2 style="color:#8844E0;margin-bottom:8px;">You've been unsubscribed</h2>
    <p style="color:#71717a;font-size:14px;">You'll no longer receive emails from this list.</p>
  </div>
</body>
</html>`);
});

// ── Shared SendGrid webhook handler ──────────────────────────────────────────
// Used by both POST /api/email/webhooks/sendgrid and POST /api/webhooks/sendgrid.
export async function handleSendGridWebhook(req: Request, res: Response): Promise<void> {
  // ── Signature verification (ECDSA P-256 / SHA-256) ────────────────────────
  const rawBody = (req as { rawBody?: Buffer }).rawBody;
  const signature = req.headers["x-twilio-email-event-webhook-signature"] as string | undefined;
  const timestamp = req.headers["x-twilio-email-event-webhook-timestamp"] as string | undefined;
  const publicKey = process.env["SENDGRID_WEBHOOK_PUBLIC_KEY"];

  const isDev = process.env["NODE_ENV"] === "development";

  if (publicKey) {
    // Key is configured — verify every request.
    if (rawBody && signature && timestamp) {
      const valid = verifyWebhookSignature(publicKey, rawBody, timestamp, signature);
      if (!valid) {
        req.log.warn({ signature, timestamp }, "SendGrid webhook: invalid signature — rejecting");
        res.status(403).json({ error: "Invalid webhook signature" });
        return;
      }
    } else {
      // Key configured but required headers missing — always reject (signature bypass attempt).
      req.log.warn({ hasRaw: !!rawBody, hasSig: !!signature, hasTs: !!timestamp }, "SendGrid webhook: missing signature headers");
      res.status(403).json({ error: "Missing webhook signature headers" });
      return;
    }
  } else if (!isDev) {
    // No key configured in production — fail-closed to prevent forged events.
    req.log.warn("SendGrid webhook: SENDGRID_WEBHOOK_PUBLIC_KEY not set — rejecting in production");
    res.status(403).json({ error: "Webhook signature verification not configured" });
    return;
  } else {
    req.log.warn("SendGrid webhook: signature verification disabled (development mode, no SENDGRID_WEBHOOK_PUBLIC_KEY)");
  }

  const events = Array.isArray(req.body) ? req.body : [req.body];
  req.log.info({ count: events.length }, "SendGrid webhook: processing events");

  for (const evt of events) {
    const event = evt as Record<string, unknown>;
    const messageId = (event["sg_message_id"] as string | undefined)?.split(".")[0];
    const eventType = event["event"] as string | undefined;
    if (!messageId || !eventType) continue;

    const msgPattern = `${messageId}%`;

    try {
      const now = new Date();

      if (eventType === "open") {
        // CTE ensures the counter only increments on the FIRST open (opened_at IS NULL guard).
        // SendGrid retry/duplicate events for the same messageId will update no rows in the CTE
        // and therefore won't increment the campaign counter.
        await pool.query(
          `WITH first_open AS (
             UPDATE email_deliveries SET status = 'opened', opened_at = $1
             WHERE message_id LIKE $2 AND opened_at IS NULL
             RETURNING campaign_id
           )
           UPDATE email_campaigns SET open_count = open_count + 1
           WHERE id IN (SELECT campaign_id FROM first_open WHERE campaign_id IS NOT NULL)`,
          [now, msgPattern],
        );

      } else if (eventType === "click") {
        await pool.query(
          `WITH first_click AS (
             UPDATE email_deliveries SET status = 'clicked', clicked_at = $1
             WHERE message_id LIKE $2 AND clicked_at IS NULL
             RETURNING campaign_id
           )
           UPDATE email_campaigns SET click_count = click_count + 1
           WHERE id IN (SELECT campaign_id FROM first_click WHERE campaign_id IS NOT NULL)`,
          [now, msgPattern],
        );

      } else if (eventType === "bounce" || eventType === "dropped") {
        await pool.query(
          `WITH first_bounce AS (
             UPDATE email_deliveries SET status = 'bounced', bounced_at = $1
             WHERE message_id LIKE $2 AND bounced_at IS NULL
             RETURNING campaign_id, subscriber_id
           )
           UPDATE email_subscribers SET status = 'bounced'
           WHERE id IN (SELECT subscriber_id FROM first_bounce WHERE subscriber_id IS NOT NULL)`,
          [now, msgPattern],
        );
        await pool.query(
          `UPDATE email_campaigns SET bounce_count = bounce_count + 1
           WHERE id = (SELECT campaign_id FROM email_deliveries WHERE message_id LIKE $1 AND campaign_id IS NOT NULL AND bounced_at = $2 LIMIT 1)`,
          [msgPattern, now],
        );

      } else if (eventType === "unsubscribe" || eventType === "group_unsubscribe") {
        await pool.query(
          `WITH first_unsub AS (
             UPDATE email_deliveries SET status = 'unsubscribed', unsubscribed_at = $1
             WHERE message_id LIKE $2 AND unsubscribed_at IS NULL
             RETURNING campaign_id, subscriber_id
           )
           UPDATE email_subscribers SET status = 'unsubscribed'
           WHERE id IN (SELECT subscriber_id FROM first_unsub WHERE subscriber_id IS NOT NULL)`,
          [now, msgPattern],
        );
        await pool.query(
          `UPDATE email_campaigns SET unsubscribe_count = unsubscribe_count + 1
           WHERE id = (SELECT campaign_id FROM email_deliveries WHERE message_id LIKE $1 AND campaign_id IS NOT NULL AND unsubscribed_at = $2 LIMIT 1)`,
          [msgPattern, now],
        );
      } else if (eventType === "delivered") {
        await pool.query(
          `UPDATE email_deliveries SET status = 'delivered', delivered_at = $1 WHERE message_id LIKE $2 AND status = 'sent'`,
          [now, msgPattern],
        );
      }
    } catch (err) {
      req.log.warn({ err, eventType, messageId }, "SendGrid webhook: error processing event");
    }
  }

  res.json({ ok: true, processed: events.length });
}

// ── POST /api/email/webhooks/sendgrid ────────────────────────────────────────
router.post("/email/webhooks/sendgrid", handleSendGridWebhook);

// ── POST /api/email/campaigns/send ───────────────────────────────────────────
// Alias for POST /api/email/campaigns/:id/send — accepts {campaignId} in body.
// Matches the original task spec path for external callers.
router.post("/email/campaigns/send", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const { campaignId } = req.body as { campaignId?: number };
  if (!campaignId || !Number.isFinite(campaignId)) {
    res.status(400).json({ error: "campaignId is required" });
    return;
  }

  const [camp] = await db.select().from(emailCampaignsTable)
    .where(and(eq(emailCampaignsTable.id, campaignId), eq(emailCampaignsTable.userId, userId)));
  if (!camp) { res.status(404).json({ error: "Campaign not found" }); return; }
  if (camp.status !== "draft") { res.status(409).json({ error: `Campaign is already ${camp.status} — cannot re-send` }); return; }
  if (!camp.listId) { res.status(400).json({ error: "Campaign has no linked list" }); return; }

  const subscribers = await db.select({
    id: emailSubscribersTable.id,
    email: emailSubscribersTable.email,
    firstName: emailSubscribersTable.firstName,
    lastName: emailSubscribersTable.lastName,
  }).from(emailSubscribersTable)
    .where(and(eq(emailSubscribersTable.listId, camp.listId), eq(emailSubscribersTable.status, "active")));

  if (subscribers.length === 0) {
    res.json({ sent: 0, failed: 0, message: "No active subscribers" });
    return;
  }

  // Atomic draft→sending — prevents duplicate blasts from concurrent/retry requests.
  const [claimed] = await db.update(emailCampaignsTable)
    .set({ status: "sending", sentAt: new Date() })
    .where(and(eq(emailCampaignsTable.id, campaignId), eq(emailCampaignsTable.status, "draft")))
    .returning({ id: emailCampaignsTable.id });

  if (!claimed) {
    res.status(409).json({ error: "Campaign send already in progress" }); return;
  }

  res.status(202).json({ queued: subscribers.length, message: "Campaign send started in background" });

  setImmediate(async () => {
    const base = getBaseUrl();
    let sentCount = 0; let failedCount = 0;
    const CONCURRENCY = 10;
    for (let i = 0; i < subscribers.length; i += CONCURRENCY) {
      const chunk = subscribers.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(async (sub) => {
        try {
          const result = await sendEmailViaCredentials({
            userId,
            to: sub.email,
            subject: camp.subject,
            body: camp.body,
            fromName: camp.fromName ?? undefined,
            vars: { firstName: sub.firstName ?? "", lastName: sub.lastName ?? "", email: sub.email },
            unsubscribeUrl: buildUnsubscribeUrl(base, sub.id, sub.email),
          });
          await db.insert(emailDeliveriesTable).values({
            userId, subscriberId: sub.id, campaignId, toEmail: sub.email, subject: camp.subject,
            status: result.ok ? "sent" : "failed", messageId: result.messageId ?? null,
            sentAt: result.ok ? new Date() : null, errorMessage: result.error ?? null,
          }).onConflictDoNothing();
          if (result.ok) sentCount++; else failedCount++;
        } catch (err) {
          failedCount++;
          await db.insert(emailDeliveriesTable).values({
            userId, subscriberId: sub.id, campaignId, toEmail: sub.email,
            subject: camp.subject, status: "failed",
            errorMessage: err instanceof Error ? err.message : String(err),
          }).onConflictDoNothing().catch(() => {});
        }
      }));
    }
    await db.update(emailCampaignsTable).set({ status: "sent", sentCount, failedCount }).where(eq(emailCampaignsTable.id, campaignId));
  });
});

export default router;
