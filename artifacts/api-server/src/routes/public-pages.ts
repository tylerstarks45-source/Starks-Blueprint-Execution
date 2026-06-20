/**
 * Public routes — no auth required.
 * /api/pages/:slug  — serves a user's published landing page as HTML (with A/B test variant serving)
 * /api/go/:slug     — redirects an affiliate link and tracks the click
 */
import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, pool, landingPagesTable, userAffiliateLinksTable, abVariantsTable } from "@workspace/db";

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

  // ── A/B Test variant assignment ──────────────────────────────────────────
  // Check if there is a running landing_page A/B test linked to this page via config.landingPageId.
  let activeTestToken: string | null = null;
  let assignedVariantId: number | null = null;
  let variantHtml: string | null = null;

  const linkedTestRows = await pool.query<{
    id: number; token: string;
  }>(
    `SELECT id, token FROM ab_tests
     WHERE status = 'running' AND type = 'landing_page'
       AND (config->>'landingPageId')::int = $1
     LIMIT 1`,
    [page.id],
  );

  if (linkedTestRows.rowCount && linkedTestRows.rowCount > 0) {
    const testRow = linkedTestRows.rows[0]!;

    const variantRows = await pool.query<{
      id: number; name: string; content_ref: string; visits: number;
    }>(
      `SELECT id, name, content_ref, visits FROM ab_variants WHERE test_id = $1 ORDER BY id`,
      [testRow.id],
    );

    if (variantRows.rowCount && variantRows.rowCount > 0) {
      const cookieKey = `abtest_${testRow.id}`;
      const existingCookieRaw = req.headers.cookie
        ?.split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${cookieKey}=`));
      const existingVariantId = existingCookieRaw
        ? parseInt(existingCookieRaw.split("=")[1] ?? "", 10)
        : NaN;

      let chosen = variantRows.rows.find((v) => v.id === existingVariantId);

      if (!chosen) {
        // Even split: pick variant with fewest visits
        chosen = variantRows.rows.reduce((a, b) => (a.visits <= b.visits ? a : b));
        await pool.query(`UPDATE ab_variants SET visits = visits + 1 WHERE id = $1`, [chosen.id]);
        res.setHeader(
          "Set-Cookie",
          `${cookieKey}=${chosen.id}; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax`,
        );
      }

      activeTestToken = testRow.token;
      assignedVariantId = chosen.id;

      // Serve variant HTML if it looks like full HTML (>200 chars, starts with DOCTYPE/html)
      if (chosen.content_ref.length > 200 && /^<!DOCTYPE|^<html/i.test(chosen.content_ref.trimStart())) {
        variantHtml = chosen.content_ref;
      }
    }
  }

  // Track base page view (fire-and-forget)
  db.update(landingPagesTable)
    .set({ pageViews: sql`${landingPagesTable.pageViews} + 1` })
    .where(eq(landingPagesTable.id, page.id))
    .catch(() => {});

  // ── Determine which HTML to serve ─────────────────────────────────────────
  const rawHtml = variantHtml
    ?? page.htmlContent
    ?? `<!DOCTYPE html><html><head><title>${page.title}</title></head><body style="background:#0a0a0a;color:#fff;font-family:sans-serif;padding:40px"><h1>${page.title}</h1><p>Page content coming soon.</p></body></html>`;

  // Sanitize: strip user-supplied <script> tags and inline event handlers.
  // Defense-in-depth against stored XSS — CSP is the primary control.
  // We inject our own trusted tracking snippet AFTER this step.
  let safeHtml = rawHtml
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*\/>/gi, "")
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");

  // ── Inject A/B tracking snippet (trusted, injected post-sanitization) ─────
  // Fires page_view event and exposes window.__sbepConvert(eventType) for CTA tracking.
  if (activeTestToken && assignedVariantId !== null) {
    const snippet = `<script>
(function(){
  var t='${activeTestToken}',v=${assignedVariantId},b='/api/public/ab-tests/'+t+'/convert';
  fetch(b,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({variantId:v,eventType:'page_view'})}).catch(function(){});
  window.__sbepConvert=function(et){fetch(b,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({variantId:v,eventType:et||'button_click'})}).catch(function(){})};
})();
</script>`;
    safeHtml = /<\/body>/i.test(safeHtml)
      ? safeHtml.replace(/<\/body>/i, `${snippet}\n</body>`)
      : safeHtml + snippet;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // CSP: allow inline scripts only for A/B test pages (trusted snippet injected above).
  const scriptPolicy = activeTestToken ? "script-src 'unsafe-inline' 'self'; connect-src 'self';" : "";
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'none'; ${scriptPolicy} style-src 'unsafe-inline' https: data:; img-src * data:; font-src * data:; frame-ancestors 'self'; base-uri 'none'; form-action 'self' https:`,
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
