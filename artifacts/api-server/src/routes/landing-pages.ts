import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, desc } from "drizzle-orm";
import { db, landingPagesTable, systemInstancesTable, usersTable } from "@workspace/db";
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
});

const GenerateLandingPageBody = z.object({
  pageId: z.number().int(),
  prompt: z.string().min(1).max(2000),
  pageType: z.enum(["affiliate", "product", "lead-capture", "sales-funnel", "portfolio", "blog", "service"]).optional(),
  affiliateLinks: z.array(z.object({ name: z.string(), url: z.string(), description: z.string().optional() })).optional(),
  brandColors: z.object({ primary: z.string(), secondary: z.string() }).optional(),
});

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) + "-" + randomBytes(3).toString("hex");
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
      customDomain: landingPagesTable.customDomain,
      createdAt: landingPagesTable.createdAt,
      updatedAt: landingPagesTable.updatedAt,
      systemName: systemInstancesTable.name,
    })
    .from(landingPagesTable)
    .leftJoin(systemInstancesTable, eq(landingPagesTable.systemInstanceId, systemInstancesTable.id))
    .where(eq(landingPagesTable.userId, userId))
    .orderBy(desc(landingPagesTable.updatedAt));
  res.json(serialize(rows));
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
  const [row] = await db.select().from(landingPagesTable)
    .where(and(eq(landingPagesTable.id, id), eq(landingPagesTable.userId, userId)));
  if (!row) {
    res.status(404).json({ error: "Landing page not found" });
    return;
  }
  res.json(serialize(row));
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
  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.isPublished === true) updates.publishedAt = new Date();
  const [row] = await db.update(landingPagesTable).set(updates)
    .where(and(eq(landingPagesTable.id, id), eq(landingPagesTable.userId, userId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Landing page not found" });
    return;
  }
  res.json(serialize(row));
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

Page Type: ${parsed.data.pageType ?? "affiliate"}
${affiliateSection}
Primary color: ${parsed.data.brandColors?.primary ?? "#8B5CF6"}
Secondary color: ${parsed.data.brandColors?.secondary ?? "#06B6D4"}`;

  req.log.info({ pageId: parsed.data.pageId, pageType: parsed.data.pageType }, "ASH generating landing page");

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

  const [updated] = await db.update(landingPagesTable)
    .set({ htmlContent })
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

export default router;
