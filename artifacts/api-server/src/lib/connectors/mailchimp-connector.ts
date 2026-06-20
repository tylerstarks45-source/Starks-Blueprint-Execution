import { BaseConnector, TestResult, ExecResult } from "./base";

export class MailchimpConnector extends BaseConnector {
  readonly id = "mailchimp";
  readonly displayName = "Mailchimp";
  readonly category = "email_marketing";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = ["MAILCHIMP_API_KEY"];
  readonly actions = ["addSubscriber", "getLists", "sendCampaign", "getStats"];

  private getDatacenter(): string {
    const key = this.creds["MAILCHIMP_API_KEY"] ?? "";
    const parts = key.split("-");
    return parts[parts.length - 1] ?? "us1";
  }

  async testConnection(): Promise<TestResult> {
    const apiKey = this.creds["MAILCHIMP_API_KEY"];
    if (!apiKey) return { ok: false, latencyMs: 0, message: "MAILCHIMP_API_KEY not configured" };

    const dc = this.getDatacenter();
    const start = Date.now();
    try {
      const res = await fetch(`https://${dc}.api.mailchimp.com/3.0/ping`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`,
        },
      });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        return { ok: true, latencyMs, message: "Mailchimp API connected" };
      }
      const errBody = await res.text();
      return { ok: false, latencyMs, message: `Mailchimp API returned ${res.status}: ${errBody.slice(0, 120)}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    const apiKey = this.creds["MAILCHIMP_API_KEY"];
    if (!apiKey) return { ok: false, error: "MAILCHIMP_API_KEY not configured" };

    const dc = this.getDatacenter();
    const authHeader = `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`;

    if (action === "addSubscriber") {
      const listId = (params["listId"] as string | undefined) ?? (this.creds["MAILCHIMP_LIST_ID"] ?? "");
      const email = params["email"] as string | undefined;
      const firstName = (params["firstName"] as string | undefined) ?? "";
      const lastName = (params["lastName"] as string | undefined) ?? "";

      if (!email) return { ok: false, error: "email parameter is required for addSubscriber" };
      if (!listId) return { ok: false, error: "listId parameter or MAILCHIMP_LIST_ID credential is required" };

      try {
        const res = await fetch(`https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members`, {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({
            email_address: email,
            status: "subscribed",
            merge_fields: { FNAME: firstName, LNAME: lastName },
          }),
        });
        const body = await res.json() as Record<string, unknown>;
        if (res.ok || res.status === 400) {
          if (res.ok) {
            return {
              ok: true,
              data: {
                subscriberId: body["id"],
                email,
                status: body["status"],
                message: `Subscriber ${email} added to Mailchimp list ${listId}`,
              },
            };
          }
          if ((body["title"] as string)?.includes("Member Exists")) {
            return { ok: true, data: { email, message: `${email} is already subscribed to this list`, alreadyExists: true } };
          }
        }
        return { ok: false, error: `Mailchimp API ${res.status}: ${JSON.stringify(body).slice(0, 200)}` };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

    if (action === "getLists") {
      try {
        const res = await fetch(`https://${dc}.api.mailchimp.com/3.0/lists?count=20`, {
          headers: { Authorization: authHeader },
        });
        const body = await res.json() as Record<string, unknown>;
        if (res.ok) {
          const lists = (body["lists"] as Array<{ id: string; name: string; stats: unknown }> | undefined) ?? [];
          return { ok: true, data: { lists: lists.map(l => ({ id: l.id, name: l.name, stats: l.stats })) } };
        }
        return { ok: false, error: `Mailchimp API ${res.status}: ${JSON.stringify(body).slice(0, 200)}` };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

    return { ok: false, error: `Unknown action: ${action}. Available: addSubscriber, getLists` };
  }
}
