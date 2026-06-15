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
}

const MAX_STEPS = 8;
const STEP_DELAY_MS = 2000;

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

// Domains / patterns that require authentication, JavaScript, or actively block bots
const AUTH_WALL_PATTERNS = [
  /accounts\.google\.com/,
  /mail\.google\.com/,
  /google\.com\/accounts/,
  /login\.microsoftonline\.com/,
  /outlook\.live\.com/,
  /outlook\.office\.com/,
  /login\.live\.com/,
  /facebook\.com\/login/,
  /instagram\.com\/accounts\//,
  /twitter\.com\/i\/flow/,
  /x\.com\/i\/flow/,
  /linkedin\.com\/login/,
  /linkedin\.com\/checkpoint/,
  /apple\.com\/sign-in/,
  /appleid\.apple\.com/,
  /github\.com\/login/,
  /github\.com\/session/,
];

// Pages that are pure SPAs — they return empty/minimal HTML without JavaScript
const SPA_SIGNALS = [
  "<noscript>",
  "enable javascript",
  "you need to enable javascript",
  "requires javascript",
  "javascript is disabled",
  "please enable javascript",
  "your browser does not support javascript",
];

function detectAuthWall(url: string): string | null {
  for (const pattern of AUTH_WALL_PATTERNS) {
    if (pattern.test(url)) {
      return `This page requires you to be logged in to an account. The ASH browser agent can only access **public web pages** — it cannot log into Gmail, Google, Microsoft, Facebook, or any other service that requires authentication. It has no way to enter your account credentials.

**What ASH can do instead:**
- Search for publicly available information on any topic
- Read and summarize public websites, pricing pages, or documentation
- Help you understand how to set up Gmail automation using tools like Zapier or Make — which can access your Gmail with proper OAuth permissions

Would you like help setting up an automation that connects to Gmail through a proper integration?`;
    }
  }
  return null;
}

function detectSPAPage(html: string, text: string): boolean {
  const htmlLower = html.toLowerCase();
  const textLower = text.toLowerCase();
  for (const signal of SPA_SIGNALS) {
    if (htmlLower.includes(signal) || textLower.includes(signal)) return true;
  }
  // Very short text on a page with a large HTML payload = likely SPA
  if (html.length > 5000 && text.length < 200) return true;
  return false;
}

function httpErrorMessage(statusCode: number, url: string): string {
  if (statusCode === 400) {
    return `The server at ${url} rejected the request with a **400 Bad Request** error. This typically means the site detected that the request did not come from a real browser (Google and other major services actively block automated HTTP access). The ASH browser agent cannot bypass this — it uses standard HTTP requests, not a full browser with JavaScript.`;
  }
  if (statusCode === 401 || statusCode === 403) {
    return `Access to ${url} was denied (HTTP ${statusCode}). This page requires authentication or the site is blocking automated access. The ASH browser agent can only read public pages without authentication.`;
  }
  if (statusCode === 404) {
    return `The page at ${url} was not found (HTTP 404). The URL may be incorrect or the page may have moved.`;
  }
  if (statusCode >= 500) {
    return `The server at ${url} returned an error (HTTP ${statusCode}). The site may be temporarily unavailable.`;
  }
  return `The server at ${url} returned HTTP ${statusCode}.`;
}

function formatPageForAI(page: PageData): string {
  const linksText = page.links
    .slice(0, 15)
    .map((l, i) => `  ${i + 1}. "${l.text}" → ${l.url}`)
    .join("\n");

  const formsText = page.forms
    .map((f, i) =>
      `  Form ${i}: action="${f.action}" method="${f.method}"\n` +
      f.fields.map(fld => `    - field name="${fld.name}" type="${fld.type}"${fld.placeholder ? ` placeholder="${fld.placeholder}"` : ""}`).join("\n")
    )
    .join("\n");

  return `URL: ${page.finalUrl}
Title: ${page.title}
Status: ${page.statusCode}

--- PAGE TEXT (first 4000 chars) ---
${page.text.slice(0, 4000)}

--- LINKS ON PAGE (top 15) ---
${linksText || "  (none found)"}

--- FORMS ON PAGE ---
${formsText || "  (none found)"}`;
}

function buildDecisionPrompt(pageInfo: string, task: string, steps: string[]): string {
  return `You are a web browsing AI agent completing a task for a user.

${pageInfo}

Previously completed steps:
${steps.length ? steps.map((s, i) => `  ${i + 1}. ${s}`).join("\n") : "  (none yet — just started)"}

USER TASK: ${task}

Decide what to do next. Respond ONLY with a valid JSON object — no explanation, no markdown, no code fences:

Options:
{"action":"navigate","url":"<full URL to visit>","reason":"<why>"}
{"action":"click_link","url":"<exact URL from the links list above>","reason":"<why>"}
{"action":"fill_form","formAction":"<form action URL>","method":"POST","fields":{"fieldname":"value"},"reason":"<why>"}
{"action":"done","result":"<detailed summary of what you found or accomplished for the user>"}

Rules:
- ONLY navigate to URLs that appear in the page links, or that logically follow the task
- For done, write a complete, useful result the user can act on
- If the page has useful information that answers the task → return done immediately
- If an error occurred or you cannot proceed → return done with explanation
- Use fill_form only when a search box, login form, or contact form is needed`;
}

