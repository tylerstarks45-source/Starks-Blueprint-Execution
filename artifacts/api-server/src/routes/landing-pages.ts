import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, landingPagesTable, systemInstancesTable, usersTable, emailListsTable, emailSubscribersTable } from "@workspace/db";
import { requireAuthActive } from "../lib/auth";
import { complete } from "../lib/openrouter";
import { z } from "zod";
import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env["SESSION_SECRET"]!;
const PREVIEW_TOKEN_MAX_AGE_SECS = 24 * 60 * 60; // 24 hours

const router: IRouter = Router();

const CreateLandingPageBody = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only").optional(),
  systemInstanceId: z.number().int().optional(),
});

const UpdateLandingPageBody = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  htmlContent: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  isPublished: z.boolean().optional(),
  customDomain: z.string().optional(),
  nextPageId: z.number().int().nullable().optional(),
  emailListId: z.number().int().nullable().optional(),
});

const GenerateLandingPageBody = z.object({
  pageId: z.number().int(),
  prompt: z.string().min(1).max(2000),
  pageType: z.enum(["affiliate", "product", "lead-capture", "sales-funnel", "portfolio", "blog", "service"]).optional(),
  affiliateLinks: z.array(z.object({ name: z.string(), url: z.string(), description: z.string().optional() })).optional(),
  brandColors: z.object({ primary: z.string(), secondary: z.string() }).optional(),
  includeLeadCapture: z.boolean().optional(),
  emailListId: z.number().int().optional(),
});

const CreateFunnelBody = z.object({
  niche: z.string().min(1).max(200),
  goal: z.string().min(1).max(500),
  systemInstanceId: z.number().int().optional(),
  emailListId: z.number().int().optional(),
  brandColors: z.object({ primary: z.string(), secondary: z.string() }).optional(),
});

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) + "-" + randomBytes(3).toString("hex");
}

function deriveUsername(email: string): string {
  return email.split("@")[0]!.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/^-|-$/g, "");
}

function computePublicUrl(email: string, slug: string, isPublished: boolean): string | null {
  if (!isPublished) return null;
  return `/api/p/${deriveUsername(email)}/${slug}`;
}

// ── GET /api/landing-pages ───────────────────────────────────────────────────
router.get("/landing-pages", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const rows = await db
    .select({
      id: landingPagesTable.id,
      userId: landingPagesTable.userId,
      systemInstanceId: landingPagesTable.systemInstanceId,
      title: landingPagesTable.title,
      slug: landingPagesTable.slug,
      description: landingPagesTable.description,
      htmlContent: landingPagesTable.htmlContent,
      metaTitle: landingPagesTable.metaTitle,
      metaDescription: landingPagesTable.metaDescription,
      isPublished: landingPagesTable.isPublished,
      publishedAt: landingPagesTable.publishedAt,
      pageViews: landingPagesTable.pageViews,
      optins: landingPagesTable.optins,
      customDomain: landingPagesTable.customDomain,
      nextPageId: landingPagesTable.nextPageId,
      emailListId: landingPagesTable.emailListId,
      createdAt: landingPagesTable.createdAt,
      updatedAt: landingPagesTable.updatedAt,
      systemName: systemInstancesTable.name,
      userEmail: usersTable.email,
    })
    .from(landingPagesTable)
    .leftJoin(systemInstancesTable, eq(landingPagesTable.systemInstanceId, systemInstancesTable.id))
    .innerJoin(usersTable, eq(landingPagesTable.userId, usersTable.id))
    .where(eq(landingPagesTable.userId, userId))
    .orderBy(desc(landingPagesTable.updatedAt));
  const enriched = rows.map(({ userEmail, ...r }) => ({
    ...r,
    publicUrl: computePublicUrl(userEmail, r.slug, r.isPublished),
  }));
  res.json(serialize(enriched));
});

// ── POST /api/landing-pages ──────────────────────────────────────────────────
router.post("/landing-pages", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const parsed = CreateLandingPageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const slug = parsed.data.slug ?? generateSlug(parsed.data.title);
  const existing = await db.select({ id: landingPagesTable.id }).from(landingPagesTable).where(eq(landingPagesTable.slug, slug));
  if (existing.length > 0) {
    res.status(409).json({ error: "A page with this slug already exists. Choose a different title or slug." });
    return;
  }
  const [row] = await db.insert(landingPagesTable).values({
    userId,
    title: parsed.data.title,
    description: parsed.data.description,
    slug,
    systemInstanceId: parsed.data.systemInstanceId,
    htmlContent: "",
  }).returning();
  res.status(201).json(serialize(row));
});

