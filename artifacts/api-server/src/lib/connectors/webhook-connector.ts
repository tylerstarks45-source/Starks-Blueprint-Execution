import { BaseConnector, TestResult, ExecResult } from "./base";

export class WebhookConnector extends BaseConnector {
  readonly id = "webhook";
  readonly displayName = "Custom Webhook";
  readonly category = "automation";
  readonly authType = "webhook" as const;
  readonly requiredCredentials = ["WEBHOOK_URL"];
  readonly actions = ["trigger", "triggerWithPayload", "triggerGet"];

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<TestResult> {
    const url = this.creds["WEBHOOK_URL"];
    if (!url) return { ok: false, latencyMs: 0, message: "WEBHOOK_URL not configured" };
    if (!this.isValidUrl(url)) {
      return { ok: false, latencyMs: 0, message: "WEBHOOK_URL is not a valid HTTP/HTTPS URL" };
    }

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
    if (!url) return { ok: false, error: "WEBHOOK_URL not configured" };
    if (!this.isValidUrl(url)) return { ok: false, error: "WEBHOOK_URL is not a valid HTTP/HTTPS URL" };

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
          const qs = new URLSearchParams(queryParams).toString();
          targetUrl = `${url}?${qs}`;
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
