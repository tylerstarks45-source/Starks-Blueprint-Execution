import { BaseConnector, TestResult, ExecResult } from "./base";

export class SlackConnector extends BaseConnector {
  readonly id = "slack";
  readonly displayName = "Slack";
  readonly category = "communication";
  readonly authType = "webhook" as const;
  readonly requiredCredentials = ["SLACK_WEBHOOK_URL"];
  readonly actions = ["postMessage", "postRichMessage"];

  private isValidWebhookUrl(url: string): boolean {
    return url.startsWith("https://hooks.slack.com/services/");
  }

  async testConnection(): Promise<TestResult> {
    const webhookUrl = this.creds["SLACK_WEBHOOK_URL"];
    if (!webhookUrl) return { ok: false, latencyMs: 0, message: "SLACK_WEBHOOK_URL not configured" };
    if (!this.isValidWebhookUrl(webhookUrl)) {
      return { ok: false, latencyMs: 0, message: "SLACK_WEBHOOK_URL must start with https://hooks.slack.com/services/" };
    }

    const start = Date.now();
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "✅ SBEP Slack connector verified — connection test successful" }),
      });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        return { ok: true, latencyMs, message: "Slack webhook connected — test message sent" };
      }
      const errBody = await res.text();
      return { ok: false, latencyMs, message: `Slack webhook returned ${res.status}: ${errBody.slice(0, 120)}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    const webhookUrl = this.creds["SLACK_WEBHOOK_URL"];
    if (!webhookUrl) return { ok: false, error: "SLACK_WEBHOOK_URL not configured" };
    if (!this.isValidWebhookUrl(webhookUrl)) {
      return { ok: false, error: "SLACK_WEBHOOK_URL must start with https://hooks.slack.com/services/" };
    }

    if (action === "postMessage") {
      const text = params["text"] as string | undefined;
      if (!text) return { ok: false, error: "text parameter is required for postMessage" };

      const channel = params["channel"] as string | undefined;
      const username = (params["username"] as string | undefined) ?? "ASH — SBEP";
      const iconEmoji = (params["iconEmoji"] as string | undefined) ?? ":robot_face:";

      const payload: Record<string, unknown> = { text, username, icon_emoji: iconEmoji };
      if (channel) payload["channel"] = channel;

      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const latencyMs = 0;
        void latencyMs;
        if (res.ok) {
          return {
            ok: true,
            data: {
              channel: channel ?? "default channel",
              text: text.slice(0, 100),
              message: `Slack message posted successfully`,
            },
          };
        }
        const errBody = await res.text();
        return { ok: false, error: `Slack webhook returned ${res.status}: ${errBody.slice(0, 200)}` };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

    if (action === "postRichMessage") {
      const blocks = params["blocks"] as unknown[] | undefined;
      const text = (params["text"] as string | undefined) ?? "SBEP notification";
      const username = (params["username"] as string | undefined) ?? "ASH — SBEP";

      if (!blocks) return { ok: false, error: "blocks parameter is required for postRichMessage" };

      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, username, icon_emoji: ":robot_face:", blocks }),
        });
        if (res.ok) {
          return { ok: true, data: { message: "Rich Slack message posted successfully", blockCount: blocks.length } };
        }
        const errBody = await res.text();
        return { ok: false, error: `Slack webhook returned ${res.status}: ${errBody.slice(0, 200)}` };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

    return { ok: false, error: `Unknown action: ${action}. Available: postMessage, postRichMessage` };
  }
}
