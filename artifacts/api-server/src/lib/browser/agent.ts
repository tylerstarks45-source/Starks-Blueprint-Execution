/**
 * Playwright browser agent — full Chromium, JS execution, screenshots.
 * Uses system Chromium via PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH env var.
 */
import { complete } from "../openrouter";
import { createBrowserContext, getPageData, isPageClosedError } from "./crawler";
import type { BrowserContext, Page } from "playwright";

export type BrowserEventType =
  | "navigate"
  | "thinking"
  | "action"
  | "content"
  | "snapshot"
  | "done"
  | "error";

export interface BrowserEvent {
  type: BrowserEventType;
  url?: string;
  title?: string;
  description?: string;
  result?: string;
  message?: string;
  html?: string;
  screenshot?: string;
}

const MAX_STEPS = 15;

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

async function settleNavigation(context: BrowserContext, page: Page): Promise<Page> {
  try {
    await page.waitForLoadState("domcontentloaded", { timeout: 6000 });
  } catch { /* may have finished or page replaced */ }
  await sleep(800);
  try {
    page.url();
    await page.title();
    return page;
  } catch {
    const pages = context.pages();
    if (pages.length === 0) return page;
    return pages[pages.length - 1];
  }
}

function formatPageForAI(page: {
  finalUrl: string;
  title: string;
  text: string;
  links: Array<{ text: string; url: string }>;
  forms: Array<{ action: string; method: string; fields: Array<{ name: string; type: string; placeholder?: string; value?: string; label?: string }> }>;
}): string {
  const linksText = page.links.slice(0, 20)
    .map((l, i) => `  ${i + 1}. "${l.text}" → ${l.url}`).join("\n");
  const formsText = page.forms
    .map((f, i) =>
      `  Form ${i}: action="${f.action}" method="${f.method}"\n` +
      f.fields.map(fld =>
        `    - name="${fld.name}" type="${fld.type}"` +
        (fld.label ? ` label="${fld.label}"` : "") +
        (fld.placeholder ? ` placeholder="${fld.placeholder}"` : "") +
        (fld.value ? ` current_value="${fld.value}"` : "")
      ).join("\n")
    ).join("\n");

  return `URL: ${page.finalUrl}
Title: ${page.title}

--- PAGE TEXT (first 5000 chars) ---
${page.text.slice(0, 5000)}

--- LINKS ON PAGE (top 20) ---
${linksText || "  (none found)"}

--- FORMS ON PAGE ---
${formsText || "  (none found)"}`;
}

function buildDecisionPrompt(pageInfo: string, task: string, steps: string[]): string {
  return `You are a web browsing AI agent with a REAL Chromium browser. You can execute JavaScript, click any element, type text, scroll, and interact with any website including Gmail, Google, and other JS-heavy sites.

${pageInfo}

Previously completed steps:
${steps.length ? steps.map((s, i) => `  ${i + 1}. ${s}`).join("\n") : "  (none yet — just started)"}

USER TASK: ${task}

Decide the NEXT single action. Respond ONLY with valid JSON — no markdown, no explanation:

Navigate to URL:
{"action":"navigate","url":"<full URL>","reason":"<why>"}

Click element by CSS selector:
{"action":"click","selector":"<CSS selector>","reason":"<why>"}

Click by visible text:
{"action":"click_text","text":"<exact visible button/link text>","reason":"<why>"}

Type into a field (clears first):
{"action":"type","selector":"<CSS selector or input name>","value":"<text>","reason":"<why>"}

Type into field by label text:
{"action":"type_label","label":"<label text>","value":"<text>","reason":"<why>"}

Press a keyboard key:
{"action":"key","key":"<Enter|Tab|Escape>","reason":"<why>"}

Scroll the page:
{"action":"scroll","direction":"down","pixels":500,"reason":"<why>"}

Wait for something to load:
{"action":"wait","ms":2000,"reason":"<why>"}

Task is complete:
{"action":"done","result":"<detailed summary of what was accomplished or found>"}

RULES:
- For Google/Gmail login: email field is input[type="email"] or #identifierId; password is input[type="password"]
- After typing credentials, click Next/Sign In or press Enter
- If current page already has the info needed → return done immediately
- Be specific with selectors — prefer id, name, or type attributes
- After navigation, the page URL changes automatically — do NOT re-navigate to same URL`;
}

