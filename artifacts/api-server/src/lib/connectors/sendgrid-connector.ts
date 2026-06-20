import { BaseConnector, TestResult, ExecResult } from "./base";

export class SendGridConnector extends BaseConnector {
  readonly id = "sendgrid";
  readonly displayName = "SendGrid";
  readonly category = "email_marketing";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = ["SENDGRID_API_KEY"];
  readonly actions = ["sendEmail", "addContact", "createList", "getStats"];

  async testConnection(): Promise<TestResult> {
    const apiKey = this.creds["SENDGRID_API_KEY"];
    if (!apiKey) return { ok: false, latencyMs: 0, message: "SENDGRID_API_KEY not configured" };

    const start = Date.now();
    try {
      const res = await fetch("https://api.sendgrid.com/v3/user/account", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        const data = await res.json() as { username?: string };
        return { ok: true, latencyMs, message: `SendGrid connected: ${data.username ?? "account verified"}` };
      }
      const errBody = await res.text();
      return { ok: false, latencyMs, message: `SendGrid API returned ${res.status}: ${errBody.slice(0, 120)}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    const apiKey = this.creds["SENDGRID_API_KEY"];
    if (!apiKey) return { ok: false, error: "SENDGRID_API_KEY not configured" };

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    if (action === "sendEmail") {
      const to = params["to"] as string | undefined;
      const subject = params["subject"] as string | undefined;
      const body = (params["body"] as string | undefined) ?? (params["html"] as string | undefined) ?? (params["text"] as string | undefined);
      const fromEmail = (params["from"] as string | undefined) ?? (this.creds["SENDGRID_FROM_EMAIL"] ?? "noreply@starksglobalgroup.net");
      const fromName = (params["fromName"] as string | undefined) ?? "SBEP";
      const isHtml = !!(params["html"] as string | undefined);

      if (!to) return { ok: false, error: "to parameter is required for sendEmail" };
      if (!subject) return { ok: false, error: "subject parameter is required for sendEmail" };
      if (!body) return { ok: false, error: "body (or html/text) parameter is required for sendEmail" };

      const payload = {
        personalizations: [{ to: [{ email: to }], subject }],
        from: { email: fromEmail, name: fromName },
        content: [{ type: isHtml ? "text/html" : "text/plain", value: body }],
      };

      try {
        const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        if (res.status === 202) {
          return {
            ok: true,
            data: {
              to,
              subject,
              from: fromEmail,
              message: `Email sent successfully via SendGrid to ${to}`,
            },
          };
        }
        const errBody = await res.text();
        return { ok: false, error: `SendGrid API ${res.status}: ${errBody.slice(0, 200)}` };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

    if (action === "addContact") {
      const email = params["email"] as string | undefined;
      const firstName = (params["firstName"] as string | undefined) ?? "";
      const lastName = (params["lastName"] as string | undefined) ?? "";
      const listIds = (params["listIds"] as string[] | undefined) ?? [];

      if (!email) return { ok: false, error: "email parameter is required for addContact" };

      const payload: Record<string, unknown> = {
        contacts: [{ email, first_name: firstName, last_name: lastName }],
      };
      if (listIds.length > 0) payload["list_ids"] = listIds;

      try {
        const res = await fetch("https://api.sendgrid.com/v3/marketing/contacts", {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        });
        const body2 = await res.json() as Record<string, unknown>;
        if (res.ok) {
          return {
            ok: true,
            data: {
              email,
              jobId: body2["job_id"],
              message: `Contact ${email} added to SendGrid marketing contacts`,
            },
          };
        }
        return { ok: false, error: `SendGrid API ${res.status}: ${JSON.stringify(body2).slice(0, 200)}` };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

    if (action === "getStats") {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
        const res = await fetch(
          `https://api.sendgrid.com/v3/stats?start_date=${weekAgo}&end_date=${today}&aggregated_by=day`,
          { headers },
        );
        const body2 = await res.json() as unknown[];
        if (res.ok) return { ok: true, data: { stats: body2 } };
        return { ok: false, error: `SendGrid API ${res.status}: ${JSON.stringify(body2).slice(0, 200)}` };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

    return { ok: false, error: `Unknown action: ${action}. Available: sendEmail, addContact, getStats` };
  }
}
