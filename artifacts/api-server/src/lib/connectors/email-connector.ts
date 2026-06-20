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
    if (action === "sendEmail") {
      try {
        const apiKey = process.env["RESEND_API_KEY"];
        if (!apiKey) return { ok: false, error: "RESEND_API_KEY not configured" };

        const to = params["to"] as string | undefined;
        const subject = params["subject"] as string | undefined;
        const body = (params["body"] as string | undefined)
          ?? (params["html"] as string | undefined)
          ?? (params["text"] as string | undefined);
        const fromEmail = (params["from"] as string | undefined) ?? "noreply@starksglobalgroup.net";
        const fromName = (params["fromName"] as string | undefined) ?? "SBEP";
        const isHtml = !!(params["html"] as string | undefined);

        if (!to)      return { ok: false, error: "to is required for sendEmail" };
        if (!subject) return { ok: false, error: "subject is required for sendEmail" };
        if (!body)    return { ok: false, error: "body is required for sendEmail" };

        const { Resend } = await import("resend");
        const resend = new Resend(apiKey);

        const { data, error } = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: [to],
          subject,
          ...(isHtml ? { html: body } : { text: body }),
        });

        if (error) return { ok: false, error: error.message };
        return { ok: true, data: { sent: true, id: (data as { id?: string } | null)?.id, to } };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

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
    return { ok: false, error: `Unknown action: ${action}. Available: sendEmail, sendWelcome, sendTemplate` };
  }
}
