/**
 * Stateful fetch+cheerio browser agent — no Chromium binary required.
 *
 * State is just the current URL + fetched PageData. Actions like navigate,
 * click, type, and form submit are implemented by re-fetching pages.
 */
import * as cheerio from "cheerio";
import { complete } from "../openrouter";
import { fetchPage, submitForm, type PageData } from "./crawler";

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

const MAX_STEPS = 12;

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

function resolveUrl(href: string, base: string): string {
  if (!href) return "";
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  try { return new URL(href, base).href; } catch { return ""; }
}

/**
 * Given a CSS selector hint (e.g. 'a[href*="mail"]', '#signIn', '.btn-primary'),
 * extract matching href/text from raw HTML via cheerio.
 */
function extractLinkFromSelector(html: string, selector: string, baseUrl: string): string | null {
  try {
    const $ = cheerio.load(html);
    // Try the selector directly
    const el = $(selector).first();
    if (el.length) {
      const href = el.attr("href") || el.find("a").first().attr("href");
      if (href) return resolveUrl(href, baseUrl);
    }
    // If selector looks like a text pattern, search link text
    const cleanText = selector.replace(/[[\](){}.*+?^$|\\]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    let found: string | null = null;
    $("a[href]").each((_, el) => {
      if (found) return;
      const txt = $(el).text().replace(/\s+/g, " ").trim().toLowerCase();
      if (txt.includes(cleanText) || cleanText.includes(txt)) {
        const href = resolveUrl($(el).attr("href") ?? "", baseUrl);
        if (href) found = href;
      }
    });
    return found;
  } catch {
    return null;
  }
}

/**
 * Find a form field by label text and return its name attribute.
 */
function findFieldNameByLabel(html: string, label: string): string | null {
  try {
    const $ = cheerio.load(html);
    const labelLower = label.toLowerCase();
    let fieldName: string | null = null;
    $("label").each((_, el) => {
      if (fieldName) return;
      const text = $(el).text().replace(/\s+/g, " ").trim().toLowerCase();
      if (text.includes(labelLower)) {
        const forAttr = $(el).attr("for");
        if (forAttr) {
          const field = $(`[name="${forAttr}"], #${forAttr}`).first();
          fieldName = field.attr("name") || field.attr("id") || null;
        }
      }
    });
    return fieldName;
  } catch {
    return null;
  }
}

function formatPageForAI(page: PageData): string {
  const linksText = page.links
    .slice(0, 20)
    .map((l, i) => `  ${i + 1}. "${l.text}" → ${l.url}`)
    .join("\n");

  const formsText = page.forms
    .map((f, i) =>
      `  Form ${i}: action="${f.action}" method="${f.method}"\n` +
      f.fields
        .map(fld =>
          `    - name="${fld.name}" type="${fld.type}"` +
          (fld.label ? ` label="${fld.label}"` : "") +
          (fld.placeholder ? ` placeholder="${fld.placeholder}"` : "") +
          (fld.value ? ` current_value="${fld.value}"` : "")
        )
        .join("\n")
    )
    .join("\n");

  return `URL: ${page.finalUrl}
Title: ${page.title}

--- PAGE TEXT ---
${page.text.slice(0, 4000)}

--- LINKS (top 20) ---
${linksText || "  (none found)"}

--- FORMS ---
${formsText || "  (none found)"}`;
}

function buildDecisionPrompt(pageInfo: string, task: string, steps: string[]): string {
  return `You are an AI web browsing agent using a fetch-based headless browser (no JavaScript execution). You can navigate pages, follow links, type into forms, and submit them.

${pageInfo}

Previously completed steps:
${steps.length ? steps.map((s, i) => `  ${i + 1}. ${s}`).join("\n") : "  (none yet)"}

USER TASK: ${task}

Decide the NEXT single action. Respond ONLY with valid JSON — no markdown, no explanation:

Navigate to a URL:
{"action":"navigate","url":"<full URL>","reason":"<why>"}

Click a link by partial text match:
{"action":"click_text","text":"<visible link text>","reason":"<why>"}

Click an element by CSS selector (use for form buttons/links):
{"action":"click","selector":"<CSS selector>","reason":"<why>"}

Type into a form field by its name or id attribute:
{"action":"type","selector":"<field name or id>","value":"<text>","reason":"<why>"}

Type into a form field by its label text:
{"action":"type_label","label":"<label text>","value":"<text>","reason":"<why>"}

Submit accumulated form fields (also triggered by key:Enter):
{"action":"submit_form","reason":"<why>"}

Press keyboard key (Enter triggers form submit):
{"action":"key","key":"<Enter|Tab|Escape>","reason":"<why>"}

Wait briefly:
{"action":"wait","ms":1000,"reason":"<why>"}

Task complete — return findings:
{"action":"done","result":"<detailed summary>"}

RULES:
- IMPORTANT: This is a fetch-based browser — JavaScript-heavy single-page apps (Gmail, Google Docs, Twitter) will only show partial content since JS is not executed. Explain this limitation if the page appears empty.
- For Google/Gmail login: navigate to https://accounts.google.com/signin/v2/identifier then type into the email field, submit, then type password.
- Use type_label for form fields when you can see a label in the FORMS section.
- After typing credentials, use submit_form or key:Enter to submit.
- If the page already has the information needed, return done immediately.
- Links shown in LINKS section are navigable — use click_text with the exact link text shown.
- If a page shows an error or is empty, try a different approach or return done with what you found.`;
}

export async function* runBrowserAgent(
  task: string,
  startUrl: string,
  userId: number
): AsyncGenerator<BrowserEvent> {
  const steps: string[] = [];
  // Accumulated form field values across type/type_label actions
  const formFields: Record<string, string> = {};

  let currentPage: PageData | null = null;

  try {
    yield { type: "thinking", description: "Starting browser (fetch mode)…" };

    yield { type: "thinking", description: `Fetching ${startUrl}…` };
    currentPage = await fetchPage(startUrl);

    if (currentPage.error) {
      yield {
        type: "thinking",
        description: `Initial page error: ${currentPage.error} — continuing…`,
      };
    }

    for (let step = 0; step < MAX_STEPS; step++) {
      if (!currentPage) {
        yield { type: "error", message: "Lost page state — aborting." };
        return;
      }

      yield {
        type: "navigate",
        url: currentPage.finalUrl,
        title: currentPage.title,
        description: `Viewing: ${currentPage.title}`,
      };

      yield {
        type: "content",
        url: currentPage.finalUrl,
        description: `Page: ${currentPage.text.length} chars, ${currentPage.links.length} links, ${currentPage.forms.length} forms`,
      };

      if (step === MAX_STEPS - 1) {
        yield {
          type: "done",
          result: `Reached step limit. Last page: "${currentPage.title}" at ${currentPage.finalUrl}.\n\n${currentPage.text.slice(0, 600)}`,
        };
        return;
      }

      yield { type: "thinking", description: "Deciding next action…" };

      const pageInfo = formatPageForAI(currentPage);
      const prompt = buildDecisionPrompt(pageInfo, task, steps);

      let decisionText = "";
      try {
        const result = await complete({ model: "openai/gpt-4o-mini", prompt, userId });
        decisionText = result.content.trim();
      } catch (err) {
        yield { type: "error", message: "AI error: " + (err instanceof Error ? err.message : String(err)) };
        return;
      }

      let decision: Record<string, unknown>;
      try {
        const cleaned = decisionText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        decision = JSON.parse(cleaned);
      } catch {
        yield { type: "error", message: `Could not parse decision: ${decisionText.slice(0, 200)}` };
        return;
      }

      if (decision.action === "done") {
        yield { type: "done", result: String(decision.result ?? "Task completed.") };
        return;
      }

      // ── Execute action ────────────────────────────────────────────────────
      const reason = decision.reason ? ` — ${decision.reason}` : "";
      let actionDesc = "";
      let nextPage: PageData | null = null;

      switch (decision.action) {
        case "navigate": {
          const url = String(decision.url ?? "");
          yield { type: "thinking", description: `Navigating to ${url}…` };
          nextPage = await fetchPage(url);
          actionDesc = `Navigated to ${url}`;
          Object.keys(formFields).forEach(k => delete formFields[k]);
          break;
        }

        case "click_text": {
          const text = String(decision.text ?? "").toLowerCase();
          const match = currentPage.links.find(l =>
            l.text.toLowerCase().includes(text) || text.includes(l.text.toLowerCase())
          );
          if (match) {
            yield { type: "thinking", description: `Following link: "${match.text}"…` };
            nextPage = await fetchPage(match.url);
            actionDesc = `Clicked link: "${match.text}"`;
            Object.keys(formFields).forEach(k => delete formFields[k]);
          } else {
            actionDesc = `Link "${decision.text}" not found on page`;
            yield { type: "thinking", description: `${actionDesc} — trying to find via HTML…` };
            const href = extractLinkFromSelector(currentPage.html, String(decision.text ?? ""), currentPage.finalUrl);
            if (href) {
              nextPage = await fetchPage(href);
              actionDesc = `Followed link for "${decision.text}"`;
              Object.keys(formFields).forEach(k => delete formFields[k]);
            }
          }
          break;
        }

        case "click": {
          const selector = String(decision.selector ?? "");
          const href = extractLinkFromSelector(currentPage.html, selector, currentPage.finalUrl);
          if (href) {
            yield { type: "thinking", description: `Clicking ${selector}…` };
            nextPage = await fetchPage(href);
            actionDesc = `Clicked: ${selector}`;
            Object.keys(formFields).forEach(k => delete formFields[k]);
          } else {
            actionDesc = `Element "${selector}" not navigable — checking if it's a submit button`;
            // May be a submit button — try submitting accumulated form
            if (Object.keys(formFields).length > 0 && currentPage.forms.length > 0) {
              const form = currentPage.forms[0];
              nextPage = await submitForm(form.action, form.method, formFields);
              actionDesc = `Submitted form via ${selector}`;
              Object.keys(formFields).forEach(k => delete formFields[k]);
            }
          }
          break;
        }

        case "type": {
          const sel = String(decision.selector ?? "");
          const value = String(decision.value ?? "");
          formFields[sel] = value;
          actionDesc = `Typed "${value}" into field "${sel}"`;
          break;
        }

        case "type_label": {
          const label = String(decision.label ?? "");
          const value = String(decision.value ?? "");
          const fieldName = findFieldNameByLabel(currentPage.html, label) ?? label;
          formFields[fieldName] = value;
          actionDesc = `Typed "${value}" into field labeled "${label}"`;
          break;
        }

        case "submit_form":
        case "key": {
          const key = String((decision.key as string | undefined) ?? "");
          if (decision.action === "submit_form" || key === "Enter" || key === "Return") {
            if (currentPage.forms.length > 0 && Object.keys(formFields).length > 0) {
              const form = currentPage.forms[0];
              yield { type: "thinking", description: `Submitting form to ${form.action}…` };
              nextPage = await submitForm(form.action, form.method, formFields);
              actionDesc = `Submitted form (${Object.keys(formFields).length} fields)`;
              Object.keys(formFields).forEach(k => delete formFields[k]);
            } else {
              actionDesc = `${key || "Submit"} — no form to submit`;
            }
          } else {
            actionDesc = `Key: ${key}`;
          }
          break;
        }

        case "wait": {
          const ms = Math.min(Number(decision.ms ?? 1000), 3000);
          await sleep(ms);
          actionDesc = `Waited ${ms}ms`;
          break;
        }

        case "scroll": {
          actionDesc = `Scroll ${decision.direction ?? "down"} (no-op in fetch mode)`;
          break;
        }

        default:
          actionDesc = `Unknown action: ${decision.action}`;
      }

      yield {
        type: "action",
        url: nextPage?.finalUrl ?? currentPage.finalUrl,
        description: `${actionDesc}${reason}`,
      };
      steps.push(actionDesc);

      if (nextPage) {
        currentPage = nextPage;
        if (currentPage.error) {
          yield { type: "thinking", description: `Page error: ${currentPage.error} — will inform AI` };
        }
      }
    }

    yield {
      type: "done",
      result: `Task ended. Final page: "${currentPage?.title ?? ""}" at ${currentPage?.finalUrl ?? ""}.\n\n${currentPage?.text?.slice(0, 600) ?? ""}`,
    };
  } catch (err: unknown) {
    yield { type: "error", message: err instanceof Error ? err.message : "Browser agent failed" };
  }
}