// ── GET /api/landing-pages/:id ───────────────────────────────────────────────
router.get("/landing-pages/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [row] = await db
    .select({ page: landingPagesTable, userEmail: usersTable.email })
    .from(landingPagesTable)
    .innerJoin(usersTable, eq(landingPagesTable.userId, usersTable.id))
    .where(and(eq(landingPagesTable.id, id), eq(landingPagesTable.userId, userId)));
  if (!row) {
    res.status(404).json({ error: "Landing page not found" });
    return;
  }
  res.json(serialize({
    ...row.page,
    publicUrl: computePublicUrl(row.userEmail, row.page.slug, row.page.isPublished),
  }));
});

// ── PATCH /api/landing-pages/:id ─────────────────────────────────────────────
router.patch("/landing-pages/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const parsed = UpdateLandingPageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // IDOR guard: ensure referenced emailListId and nextPageId belong to this user
  if (parsed.data.emailListId != null) {
    const owned = await db.select({ id: emailListsTable.id })
      .from(emailListsTable)
      .where(and(eq(emailListsTable.id, parsed.data.emailListId), eq(emailListsTable.userId, userId)));
    if (owned.length === 0) {
      res.status(403).json({ error: "Email list not found or access denied" });
      return;
    }
  }
  if (parsed.data.nextPageId != null) {
    const owned = await db.select({ id: landingPagesTable.id })
      .from(landingPagesTable)
      .where(and(eq(landingPagesTable.id, parsed.data.nextPageId), eq(landingPagesTable.userId, userId)));
    if (owned.length === 0) {
      res.status(403).json({ error: "Next page not found or access denied" });
      return;
    }
  }

  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.isPublished === true) updates.publishedAt = new Date();
  const [row] = await db.update(landingPagesTable).set(updates)
    .where(and(eq(landingPagesTable.id, id), eq(landingPagesTable.userId, userId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Landing page not found" });
    return;
  }

  // Fetch email to build canonical publicUrl
  const [user] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId));
  res.json(serialize({
    ...row,
    publicUrl: computePublicUrl(user?.email ?? "", row.slug, row.isPublished),
  }));
});

