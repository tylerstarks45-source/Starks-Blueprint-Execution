/**
 * Playwright-based browser crawler.
 * Uses system Chromium via PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH env var —
 * no separate `npx playwright install` download needed.
 */
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export interface InputField {
  tag: string;
  type: string;
  name: string;
  id: string;
  placeholder: string;
  label: string;
  selector: string;
  value?: string;
}

export interface PageData {
  url: string;
  finalUrl: string;
  title: string;
  text: string;
  html: string;
  links: Array<{ text: string; url: string }>;
  forms: Array<{
    action: string;
    method: string;
    fields: Array<{ name: string; type: string; placeholder?: string; value?: string; label?: string }>;
  }>;
  inputs: InputField[];
  statusCode: number;
  screenshot?: string;
  error?: string;
}

let _browser: Browser | null = null;

function getExecutablePath(): string | undefined {
  return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;
}

async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) return _browser;
  _browser = await chromium.launch({
    executablePath: getExecutablePath(),
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--no-first-run",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-software-rasterizer",
      "--remote-debugging-port=0",
      // Stealth: suppress the automation info-bar and webdriver flag
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--excludeSwitches=enable-automation",
      "--window-size=1280,800",
    ],
  });
  _browser.on("disconnected", () => { _browser = null; });
  return _browser;
}

// Script injected into every page to erase obvious bot fingerprints
const STEALTH_INIT_SCRIPT = `
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  window.chrome = { runtime: {} };
  const origQuery = window.navigator.permissions.query;
  window.navigator.permissions.query = (p) =>
    p.name === 'notifications'
      ? Promise.resolve({ state: Notification.permission })
      : origQuery(p);
`;

export async function createBrowserContext(): Promise<BrowserContext> {
  const browser = await getBrowser();
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    locale: "en-US",
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  // Remove navigator.webdriver on every new page before any scripts run
  await ctx.addInitScript(STEALTH_INIT_SCRIPT);
  return ctx;
}

export function isPageClosedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Target page, context or browser has been closed") ||
    msg.includes("Target closed") ||
    msg.includes("has been closed") ||
    msg.includes("Session closed")
  );
}

