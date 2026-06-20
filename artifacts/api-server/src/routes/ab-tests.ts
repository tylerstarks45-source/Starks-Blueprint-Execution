import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, pool, abTestsTable, abVariantsTable, landingPagesTable } from "@workspace/db";
import { requireAuthActive } from "../lib/auth";
import { complete } from "../lib/openrouter";
import { randomBytes } from "crypto";
import { z } from "zod";

const router: IRouter = Router();

function generateToken(): string {
  return randomBytes(16).toString("hex");
}

// ── POST /api/ab-tests ────────────────────────────────────────────────────────
const CreateAbTestBody = z.object({
  systemInstanceId: z.number().int(),
  name: z.string().min(1).max(200),
  type: z.enum(["landing_page", "email_subject"]),
  config: z.record(z.unknown()).optional().default({}),
});

router.post("/ab-tests", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const parsed = CreateAbTestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(abTestsTable).values({
    userId,
    systemInstanceId: parsed.data.systemInstanceId,
    name: parsed.data.name,
    type: parsed.data.type,
    status: "running",
    config: parsed.data.config,
    token: generateToken(),
  }).returning();
  res.status(201).json(serialize(row));
});

// ── GET /api/ab-tests?systemInstanceId=X ──────────────────────────────────────
router.get("/ab-tests", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const systemInstanceId = req.query.systemInstanceId ? Number(req.query.systemInstanceId) : null;
  const rows = await db
    .select()
    .from(abTestsTable)
    .where(
      systemInstanceId
        ? and(eq(abTestsTable.userId, userId), eq(abTestsTable.systemInstanceId, systemInstanceId))
        : eq(abTestsTable.userId, userId),
    )
    .orderBy(desc(abTestsTable.createdAt));
  res.json(serialize(rows));
});

// ── GET /api/ab-tests/:id ─────────────────────────────────────────────────────
router.get("/ab-tests/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const id = parseInt(req.params.id as string, 10);
  const [test] = await db.select().from(abTestsTable)
    .where(and(eq(abTestsTable.id, id), eq(abTestsTable.userId, userId)));
  if (!test) { res.status(404).json({ error: "A/B test not found" }); return; }
  const variants = await db.select().from(abVariantsTable)
    .where(eq(abVariantsTable.testId, id))
    .orderBy(abVariantsTable.id);
  res.json({ test: serialize(test), variants: serialize(variants) });
});

// ── DELETE /api/ab-tests/:id ──────────────────────────────────────────────────
router.delete("/ab-tests/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const id = parseInt(req.params.id as string, 10);
  const [row] = await db.delete(abTestsTable)
    .where(and(eq(abTestsTable.id, id), eq(abTestsTable.userId, userId)))
    .returning();
  if (!row) { res.status(404).json({ error: "A/B test not found" }); return; }
  res.sendStatus(204);
});

// ── POST /api/ab-tests/:id/generate-variants — ASH generates content variants ─
const GenerateVariantsBody = z.object({
  originalContent: z.string().min(1),
  pageTitle: z.string().optional(),
  numberOfVariants: z.number().int().min(2).max(3).default(2),
});

router.post("/ab-tests/:id/generate-variants", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const id = parseInt(req.params.id as string, 10);
  const [test] = await db.select().from(abTestsTable)
    .where(and(eq(abTestsTable.id, id), eq(abTestsTable.userId, userId)));
  if (!test) { res.status(404).json({ error: "A/B test not found" }); return; }
  const parsed = GenerateVariantsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const isEmailSubject = test.type === "email_subject";

  const systemPrompt = isEmailSubject
    ? `You are ASH, an expert email marketer. Generate A/B test variants for email subject lines.
Return ONLY valid JSON, no markdown:
{
  "variants": [
    { "name": "Variant A", "content": "subject line text" },
    { "name": "Variant B", "content": "subject line text" }
  ]
}`
    : `You are ASH, an expert landing page conversion optimizer. Generate A/B test variants.
For landing page tests, each variant should have a DIFFERENT hook, headline, CTA, or structure from the original.
Return ONLY valid JSON, no markdown:
{
  "variants": [
    { "name": "Variant A", "content": "brief description of what changes in this variant (headline change, CTA change, etc.)" },
    { "name": "Variant B", "content": "brief description of what changes in this variant" }
  ]
}`;

  const prompt = isEmailSubject
    ? `Generate ${parsed.data.numberOfVariants} subject line variants for this email campaign.
Original subject: ${parsed.data.originalContent}
Title/context: ${parsed.data.pageTitle ?? "email campaign"}
Make each variant test a different angle: curiosity, urgency, social proof, or direct benefit.`
    : `Generate ${parsed.data.numberOfVariants} landing page variant descriptions for A/B testing.
Page title: ${parsed.data.pageTitle ?? "landing page"}
Original content summary: ${parsed.data.originalContent.slice(0, 500)}
Each variant should test ONE thing differently: headline hook, CTA text/color, hero copy, or page structure.`;

  req.log.info({ testId: id, type: test.type }, "ASH generating A/B test variants");

  const result = await complete({ systemPrompt, prompt, model: "openai/gpt-4o-mini", userId });

  let variants: Array<{ name: string; content: string }> = [];
  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    variants = data.variants ?? [];
  } catch {
    res.status(500).json({ error: "Failed to parse AI response. Please try again." });
    return;
  }

  if (variants.length === 0) {
    res.status(500).json({ error: "AI returned no variants. Please try again." });
    return;
  }

  // Add the original as "Control" if there are no variants yet
  const existingVariants = await db.select({ id: abVariantsTable.id }).from(abVariantsTable)
    .where(eq(abVariantsTable.testId, id));

  const toInsert: Array<{ testId: number; name: string; contentRef: string }> = [];

  if (existingVariants.length === 0) {
    toInsert.push({
      testId: id,
      name: "Control",
      contentRef: parsed.data.originalContent.slice(0, 2000),
    });
  }

  for (const v of variants) {
    toInsert.push({
      testId: id,
      name: v.name,
      contentRef: v.content.slice(0, 2000),
    });
  }

  const inserted = await db.insert(abVariantsTable).values(toInsert).returning();
  res.json({ variants: serialize(inserted) });
});