// ── DELETE /api/landing-pages/:id ────────────────────────────────────────────
router.delete("/landing-pages/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [row] = await db.delete(landingPagesTable)
    .where(and(eq(landingPagesTable.id, id), eq(landingPagesTable.userId, userId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Landing page not found" });
    return;
  }
  res.sendStatus(204);
});

// ── POST /api/landing-pages/funnel ───────────────────────────────────────────
// ASH creates a 3-page funnel: opt-in → thank-you → upsell, all linked.
router.post("/landing-pages/funnel", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const parsed = CreateFunnelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  // Capture as number — userId is narrowed above after null check, but
  // TypeScript loses that narrowing inside nested async functions.
  const authorId = userId as number;
  const { niche, goal, systemInstanceId, emailListId, brandColors } = parsed.data;

  // IDOR guard: verify referenced resources belong to this user before proceeding
  if (emailListId != null) {
    const owned = await db.select({ id: emailListsTable.id })
      .from(emailListsTable)
      .where(and(eq(emailListsTable.id, emailListId), eq(emailListsTable.userId, userId)));
    if (owned.length === 0) {
      res.status(403).json({ error: "Email list not found or access denied" });
      return;
    }
  }
  if (systemInstanceId != null) {
    const owned = await db.select({ id: systemInstancesTable.id })
      .from(systemInstancesTable)
      .where(and(eq(systemInstancesTable.id, systemInstanceId), eq(systemInstancesTable.userId, userId)));
    if (owned.length === 0) {
      res.status(403).json({ error: "System instance not found or access denied" });
      return;
    }
  }

  const primary = brandColors?.primary ?? "#8B5CF6";
  const secondary = brandColors?.secondary ?? "#06B6D4";

  req.log.info({ niche, goal }, "ASH building funnel");

  const planResult = await complete({
    systemPrompt: `You are ASH, an expert funnel architect. Generate page names, slugs, and descriptions for a 3-page lead magnet funnel.
Return ONLY valid JSON, no markdown:
{"optin":{"title":"...","slug":"...","description":"..."},"thankyou":{"title":"...","slug":"...","description":"..."},"upsell":{"title":"...","slug":"...","description":"..."}}
Slugs must be lowercase letters, numbers, and hyphens only. Keep them short (≤40 chars). Make titles punchy.`,
    prompt: `Niche: ${niche}\nGoal: ${goal}`,
    model: "openai/gpt-4o-mini",
    userId,
  });

  let funnelMeta: { optin: { title: string; slug: string; description: string }; thankyou: { title: string; slug: string; description: string }; upsell: { title: string; slug: string; description: string } };
  try {
    const jsonMatch = planResult.content.match(/\{[\s\S]*\}/);
    funnelMeta = JSON.parse(jsonMatch![0]);
  } catch {
    res.status(500).json({ error: "Failed to plan funnel pages. Please try again." });
    return;
  }

  function makeSlug(raw: string) {
    return raw.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-|-$/g, "").slice(0, 50) + "-" + randomBytes(3).toString("hex");
  }

  async function insertPage(title: string, rawSlug: string, description: string) {
    const slug = makeSlug(rawSlug);
    const base = { userId: authorId, title, description, slug, htmlContent: "" };
    const [p] = systemInstanceId !== undefined
      ? await db.insert(landingPagesTable).values({ ...base, systemInstanceId }).returning()
      : await db.insert(landingPagesTable).values(base).returning();
    return p!;
  }

  const upsell = await insertPage(funnelMeta.upsell.title, funnelMeta.upsell.slug, funnelMeta.upsell.description);
  const thankyou = await insertPage(funnelMeta.thankyou.title, funnelMeta.thankyou.slug, funnelMeta.thankyou.description);
  const optin = await insertPage(funnelMeta.optin.title, funnelMeta.optin.slug, funnelMeta.optin.description);

  await db.update(landingPagesTable).set({ nextPageId: thankyou.id, ...(emailListId ? { emailListId } : {}) }).where(eq(landingPagesTable.id, optin.id));
  await db.update(landingPagesTable).set({ nextPageId: upsell.id }).where(eq(landingPagesTable.id, thankyou.id));

  const basePrompt = `You are ASH, an expert web designer and conversion optimizer. Generate a complete, self-contained, production-ready HTML landing page.
REQUIREMENTS: Single HTML file, ALL CSS in <style> tag, dark modern design, mobile-responsive, no placeholder images (use gradients/emoji), return ONLY the HTML document.
Primary color: ${primary} | Secondary color: ${secondary}`;

  const [optinHtml, tyHtml, upsellHtml] = await Promise.all([
    complete({ systemPrompt: basePrompt, model: "openai/gpt-4o", userId: authorId,
      prompt: `Niche: ${niche} | Goal: ${goal}\nThis is the OPT-IN page.\nInclude a lead capture form with action="/api/pages/${optin.id}/submit" method="POST" and fields: email (required), firstName (optional). The server handles the redirect after submit. Style the form to match dark theme. Include hero, benefits, social proof, and email capture form.` }),
    complete({ systemPrompt: basePrompt, model: "openai/gpt-4o", userId: authorId,
      prompt: `Niche: ${niche} | Goal: ${goal}\nThis is the THANK-YOU page after opt-in. Thank them warmly. Say to check their email. Introduce a soft upgrade offer. Link to upsell at /api/pages/${upsell.slug}.` }),
    complete({ systemPrompt: basePrompt, model: "openai/gpt-4o", userId: authorId,
      prompt: `Niche: ${niche} | Goal: ${goal}\nThis is the UPSELL page. Present a premium offer. Clear price, bold benefits, strong CTA button. This is the final step of the funnel.` }),
  ]);

  const extractHtml = (r: { content: string }) => {
    const m = r.content.match(/<!DOCTYPE html>[\s\S]*/i) ?? r.content.match(/<html[\s\S]*/i);
    return m ? m[0] : r.content;
  };

  await Promise.all([
    db.update(landingPagesTable).set({ htmlContent: extractHtml(optinHtml) }).where(eq(landingPagesTable.id, optin.id)),
    db.update(landingPagesTable).set({ htmlContent: extractHtml(tyHtml) }).where(eq(landingPagesTable.id, thankyou.id)),
    db.update(landingPagesTable).set({ htmlContent: extractHtml(upsellHtml) }).where(eq(landingPagesTable.id, upsell.id)),
  ]);

  const freshPages = await db.select().from(landingPagesTable)
    .where(and(eq(landingPagesTable.userId, userId), eq(landingPagesTable.userId, userId)))
    .orderBy(desc(landingPagesTable.createdAt)).limit(3);

  res.status(201).json(serialize({ pages: freshPages, funnelOrder: [optin.id, thankyou.id, upsell.id] }));
});