async function executeAction(
  context: BrowserContext,
  page: Page,
  decision: {
    action: string;
    url?: string;
    selector?: string;
    text?: string;
    label?: string;
    value?: string;
    key?: string;
    direction?: string;
    pixels?: number;
    ms?: number;
    reason?: string;
    result?: string;
  }
): Promise<{ ok: boolean; description: string; error?: string; page: Page }> {
  try {
    switch (decision.action) {
      case "navigate": {
        await page.goto(decision.url!, { waitUntil: "domcontentloaded", timeout: 25000 });
        const activePage = await settleNavigation(context, page);
        return { ok: true, description: `Navigated to ${decision.url}`, page: activePage };
      }

      case "click": {
        const sel = decision.selector!;
        try {
          await page.waitForSelector(sel, { timeout: 8000, state: "visible" });
        } catch (waitErr) {
          if (isPageClosedError(waitErr)) {
            const activePage = await settleNavigation(context, page);
            return { ok: true, description: `Page navigated while waiting for ${sel}`, page: activePage };
          }
        }
        try { await page.click(sel, { timeout: 5000 }); } catch { /* page may navigate */ }
        const activePage = await settleNavigation(context, page);
        return { ok: true, description: `Clicked: ${sel}`, page: activePage };
      }

      case "click_text": {
        const txt = decision.text!;
        const locator = page.getByText(txt, { exact: false }).first();
        try {
          await locator.waitFor({ timeout: 8000 });
          await locator.click({ timeout: 5000 });
        } catch (err) {
          if (!isPageClosedError(err)) {
            const activePage = await settleNavigation(context, page);
            return { ok: false, description: `Could not click "${txt}"`, error: err instanceof Error ? err.message : String(err), page: activePage };
          }
        }
        const activePage = await settleNavigation(context, page);
        return { ok: true, description: `Clicked text: "${txt}"`, page: activePage };
      }

      case "type": {
        const sel = decision.selector!;
        try {
          await page.waitForSelector(sel, { timeout: 8000, state: "visible" });
          await page.fill(sel, decision.value ?? "");
        } catch (err) {
          if (isPageClosedError(err)) {
            const activePage = await settleNavigation(context, page);
            return { ok: false, description: `Page closed while typing into ${sel}`, page: activePage };
          }
          return { ok: false, description: `Could not type into ${sel}`, error: err instanceof Error ? err.message : String(err), page };
        }
        await sleep(400);
        return { ok: true, description: `Typed into ${sel}: "${decision.value}"`, page };
      }

      case "type_label": {
        const label = decision.label!;
        const labelEl = page.getByLabel(label, { exact: false }).first();
        try {
          await labelEl.waitFor({ timeout: 8000 });
          await labelEl.fill(decision.value ?? "");
        } catch (err) {
          return { ok: false, description: `Could not type into label "${label}"`, error: err instanceof Error ? err.message : String(err), page };
        }
        await sleep(400);
        return { ok: true, description: `Typed "${decision.value}" into field labeled "${label}"`, page };
      }

      case "key": {
        try { await page.keyboard.press(decision.key!); } catch { /* ignore */ }
        const activePage = await settleNavigation(context, page);
        return { ok: true, description: `Pressed key: ${decision.key}`, page: activePage };
      }

      case "scroll": {
        const px = decision.pixels ?? 500;
        const dir = decision.direction === "up" ? -px : px;
        try {
          await page.evaluate(new Function("dy", "window.scrollBy(0, dy)") as (dy: number) => void, dir);
        } catch { /* ignore */ }
        await sleep(400);
        return { ok: true, description: `Scrolled ${decision.direction ?? "down"} ${px}px`, page };
      }

      case "wait": {
        await sleep(decision.ms ?? 2000);
        return { ok: true, description: `Waited ${decision.ms ?? 2000}ms`, page };
      }

      default:
        return { ok: false, description: `Unknown action: ${decision.action}`, error: "Unknown action", page };
    }
  } catch (err: unknown) {
    let activePage = page;
    if (isPageClosedError(err)) {
      try { activePage = await settleNavigation(context, page); } catch { /* best effort */ }
    }
    return {
      ok: false,
      description: `Action failed: ${decision.action}`,
      error: err instanceof Error ? err.message : String(err),
      page: activePage,
    };
  }
}

