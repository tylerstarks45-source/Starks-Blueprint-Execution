/**
 * Public routes — no auth required.
 * /api/pages/:slug  — serves a user's published landing page as HTML
 * /api/go/:slug     — redirects an affiliate link and tracks the click
 */
import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, sql } from "drizzle-orm";
import { db, landingPagesTable, userAffiliateLinksTable } from "@workspace/db";

const router: IRouter = Router();

// ── GET /api/pages/:slug ── public landing page serve ──────────────────────
router.get("/pages/:slug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const [page] = await db.select().from(landingPagesTable)
    .where(eq(landingPagesTable.slug, slug));

  if (!page) {
    res.status(404).send(`<!DOCTYPE html><html><head><title>Page Not Found</title><style>
      body{background:#0a0a0a;color:#555;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
      .wrap{text-align:center}.code{font-size:4rem;color:#222;font-weight:bold}.msg{margin-top:8px}a{color:#8b5cf6}
    </style></head><body><div class="wrap"><div class="code">404</div><div class="msg">This page doesn't exist.<br><a href="/">← Starks Global Group</a></div></div></body></html>`);
    return;
  }

  if (!page.isPublished) {
    res.status(403).send(`<!DOCTYPE html><html><head><title>Page Not Published</title><style>
      body{background:#0a0a0a;color:#555;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
      .wrap{text-align:center}.code{font-size:2rem;color:#8b5cf6;font-weight:bold}.msg{margin-top:8px;color:#444}a{color:#8b5cf6}
    </style></head><body><div class="wrap"><div class="code">Coming Soon</div><div class="msg">This page is not published yet.<br><a href="/">← Starks Global Group</a></div></div></body></html>`);
    return;
  }

  // Track page view (fire-and-forget)
  db.update(landingPagesTable)
    .set({ pageViews: sql`${landingPagesTable.pageViews} + 1` })
    .where(eq(landingPagesTable.id, page.id))
    .catch(() => {});

  // Sanitize: strip <script> tags and event handlers before serving.
  // Defense-in-depth against stored XSS — the CSP header below is the primary control.
  const rawHtml = page.htmlContent || `<!DOCTYPE html><html><head><title>${page.title}</title></head><body style="background:#0a0a0a;color:#fff;font-family:sans-serif;padding:40px"><h1>${page.title}</h1><p>Page content coming soon.</p></body></html>`;
  const safeHtml = rawHtml
    // Remove <script> blocks (including src= variants)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*\/>/gi, "")
    // Remove inline event handlers (onclick, onerror, onload, etc.)
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Strict CSP: no scripts allowed, images/styles from anywhere, no framing from third parties.
  // This is the primary XSS control — even if a script tag slips through sanitization, the browser blocks it.
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; style-src 'unsafe-inline' https: data:; img-src * data:; font-src * data:; frame-ancestors 'self'; base-uri 'none'; form-action 'self' https:"
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.send(safeHtml);
});

// ── GET /api/go/:slug ── affiliate link redirect + click tracking ───────────
router.get("/go/:slug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const [link] = await db.select().from(userAffiliateLinksTable)
    .where(eq(userAffiliateLinksTable.cloakedSlug, slug));

  if (!link || !link.isActive) {
    res.status(404).send("Link not found or inactive");
    return;
  }

  // Track click (fire-and-forget)
  db.update(userAffiliateLinksTable)
    .set({ clickCount: sql`${userAffiliateLinksTable.clickCount} + 1` })
    .where(eq(userAffiliateLinksTable.id, link.id))
    .catch(() => {});

  res.redirect(302, link.url);
});

export default router;
