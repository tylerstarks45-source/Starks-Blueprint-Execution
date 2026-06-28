import { pool } from "@workspace/db";
import { decrypt } from "./crypto";
import { logger } from "./logger";

const SENDGRID_SEND_URL = "https://api.sendgrid.com/v3/mail/send";
const DEFAULT_FROM_EMAIL = "noreply@starksglobalgroup.net";
const DEFAULT_FROM_NAME = "Starks Global Group";

export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

// Load user's SENDGRID_API_KEY from the credential vault.
// Falls back to the platform-level env var if none is set.
async function resolveApiKey(userId: number): Promise<string | null> {
  try {
    const rows = await pool.query<{ encrypted_value: string | null }>(
      `SELECT encrypted_value FROM user_credentials WHERE user_id = $1 AND credential_key = 'SENDGRID_API_KEY' LIMIT 1`,
      [userId],
    );
    const enc = rows.rows[0]?.encrypted_value;
    if (enc) return await decrypt(enc);
  } catch {
    // fall through to env var
  }
  return process.env["SENDGRID_API_KEY"] ?? null;
}

async function resolveFromEmail(userId: number): Promise<string> {
  try {
    const rows = await pool.query<{ encrypted_value: string | null }>(
      `SELECT encrypted_value FROM user_credentials WHERE user_id = $1 AND credential_key = 'SENDGRID_FROM_EMAIL' LIMIT 1`,
      [userId],
    );
    const enc = rows.rows[0]?.encrypted_value;
    if (enc) return await decrypt(enc);
  } catch {
    // fall through to default
  }
  return process.env["SENDGRID_FROM_EMAIL"] ?? DEFAULT_FROM_EMAIL;
}

// Personalize body — replaces {{firstName}}, {{lastName}}, {{email}} tokens.
function personalize(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

// Build a plain-text email body that appends a CAN-SPAM footer with an
// unsubscribe link. The unsubscribe URL is added by callers.
function buildHtml(body: string, unsubscribeUrl?: string): string {
  const escaped = body
    .split("\n")
    .map((l) => `<p style="margin:0 0 12px;line-height:1.6;color:#d4d4d8;">${l || "&nbsp;"}</p>`)
    .join("");

  const footer = unsubscribeUrl
    ? `<p style="font-size:11px;color:#52525b;margin-top:32px;">
         You received this email because you subscribed to our list.<br>
         <a href="${unsubscribeUrl}" style="color:#8844E0;">Unsubscribe</a>
       </p>`
    : "";

  return `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#09090b;max-width:600px;margin:0 auto;padding:32px 20px;">
  <div style="background:#18181b;border-radius:12px;padding:32px;border:1px solid #27272a;">
    ${escaped}
    ${footer}
  </div>
</body>
</html>`;
}

export interface SendEmailOptions {
  userId: number;
  to: string;
  subject: string;
  body: string;
  fromName?: string;
  unsubscribeUrl?: string;
  vars?: Record<string, string>;
}

// Send a single email via SendGrid using the user's stored API key.
// Returns {ok, messageId} on success or {ok: false, error} on failure.
export async function sendEmailViaCredentials(opts: SendEmailOptions): Promise<SendResult> {
  const apiKey = await resolveApiKey(opts.userId);
  if (!apiKey) {
    return { ok: false, error: "No SendGrid API key configured. Connect SendGrid in the Connections Hub." };
  }

  const fromEmail = await resolveFromEmail(opts.userId);
  const fromName = opts.fromName ?? DEFAULT_FROM_NAME;

  const vars = opts.vars ?? {};
  const personalizedBody = personalize(opts.body, vars);
  const personalizedSubject = personalize(opts.subject, vars);

  const html = buildHtml(personalizedBody, opts.unsubscribeUrl);

  const payload = {
    personalizations: [{ to: [{ email: opts.to }] }],
    from: { email: fromEmail, name: fromName },
    subject: personalizedSubject,
    content: [
      { type: "text/plain", value: personalizedBody },
      { type: "text/html", value: html },
    ],
    tracking_settings: {
      click_tracking: { enable: true, enable_text: false },
      open_tracking: { enable: true },
    },
  };

  try {
    const res = await fetch(SENDGRID_SEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 202) {
      const messageId = res.headers.get("X-Message-Id") ?? undefined;
      return { ok: true, messageId };
    }

    const errText = await res.text().catch(() => `HTTP ${res.status}`);
    return { ok: false, error: `SendGrid ${res.status}: ${errText.slice(0, 300)}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err, to: opts.to }, "SendGrid request failed");
    return { ok: false, error: msg };
  }
}

// Batch-send to multiple recipients, recording per-address results.
// Throttled to 10 concurrent sends to respect rate limits.
export interface BatchRecipient {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  subject?: string;
}

export interface BatchResult {
  sent: number;
  failed: number;
  results: Array<{ email: string; ok: boolean; messageId?: string; error?: string }>;
}

export async function batchSend(
  userId: number,
  recipients: BatchRecipient[],
  baseSubject: string,
  body: string,
  fromName?: string,
): Promise<BatchResult> {
  const results: BatchResult["results"] = [];
  let sent = 0;
  let failed = 0;

  const CONCURRENCY = 10;
  for (let i = 0; i < recipients.length; i += CONCURRENCY) {
    const chunk = recipients.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (r) => {
        const vars: Record<string, string> = {
          firstName: r.firstName ?? "",
          lastName: r.lastName ?? "",
          email: r.email,
        };
        const result = await sendEmailViaCredentials({
          userId,
          to: r.email,
          subject: r.subject ?? baseSubject,
          body,
          fromName,
          vars,
        });
        results.push({ email: r.email, ...result });
        if (result.ok) sent++; else failed++;
      }),
    );
  }

  return { sent, failed, results };
}
