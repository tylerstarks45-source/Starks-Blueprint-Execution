/**
 * fetch + cheerio page crawler — no Chromium binary required.
 * Works in any environment including Replit sandbox.
 */
import * as cheerio from "cheerio";

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
  error?: string;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function resolveUrl(href: string, base: string): string {
  if (!href) return "";
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  try { return new URL(href, base).href; } catch { return ""; }
}

export async function fetchPage(url: string): Promise<PageData> {
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });

    const finalUrl = resp.url || url;
    const html = await resp.text();
    const $ = cheerio.load(html);

    $("script, style, noscript, head").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 8000);
    const title = $("head title, title").first().text().trim() || finalUrl;

    const links: PageData["links"] = [];
    $("a[href]").each((_, el) => {
      if (links.length >= 30) return;
      const href = resolveUrl($(el).attr("href") ?? "", finalUrl);
      const linkText = $(el).text().replace(/\s+/g, " ").trim().slice(0, 120);
      if (href && linkText && !href.startsWith("javascript:")) {
        links.push({ text: linkText, url: href });
      }
    });

    const forms: PageData["forms"] = [];
    $("form").each((_, formEl) => {
      const rawAction = $(formEl).attr("action") || finalUrl;
      const action = resolveUrl(rawAction, finalUrl) || finalUrl;
      const method = ($(formEl).attr("method") || "GET").toUpperCase();
      const fields: PageData["forms"][0]["fields"] = [];
      $(formEl).find("input, textarea, select").each((_, fieldEl) => {
        const name = $(fieldEl).attr("name") || $(fieldEl).attr("id") || "";
        if (!name) return;
        const fieldId = $(fieldEl).attr("id") || "";
        const labelText = fieldId ? $(`label[for="${fieldId}"]`).first().text().trim() : "";
        fields.push({
          name,
          type: ($(fieldEl).attr("type") || "text").toLowerCase(),
          placeholder: $(fieldEl).attr("placeholder") || undefined,
          value: $(fieldEl).attr("value") || undefined,
          label: labelText || undefined,
        });
      });
      forms.push({ action, method, fields });
    });

    return {
      url,
      finalUrl,
      title,
      text,
      html: html.slice(0, 20_000),
      links,
      forms,
      statusCode: resp.status,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      url, finalUrl: url, title: "Error", text: "", html: "",
      links: [], forms: [], statusCode: 0, error: message,
    };
  }
}

export async function submitForm(
  formAction: string,
  method: string,
  fields: Record<string, string>
): Promise<PageData> {
  try {
    let resp: Response;
    if (method.toUpperCase() === "POST") {
      resp = await fetch(formAction, {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(fields).toString(),
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
      });
    } else {
      const target = new URL(formAction);
      for (const [k, v] of Object.entries(fields)) target.searchParams.set(k, v);
      resp = await fetch(target.toString(), {
        headers: { "User-Agent": USER_AGENT },
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
      });
    }
    return fetchPage(resp.url || formAction);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      url: formAction, finalUrl: formAction, title: "Error", text: "", html: "",
      links: [], forms: [], statusCode: 0, error: message,
    };
  }
}
