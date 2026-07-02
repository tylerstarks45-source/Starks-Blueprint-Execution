import { BaseConnector, TestResult, ExecResult } from "./base";
import { getGoogleAccessToken } from "./google-oauth-helper";

function buildMimeMessage(to: string, subject: string, body: string, isHtml: boolean): string {
  const headers = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/${isHtml ? "html" : "plain"}; charset="UTF-8"`,
  ];
  const raw = `${headers.join("\r\n")}\r\n\r\n${body}`;
  return Buffer.from(raw).toString("base64url");
}

// Gmail API connector (send/read via the authenticated user's own mailbox).
// Requires a Google OAuth 2.0 app + refresh token pasted into Connections Hub
// as GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN.
export class GmailConnector extends BaseConnector {
  readonly id = "gmail";
  readonly displayName = "Gmail";
  readonly category = "communication";
  readonly authType = "oauth2" as const;
  readonly requiredCredentials = ["GMAIL_REFRESH_TOKEN", "GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET"];
  readonly actions = ["sendEmail", "readInbox", "createDraft", "searchEmails"];

  async testConnection(): Promise<TestResult> {
    const start = Date.now();
    try {
      const token = await getGoogleAccessToken(this.creds, "GMAIL");
      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        const data = await res.json() as { emailAddress?: string };
        return { ok: true, latencyMs, message: `Connected as ${data.emailAddress ?? "Gmail user"}` };
      }
      const err = await res.text();
      return { ok: false, latencyMs, message: `Gmail API returned ${res.status}: ${err.slice(0, 150)}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: err instanceof Error ? err.message : String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    let token: string;
    try {
      token = await getGoogleAccessToken(this.creds, "GMAIL");
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }

    try {
      if (action === "sendEmail") {
        const to = params["to"] as string | undefined;
        const subject = params["subject"] as string | undefined;
        const body = (params["body"] as string | undefined) ?? (params["html"] as string | undefined) ?? (params["text"] as string | undefined);
        const isHtml = !!(params["html"] as string | undefined);
        if (!to) return { ok: false, error: "to is required for sendEmail" };
        if (!subject) return { ok: false, error: "subject is required for sendEmail" };
        if (!body) return { ok: false, error: "body is required for sendEmail" };

        const raw = buildMimeMessage(to, subject, body, isHtml);
        const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ raw }),
        });
        const data = await res.json() as Record<string, unknown>;
        if (res.ok) {
          return { ok: true, data: { messageId: data["id"], threadId: data["threadId"], to, subject, message: `Email sent to ${to} (ID: ${data["id"]})` } };
        }
        return { ok: false, error: `Gmail API ${res.status}: ${JSON.stringify(data).slice(0, 200)}` };
      }

      if (action === "createDraft") {
        const to = params["to"] as string | undefined;
        const subject = params["subject"] as string | undefined;
        const body = (params["body"] as string | undefined) ?? (params["html"] as string | undefined) ?? (params["text"] as string | undefined);
        const isHtml = !!(params["html"] as string | undefined);
        if (!to || !subject || !body) return { ok: false, error: "to, subject, and body are required for createDraft" };

        const raw = buildMimeMessage(to, subject, body, isHtml);
        const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ message: { raw } }),
        });
        const data = await res.json() as Record<string, unknown>;
        if (res.ok) return { ok: true, data: { draftId: data["id"], message: `Draft created (ID: ${data["id"]})` } };
        return { ok: false, error: `Gmail API ${res.status}: ${JSON.stringify(data).slice(0, 200)}` };
      }

      if (action === "readInbox") {
        const maxResults = (params["maxResults"] as number | undefined) ?? 10;
        const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&labelIds=INBOX`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json() as { messages?: Array<{ id: string }> };
        if (!res.ok) return { ok: false, error: `Gmail API ${res.status}` };
        return { ok: true, data: { count: data.messages?.length ?? 0, messageIds: data.messages?.map((m) => m.id) ?? [], message: `Found ${data.messages?.length ?? 0} inbox message(s)` } };
      }

      if (action === "searchEmails") {
        const query = params["query"] as string | undefined;
        if (!query) return { ok: false, error: "query parameter is required for searchEmails" };
        const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json() as { messages?: Array<{ id: string }>; resultSizeEstimate?: number };
        if (!res.ok) return { ok: false, error: `Gmail API ${res.status}` };
        return { ok: true, data: { count: data.messages?.length ?? 0, messageIds: data.messages?.map((m) => m.id) ?? [], message: `Search "${query}" found ${data.resultSizeEstimate ?? data.messages?.length ?? 0} message(s)` } };
      }

      return { ok: false, error: `Unknown Gmail action: ${action}. Available: sendEmail, readInbox, createDraft, searchEmails` };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