export async function* runBrowserAgent(
  task: string,
  startUrl: string,
  userId: number
): AsyncGenerator<BrowserEvent> {
  const steps: string[] = [];
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    yield { type: "thinking", description: "Starting Chromium browser…" };

    context = await createBrowserContext();
    page = await context.newPage();

    yield { type: "thinking", description: `Navigating to ${startUrl}…` };
    try {
      await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
    } catch (err) {
      if (!isPageClosedError(err)) {
        yield { type: "thinking", description: "Page slow to load, continuing…" };
      }
    }
    page = await settleNavigation(context, page);

    for (let step = 0; step < MAX_STEPS; step++) {
      const activePage = context.pages().at(-1) ?? page;
      page = activePage;

      let pageData;
      try {
        pageData = await getPageData(page, page.url());
      } catch (err) {
        if (isPageClosedError(err)) {
          const pages = context.pages();
          if (pages.length === 0) {
            yield { type: "error", message: "Browser session ended unexpectedly." };
            return;
          }
          page = pages[pages.length - 1];
          pageData = await getPageData(page, page.url());
        } else {
          throw err;
        }
      }

      yield { type: "navigate", url: pageData.finalUrl, title: pageData.title, description: `Viewing: ${pageData.title}` };

      if (pageData.screenshot) {
        yield { type: "snapshot", url: pageData.finalUrl, title: pageData.title, screenshot: pageData.screenshot };
      }

      yield {
        type: "content",
        url: pageData.finalUrl,
        description: `Page loaded — ${pageData.text.length} chars, ${pageData.links.length} links, ${pageData.forms.length} forms`,
      };

      if (step === MAX_STEPS - 1) {
        yield { type: "done", result: `Reached maximum steps. Last page: "${pageData.title}" at ${pageData.finalUrl}.\n\n${pageData.text.slice(0, 800)}` };
        return;
      }

      yield { type: "thinking", description: "Deciding next action…" };

      const pageInfo = formatPageForAI(pageData);
      const decisionPrompt = buildDecisionPrompt(pageInfo, task, steps);

      let decisionText = "";
      try {
        const result = await complete({ model: "openai/gpt-4o-mini", prompt: decisionPrompt, userId });
        decisionText = result.content.trim();
      } catch (err) {
        yield { type: "error", message: "AI decision failed: " + (err instanceof Error ? err.message : String(err)) };
        return;
      }

      let decision: Record<string, unknown>;
      try {
        const cleaned = decisionText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        decision = JSON.parse(cleaned);
      } catch {
        yield { type: "error", message: `Could not parse AI decision: ${decisionText.slice(0, 200)}` };
        return;
      }

      if (decision.action === "done") {
        yield { type: "done", result: String(decision.result ?? "Task completed.") };
        return;
      }

      const actionResult = await executeAction(context, page, decision as Parameters<typeof executeAction>[2]);
      page = actionResult.page;

      yield {
        type: "action",
        description: `${actionResult.description}${decision.reason ? ` — ${decision.reason}` : ""}`,
      };
      steps.push(actionResult.description);

      if (!actionResult.ok && actionResult.error) {
        steps.push(`  ⚠ Error: ${actionResult.error}`);
        yield { type: "thinking", description: `Action had an issue — recovering and continuing…` };
      }
    }

    yield { type: "done", result: `Task reached maximum steps. Final page: ${page?.url() ?? "unknown"}` };
  } catch (err: unknown) {
    yield { type: "error", message: err instanceof Error ? err.message : "Browser agent failed" };
  } finally {
    await page?.close().catch(() => undefined);
    await context?.close().catch(() => undefined);
  }
}
