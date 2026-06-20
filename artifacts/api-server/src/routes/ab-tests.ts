import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, pool, abTestsTable, abVariantsTable, landingPagesTable, systemInstancesTable } from "@workspace/db";
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
  landingPageId: z.number().int().optional(),
  /** For email_subject tests: links the test to a specific email sequence */
  sequenceId: z.number().int().optional(),
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

  // Verify user owns the system instance
  const [ownedInstance] = await db
    .select({ id: systemInstancesTable.id })
    .from(systemInstancesTable)
    .where(and(eq(systemInstancesTable.id, parsed.data.systemInstanceId), eq(systemInstancesTable.userId, userId)));
  if (!ownedInstance) {
    res.status(403).json({ error: "System instance not found or not yours" });
    return;
  }

  // For landing_page tests, verify the landing page belongs to this user
  if (parsed.data.landingPageId != null) {
    const [ownedPage] = await db
      .select({ id: landingPagesTable.id })
      .from(landingPagesTable)
      .where(and(eq(landingPagesTable.id, parsed.data.landingPageId), eq(landingPagesTable.userId, userId)));
    if (!ownedPage) {
      res.status(403).json({ error: "Landing page not found or not yours" });
      return;
    }
  }

  const config: Record<string, unknown> = { ...parsed.data.config };
  if (parsed.data.landingPageId != null) config.landingPageId = parsed.data.landingPageId;
  if (parsed.data.sequenceId != null) config.sequenceId = parsed.data.sequenceId;

  const [row] = await db.insert(abTestsTable).values({
    userId,
    systemInstanceId: parsed.data.systemInstanceId,
    name: parsed.data.name,
    type: parsed.data.type,
    status: "running",
    config,
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

// ── PATCH /api/ab-tests/:id ────────────────────────────────────────────────────
// Allows manually concluding a test and declaring a winner
const PatchAbTestBody = z.object({
  status: z.enum(["running", "concluded", "archived"]).optional(),
  winnerVariantId: z.number().int().optional(),
  name: z.string().min(1).max(200).optional(),
});

router.patch("/ab-tests/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const id = parseInt(req.params.id as string, 10);
  const parsed = PatchAbTestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db.select().from(abTestsTable)
    .where(and(eq(abTestsTable.id, id), eq(abTestsTable.userId, userId)));
  if (!existing) { res.status(404).json({ error: "A/B test not found" }); return; }

  // IDOR guard: if a winnerVariantId is provided, verify it belongs to THIS test
  if (parsed.data.winnerVariantId !== undefined) {
    const [ownedVariant] = await db.select({ id: abVariantsTable.id })
      .from(abVariantsTable)
      .where(and(
        eq(abVariantsTable.id, parsed.data.winnerVariantId),
        eq(abVariantsTable.testId, id),
      ));
    if (!ownedVariant) {
      res.status(403).json({ error: "Variant does not belong to this test" });
      return;
    }
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.winnerVariantId !== undefined) updates.winnerVariantId = parsed.data.winnerVariantId;
  if (parsed.data.status === "concluded") updates.concludedAt = new Date();

  const [row] = await db.update(abTestsTable).set(updates)
    .where(eq(abTestsTable.id, id)).returning();

  // When concluding with a winner: archive all losing variants
  if (parsed.data.status === "concluded" && parsed.data.winnerVariantId) {
    await pool.query(
      `UPDATE ab_variants SET status = 'archived' WHERE test_id = $1 AND id != $2`,
      [id, parsed.data.winnerVariantId],
    );
  }

  // If manually concluding with a winner, promote the winning variant's HTML to the landing page
  if (parsed.data.status === "concluded" && parsed.data.winnerVariantId && existing.type === "landing_page") {
    const cfg = (existing.config ?? {}) as Record<string, unknown>;
    const landingPageId = cfg.landingPageId as number | undefined;
    if (landingPageId) {
      const [winner] = await db.select({ contentRef: abVariantsTable.contentRef })
        .from(abVariantsTable).where(eq(abVariantsTable.id, parsed.data.winnerVariantId));
      if (winner && winner.contentRef && winner.contentRef.length > 100) {
        await db.update(landingPagesTable)
          .set({ htmlContent: winner.contentRef })
          .where(and(eq(landingPagesTable.id, landingPageId), eq(landingPagesTable.userId, userId)));
      }
    }
  }

  res.json(serialize(row));
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

// ── POST /api/ab-tests/:id/generate-variants ──────────────────────────────────
// ASH generates 2–3 content variants.
// For landing_page tests: generates full HTML variants (like the landing page generator).
// For email_subject tests: generates alternative subject lines.
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

  req.log.info({ testId: id, type: test.type }, "ASH generating A/B test variants");

  let variantSpecs: Array<{ name: string; content: string }> = [];

  if (test.type === "email_subject") {
    // Generate alternative email subject lines
    const result = await complete({
      systemPrompt: `You are ASH, an expert email marketer. Generate A/B test variants for email subject lines.
Return ONLY valid JSON, no markdown, no code blocks:
{
  "variants": [
    { "name": "Variant A", "content": "subject line text" },
    { "name": "Variant B", "content": "subject line text" }
  ]
}`,
      prompt: `Generate ${parsed.data.numberOfVariants} subject line variants for this email campaign.
Original subject: ${parsed.data.originalContent}
Title/context: ${parsed.data.pageTitle ?? "email campaign"}
Make each variant test a different angle: curiosity, urgency, social proof, or direct benefit.
Keep subjects under 60 characters.`,
      model: "openai/gpt-4o-mini",
      userId,
    });
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      variantSpecs = data.variants ?? [];
    } catch {
      res.status(500).json({ error: "Failed to parse AI response. Please try again." });
      return;
    }
  } else {
    // For landing_page tests: generate actual full HTML variants
    // First get the original landing page for context if linked
    const cfg = (test.config ?? {}) as Record<string, unknown>;
    const landingPageId = cfg.landingPageId as number | undefined;
    let baseHtml = parsed.data.originalContent;
    if (landingPageId) {
      const [page] = await db.select({ htmlContent: landingPagesTable.htmlContent })
        .from(landingPagesTable).where(eq(landingPagesTable.id, landingPageId));
      if (page?.htmlContent && page.htmlContent.length > 50) baseHtml = page.htmlContent;
    }

    // Generate variant descriptions first (what to change), then full HTML
    const planResult = await complete({
      systemPrompt: `You are ASH, an expert conversion rate optimizer. Describe 2 A/B test variant strategies.
Return ONLY valid JSON, no markdown:
{
  "variants": [
    { "name": "Variant A", "changeDescription": "one sentence describing the key difference from the control" },
    { "name": "Variant B", "changeDescription": "one sentence describing the key difference from the control" }
  ]
}`,
      prompt: `Design 2 A/B test variants for this landing page.
Page title: ${parsed.data.pageTitle ?? test.name}
Original content: ${parsed.data.originalContent.slice(0, 300)}
Each variant should change ONE thing: headline hook, CTA copy, hero section structure, or social proof placement.`,
      model: "openai/gpt-4o-mini",
      userId,
    });

    let plans: Array<{ name: string; changeDescription: string }> = [];
    try {
      const jsonMatch = planResult.content.match(/\{[\s\S]*\}/);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      plans = data.variants ?? [];
    } catch {
      res.status(500).json({ error: "Failed to plan variants. Please try again." });
      return;
    }

    // Generate full HTML for each variant
    for (const plan of plans.slice(0, parsed.data.numberOfVariants)) {
      const htmlResult = await complete({
        systemPrompt: `You are ASH, an expert web designer and conversion optimizer. Modify an existing landing page HTML to create an A/B test variant.
REQUIREMENTS:
- Return ONLY the complete modified HTML document (no markdown, no code blocks, no explanation)
- Keep the same overall structure and branding
- Apply ONLY the described change
- The result must be a complete, self-contained HTML file`,
        prompt: `Modify this landing page to create variant "${plan.name}".
Change to apply: ${plan.changeDescription}

Original HTML:
${baseHtml.slice(0, 6000)}`,
        model: "openai/gpt-4o",
        userId,
      });
      const htmlMatch = htmlResult.content.match(/<!DOCTYPE html>[\s\S]*/i) ?? htmlResult.content.match(/<html[\s\S]*/i);
      variantSpecs.push({
        name: plan.name,
        content: htmlMatch ? htmlMatch[0] : htmlResult.content,
      });
    }
  }

  if (variantSpecs.length === 0) {
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
      contentRef: parsed.data.originalContent.slice(0, 65535),
    });
  }

  for (const v of variantSpecs) {
    toInsert.push({
      testId: id,
      name: v.name,
      contentRef: v.content.slice(0, 65535),
    });
  }

  const inserted = await db.insert(abVariantsTable).values(toInsert).returning();

  // For landing_page tests: assign URL slugs to treatment variants so they get their own public URLs.
  // Control (first variant, named "Control") keeps null slug — it's served at the base page URL.
  // Treatments get slugs like "{base-slug}-vb", "{base-slug}-vc".
  if (test.type === "landing_page") {
    const cfg = (test.config ?? {}) as Record<string, unknown>;
    const lpId = cfg.landingPageId as number | undefined;
    if (lpId) {
      const [pg] = await db
        .select({ slug: landingPagesTable.slug })
        .from(landingPagesTable)
        .where(eq(landingPagesTable.id, lpId));
      if (pg?.slug) {
        const treatments = inserted.filter((v) => v.name !== "Control");
        const suffixes = ["vb", "vc", "vd"];
        for (let i = 0; i < treatments.length; i++) {
          const varSlug = `${pg.slug}-${suffixes[i] ?? `v${i + 2}`}`;
          await pool.query(
            `UPDATE ab_variants SET slug = $1 WHERE id = $2`,
            [varSlug, treatments[i]!.id],
          );
        }
      }
    }
  }

  res.json({ variants: serialize(inserted) });
});

