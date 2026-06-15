import { chromium, type Browser, type Page, type BrowserContext } from "playwright";

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
  statusCode: number;
  screenshot?: string;
  error?: string;
}

let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) return _browser;
  _browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
    ],
  });
  _browser.on("disconnected", () => { _browser = null; });
  return _browser;
}

export async function createBrowserContext(): Promise<BrowserContext> {
  const browser = await getBrowser();
  return browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    locale: "en-US",
  });
}

function isPageClosedError(err: unknown): boolean {
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

  try { finalUrl = page.url(); } catch { /* page may be navigating */ }

  try { title = await page.title(); } catch { title = "(loading)"; }

  try {
    screenshot = await page
      .screenshot({ type: "jpeg", quality: 60 })
      .then(buf => buf.toString("base64"))
      .catch(() => undefined);
  } catch { /* ignore screenshot failures */ }

  type EvalResult = {
    text: string;
    html: string;
    links: Array<{ text: string; url: string }>;
    forms: Array<{ action: string; method: string; fields: Array<{ name: string; type: string; placeholder?: string; value?: string; label?: string }> }>;
  };

  let text = "";
  let html = "";
  let links: EvalResult["links"] = [];
  let forms: EvalResult["forms"] = [];

  try {
    const result = await page.evaluate<EvalResult>(
      new Function(`
        var d = document;
        var w = window;
        var bodyText = (d.body ? d.body.innerText : "").replace(/\\s+/g, " ").trim();
        var rawHtml = (d.documentElement ? d.documentElement.outerHTML : "").slice(0, 20000);
        var rawLinks = [];
        d.querySelectorAll("a[href]").forEach(function(el) {
          var href = el.href || "";
          var txt = (el.innerText || "").trim().slice(0, 120);
          if (href && txt && !href.startsWith("javascript:") && rawLinks.length < 30) {
            rawLinks.push({ text: txt, url: href });
          }
        });
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
          rawForms.push({
            action: form.action || w.location.href,
            method: (form.method || "GET").toUpperCase(),
            fields: fields
          });
        });
        return { text: bodyText.slice(0, 8000), html: rawHtml, links: rawLinks, forms: rawForms };
      `) as () => EvalResult
    );
    text = result.text;
    html = result.html;
    links = result.links;
    forms = result.forms;
  } catch (err) {
    if (!isPageClosedError(err)) {
      text = "(page content unavailable)";
    }
  }

  return {
    url: originalUrl,
    finalUrl,
    title,
    text,
    html,
    links,
    forms,
    statusCode: 200,
    screenshot,
  };
}

export async function fetchPage(url: string): Promise<PageData> {
  let context: BrowserContext | null = null;
  try {
    context = await createBrowserContext();
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(1500);
    return await getPageData(page, url);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      url, finalUrl: url, title: "Error", text: "", html: "",
      links: [], forms: [], statusCode: 0, error: message,
    };
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

    for (const [name, value] of Object.entries(fields)) {
      const selector = `[name="${name}"], [id="${name}"]`;
      const el = page.locator(selector).first();
      if (await el.count() > 0) {
        await el.fill(value);
      }
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
    return {
      url: formAction, finalUrl: formAction, title: "Error", text: "", html: "",
      links: [], forms: [], statusCode: 0, error: message,
    };
  } finally {
    await context?.close().catch(() => undefined);
  }
}
