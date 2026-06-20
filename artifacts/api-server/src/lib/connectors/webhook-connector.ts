import { BaseConnector, TestResult, ExecResult } from "./base";

// Private / internal network ranges and hostnames that must never be fetched
// from a server-side request (SSRF protection).
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "0.0.0.0",
  "metadata.google.internal",         // GCP metadata
  "169.254.169.254",                   // AWS/Azure/GCP IMDS
  "fd00::ec2",                         // AWS IPv6 IMDS
]);

function isBlockedUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return true; // Unparseable = blocked
  }

  // Only allow http and https
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return true;

  // Strongly prefer HTTPS (we block plain http in isBlockedUrl only for
  // internal/private ranges, not for all http — some webhooks are HTTP-only).
  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) return true;

  // Block numeric IPv4 loopback / private / link-local ranges
  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [, a, b] = ipv4.map(Number);
    if (
      a === 127 ||                                   // 127.x.x.x loopback
      a === 0 ||                                     // 0.x.x.x
      a === 10 ||                                    // 10.x.x.x private
      (a === 172 && b >= 16 && b <= 31) ||           // 172.16–31.x.x private
      (a === 192 && b === 168) ||                    // 192.168.x.x private
      (a === 169 && b === 254)                       // 169.254.x.x link-local / IMDS
    ) {
      return true;
    }
  }

  // Block IPv6 loopback and private ranges
  if (
    hostname === "::1" ||
    hostname.startsWith("fe80:") ||         // IPv6 link-local
    hostname.startsWith("fc") ||            // IPv6 unique local
    hostname.startsWith("fd")               // IPv6 unique local
  ) {
    return true;
  }

  return false;
}

export class WebhookConnector extends BaseConnector {
  readonly id = "webhook";
  readonly displayName = "Custom Webhook";
  readonly category = "automation";
  readonly authType = "webhook" as const;
  readonly requiredCredentials = ["WEBHOOK_URL"];
  readonly actions = ["trigger", "triggerWithPayload", "triggerGet"];

  private validateUrl(url: string): string | null {
    if (!url) return "WEBHOOK_URL not configured";
    if (isBlockedUrl(url)) {
      return "WEBHOOK_URL targets a private, loopback, or reserved address — only external URLs are allowed";
    }
    return null;
  }

  async testConnection(): Promise<TestResult> {
    const url = this.creds["WEBHOOK_URL"];
    const err = this.validateUrl(url);
    if (err) return { ok: false, latencyMs: 0, message: err };

    const start = Date.now();
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-SBEP-Source": "sbep-connector-test" },
        body: JSON.stringify({
          source: "SBEP",
          type: "connection_test",
          timestamp: new Date().toISOString(),
        }),
      });
      const latencyMs = Date.now() - start;
      if (res.ok || res.status === 201 || res.status === 204) {
        return { ok: true, latencyMs, message: `Webhook connected — endpoint responded with ${res.status}` };
      }
      return { ok: false, latencyMs, message: `Webhook endpoint returned ${res.status}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    const url = this.creds["WEBHOOK_URL"];
    const urlErr = this.validateUrl(url);
    if (urlErr) return { ok: false, error: urlErr };

    if (action === "trigger" || action === "triggerWithPayload") {
      const method = (params["method"] as string | undefined)?.toUpperCase() ?? "POST";
      const customHeaders = (params["headers"] as Record<string, string> | undefined) ?? {};
      const secretKey = this.creds["WEBHOOK_SECRET"] ?? "";

      const payload: Record<string, unknown> = {
        source: "SBEP",
        timestamp: new Date().toISOString(),
        ...params,
      };
      delete payload["method"];
      delete payload["headers"];

      const requestHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "X-SBEP-Source": "sbep-connector",
        "X-SBEP-Timestamp": new Date().toISOString(),
        ...customHeaders,
      };
      if (secretKey) requestHeaders["X-Webhook-Secret"] = secretKey;

      try {
        const fetchOptions: RequestInit = {
          method,
          headers: requestHeaders,
        };
        if (method !== "GET" && method !== "HEAD") {
          fetchOptions.body = JSON.stringify(payload);
        }

        const res = await fetch(url, fetchOptions);

        let responseBody: unknown = null;
        try { responseBody = await res.json(); } catch { responseBody = await res.text(); }

        const ok = res.ok || res.status === 201 || res.status === 204;
        if (ok) {
          return {
            ok: true,
            data: {
              status: res.status,
              url: url.slice(0, 60) + (url.length > 60 ? "…" : ""),
              method,
              payloadKeys: Object.keys(payload),
              response: responseBody,
              message: `Webhook triggered successfully — HTTP ${res.status}`,
            },
          };
        }
        return { ok: false, error: `Webhook returned ${res.status}: ${JSON.stringify(responseBody).slice(0, 200)}` };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

    if (action === "triggerGet") {
      try {
        const queryParams = params["queryParams"] as Record<string, string> | undefined;
        let targetUrl = url;
        if (queryParams) {
          // Validate the final URL after appending query params
          const qs = new URLSearchParams(queryParams).toString();
          targetUrl = `${url}?${qs}`;
          const getErr = this.validateUrl(targetUrl);
          if (getErr) return { ok: false, error: getErr };
        }
        const res = await fetch(targetUrl, {
          headers: { "X-SBEP-Source": "sbep-connector" },
        });
        let responseBody: unknown = null;
        try { responseBody = await res.json(); } catch { responseBody = await res.text(); }
        if (res.ok) {
          return { ok: true, data: { status: res.status, response: responseBody, message: `GET request to webhook succeeded` } };
        }
        return { ok: false, error: `Webhook GET returned ${res.status}: ${JSON.stringify(responseBody).slice(0, 200)}` };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

    return { ok: false, error: `Unknown action: ${action}. Available: trigger, triggerWithPayload, triggerGet` };
  }
}