export async function* runBrowserAgent(
  task: string,
  startUrl: string,
  userId: number
): AsyncGenerator<BrowserEvent> {
  const steps: string[] = [];
  let currentUrl = startUrl;

  // Pre-flight: check if the starting URL is an auth wall
  const authWallMsg = detectAuthWall(startUrl);
  if (authWallMsg) {
    yield { type: "done", result: authWallMsg };
    return;
  }

  for (let step = 0; step < MAX_STEPS; step++) {
    yield {
      type: "thinking",
      description: step === 0
        ? `Navigating to ${currentUrl}…`
        : `Analyzing page and deciding next action…`,
    };

    const page = await fetchPage(currentUrl);

    if (page.error) {
      yield { type: "done", result: `Could not load ${currentUrl}: ${page.error}. The site may be blocking automated access or temporarily unavailable.` };
      return;
    }

    // Check if we were redirected to an auth wall
    const redirectAuthWall = detectAuthWall(page.finalUrl);
    if (redirectAuthWall) {
      yield {
        type: "navigate",
        url: page.finalUrl,
        title: page.title,
        description: `Redirected to: ${page.title}`,
      };
      yield { type: "done", result: redirectAuthWall };
      return;
    }

    // Handle non-2xx status codes immediately rather than passing to AI
    if (page.statusCode >= 400) {
      yield {
        type: "navigate",
        url: page.finalUrl,
        title: page.title,
        description: `Received HTTP ${page.statusCode}`,
      };
      yield { type: "done", result: httpErrorMessage(page.statusCode, page.finalUrl) };
      return;
    }

    // Detect JavaScript-only SPAs with no meaningful content
    if (detectSPAPage(page.html, page.text)) {
      yield {
        type: "navigate",
        url: page.finalUrl,
        title: page.title || page.finalUrl,
        description: `Page requires JavaScript to load`,
      };
      yield {
        type: "done",
        result: `This page (${page.finalUrl}) requires JavaScript to render its content. The ASH browser agent uses plain HTTP requests and cannot execute JavaScript. Sites like Gmail, Twitter, Facebook, and other modern web apps need a full browser with JavaScript support.\n\nIf you need to automate actions on this site, I can help you set up an automation using tools like Zapier, Make, or n8n that have proper integrations with built-in authentication.`,
      };
      return;
    }

    yield {
      type: "navigate",
      url: page.finalUrl,
      title: page.title,
      description: `Viewing: ${page.title}`,
    };

    if (page.html) {
      yield {
        type: "snapshot",
        url: page.finalUrl,
        title: page.title,
        html: page.html,
      };
    }

    yield {
      type: "content",
      url: page.finalUrl,
      description: `Page loaded — ${page.text.length} chars, ${page.links.length} links, ${page.forms.length} forms`,
    };

    await sleep(STEP_DELAY_MS);

    if (step === MAX_STEPS - 1) {
      yield {
        type: "done",
        result: `Reached maximum navigation steps. Last page: "${page.title}" at ${page.finalUrl}.\n\n${page.text.slice(0, 600)}`,
      };
      return;
    }

    const pageInfo = formatPageForAI(page);
    const decisionPrompt = buildDecisionPrompt(pageInfo, task, steps);

    yield { type: "thinking", description: "Deciding next action…" };

    let decisionText = "";
    try {
      const result = await complete({
        model: "openai/gpt-4o-mini",
        prompt: decisionPrompt,
        userId,
      });
      decisionText = result.content.trim();
    } catch (err: unknown) {
      yield { type: "error", message: "AI decision failed: " + (err instanceof Error ? err.message : String(err)) };
      return;
    }

    let decision: {
      action: string;
      url?: string;
      formAction?: string;
      method?: string;
      fields?: Record<string, string>;
      reason?: string;
      result?: string;
    };

    try {
      const cleaned = decisionText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      decision = JSON.parse(cleaned);
    } catch {
      yield { type: "error", message: `Could not parse AI decision: ${decisionText.slice(0, 200)}` };
      return;
    }

    if (decision.action === "done") {
      yield { type: "done", result: decision.result ?? "Task completed." };
      return;
    }

    if (decision.action === "navigate" || decision.action === "click_link") {
      const targetUrl = decision.url ?? "";
      if (!targetUrl) {
        yield { type: "done", result: "No URL to navigate to — task may be complete." };
        return;
      }
      // Check auth wall before navigating
      const nextAuthWall = detectAuthWall(targetUrl);
      if (nextAuthWall) {
        yield { type: "done", result: nextAuthWall };
        return;
      }
      steps.push(`Navigated to: ${targetUrl}`);
      yield { type: "action", description: `Going to → ${targetUrl}${decision.reason ? ` (${decision.reason})` : ""}` };
      currentUrl = targetUrl;
      continue;
    }

    if (decision.action === "fill_form") {
      const formAction = decision.formAction ?? currentUrl;
      const method = decision.method ?? "POST";
      const fields = decision.fields ?? {};
      yield { type: "action", description: `Filling form: ${Object.entries(fields).map(([k, v]) => `${k}="${v}"`).join(", ")}` };
      steps.push(`Submitted form to ${formAction}`);

      await sleep(1000);
      const result = await submitForm(formAction, method, fields);
      if (result.error) {
        yield { type: "done", result: `Form submission failed: ${result.error}. The site may require JavaScript or authentication to process form submissions.` };
        return;
      }
      currentUrl = result.finalUrl;
      continue;
    }

    yield { type: "done", result: `Browser task complete. Last visited: ${currentUrl}` };
    return;
  }
}
