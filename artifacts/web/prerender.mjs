#!/usr/bin/env node
/**
 * prerender.mjs — Build-time static HTML generator with full SSR body rendering
 *
 * Runs after `vite build` to produce route-specific index.html files inside
 * dist/public/<route>/index.html.  Every file contains:
 *   • Route-specific <head> tags (title, description, robots, canonical, OG,
 *     Twitter Card).
 *   • Real content in the <body>'s #root div, so crawlers/social bots receive
 *     meaningful HTML without executing JavaScript.
 *
 * Content strategy per route type:
 *   • STATIC routes  → React renderToString() via vite.ssrLoadModule().
 *     Static pages have no API dependencies so renderToString() sees the full
 *     component tree.
 *   • BLUEPRINT detail → content-rich HTML built directly from prefetched API
 *     data (name, description, difficulty, cost, time).  renderToString()
 *     produces only a loading skeleton for these because the component fetches
 *     in useEffect, so we use the data-driven body instead.
 *   • TOOL detail    → same data-driven approach.
 *   • /tools/:id     → canonical-redirect HTML (noindex + meta-refresh + JS
 *     redirect) so bots that crawl the legacy URL see the real product page.
 *
 * Additional outputs: sitemap.xml, robots.txt.
 *
 * The Vite dev server is started in SSR middleware mode (no HTTP port bound)
 * and closed before the script exits.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Must be set before vite.config.ts is evaluated (it throws if missing).
process.env.PORT      = process.env.PORT      || '3000';
process.env.BASE_PATH = process.env.BASE_PATH || '/';

import { createServer } from 'vite';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const DIST       = join(__dirname, 'dist/public');
const SITE_URL   = 'https://starksglobalgroup.net';
const OG_IMAGE   = `${SITE_URL}/opengraph.jpg`;
const API_BASE   = process.env.API_BASE_URL || 'http://localhost:80/api';

// ─── Route metadata ────────────────────────────────────────────────────────────

const STATIC_ROUTES = [
  {
    path: '/',
    title: 'Starks Global Group — Build. Launch. Run. Scale. With ASH AI.',
    description:
      'The AI Business Operating System for entrepreneurs. Select a blueprint, connect your tools, and let ASH AI build and run your automated income systems from one powerful dashboard.',
    robots: 'index, follow',
  },
  {
    path: '/marketplace',
    title: 'Premium Tools Marketplace | Starks Global Group',
    description:
      'Discover expert-curated AI tools, automation systems, and marketing software to scale your business.',
    robots: 'index, follow',
  },
  {
    path: '/pricing',
    title: 'Pricing | Starks Global Group',
    description:
      'Choose the plan that fits your goals. Free, Builder, Operator, or Empire — build and scale AI-powered business systems with ASH AI.',
    robots: 'index, follow',
  },
  {
    path: '/about',
    title: 'About Us | Starks Global Group',
    description:
      'Learn about Tyler Starks and our commitment to building real automated systems using AI tools.',
    robots: 'index, follow',
  },
  {
    path: '/contact',
    title: 'Contact Us | Starks Global Group',
    description:
      'Contact Starks Global Group for questions about AI tools, automation systems, and platform recommendations.',
    robots: 'index, follow',
  },
  {
    path: '/blueprints',
    title: 'AI System Blueprints | System Vault — Starks Global Group',
    description:
      'Step-by-step systems to build real AI-powered income streams. Browse our full blueprint library and start building your automated business today.',
    robots: 'index, follow',
  },
  {
    path: '/how-it-works',
    title: 'How It Works | Starks Global Group',
    description:
      'Discover how to use our platform to build, understand, and deploy real AI-powered automation systems.',
    robots: 'index, follow',
  },
  {
    path: '/business-model',
    title: 'Our Business Model | Starks Global Group',
    description:
      'A transparent approach to building, testing, and recommending AI-powered automation systems.',
    robots: 'index, follow',
  },
  {
    path: '/research-lab',
    title: 'Research & Testing Lab | Starks Global Group',
    description:
      'We test, compare, and break down AI tools so you know what actually works.',
    robots: 'index, follow',
  },
  {
    path: '/why-trust-us',
    title: 'Why Trust Us | Starks Global Group',
    description:
      'Learn how Starks Global Group tests, validates, and deploys AI tools and automation systems before recommending them.',
    robots: 'index, follow',
  },
  {
    path: '/updates',
    title: 'Platform Updates | Starks Global Group',
    description:
      'Stay up to date with the latest tool additions, new AI system blueprints, and platform improvements from Starks Global Group.',
    robots: 'index, follow',
  },
  {
    path: '/privacy-policy',
    title: 'Privacy Policy | Starks Global Group',
    description: 'How we collect, use, and protect your data at Starks Global Group.',
    robots: 'index, follow',
  },
  {
    path: '/terms-and-conditions',
    title: 'Terms & Conditions | Starks Global Group',
    description: 'Terms and conditions for using the Starks Blueprint Execution Platform.',
    robots: 'index, follow',
  },
  {
    path: '/affiliate-disclosure',
    title: 'Affiliate Disclosure | Starks Global Group',
    description:
      'Our transparent affiliate disclosure and commitment to unbiased system building.',
    robots: 'index, follow',
  },
  {
    path: '/earnings-disclaimer',
    title: 'Earnings Disclaimer | Starks Global Group',
    description: 'Important disclaimer regarding earnings, results, and system implementation.',
    robots: 'index, follow',
  },
  {
    path: '/login',
    title: 'Log In | Starks Global Group',
    description:
      'Log in to your Starks Global Group account to access your AI-powered systems, blueprints, and automation dashboard.',
    robots: 'noindex, follow',
  },
  {
    path: '/signup',
    title: 'Create Account | Starks Global Group',
    description:
      'Create your free Starks Global Group account and start building AI-powered automated income systems today.',
    robots: 'noindex, follow',
  },
  {
    path: '/reset-password',
    title: 'Reset Password | Starks Global Group',
    description: 'Reset your Starks Global Group account password.',
    robots: 'noindex, nofollow',
  },
  {
    path: '/verify-email',
    title: 'Verify Email | Starks Global Group',
    description: 'Verify your email address to activate your Starks Global Group account.',
    robots: 'noindex, nofollow',
  },
];

// ─── HTML escaping / helpers ───────────────────────────────────────────────────

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function truncate(str, max) {
  if (!str) return '';
  const s = String(str).replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return s.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

const DIFFICULTY_LABEL = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

// ─── Body builders for API-data-driven routes ──────────────────────────────────

/**
 * Build a content-rich HTML body for a blueprint detail page from API data.
 * The React component fetches in useEffect so renderToString only produces a
 * loading skeleton; this function generates the actual content instead.
 */
