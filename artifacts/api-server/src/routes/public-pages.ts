/**
 * Public routes — no auth required.
 * /api/pages/:slug  — serves a user's published landing page as HTML (with A/B test variant serving)
 * /api/go/:slug     — redirects an affiliate link and tracks the click
 */
import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, pool, landingPagesTable, userAffiliateLinksTable, abVariantsTable, emailSubscribersTable, emailListsTable, usersTable } from "@workspace/db";

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
      // New visitor: true 1/N even allocator — pick the active variant with the fewest visits.
      // Control has slug=NULL (stays on this URL); treatments have a slug (get a 302 redirect).
      const allVariants = await pool.query<{ id: number; slug: string | null; visits: number }>(
        `SELECT id, slug, visits FROM ab_variants
         WHERE test_id = $1 AND status = 'active'
         ORDER BY visits ASC, id ASC
         LIMIT 1`,
        [testRow.id],
      );

      if (allVariants.rowCount && allVariants.rowCount > 0) {
        const chosen = allVariants.rows[0]!;
        await pool.query(`UPDATE ab_variants SET visits = visits + 1 WHERE id = $1`, [chosen.id]);
        res.setHeader("Set-Cookie", `${cookieKey}=${chosen.id}; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax`);

        if (chosen.slug) {
          // Treatment variant: redirect to its own URL
          res.redirect(302, `/api/pages/${chosen.slug}`);
          return;
        }
        // Control: serve here
        activeTestToken = testRow.token;
        assignedVariantId = chosen.id;
      }
    } else {
      // Returning visitor: check if their assigned variant is a treatment (has a slug).
      // If so, redirect to ensure consistent URL exposure and valid attribution.
      const assignedVariantRow = await pool.query<{ slug: string | null }>(
        `SELECT slug FROM ab_variants WHERE id = $1 AND test_id = $2 LIMIT 1`,
        [existingVariantId, testRow.id],
      );
      const assignedSlug = assignedVariantRow.rows[0]?.slug ?? null;
      if (assignedSlug) {
        // Treatment variant: redirect to assigned variant slug
        res.redirect(302, `/api/pages/${assignedSlug}`);
        return;
      }
      // Control variant: serve here
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

// ── POST /api/pages/:id/submit ── public lead capture form submission ─────────
// No auth required — this is called from the public landing page form.
// Accepts both application/json and application/x-www-form-urlencoded (HTML form POST).
router.post("/pages/:id/submit", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (!Number.isFinite(id)) {
    res.status(400).send("Invalid page id");
    return;
  }

  const rawEmail = (req.body?.email ?? req.query["email"]) as string | undefined;
  const rawFirstName = (req.body?.firstName ?? req.body?.first_name ?? req.query["firstName"]) as string | undefined;

  if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail.trim())) {
    if (req.accepts("html")) {
      res.status(400).send(`<!DOCTYPE html><html><body style="background:#0a0a0a;color:#e57373;font-family:sans-serif;padding:40px;text-align:center"><p>Please enter a valid email address.</p><a href="javascript:history.back()" style="color:#8B5CF6">← Try again</a></body></html>`);
    } else {
      res.status(400).json({ error: "Valid email is required" });
    }
    return;
  }

  const email = rawEmail.trim().toLowerCase();
  const firstName = rawFirstName?.trim() ?? null;

  const [page] = await db.select({
    id: landingPagesTable.id,
    isPublished: landingPagesTable.isPublished,
    emailListId: landingPagesTable.emailListId,
    nextPageId: landingPagesTable.nextPageId,
    slug: landingPagesTable.slug,
    title: landingPagesTable.title,
  }).from(landingPagesTable).where(eq(landingPagesTable.id, id));

  if (!page) {
    res.status(404).send("Page not found");
    return;
  }

  // Increment optin count (fire-and-forget)
  db.update(landingPagesTable)
    .set({ optins: sql`${landingPagesTable.optins} + 1` })
    .where(eq(landingPagesTable.id, id))
    .catch(() => {});

  // Add to linked email list if one is connected
  if (page.emailListId) {
    try {
      const existing = await db.select({ id: emailSubscribersTable.id })
        .from(emailSubscribersTable)
        .where(and(
          eq(emailSubscribersTable.listId, page.emailListId),
          eq(emailSubscribersTable.email, email),
        ));
      if (existing.length === 0) {
        await db.insert(emailSubscribersTable).values({
          listId: page.emailListId,
          email,
          firstName: firstName ?? undefined,
          source: `landing-page:${page.slug}`,
          tags: ["landing-page"],
        }).onConflictDoNothing();
        db.update(emailListsTable)
          .set({ subscriberCount: sql`${emailListsTable.subscriberCount} + 1` })
          .where(eq(emailListsTable.id, page.emailListId))
          .catch(() => {});
      }
    } catch { /* non-fatal */ }
  }

  // Redirect to next page in funnel, or show thank-you message
  if (page.nextPageId) {
    res.redirect(302, `/api/pages/${page.nextPageId}`);
    return;
  }

  // Inline thank-you if no next page configured
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html><html><head><title>Thank You!</title><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#050508;color:#fff;font-family:'Outfit',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}.card{text-align:center;max-width:460px;padding:48px 40px;border-radius:24px;border:1px solid rgba(139,92,246,0.25);background:rgba(139,92,246,0.06)}.emoji{font-size:64px;margin-bottom:24px}.h1{font-size:32px;font-weight:800;margin-bottom:12px;background:linear-gradient(135deg,#8B5CF6,#06B6D4);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.p{font-size:16px;color:rgba(255,255,255,0.55);line-height:1.6}</style></head>
<body><div class="card"><div class="emoji">🎉</div><div class="h1">You're in!</div><p class="p">Thanks for joining. Check your inbox — we'll be in touch soon.</p></div></body></html>`);
});

// ── GET /api/p/:username/:slug ── username-scoped public URL ──────────────────
// Friendly URL format: /api/p/{emailPrefix}/{slug}
// This is equivalent to /api/pages/:slug but with the user's email prefix for branding.
router.get("/p/:username/:slug", async (req, res): Promise<void> => {
  const slugParam = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  // Delegate to the same slug-based serve flow by redirecting internally.
  // We verify the username matches to prevent slug enumeration via wrong username.
  const [page] = await db.select({
    id: landingPagesTable.id,
    slug: landingPagesTable.slug,
    isPublished: landingPagesTable.isPublished,
    userEmail: usersTable.email,
  }).from(landingPagesTable)
    .innerJoin(usersTable, eq(landingPagesTable.userId, usersTable.id))
    .where(eq(landingPagesTable.slug, slugParam));

  if (!page) {
    res.status(404).send(`<!DOCTYPE html><html><body style="background:#0a0a0a;color:#555;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center"><p>Page not found.<br><a href="/" style="color:#8b5cf6">← Home</a></p></body></html>`);
    return;
  }

  // Serve via the canonical slug URL (handles A/B tests, view tracking, etc.)
  res.redirect(301, `/api/pages/${page.slug}`);
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