// ── GET /api/public/ab-tests/:token/assign ─────────────────────────────────────
// Public — assigns a visitor to a variant via cookie and increments visits.
router.get("/public/ab-tests/:token/assign", async (req, res): Promise<void> => {
  const token = req.params.token as string;
  const [test] = await db.select().from(abTestsTable).where(eq(abTestsTable.token, token));
  if (!test || test.status !== "running") {
    res.status(404).json({ error: "Test not found or concluded" });
    return;
  }

  const variants = await db.select().from(abVariantsTable)
    .where(eq(abVariantsTable.testId, test.id))
    .orderBy(abVariantsTable.id);

  if (variants.length === 0) {
    res.status(404).json({ error: "No variants configured for this test" });
    return;
  }

  const cookieKey = `abtest_${test.id}`;
  const existingCookieRaw = req.headers.cookie
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${cookieKey}=`));
  const existingVariantId = existingCookieRaw
    ? parseInt(existingCookieRaw.split("=")[1] ?? "", 10)
    : NaN;

  let assignedVariant = variants.find((v) => v.id === existingVariantId);

  if (!assignedVariant) {
    // Assign to the variant with fewest visits (even split)
    assignedVariant = variants.reduce((a, b) => (a.visits <= b.visits ? a : b));
    // Increment visits atomically
    await pool.query(
      `UPDATE ab_variants SET visits = visits + 1 WHERE id = $1`,
      [assignedVariant.id],
    );
    res.setHeader(
      "Set-Cookie",
      `${cookieKey}=${assignedVariant.id}; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax`,
    );
  }

  res.json({
    variantId: assignedVariant.id,
    variantName: assignedVariant.name,
    contentRef: assignedVariant.contentRef,
  });
});

// ── POST /api/public/ab-tests/:token/convert ──────────────────────────────────
// Public — tracks a conversion event for the assigned variant (identified by cookie).
router.post("/public/ab-tests/:token/convert", async (req, res): Promise<void> => {
  const token = req.params.token as string;
  const [test] = await db.select().from(abTestsTable).where(eq(abTestsTable.token, token));
  if (!test || test.status !== "running") {
    res.status(404).json({ error: "Test not found or concluded" });
    return;
  }

  const cookieKey = `abtest_${test.id}`;
  const cookieRaw = req.headers.cookie
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${cookieKey}=`));
  const variantId = cookieRaw ? parseInt(cookieRaw.split("=")[1] ?? "", 10) : NaN;

  // Also accept variantId in body (for JS snippet that can't rely on cookies cross-origin)
  const bodyVariantId = typeof req.body?.variantId === "number" ? req.body.variantId : NaN;
  const targetId = Number.isFinite(variantId) ? variantId : bodyVariantId;

  if (!Number.isFinite(targetId)) {
    res.status(400).json({ error: "Could not determine variant — no cookie or variantId in body" });
    return;
  }

  const result = await pool.query(
    `UPDATE ab_variants SET conversions = conversions + 1 WHERE id = $1 AND test_id = $2 RETURNING id`,
    [targetId, test.id],
  );

  if ((result.rowCount ?? 0) === 0) {
    res.status(404).json({ error: "Variant not found for this test" });
    return;
  }

  res.json({ ok: true });
});

export default router;
