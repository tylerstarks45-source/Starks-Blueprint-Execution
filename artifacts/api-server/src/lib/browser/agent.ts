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

const MAX_STEPS = 20;

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

async function settleNavigation(context: BrowserContext, page: Page): Promise<Page> {
  try {
    await page.waitForLoadState("domcontentloaded", { timeout: 8000 });
  } catch { /* may have finished or page replaced */ }
  // Give JS-heavy SPAs (Gmail, Google, etc.) time to render their forms
  await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
  await sleep(2000);
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
  inputs: Array<{ tag: string; type: string; name: string; id: string; placeholder: string; label: string; selector: string }>;
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

  const inputsText = page.inputs.length > 0
    ? page.inputs.map(inp =>
        `  - selector="${inp.selector}" type="${inp.type}"` +
        (inp.label ? ` label="${inp.label}"` : "") +
        (inp.placeholder ? ` placeholder="${inp.placeholder}"` : "") +
        (inp.id ? ` id="${inp.id}"` : "") +
        (inp.name ? ` name="${inp.name}"` : "")
      ).join("\n")
    : "  (none detected — page may still be loading)";

  return `URL: ${page.finalUrl}
Title: ${page.title}

--- PAGE TEXT (first 5000 chars) ---
${page.text.slice(0, 5000)}

--- LINKS ON PAGE (top 20) ---
${linksText || "  (none found)"}

--- FORMS ON PAGE ---
${formsText || "  (none found)"}

--- ALL VISIBLE INPUTS (including outside <form> tags — use these selectors to type) ---
${inputsText}`;
}

function buildDecisionPrompt(pageInfo: string, task: string, steps: string[]): string {
  return `You are a web browsing AI agent with a REAL Chromium browser running. You can execute JavaScript, click any element, type text, scroll, and interact with any website including Gmail, Google, and other JS-heavy sites.

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

Type into a field (clears first) — use selector from "ALL VISIBLE INPUTS" above:
{"action":"type","selector":"<CSS selector or input name>","value":"<text>","reason":"<why>"}

Type into field by label text:
{"action":"type_label","label":"<label text>","value":"<text>","reason":"<why>"}

Press a keyboard key:
{"action":"key","key":"<Enter|Tab|Escape>","reason":"<why>"}

Wait for an element to appear (use when page is still loading):
{"action":"wait_for_selector","selector":"<CSS selector>","timeout":5000,"reason":"<why>"}

Scroll the page:
{"action":"scroll","direction":"down","pixels":500,"reason":"<why>"}

Wait for something to load:
{"action":"wait","ms":2000,"reason":"<why>"}

Task is FULLY complete (only use when goal is 100% achieved — NOT just navigated):
{"action":"done","result":"<detailed summary of what was accomplished>"}

CRITICAL RULES:
- NEVER use "done" just because you navigated to a page — only use "done" when the FULL task goal is achieved (e.g., actually logged in, form submitted, data found)
- For Google/Gmail login: email field selector is input[type="email"] or #identifierId; after typing email press Enter or click "Next"; then password field is input[type="password"] or #password; press Enter or click "Sign in"
- If "ALL VISIBLE INPUTS" shows 0 inputs but the page title suggests a form exists, use wait_for_selector to wait for the input before typing
- After typing credentials, always press Enter or click the Next/Sign In button — do not stop at just entering the email
- Be specific with selectors — prefer id (#identifierId), name, or type attributes
- If an action fails, try an alternative selector or approach — do not give up`;
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
    timeout?: number;
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

      case "wait_for_selector": {
        const sel = decision.selector!;
        const timeout = decision.timeout ?? 8000;
        try {
          await page.waitForSelector(sel, { timeout, state: "visible" });
          return { ok: true, description: `Element ready: ${sel}`, page };
        } catch (err) {
          return { ok: false, description: `Timed out waiting for ${sel}`, error: err instanceof Error ? err.message : String(err), page };
        }
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

      // If the page looks sparse (SPA still rendering), wait and re-read once
      if (pageData.text.length < 400 && pageData.inputs.length === 0 && pageData.forms.length === 0) {
        yield { type: "thinking", description: "Page still loading — waiting for JS to render…" };
        await sleep(3000);
        try {
          await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
          pageData = await getPageData(page, page.url());
        } catch { /* best effort */ }
      }

      yield { type: "navigate", url: pageData.finalUrl, title: pageData.title, description: `Viewing: ${pageData.title}` };

      if (pageData.screenshot) {
        yield { type: "snapshot", url: pageData.finalUrl, title: pageData.title, screenshot: pageData.screenshot };
      }

      yield {
        type: "content",
        url: pageData.finalUrl,
        description: `Page loaded — ${pageData.text.length} chars, ${pageData.links.length} links, ${pageData.forms.length} forms, ${pageData.inputs.length} inputs`,
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
        // Use gpt-4o with the screenshot so the AI can see what's actually on screen
        const result = await complete({
          model: "openai/gpt-4o",
          prompt: decisionPrompt,
          userId,
          imageBase64: pageData.screenshot,
        });
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