function buildBlueprintBody(bp) {
  const name         = esc(bp.name || '');
  const description  = esc(bp.description || '');
  const difficulty   = DIFFICULTY_LABEL[bp.difficulty] || esc(bp.difficulty || '');
  const cost         = esc(bp.estimatedCost || '');
  const time         = esc(bp.estimatedTime || '');
  const version      = esc(bp.version || '');

  const meta = [
    difficulty && `<li><strong>Difficulty:</strong> ${difficulty}</li>`,
    cost       && `<li><strong>Estimated Cost:</strong> ${cost}</li>`,
    time       && `<li><strong>Setup Time:</strong> ${time}</li>`,
    version    && `<li><strong>Version:</strong> ${version}</li>`,
  ].filter(Boolean).join('\n        ');

  return `<div>
  <main style="padding:6rem 1rem 4rem">
    <div style="max-width:800px;margin:0 auto">
      <h1>${name}</h1>
      ${description ? `<p>${description}</p>` : ''}
      ${meta ? `<ul>\n        ${meta}\n      </ul>` : ''}
      <p><a href="/blueprints">← Back to Blueprints</a></p>
    </div>
  </main>
</div>`;
}

/**
 * Build a content-rich HTML body for a tool/product detail page from API data.
 */
function buildToolBody(tool) {
  const name        = esc(tool.name || '');
  const description = esc(tool.description || '');

  return `<div>
  <main style="padding:6rem 1rem 4rem">
    <div style="max-width:800px;margin:0 auto">
      <h1>${name}</h1>
      ${description ? `<p>${description}</p>` : ''}
      <p><a href="/marketplace">← Back to Marketplace</a></p>
    </div>
  </main>
</div>`;
}

/**
 * Build a canonical-redirect HTML body for legacy /tools/:id URLs.
 * Uses both meta-refresh and JS redirect so bots see the canonical pointer.
 */
function buildRedirectBody(fromPath, toPath, toolName) {
  const safeTo = esc(toPath);
  const safeName = esc(toolName || 'this tool');
  return `<div>
  <main style="padding:6rem 1rem 4rem;text-align:center">
    <h1>${safeName}</h1>
    <p>Redirecting to the full product page…</p>
    <p><a href="${safeTo}">View ${safeName}</a></p>
  </main>
</div>`;
}

// ─── Shell injection ───────────────────────────────────────────────────────────

