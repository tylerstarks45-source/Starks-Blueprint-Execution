import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Response } from "express";
import { isAdminRole } from "./auth";

// Production keeps signup and new checkouts closed until the owner sets PUBLIC_ROLLOUT_OPEN=true.
// Admins and ROLLOUT_ALLOWED_EMAILS can still run staging acceptance, and testers only get
// pre-launch sessions or checkouts after verifying they own the allowlisted mailbox.
function allowedEmails(): Set<string> {
  return new Set((process.env["ROLLOUT_ALLOWED_EMAILS"] ?? "")
    .split(",").map(email => email.trim().toLowerCase()).filter(Boolean));
}

export function publicRolloutOpen(): boolean {
  return process.env["NODE_ENV"] !== "production" || process.env["PUBLIC_ROLLOUT_OPEN"] === "true";
}

export function rolloutAllowsEmail(email: string): boolean {
  return publicRolloutOpen() || allowedEmails().has(email.trim().toLowerCase());
}

/** True while a pre-launch tester's access still rests on an unverified allowlisted address. */
export function testerNeedsVerification(user: { email: string; role: string | null; emailVerified: boolean }): boolean {
  return !publicRolloutOpen()
    && !isAdminRole(user.role ?? "")
    && !user.emailVerified
    && allowedEmails().has(user.email.trim().toLowerCase());
}

/** Sends 403 and returns false when this user can't start a new checkout yet. */
export async function requireCheckoutOpen(userId: number, res: Response): Promise<boolean> {
  if (publicRolloutOpen()) return true;
  const [user] = await db.select({ email: usersTable.email, role: usersTable.role, emailVerified: usersTable.emailVerified })
    .from(usersTable).where(eq(usersTable.id, userId));
  if (user && (isAdminRole(user.role ?? "") || (user.emailVerified && rolloutAllowsEmail(user.email)))) return true;
  res.status(403).json({ error: "Billing opens with the public launch.", code: "rollout_closed" });
  return false;
}
