import { BaseConnector, TestResult, ExecResult } from "./base";
import { sendWelcomeEmail } from "../email";

export class EmailConnector extends BaseConnector {
  readonly id = "email";
  readonly displayName = "Email (Resend)";
  readonly category = "communication";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = [];
  readonly actions = ["sendEmail", "sendWelcome", "sendTemplate"];

  async testConnection(): Promise<TestResult> {
    const start = Date.now();
    try {
      const apiKey = process.env["RESEND_API_KEY"];
      if (!apiKey) {
        return { ok: false, latencyMs: 0, message: "RESEND_API_KEY not configured" };
      }
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        return { ok: true, latencyMs, message: "Resend email API connected" };
      }
      return { ok: false, latencyMs, message: `Resend API returned ${res.status}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    if (action === "sendWelcome") {
      try {
        const email = params["email"] as string;
        const name = (params["name"] as string) ?? "";
        await sendWelcomeEmail(email, name);
        return { ok: true, data: { sent: true, to: email } };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }
    return { ok: false, error: `Unknown action: ${action}` };
  }
}
