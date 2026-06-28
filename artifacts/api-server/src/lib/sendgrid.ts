import { createHmac, createPublicKey, createVerify } from "crypto";
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

// ── Credential resolution ─────────────────────────────────────────────────────

async function resolveApiKey(userId: number): Promise<string | null> {
  try {
    const rows = await pool.query<{ encrypted_value: string | null }>(
      `SELECT encrypted_value FROM user_credentials WHERE user_id = $1 AND credential_key = 'SENDGRID_API_KEY' LIMIT 1`,
      [userId],
    );
    const enc = rows.rows[0]?.encrypted_value;
    if (enc) return await decrypt(enc);
  } catch {
    // fall through
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
    // fall through
  }
  return process.env["SENDGRID_FROM_EMAIL"] ?? DEFAULT_FROM_EMAIL;
}

// ── Unsubscribe token helpers ─────────────────────────────────────────────────
// HMAC-SHA256 signed token — safe to include in email links.

export function generateUnsubscribeToken(subscriberId: number, email: string): string {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) {
    throw new Error("SESSION_SECRET is required for unsubscribe token generation");
  }
  return createHmac("sha256", secret).update(`unsub:${subscriberId}:${email}`).digest("hex");
}

// Returns the full https URL for the one-click unsubscribe link.
export function buildUnsubscribeUrl(baseUrl: string, subscriberId: number, email: string): string {
  const token = generateUnsubscribeToken(subscriberId, email);
  return `${baseUrl}/api/email/unsubscribe?sub=${subscriberId}&token=${encodeURIComponent(token)}`;
}

// Derive the canonical base URL from environment (works on Replit + production).
export function getBaseUrl(): string {
  const domains = process.env["REPLIT_DOMAINS"];
  if (domains) {
    const first = domains.split(",")[0]?.trim();
    if (first) return `https://${first}`;
  }
  return process.env["APP_BASE_URL"] ?? "https://starksglobalgroup.net";
}

// ── Webhook signature verification ───────────────────────────────────────────
// SendGrid Event Webhook uses ECDSA P-256 + SHA-256. The public key is a
// base64-encoded DER SPKI key from the SendGrid dashboard.
// Store as SENDGRID_WEBHOOK_PUBLIC_KEY env var or user credential.
//
// If the key is not configured, verification is skipped (soft mode).
// In production, configure the key so spoofed events are rejected.

export function verifyWebhookSignature(
  publicKeyBase64: string,
  rawBody: string | Buffer,
  timestamp: string,
  signature: string,
): boolean {
  try {
    const publicKeyDer = Buffer.from(publicKeyBase64, "base64");
    const publicKey = createPublicKey({ key: publicKeyDer, format: "der", type: "spki" });
    const verifier = createVerify("SHA256");
    verifier.update(Buffer.from(timestamp));
    verifier.update(rawBody);
    return verifier.verify(publicKey, signature, "base64");
  } catch {
    return false;
  }
}

// ── Template helpers ──────────────────────────────────────────────────────────

function personalize(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

function buildHtml(body: string, unsubscribeUrl: string): string {
  const escaped = body
    .split("\n")
    .map((l) => `<p style="margin:0 0 12px;line-height:1.6;color:#d4d4d8;">${l || "&nbsp;"}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#09090b;max-width:600px;margin:0 auto;padding:32px 20px;">
  <div style="background:#18181b;border-radius:12px;padding:32px;border:1px solid #27272a;">
    ${escaped}
    <p style="font-size:11px;color:#52525b;margin-top:32px;">
      You received this email because you subscribed to our list.<br>
      <a href="${unsubscribeUrl}" style="color:#8844E0;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>`;
}

// ── Core send function ────────────────────────────────────────────────────────

export interface SendEmailOptions {
  userId: number;
  to: string;
  subject: string;
  body: string;
  fromName?: string;
  /** Full unsubscribe URL — required for all marketing sends (CAN-SPAM). */
  unsubscribeUrl: string;
  vars?: Record<string, string>;
}

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
      { type: "text/plain", value: personalizedBody + `\n\nUnsubscribe: ${opts.unsubscribeUrl}` },
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

// ── Batch send ────────────────────────────────────────────────────────────────

export interface BatchRecipient {
  id: number;
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
  const base = getBaseUrl();
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
          unsubscribeUrl: buildUnsubscribeUrl(base, r.id, r.email),
        });
        results.push({ email: r.email, ...result });
        if (result.ok) sent++; else failed++;
      }),
    );
  }

  return { sent, failed, results };
}