// ── POST /api/landing-pages/generate ─────────────────────────────────────────
// ASH generates a full HTML/CSS landing page via OpenRouter and saves it.
router.post("/landing-pages/generate", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const parsed = GenerateLandingPageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [page] = await db.select().from(landingPagesTable)
    .where(and(eq(landingPagesTable.id, parsed.data.pageId), eq(landingPagesTable.userId, userId)));
  if (!page) {
    res.status(404).json({ error: "Landing page not found" });
    return;
  }

  const affiliateSection = parsed.data.affiliateLinks?.length
    ? `\nAffiliate Products to Feature:\n${parsed.data.affiliateLinks.map(l => `- ${l.name}: ${l.url}${l.description ? ` (${l.description})` : ""}`).join("\n")}`
    : "";

  const emailListId = parsed.data.emailListId ?? page.emailListId;
  const includeLeadCapture = parsed.data.includeLeadCapture ?? (!!emailListId);
  const primary = parsed.data.brandColors?.primary ?? "#8B5CF6";
  const secondary = parsed.data.brandColors?.secondary ?? "#06B6D4";

  const leadCaptureBlock = includeLeadCapture
    ? `\n\nLEAD CAPTURE FORM — REQUIRED:
Include an email opt-in form in the hero AND near the bottom CTA. Use EXACTLY this HTML structure (do not modify):
<form action="/api/pages/${page.id}/submit" method="POST" style="display:flex;flex-direction:column;gap:12px;max-width:420px;margin:0 auto">
  <input type="text" name="firstName" placeholder="Your first name" style="padding:14px 18px;border-radius:10px;border:1.5px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.07);color:#fff;font-size:15px;outline:none" />
  <input type="email" name="email" required placeholder="Your best email address" style="padding:14px 18px;border-radius:10px;border:1.5px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.07);color:#fff;font-size:15px;outline:none" />
  <button type="submit" style="padding:16px;border-radius:10px;background:linear-gradient(135deg,${primary},${secondary});color:#fff;font-weight:700;font-size:16px;border:none;cursor:pointer;letter-spacing:0.5px">Get Free Access →</button>
</form>`
    : "";

  const systemPrompt = `You are ASH, an expert web designer and conversion optimizer. Generate a complete, self-contained, production-ready HTML landing page.

REQUIREMENTS:
- Single HTML file with ALL CSS embedded in a <style> tag (no external stylesheets)
- Dark, modern, premium design — black/dark-gray backgrounds, vibrant accent colors
- Mobile-responsive using CSS Grid/Flexbox
- Include: hero section, features/benefits, social proof section, CTA buttons
- High-converting copywriting with emotional hooks
- All links should use the provided affiliate URLs exactly as given
- No placeholder images — use CSS gradients and emoji for visual elements
- Page must render perfectly in a browser iframe
- Return ONLY the HTML document — no markdown, no code blocks, no explanation

Page Type: ${parsed.data.pageType ?? "affiliate"}${affiliateSection}
Primary color: ${primary}
Secondary color: ${secondary}${leadCaptureBlock}`;

  req.log.info({ pageId: parsed.data.pageId, pageType: parsed.data.pageType, includeLeadCapture }, "ASH generating landing page");

  const result = await complete({
    systemPrompt,
    prompt: `Create a landing page for: ${parsed.data.prompt}

Title: ${page.title}
${page.description ? `Description: ${page.description}` : ""}

Generate a complete HTML page that would genuinely convert visitors into buyers/subscribers.`,
    model: "openai/gpt-4o",
    userId,
  });

  const htmlMatch = result.content.match(/<!DOCTYPE html>[\s\S]*/i) ?? result.content.match(/<html[\s\S]*/i);
  const htmlContent = htmlMatch ? htmlMatch[0] : result.content;

  const updates: Record<string, unknown> = { htmlContent };
  if (emailListId) updates.emailListId = emailListId;

  const [updated] = await db.update(landingPagesTable)
    .set(updates)
    .where(eq(landingPagesTable.id, parsed.data.pageId))
    .returning();

  res.json(serialize(updated));
});

