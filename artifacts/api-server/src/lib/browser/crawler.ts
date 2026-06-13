import { load } from "cheerio";

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
    fields: Array<{ name: string; type: string; placeholder?: string; value?: string }>;
  }>;
  statusCode: number;
  error?: string;
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function fetchPage(url: string, options?: {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
  timeout?: number;
}): Promise<PageData> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options?.timeout ?? 12000);

  let finalUrl = url;
  let statusCode = 0;
  let html = "";

  try {
    const resp = await fetch(url, {
      method: options?.method ?? "GET",
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        ...(options?.headers ?? {}),
      },
      body: options?.body,
      redirect: "follow",
      signal: controller.signal,
    });

    finalUrl = resp.url || url;
    statusCode = resp.status;
    html = await resp.text();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return {
      url, finalUrl: url, title: "Error", text: "", html: "",
      links: [], forms: [], statusCode: 0, error: message,
    };
  } finally {
    clearTimeout(timer);
  }

  const $ = load(html);

  const title = $("title").first().text().trim() || finalUrl;

  $("script, style, noscript, svg, [aria-hidden='true']").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 6000);

  const links: PageData["links"] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const linkText = $(el).text().trim().slice(0, 120);
    if (!href || href.startsWith("#") || href.startsWith("javascript:") || !linkText) return;
    try {
      const abs = new URL(href, finalUrl).toString();
      if (links.length < 25) links.push({ text: linkText, url: abs });
    } catch { /* skip malformed */ }
  });

  const forms: PageData["forms"] = [];
  $("form").each((_, formEl) => {
    const action = $(formEl).attr("action") ?? "";
    const method = ($(formEl).attr("method") ?? "GET").toUpperCase();
    const fields: PageData["forms"][0]["fields"] = [];
    $(formEl).find("input, textarea, select").each((_, f) => {
      const name = $(f).attr("name") ?? $(f).attr("id") ?? "";
      if (!name) return;
      fields.push({
        name,
        type: $(f).attr("type") ?? "text",
        placeholder: $(f).attr("placeholder"),
        value: $(f).attr("value"),
      });
    });
    try {
      forms.push({ action: action ? new URL(action, finalUrl).toString() : finalUrl, method, fields });
    } catch { /* skip */ }
  });

  return {
    url,
    finalUrl,
    title,
    text,
    html: html.slice(0, 15000),
    links,
    forms,
    statusCode,
  };
}

export async function submitForm(
  formAction: string,
  method: string,
  fields: Record<string, string>
): Promise<PageData> {
  if (method.toUpperCase() === "GET") {
    const params = new URLSearchParams(fields);
    return fetchPage(`${formAction}?${params}`);
  }
  return fetchPage(formAction, {
    method: "POST",
    body: new URLSearchParams(fields).toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}
