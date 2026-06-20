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
// Handles both base page slugs AND variant-specific slugs (e.g. "my-page-vb").
router.get("/pages/:slug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;

  // ── Check if slug belongs to a variant first ──────────────────────────────
  // Treatment variants get their own URL slug (e.g. "hero-page-vb").
  const variantCheck = await pool.query<{
    id: number; test_id: number; content_ref: string; visits: number; status: string;
  }>(
    `SELECT id, test_id, content_ref, visits, status FROM ab_variants WHERE slug = $1 LIMIT 1`,
    [slug],
  );

  if (variantCheck.rowCount && variantCheck.rowCount > 0) {
    const vRow = variantCheck.rows[0]!;
    // Find the test
    const testCheck = await pool.query<{ id: number; token: string; status: string; config: Record<string, unknown> }>(
      `SELECT id, token, status, config FROM ab_tests WHERE id = $1 LIMIT 1`,
      [vRow.test_id],
    );
    if (testCheck.rowCount && testCheck.rowCount > 0) {
      const test = testCheck.rows[0]!;
      if (test.status !== "running" || vRow.status === "archived") {
        // Test concluded — redirect to the base landing page (winner now served there)
        const lpId = test.config?.landingPageId as number | undefined;
        if (lpId) {
          const pgRow = await pool.query<{ slug: string }>(`SELECT slug FROM landing_pages WHERE id = $1`, [lpId]);
          if (pgRow.rowCount && pgRow.rowCount > 0) {
            res.redirect(302, `/api/pages/${pgRow.rows[0]!.slug}`);
            return;
          }
        }
      } else {
        // Still running: serve this variant
        const cookieKey = `abtest_${test.id}`;
        const hasCookie = req.headers.cookie?.includes(`${cookieKey}=`);
        if (!hasCookie) {
          await pool.query(`UPDATE ab_variants SET visits = visits + 1 WHERE id = $1`, [vRow.id]);
          res.setHeader("Set-Cookie", `${cookieKey}=${vRow.id}; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax`);
        }

        // Serve variant HTML (must be a full HTML document)
        const html = vRow.content_ref.length > 200 && /^<!DOCTYPE|^<html/i.test(vRow.content_ref.trimStart())
          ? vRow.content_ref
          : `<!DOCTYPE html><html><head><title>Variant</title></head><body style="background:#0a0a0a;color:#fff;font-family:sans-serif;padding:40px"><p>${vRow.content_ref}</p></body></html>`;

        const safeHtml = html
          .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<script\b[^>]*\/>/gi, "")
          .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");

        const snippet = `<script>
(function(){
  var t='${test.token}',v=${vRow.id},b='/api/public/ab-tests/'+t+'/convert';
  fetch(b,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({variantId:v,eventType:'page_view'})}).catch(function(){});
  window.__sbepConvert=function(et){fetch(b,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({variantId:v,eventType:et||'button_click'})}).catch(function(){})};
})();
</script>`;
        const finalHtml = /<\/body>/i.test(safeHtml)
          ? safeHtml.replace(/<\/body>/i, `${snippet}\n</body>`)
          : safeHtml + snippet;

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline' 'self'; connect-src 'self'; style-src 'unsafe-inline' https: data:; img-src * data:; font-src * data:; frame-ancestors 'self'; base-uri 'none'; form-action 'self' https:");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "SAMEORIGIN");
        res.send(finalHtml);
        return;
      }
    }
  }

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

  // ── A/B Test variant assignment (URL-based, even split) ──────────────────
  // Each treatment variant has its own slug (e.g. "hero-page-vb").
  // New visitors: 50% are redirected to the treatment slug URL, 50% stay here (control).
  // Returning visitors: cookie preserves their group.
  let activeTestToken: string | null = null;
  let assignedVariantId: number | null = null;

  const linkedTestRows = await pool.query<{ id: number; token: string }>(
    `SELECT id, token FROM ab_tests
     WHERE status = 'running' AND type = 'landing_page'
       AND (config->>'landingPageId')::int = $1
     LIMIT 1`,
    [page.id],
  );

  if (linkedTestRows.rowCount && linkedTestRows.rowCount > 0) {
    const testRow = linkedTestRows.rows[0]!;
    const cookieKey = `abtest_${testRow.id}`;
    const existingCookieRaw = req.headers.cookie
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${cookieKey}=`));
    const existingVariantId = existingCookieRaw
      ? parseInt(existingCookieRaw.split("=")[1] ?? "", 10)
      : NaN;

    if (!Number.isFinite(existingVariantId)) {
      // New visitor: randomly assign to control (no redirect) or a treatment slug (redirect).
      // Control variant has slug = NULL; treatments have slugs like "{page-slug}-vb".
      const treatmentRows = await pool.query<{ id: number; slug: string; visits: number }>(
        `SELECT id, slug, visits FROM ab_variants
         WHERE test_id = $1 AND slug IS NOT NULL AND status = 'active'
         ORDER BY visits ASC LIMIT 1`,
        [testRow.id],
      );
      const controlRows = await pool.query<{ id: number; visits: number }>(
        `SELECT id, visits FROM ab_variants
         WHERE test_id = $1 AND slug IS NULL
         ORDER BY id ASC LIMIT 1`,
        [testRow.id],
      );

      const hasTreatment = treatmentRows.rowCount && treatmentRows.rowCount > 0;
      const treatment = hasTreatment ? treatmentRows.rows[0]! : null;
      const control = controlRows.rowCount && controlRows.rowCount > 0 ? controlRows.rows[0]! : null;

      // 50/50 split: redirect to treatment if coin flip AND treatment has a slug
      if (treatment && Math.random() < 0.5) {
        await pool.query(`UPDATE ab_variants SET visits = visits + 1 WHERE id = $1`, [treatment.id]);
        res.setHeader("Set-Cookie", `${cookieKey}=${treatment.id}; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax`);
        res.redirect(302, `/api/pages/${treatment.slug}`);
        return;
      } else if (control) {
        // Stay on this URL (control group)
        await pool.query(`UPDATE ab_variants SET visits = visits + 1 WHERE id = $1`, [control.id]);
        res.setHeader("Set-Cookie", `${cookieKey}=${control.id}; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax`);
        activeTestToken = testRow.token;
        assignedVariantId = control.id;
      }
    } else {
      // Returning visitor: already assigned; serve control content here (treatment redirects are handled above at variant slug)
      activeTestToken = testRow.token;
      assignedVariantId = existingVariantId;
    }
  }

  // Track base page view (fire-and-forget)
  db.update(landingPagesTable)
    .set({ pageViews: sql`${landingPagesTable.pageViews} + 1` })
    .where(eq(landingPagesTable.id, page.id))
    .catch(() => {});

  // ── Determine which HTML to serve ─────────────────────────────────────────
  // Control visitors (assignedVariantId set, no redirect) get the base page HTML.
  // Treatment visitors were already redirected to their variant slug URL above.
  const rawHtml = page.htmlContent
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
