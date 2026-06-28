import { BaseConnector, TestResult, ExecResult } from "./base";

export class MailchimpConnector extends BaseConnector {
  readonly id = "mailchimp";
  readonly displayName = "Mailchimp";
  readonly category = "email_marketing";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = ["MAILCHIMP_API_KEY"];
  readonly actions = ["addSubscriber", "getLists", "createList", "sendCampaign", "getCampaigns"];

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

    if (action === "createList") {
      const name = (params["name"] as string) ?? "New Audience";
      const fromEmail = (params["fromEmail"] as string) ?? "hello@example.com";
      const fromName = (params["fromName"] as string) ?? "My Brand";
      const subject = (params["subject"] as string) ?? "News from us";
      const language = (params["language"] as string) ?? "en";
      try {
        const res = await fetch(`https://${dc}.api.mailchimp.com/3.0/lists`, {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            permission_reminder: "You signed up on our website",
            email_type_option: false,
            contact: { company: fromName, address1: "123 Main St", city: "New York", state: "NY", zip: "10001", country: "US" },
            campaign_defaults: { from_name: fromName, from_email: fromEmail, subject, language },
          }),
        });
        const body = await res.json() as Record<string, unknown>;
        if (res.ok) {
          return { ok: true, data: { id: body["id"], name: body["name"], webId: body["web_id"], message: `Mailchimp audience "${name}" created (ID: ${body["id"]})` } };
        }
        return { ok: false, error: `Mailchimp ${res.status}: ${JSON.stringify(body).slice(0, 200)}` };
      } catch (err: unknown) { return { ok: false, error: String(err) }; }
    }

    if (action === "getCampaigns") {
      try {
        const count = Math.min(Number(params["count"] ?? 20), 100);
        const res = await fetch(`https://${dc}.api.mailchimp.com/3.0/campaigns?count=${count}`, {
          headers: { Authorization: authHeader },
        });
        const body = await res.json() as { campaigns?: Array<{ id?: string; status?: string; settings?: { subject_line?: string }; send_time?: string }>; total_items?: number };
        if (res.ok) {
          return { ok: true, data: { total: body.total_items, campaigns: body.campaigns?.slice(0, 10).map(c => ({ id: c.id, status: c.status, subject: c.settings?.subject_line, sentAt: c.send_time })), message: `Found ${body.total_items ?? 0} campaigns` } };
        }
        return { ok: false, error: `Mailchimp ${(body as Record<string, unknown>)["status"] ?? "error"}` };
      } catch (err: unknown) { return { ok: false, error: String(err) }; }
    }

    if (action === "sendCampaign") {
      // Creates a regular campaign and, if sendNow=true, sends it immediately.
      const listId = (params["listId"] as string | undefined) ?? (this.creds["MAILCHIMP_LIST_ID"] ?? "");
      if (!listId) return { ok: false, error: "listId or MAILCHIMP_LIST_ID required" };
      const subjectLine = (params["subject"] as string) ?? "Campaign from SBEP";
      const fromName = (params["fromName"] as string) ?? "SBEP";
      const replyTo = (params["replyTo"] as string) ?? "noreply@example.com";
      const htmlContent = (params["html"] as string) ?? `<p>${(params["text"] as string) ?? "Hello!"}</p>`;
      const sendNow = (params["sendNow"] as boolean) ?? false;
      try {
        // Step 1: create the campaign
        const createRes = await fetch(`https://${dc}.api.mailchimp.com/3.0/campaigns`, {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ type: "regular", recipients: { list_id: listId }, settings: { subject_line: subjectLine, from_name: fromName, reply_to: replyTo } }),
        });
        const campaign = await createRes.json() as Record<string, unknown>;
        if (!createRes.ok) return { ok: false, error: `Mailchimp create campaign ${createRes.status}: ${JSON.stringify(campaign).slice(0, 200)}` };
        const campaignId = campaign["id"] as string;

        // Step 2: set content
        const contentRes = await fetch(`https://${dc}.api.mailchimp.com/3.0/campaigns/${campaignId}/content`, {
          method: "PUT",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ html: htmlContent }),
        });
        if (!contentRes.ok) return { ok: false, error: `Mailchimp set content ${contentRes.status}` };

        if (!sendNow) {
          return { ok: true, data: { campaignId, status: "draft", subject: subjectLine, message: `Campaign "${subjectLine}" created as draft (ID: ${campaignId}). Set sendNow:true to send immediately.` } };
        }

        // Step 3: send
        const sendRes = await fetch(`https://${dc}.api.mailchimp.com/3.0/campaigns/${campaignId}/actions/send`, {
          method: "POST", headers: { Authorization: authHeader },
        });
        if (sendRes.ok || sendRes.status === 204) {
          return { ok: true, data: { campaignId, status: "sent", subject: subjectLine, message: `Campaign "${subjectLine}" sent to list ${listId} (campaign ID: ${campaignId})` } };
        }
        const sendErr = await sendRes.json() as Record<string, unknown>;
        return { ok: false, error: `Mailchimp send ${sendRes.status}: ${JSON.stringify(sendErr).slice(0, 200)}` };
      } catch (err: unknown) { return { ok: false, error: String(err) }; }
    }

    return { ok: false, error: `Unknown action: ${action}. Available: addSubscriber, getLists, createList, sendCampaign, getCampaigns` };
  }
}