function injectHead(html, title, description, robots, canonicalUrl) {
  const safeTitle = esc(title);
  const safeDesc  = esc(truncate(description, 160));
  const safeUrl   = esc(canonicalUrl);
  const safeImage = esc(OG_IMAGE);

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${safeTitle}</title>`);
  html = html.replace(
    /<meta name="description"[^>]*>/,
    `<meta name="description" content="${safeDesc}" />`,
  );
  html = html.replace(
    /<meta name="robots"[^>]*>/,
    `<meta name="robots" content="${robots}" />`,
  );

  if (/<link rel="canonical"/.test(html)) {
    html = html.replace(
      /<link rel="canonical"[^>]*>/,
      `<link rel="canonical" href="${safeUrl}" />`,
    );
  } else {
    html = html.replace('</head>', `  <link rel="canonical" href="${safeUrl}" />\n  </head>`);
  }

  html = html.replace(/<meta property="og:url"[^>]*>/,         `<meta property="og:url" content="${safeUrl}" />`);
  html = html.replace(/<meta property="og:title"[^>]*>/,       `<meta property="og:title" content="${safeTitle}" />`);
  html = html.replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${safeDesc}" />`);
  html = html.replace(/<meta property="og:image"[^>]*>/,       `<meta property="og:image" content="${safeImage}" />`);
  html = html.replace(/<meta name="twitter:title"[^>]*>/,      `<meta name="twitter:title" content="${safeTitle}" />`);
  html = html.replace(/<meta name="twitter:description"[^>]*>/,`<meta name="twitter:description" content="${safeDesc}" />`);

  return html;
}

function writeRoute(shell, route, renderedBody, isCoreRoute = false) {
  const { path, title, description, robots } = route;
  const canonicalUrl = `${SITE_URL}${path}`;

  let html = injectHead(shell, title, description, robots, canonicalUrl);

  if (renderedBody) {
    html = html.replace('<div id="root"></div>', `<div id="root">${renderedBody}</div>`);
  } else if (isCoreRoute) {
    console.warn(`  ⚠  WARN: no body content for core SEO route ${path}`);
  }

  const subdir  = path === '/' ? '' : path.replace(/^\//, '');
  const dir     = subdir ? join(DIST, subdir) : DIST;
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html, 'utf8');

  const bodyNote = renderedBody ? `${Math.round(renderedBody.length / 1024)}kB body` : 'head only';
  console.log(`  ✓  ${path}  (${bodyNote})`);
}

/**
 * Write a canonical-redirect HTML file for legacy /tools/:id paths.
 * Crawlers that land here see a noindex page with the canonical href.
 */
