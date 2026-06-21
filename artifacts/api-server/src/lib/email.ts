import { Resend } from "resend";

const DEFAULT_BRAND = "Starks Global Group";
const FROM_EMAIL = "noreply@starksglobalgroup.net";

/** Build the RFC 5322 "From" header. Pass a white-label brand name for agency emails. */
export function getEmailSender(brandName?: string | null): string {
  const name = brandName?.trim() || DEFAULT_BRAND;
  return `${name} <${FROM_EMAIL}>`;
}

const FROM = getEmailSender();
const ADMIN_EMAIL = "tylerstarks77@gmail.com";

function getBaseUrl(): string {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  return domain ? `https://${domain}` : "http://localhost:80";
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendPasswordResetEmail(to: string, rawToken: string): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;
  const resetUrl = `${getBaseUrl()}/reset-password?token=${rawToken}`;
  try {
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject: "Reset your Starks Global Group password",
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;background:#0a0a0a;color:#fff;border-radius:12px;">
          <h1 style="font-size:22px;font-weight:700;margin-bottom:12px;">Reset Your Password</h1>
          <p style="color:#a1a1aa;margin-bottom:24px;">Click the button below to reset your password. This link expires in <strong style="color:#fff;">1 hour</strong>.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#3b82f6;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-bottom:24px;">Reset Password →</a>
          <p style="color:#52525b;font-size:12px;margin-top:24px;">If you didn't request a password reset, you can safely ignore this email.</p>
          <p style="color:#3f3f46;font-size:11px;margin-top:8px;word-break:break-all;">Or copy: ${resetUrl}</p>
        </div>
      `,
    });
    return true;
  } catch {
    return false;
  }
}

export async function sendEmailVerification(to: string, rawToken: string): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;
  const verifyUrl = `${getBaseUrl()}/verify-email?token=${rawToken}`;
  try {
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject: "Verify your Starks Global Group email",
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;background:#0a0a0a;color:#fff;border-radius:12px;">
          <h1 style="font-size:22px;font-weight:700;margin-bottom:12px;">Verify Your Email 🚀</h1>
          <p style="color:#a1a1aa;margin-bottom:24px;">Welcome to Starks Global Group! Click below to verify your email and activate your account.</p>
          <a href="${verifyUrl}" style="display:inline-block;background:#3b82f6;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-bottom:24px;">Verify Email →</a>
          <p style="color:#52525b;font-size:12px;margin-top:24px;">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
        </div>
      `,
    });
    return true;
  } catch {
    return false;
  }
}

export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;
  const base = getBaseUrl();
  try {
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject: "Welcome to Starks Global Group",
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;background:#0a0a0a;color:#fff;border-radius:12px;">
          <h1 style="font-size:22px;font-weight:700;margin-bottom:12px;">Welcome, ${name || "Commander"}! 🚀</h1>
          <p style="color:#a1a1aa;margin-bottom:16px;">You've joined Starks Global Group — the AI automation platform built to help you build real income systems.</p>
          <ul style="color:#a1a1aa;margin-bottom:24px;padding-left:20px;line-height:1.8;">
            <li>Browse 8 pre-built AI blueprints</li>
            <li>Explore 17+ curated tools in the marketplace</li>
            <li>Upgrade to Builder to launch your first AI system</li>
          </ul>
          <a href="${base}/dashboard" style="display:inline-block;background:#3b82f6;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Go to Dashboard →</a>
        </div>
      `,
    });
    return true;
  } catch {
    return false;
  }
}

export async function sendContactNotification(data: {
  name: string;
  email: string;
  subject?: string;
  company?: string;
  message: string;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;
  try {
    await resend.emails.send({
      from: FROM,
      to: [ADMIN_EMAIL],
      replyTo: data.email,
      subject: `[Contact] ${data.subject || "New message"} — ${data.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;background:#0a0a0a;color:#fff;border-radius:12px;">
          <h1 style="font-size:20px;font-weight:700;margin-bottom:20px;">New Contact Form Submission</h1>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <tr><td style="padding:8px 0;color:#a1a1aa;width:90px;vertical-align:top;">From</td><td style="color:#fff;">${data.name}</td></tr>
            <tr><td style="padding:8px 0;color:#a1a1aa;vertical-align:top;">Email</td><td><a href="mailto:${data.email}" style="color:#3b82f6;">${data.email}</a></td></tr>
            ${data.company ? `<tr><td style="padding:8px 0;color:#a1a1aa;">Company</td><td style="color:#fff;">${data.company}</td></tr>` : ""}
            ${data.subject ? `<tr><td style="padding:8px 0;color:#a1a1aa;">Subject</td><td style="color:#fff;">${data.subject}</td></tr>` : ""}
          </table>
          <div style="padding:16px;background:#18181b;border-radius:8px;">
            <p style="color:#a1a1aa;font-size:11px;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Message</p>
            <p style="color:#fff;white-space:pre-wrap;line-height:1.6;">${data.message}</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch {
    return false;
  }
}