// ── GET /api/landing-pages/:id/preview-html ──────────────────────────────────
// Returns the raw HTML for iframe preview (auth required).
// Also accepts ?token=<jwt> query param so users can open pages in a new
// browser tab without a separate login — the same JWT is passed in the URL.
// Preview tokens are capped at 24 hours even if the underlying JWT has a longer TTL.
router.get("/landing-pages/:id/preview-html", async (req, res): Promise<void> => {
  let userId: number | null = null;

  const queryToken = typeof req.query["token"] === "string" ? req.query["token"] : null;
  if (queryToken) {
    // Verify the token inline so we can enforce the 24h preview cap independently
    // of the JWT's own expiry (JWTs are issued with 7d expiry for normal sessions).
    try {
      const payload = jwt.verify(queryToken, JWT_SECRET) as jwt.JwtPayload;
      const id = Number(payload["sub"]);
      if (!Number.isFinite(id)) {
        res.status(401).send("Invalid preview token");
        return;
      }
      const issuedAt = Number(payload["iat"] ?? 0);
      const ageSecs = Math.floor(Date.now() / 1000) - issuedAt;
      if (ageSecs > PREVIEW_TOKEN_MAX_AGE_SECS) {
        res.status(401).send(
          `<!DOCTYPE html><html><head><title>Preview Expired</title><style>body{background:#0a0a0a;color:#888;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}p{max-width:400px}a{color:#0ea5e9}</style></head>` +
          `<body><p>This preview link has expired (24-hour limit).<br>Open the <a href="/builder">Builder</a> and click Preview again to get a fresh link.</p></body></html>`,
        );
        return;
      }
      // Enforce the same active-account check as requireAuthActive so suspended
      // users cannot access preview HTML even with a valid, unexpired JWT.
      const [user] = await db.select({ active: usersTable.active }).from(usersTable).where(eq(usersTable.id, id));
      if (!user || user.active === false) {
        res.status(403).send("Account suspended");
        return;
      }
      userId = id;
    } catch {
      res.status(401).send("Invalid or expired preview token");
      return;
    }
  } else {
    userId = await requireAuthActive(req, res);
    if (userId === null) return;
  }
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [row] = await db.select().from(landingPagesTable)
    .where(and(eq(landingPagesTable.id, id), eq(landingPagesTable.userId, userId)));
  if (!row) {
    res.status(404).json({ error: "Landing page not found" });
    return;
  }
  res.setHeader("Content-Type", "text/html");
  res.send(row.htmlContent || "<html><body style='background:#0a0a0a;color:#888;font-family:monospace;padding:40px'>No content yet. Generate a page with ASH first.</body></html>");
});

// ── GET /api/landing-pages/:id/analytics ─────────────────────────────────────
router.get("/landing-pages/:id/analytics", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [row] = await db.select({
    id: landingPagesTable.id,
    title: landingPagesTable.title,
    slug: landingPagesTable.slug,
    pageViews: landingPagesTable.pageViews,
    optins: landingPagesTable.optins,
    isPublished: landingPagesTable.isPublished,
    publishedAt: landingPagesTable.publishedAt,
    nextPageId: landingPagesTable.nextPageId,
    emailListId: landingPagesTable.emailListId,
  }).from(landingPagesTable)
    .where(and(eq(landingPagesTable.id, id), eq(landingPagesTable.userId, userId)));
  if (!row) { res.status(404).json({ error: "Landing page not found" }); return; }
  const conversionRate = row.pageViews > 0 ? ((row.optins / row.pageViews) * 100).toFixed(1) : "0.0";
  res.json(serialize({ ...row, conversionRate }));
});

// ── GET /api/landing-pages/email-lists ───────────────────────────────────────
// Returns the user's email lists for the canvas funnel settings panel.
router.get("/landing-pages/email-lists", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const lists = await db.select({
    id: emailListsTable.id,
    name: emailListsTable.name,
    subscriberCount: emailListsTable.subscriberCount,
  }).from(emailListsTable).where(eq(emailListsTable.userId, userId)).orderBy(desc(emailListsTable.createdAt));
  res.json(serialize(lists));
});

export { deriveUsername };
export default router;