export async function getPageData(page: Page, originalUrl: string): Promise<PageData> {
  let finalUrl = originalUrl;
  let title = "";
  let screenshot: string | undefined;

  try { finalUrl = page.url(); } catch { /* navigating */ }
  try { title = await page.title(); } catch { title = "(loading)"; }

  try {
    screenshot = await page
      .screenshot({ type: "jpeg", quality: 55 })
      .then(buf => buf.toString("base64"))
      .catch(() => undefined);
  } catch { /* ignore */ }

  type EvalResult = {
    text: string;
    html: string;
    links: Array<{ text: string; url: string }>;
    forms: Array<{ action: string; method: string; fields: Array<{ name: string; type: string; placeholder?: string; value?: string; label?: string }> }>;
    inputs: InputField[];
  };

  let text = "", html = "";
  let links: EvalResult["links"] = [];
  let forms: EvalResult["forms"] = [];
  let inputs: InputField[] = [];

  try {
    const result = await page.evaluate<EvalResult>(
      new Function(`
        var d = document;
        var bodyText = (d.body ? d.body.innerText : "").replace(/\\s+/g, " ").trim();
        var rawHtml = (d.documentElement ? d.documentElement.outerHTML : "").slice(0, 20000);

        // Links
        var rawLinks = [];
        d.querySelectorAll("a[href]").forEach(function(el) {
          var href = el.href || "";
          var txt = (el.innerText || "").trim().slice(0, 120);
          if (href && txt && !href.startsWith("javascript:") && rawLinks.length < 30) {
            rawLinks.push({ text: txt, url: href });
          }
        });

        // Forms (traditional <form> elements)
        var rawForms = [];
        d.querySelectorAll("form").forEach(function(form) {
          var fields = [];
          form.querySelectorAll("input, textarea, select").forEach(function(el) {
            var name = el.name || el.id || "";
            if (!name) return;
            var labelEl = d.querySelector('label[for="' + el.id + '"]');
            fields.push({
              name: name,
              type: el.type || "text",
              placeholder: el.placeholder || undefined,
              value: el.value || undefined,
              label: labelEl ? labelEl.textContent.trim() : undefined
            });
          });
          rawForms.push({ action: form.action || window.location.href, method: (form.method || "GET").toUpperCase(), fields: fields });
        });

        // ALL visible inputs (including those NOT inside <form> elements — e.g. Gmail, Google Sign-In)
        var rawInputs = [];
        var seenIds = {};
        d.querySelectorAll("input, textarea, select").forEach(function(el) {
          if (el.type === "hidden" || el.type === "submit" || el.type === "button" || el.type === "image" || el.type === "reset") return;
          var rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
          if (rect && rect.width === 0 && rect.height === 0) return;
          var uid = el.id || el.name || (el.type + "_" + rawInputs.length);
          if (seenIds[uid]) return;
          seenIds[uid] = true;
          var labelText = "";
          if (el.id) {
            var lbl = d.querySelector('label[for="' + el.id + '"]');
            if (lbl) labelText = lbl.textContent.trim();
          }
          if (!labelText && el.getAttribute && el.getAttribute("aria-label")) labelText = el.getAttribute("aria-label");
          if (!labelText && el.getAttribute && el.getAttribute("aria-labelledby")) {
            var lblEl = d.getElementById(el.getAttribute("aria-labelledby"));
            if (lblEl) labelText = lblEl.textContent.trim();
          }
          var selector = el.id ? "#" + el.id : (el.name ? '[name="' + el.name + '"]' : el.tagName.toLowerCase() + '[type="' + el.type + '"]');
          rawInputs.push({
            tag: el.tagName.toLowerCase(),
            type: el.type || "text",
            name: el.name || "",
            id: el.id || "",
            placeholder: el.placeholder || el.getAttribute("placeholder") || "",
            label: labelText,
            selector: selector,
            value: el.type !== "password" ? (el.value || "") : "",
          });
        });

        return { text: bodyText.slice(0, 8000), html: rawHtml, links: rawLinks, forms: rawForms, inputs: rawInputs };
      `) as () => EvalResult
    );
    text = result.text;
    html = result.html;
    links = result.links;
    forms = result.forms;
    inputs = result.inputs ?? [];
  } catch (err) {
    if (!isPageClosedError(err)) text = "(page content unavailable)";
  }

  return { url: originalUrl, finalUrl, title, text, html, links, forms, inputs, statusCode: 200, screenshot };
}

export async function fetchPage(url: string): Promise<PageData> {
  let context: BrowserContext | null = null;
  try {
    context = await createBrowserContext();
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    // Give JS-heavy SPAs time to render (Gmail, Google, etc.)
    await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(1500);
    return await getPageData(page, url);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { url, finalUrl: url, title: "Error", text: "", html: "", links: [], forms: [], inputs: [], statusCode: 0, error: message };
  } finally {
    await context?.close().catch(() => undefined);
  }
}

export async function submitForm(
  formAction: string,
  method: string,
  fields: Record<string, string>
): Promise<PageData> {
  let context: BrowserContext | null = null;
  try {
    context = await createBrowserContext();
    const page = await context.newPage();
    await page.goto(formAction, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});

    for (const [name, value] of Object.entries(fields)) {
      const selector = `[name="${name}"], [id="${name}"]`;
      const el = page.locator(selector).first();
      if (await el.count() > 0) await el.fill(value);
    }

    const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
    } else {
      await page.keyboard.press("Enter");
    }

    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    await page.waitForTimeout(1500);
    return await getPageData(page, formAction);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { url: formAction, finalUrl: formAction, title: "Error", text: "", html: "", links: [], forms: [], inputs: [], statusCode: 0, error: message };
  } finally {
    await context?.close().catch(() => undefined);
  }
}
