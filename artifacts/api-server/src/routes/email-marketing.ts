import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, pool, emailListsTable, emailSubscribersTable, emailSequencesTable, emailSequenceStepsTable } from "@workspace/db";
import { requireAuthActive } from "../lib/auth";
import { complete } from "../lib/openrouter";
import { z } from "zod";

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

// ── POST /api/email/sequences/generate — ASH generates a full email sequence ─
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

// ── POST /api/email/sequences/:id/broadcast ───────────────────────────────────
// Starts a broadcast send for a sequence. When an active email_subject A/B test is
// linked to this sequence (via test.config.sequenceId), subscribers are assigned to
// variants using a deterministic 1/N even allocator (pick variant with fewest visits).
// The variant's subject line is returned per subscriber so callers can send the correct
// email. Variant visit counts are incremented to track send exposure.
//
// Open events should be reported via POST /api/ab-tests/convert with
// eventType "email_open" and the variant's test token for winner selection.
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

  // Verify user owns this sequence
  const [seq] = await db.select().from(emailSequencesTable)
    .where(and(eq(emailSequencesTable.id, seqId), eq(emailSequencesTable.userId, userId)));
  if (!seq) {
    res.status(404).json({ error: "Sequence not found" });
    return;
  }

  // Fetch the requested step
  const [step] = await db.select().from(emailSequenceStepsTable)
    .where(and(
      eq(emailSequenceStepsTable.sequenceId, seqId),
      eq(emailSequenceStepsTable.stepNumber, stepNumber),
    ));
  if (!step) {
    res.status(404).json({ error: `Step ${stepNumber} not found in sequence` });
    return;
  }

  // Fetch all active subscribers for the linked list
  if (!seq.listId) {
    res.status(400).json({ error: "Sequence has no linked list. Attach a list before broadcasting." });
    return;
  }
  const subscribers = await db.select({
    id: emailSubscribersTable.id,
    email: emailSubscribersTable.email,
    firstName: emailSubscribersTable.firstName,
  }).from(emailSubscribersTable)
    .where(and(
      eq(emailSubscribersTable.listId, seq.listId),
      eq(emailSubscribersTable.status, "active"),
    ));

  if (subscribers.length === 0) {
    res.json({ sent: 0, abTest: null, assignments: [] });
    return;
  }

  // ── A/B subject split ────────────────────────────────────────────────────────
  // Check for a running email_subject test linked to this sequence.
  const abRows = await pool.query<{ id: number; token: string }>(
    `SELECT id, token FROM ab_tests
     WHERE status = 'running' AND type = 'email_subject'
       AND (config->>'sequenceId')::int = $1
     LIMIT 1`,
    [seqId],
  );

  let abTestInfo: { id: number; token: string } | null =
    abRows.rowCount && abRows.rowCount > 0 ? (abRows.rows[0] ?? null) : null;

  // Build per-subscriber assignments
  type Assignment = {
    subscriberId: number;
    email: string;
    firstName: string | null;
    subject: string;
    body: string;
    abVariantId: number | null;
    abToken: string | null;
  };

  const assignments: Assignment[] = [];

  if (abTestInfo) {
    // Fetch all active variants — subject line is stored in content_ref
    const variantRows = await pool.query<{ id: number; name: string; visits: number; contentRef: string }>(
      `SELECT id, name, visits, content_ref AS "contentRef" FROM ab_variants
       WHERE test_id = $1 AND status = 'active'
       ORDER BY id ASC`,
      [abTestInfo.id],
    );
    const variants = variantRows.rows;

    if (variants.length < 2) {
      // Not enough variants — fall back to default subject
      abTestInfo = null;
    } else {
      // 1/N even allocator: assign each subscriber to the variant with fewest visits so far.
      // We track running totals locally so ties are broken round-robin across the batch.
      const runningVisits = new Map<number, number>(variants.map(v => [v.id, v.visits]));

      for (const sub of subscribers) {
        // Pick variant with fewest running visits
        let chosen = variants[0]!;
        for (const v of variants) {
          if ((runningVisits.get(v.id) ?? 0) < (runningVisits.get(chosen.id) ?? 0)) {
            chosen = v;
          }
        }
        runningVisits.set(chosen.id, (runningVisits.get(chosen.id) ?? 0) + 1);

        // The variant's subject line is stored in content_ref (set by generate-variants)
        const variantSubject = (chosen.contentRef && chosen.contentRef.trim().length > 0)
          ? chosen.contentRef
          : step.subject;

        assignments.push({
          subscriberId: sub.id,
          email: sub.email,
          firstName: sub.firstName ?? null,
          subject: variantSubject,
          body: step.body,
          abVariantId: chosen.id,
          abToken: abTestInfo.token,
        });
      }

      // Persist incremented visit counts in bulk (one UPDATE per variant)
      await Promise.all(
        variants.map(v => {
          const delta = (runningVisits.get(v.id) ?? 0) - v.visits;
          if (delta <= 0) return Promise.resolve();
          return pool.query(
            `UPDATE ab_variants SET visits = visits + $1 WHERE id = $2`,
            [delta, v.id],
          );
        }),
      );
    }
  }

  // Fall back: no A/B test — everyone gets the default step subject
  if (!abTestInfo) {
    for (const sub of subscribers) {
      assignments.push({
        subscriberId: sub.id,
        email: sub.email,
        firstName: sub.firstName ?? null,
        subject: step.subject,
        body: step.body,
        abVariantId: null,
        abToken: null,
      });
    }
  }

  res.json({
    sent: assignments.length,
    abTest: abTestInfo
      ? { testId: abTestInfo.id, token: abTestInfo.token, note: "Report opens via POST /api/ab-tests/convert with eventType=email_open" }
      : null,
    assignments,
  });
});

export default router;
