import { BaseConnector, TestResult, ExecResult } from "./base";

export class ZapierConnector extends BaseConnector {
  readonly id = "zapier";
  readonly displayName = "Zapier";
  readonly category = "automation";
  readonly authType = "webhook" as const;
  readonly requiredCredentials = ["ZAPIER_WEBHOOK_URL"];
  readonly actions = ["triggerWebhook", "triggerWithPayload"];

  private isValidWebhookUrl(url: string): boolean {
    return url.startsWith("https://hooks.zapier.com/");
  }

  async testConnection(): Promise<TestResult> {
    const webhookUrl = this.creds["ZAPIER_WEBHOOK_URL"];
    if (!webhookUrl) return { ok: false, latencyMs: 0, message: "ZAPIER_WEBHOOK_URL not configured" };
    if (!this.isValidWebhookUrl(webhookUrl)) {
      return { ok: false, latencyMs: 0, message: "ZAPIER_WEBHOOK_URL must start with https://hooks.zapier.com/" };
    }

    const start = Date.now();
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true, source: "SBEP", timestamp: new Date().toISOString() }),
      });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        return { ok: true, latencyMs, message: "Zapier webhook verified — test event sent" };
      }
      return { ok: false, latencyMs, message: `Zapier webhook returned ${res.status}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    const webhookUrl = this.creds["ZAPIER_WEBHOOK_URL"];
    if (!webhookUrl) return { ok: false, error: "ZAPIER_WEBHOOK_URL not configured" };
    if (!this.isValidWebhookUrl(webhookUrl)) {
      return { ok: false, error: "ZAPIER_WEBHOOK_URL must start with https://hooks.zapier.com/" };
    }

    if (action === "triggerWebhook" || action === "triggerWithPayload") {
      const payload: Record<string, unknown> = {
        source: "SBEP",
        timestamp: new Date().toISOString(),
        ...params,
      };

      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        let responseBody: unknown = null;
        try { responseBody = await res.json(); } catch { responseBody = await res.text(); }

        if (res.ok) {
          return {
            ok: true,
            data: {
              webhookUrl: webhookUrl.slice(0, 50) + "…",
              status: res.status,
              response: responseBody,
              payloadKeys: Object.keys(payload),
              message: `Zapier webhook triggered successfully — Zap activated`,
            },
          };
        }
        return { ok: false, error: `Zapier webhook returned ${res.status}: ${JSON.stringify(responseBody).slice(0, 200)}` };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

    return { ok: false, error: `Unknown action: ${action}. Available: triggerWebhook, triggerWithPayload` };
  }
}