function writeRedirectRoute(shell, { fromPath, toPath, title, body }) {
  const safeTo = esc(toPath);
  const fullTo = esc(`${SITE_URL}${toPath}`);

  // Add meta-refresh before </head>
  let html = shell.replace('</head>', `  <meta http-equiv="refresh" content="0;url=${safeTo}" />\n  </head>`);
  html = injectHead(html, title, `Redirecting to ${toPath}`, 'noindex, follow', `${SITE_URL}${fromPath}`);
  // Override canonical to point at the real URL
  html = html.replace(
    /<link rel="canonical"[^>]*>/,
    `<link rel="canonical" href="${fullTo}" />`,
  );
  html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);

  const dir = join(DIST, fromPath.replace(/^\//, ''));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html, 'utf8');
  console.log(`  ✓  ${fromPath}  → ${toPath}  (redirect)`);
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchJson(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchAllPages(baseUrl) {
  const first = await fetchJson(`${baseUrl}?page=1&perPage=100`);
  if (!first) return null;
  const items = Array.isArray(first) ? first : (first.items ?? []);
  return { items, total: items.length };
}

// ─── Sitemap ──────────────────────────────────────────────────────────────────

function buildSitemap(allRoutes) {
  const today     = new Date().toISOString().slice(0, 10);
  const indexable = allRoutes.filter(r => r.robots === 'index, follow');

  const entries = indexable.map(({ path }) => {
    const priority =
      path === '/'  ? '1.0'
      : ['/marketplace', '/blueprints', '/pricing'].includes(path) ? '0.9'
      : path.startsWith('/blueprints/') || path.startsWith('/marketplace/') ? '0.8'
      : '0.6';
    const changefreq =
      path === '/' ? 'weekly'
      : path.startsWith('/blueprints/') || path.startsWith('/marketplace/') ? 'monthly'
      : 'monthly';
    return `  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const shellPath = join(DIST, 'index.html');
  if (!existsSync(shellPath)) {
    console.error(`ERROR: ${shellPath} not found. Run vite build first.`);
    process.exit(1);
  }
  const shell = readFileSync(shellPath, 'utf8');

  // ── Start Vite SSR server (used for static routes) ─────────────────────────
  console.log('\nStarting Vite SSR renderer…');
  let render  = null;
  let vite    = null;
  let ssrOk   = false;

  try {
    vite = await createServer({
      root:      __dirname,
      server:    { middlewareMode: true },
      appType:   'custom',
      logLevel:  'warn',
    });
    const mod = await vite.ssrLoadModule('/src/entry-server.jsx');
    render = mod.render;
    ssrOk  = true;
    console.log('  SSR renderer ready.\n');
  } catch (err) {
    console.warn(`  SSR renderer unavailable: ${err.message}`);
    console.warn('  Static routes will use head-only output (no body HTML).\n');
  }

  // ── Static routes (React renderToString) ──────────────────────────────────
  const coreRoutes = new Set(['/', '/marketplace', '/pricing', '/about', '/blueprints', '/how-it-works']);

  console.log('Prerendering static routes…');
  for (const route of STATIC_ROUTES) {
    let body = '';
    if (render) {
      try {
        body = render(route.path) ?? '';
        // A body shorter than 500 chars is likely just a loading skeleton
        if (body.length < 500) {
          console.warn(`    ⚠  Short SSR output for ${route.path} (${body.length} chars) — possible loading state`);
        }
      } catch (e) {
        const msg = `SSR failed for ${route.path}: ${e.message}`;
        if (coreRoutes.has(route.path)) {
          console.error(`    ✗  ${msg}`);
        } else {
          console.warn(`    ⚠  ${msg}`);
        }
      }
    }
    writeRoute(shell, route, body, coreRoutes.has(route.path));
  }

  // ── Fetch blueprint + tool data ────────────────────────────────────────────
  console.log('\nFetching API data for dynamic routes…');
  const [blueprintsData, toolsData] = await Promise.all([
    fetchAllPages(`${API_BASE}/blueprints`),
    fetchAllPages(`${API_BASE}/tools`),
  ]);

  if (blueprintsData?.items?.length) {
    console.log(`  Fetched ${blueprintsData.items.length} blueprint(s).`);
  } else {
    console.log('  Blueprints API unavailable — skipping blueprint detail pages.');
  }
  if (toolsData?.items?.length) {
    console.log(`  Fetched ${toolsData.items.length} tool(s).`);
  } else {
    console.log('  Tools API unavailable — skipping tool detail / redirect pages.');
  }

  // ── Blueprint detail pages ─────────────────────────────────────────────────
  const blueprintRoutes = [];
  if (blueprintsData?.items?.length) {
    console.log('\nPrerendering blueprint detail pages…');
    for (const bp of blueprintsData.items) {
      const slug = bp.slug || String(bp.id);
      const path = `/blueprints/${slug}`;
      const description = truncate(
        bp.description || `${bp.name} — a step-by-step AI system blueprint for building automated income streams.`,
        160,
      );
      const route = {
        path,
        title: `${bp.name} | System Blueprint — Starks Global Group`,
        description,
        robots: 'index, follow',
      };
      blueprintRoutes.push(route);
      const body = buildBlueprintBody(bp);
      writeRoute(shell, route, body);
    }
  }

  // ── Tool detail pages + /tools/:id redirect pages ─────────────────────────
  const toolDetailRoutes = [];
  if (toolsData?.items?.length) {
    console.log('\nPrerendering tool detail + redirect pages…');
    for (const tool of toolsData.items) {
      const id   = tool.id;
      const path = `/marketplace/product/${id}`;
      const description = truncate(
        tool.description || `${tool.name} — an expert-curated AI tool on the Starks Global Marketplace.`,
        160,
      );
      const route = {
        path,
        title: `${tool.name} | Starks Global Marketplace`,
        description,
        robots: 'index, follow',
      };
      toolDetailRoutes.push(route);
      const body = buildToolBody(tool);
      writeRoute(shell, route, body);

      // Legacy /tools/:id → canonical redirect
      writeRedirectRoute(shell, {
        fromPath: `/tools/${id}`,
        toPath:   path,
        title:    `${tool.name} | Starks Global Group`,
        body:     buildRedirectBody(`/tools/${id}`, path, tool.name),
      });
    }
  }

  // ── Sitemap ────────────────────────────────────────────────────────────────
  const allIndexableRoutes = [...STATIC_ROUTES, ...blueprintRoutes, ...toolDetailRoutes];
  console.log('\nGenerating sitemap.xml…');
  writeFileSync(join(DIST, 'sitemap.xml'), buildSitemap(allIndexableRoutes), 'utf8');
  console.log('  ✓  /sitemap.xml');

  // ── robots.txt ────────────────────────────────────────────────────────────
  console.log('Generating robots.txt…');
  writeFileSync(
    join(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
    'utf8',
  );
  console.log('  ✓  /robots.txt');

  if (vite) await vite.close();

  const totalRoutes = STATIC_ROUTES.length +
    (blueprintRoutes.length) +
    (toolDetailRoutes.length) +
    (toolsData?.items?.length ?? 0); // /tools/:id redirects

  console.log(`\n✅  Prerender complete — ${totalRoutes} route file(s) written.\n`);
}

main().catch(err => {
  console.error('\nPrerender failed:', err);
  process.exit(1);
});
