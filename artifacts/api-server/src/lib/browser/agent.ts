import { complete } from "../openrouter";
import { fetchPage, submitForm, type PageData } from "./crawler";

export type BrowserEventType =
  | "navigate"
  | "thinking"
  | "action"
  | "content"
  | "done"
  | "error";

export interface BrowserEvent {
  type: BrowserEventType;
  url?: string;
  title?: string;
  description?: string;
  result?: string;
  message?: string;
}

const MAX_STEPS = 8;

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

  for (let step = 0; step < MAX_STEPS; step++) {
    yield { type: "thinking", description: step === 0 ? `Loading ${currentUrl}…` : `Analyzing page and deciding next action…` };

    const page = await fetchPage(currentUrl);

    if (page.error) {
      yield { type: "error", message: `Failed to load ${currentUrl}: ${page.error}` };
      return;
    }

    yield {
      type: "navigate",
      url: page.finalUrl,
      title: page.title,
      description: `Viewing: ${page.title}`,
    };

    yield {
      type: "content",
      url: page.finalUrl,
      description: `Page loaded — ${page.text.length} chars of content, ${page.links.length} links, ${page.forms.length} forms`,
    };

    if (step === MAX_STEPS - 1) {
      yield { type: "done", result: `Reached maximum steps. Last page viewed: ${page.title} at ${page.finalUrl}. Content: ${page.text.slice(0, 500)}` };
      return;
    }

    const pageInfo = formatPageForAI(page);
    const decisionPrompt = buildDecisionPrompt(pageInfo, task, steps);

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
      const step_desc = `Navigated to: ${targetUrl}`;
      steps.push(step_desc);
      yield { type: "action", description: `Navigating → ${targetUrl}${decision.reason ? ` (${decision.reason})` : ""}` };
      currentUrl = targetUrl;
      continue;
    }

    if (decision.action === "fill_form") {
      const formAction = decision.formAction ?? currentUrl;
      const method = decision.method ?? "POST";
      const fields = decision.fields ?? {};
      yield { type: "action", description: `Filling form at ${formAction}: ${Object.entries(fields).map(([k, v]) => `${k}="${v}"`).join(", ")}` };
      steps.push(`Submitted form to ${formAction}`);
      const result = await submitForm(formAction, method, fields);
      if (result.error) {
        yield { type: "error", message: `Form submission failed: ${result.error}` };
        return;
      }
      currentUrl = result.finalUrl;
      continue;
    }

    yield { type: "done", result: `Browser task complete. Visited: ${currentUrl}` };
    return;
  }
}