// ── GET /api/public/ab-tests/:token/assign ─────────────────────────────────────
// Public — assigns a visitor to a variant via cookie and increments visits.
// Returns the assigned variant's id, name, and whether it has full HTML content.
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
  let isNewAssignment = false;

  if (!assignedVariant) {
    isNewAssignment = true;
    // Even split: assign to variant with fewest visits
    assignedVariant = variants.reduce((a, b) => (a.visits <= b.visits ? a : b));
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
    hasHtml: assignedVariant.contentRef.length > 100 && assignedVariant.contentRef.trimStart().startsWith("<"),
    isNewAssignment,
  });
});

// ── POST /api/public/ab-tests/:token/convert ──────────────────────────────────
// Public — tracks a typed conversion event for the visitor's assigned variant.
// eventType: 'page_view' | 'button_click' | 'form_submit' | 'email_opt_in'
// page_view does NOT increment conversions (already counted in visits via assign).
// All other event types increment the conversions counter.
const ConvertBody = z.object({
  variantId: z.number().int().optional(),
  eventType: z.enum(["page_view", "button_click", "form_submit", "email_opt_in", "email_open"]).default("button_click"),
});

router.post("/public/ab-tests/:token/convert", async (req, res): Promise<void> => {
  const token = req.params.token as string;
  const [test] = await db.select().from(abTestsTable).where(eq(abTestsTable.token, token));
  if (!test || test.status !== "running") {
    res.status(404).json({ error: "Test not found or concluded" });
    return;
  }

  const parsed = ConvertBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const cookieKey = `abtest_${test.id}`;
  const cookieRaw = req.headers.cookie
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${cookieKey}=`));
  const cookieVariantId = cookieRaw ? parseInt(cookieRaw.split("=")[1] ?? "", 10) : NaN;
  const targetId = parsed.data.variantId ?? (Number.isFinite(cookieVariantId) ? cookieVariantId : NaN);

  if (!Number.isFinite(targetId)) {
    res.status(400).json({ error: "Could not determine variant — missing cookie or variantId" });
    return;
  }

  const eventType = parsed.data.eventType;
  const isConversion = eventType !== "page_view";

  // Atomically update conversionEvents jsonb and conversions counter.
  // Note: ->> extracts jsonb value as text, which can then be cast to int safely.
  if (isConversion) {
    await pool.query(
      `UPDATE ab_variants
       SET conversions = conversions + 1,
           conversion_events = COALESCE(conversion_events, '{}')::jsonb ||
             jsonb_build_object($1::text, (COALESCE((conversion_events->>$1)::int, 0) + 1))
       WHERE id = $2 AND test_id = $3`,
      [eventType, targetId, test.id],
    );
  } else {
    // page_view: just update the event log (don't count as conversion)
    await pool.query(
      `UPDATE ab_variants
       SET conversion_events = COALESCE(conversion_events, '{}')::jsonb ||
             jsonb_build_object($1::text, (COALESCE((conversion_events->>$1)::int, 0) + 1))
       WHERE id = $2 AND test_id = $3`,
      [eventType, targetId, test.id],
    );
  }

  res.json({ ok: true, eventType, counted: isConversion });
});

export default router;
