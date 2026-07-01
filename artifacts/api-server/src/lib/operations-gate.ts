import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { isFounderAdmin } from "./auth";

// ASH Operations Mode (continuous monitoring/optimization/content/scheduling)
// is a premium feature gated to Operator and Empire tiers only — stricter
// than the general free-vs-paid SubscriptionGate used elsewhere in the app.
export const OPERATIONS_MODE_TIERS = new Set(["operator", "empire"]);

export function hasOperationsModeAccess(
  tier: string | null | undefined,
  role?: string | null,
): boolean {
  if (isFounderAdmin(role)) return true;
  return OPERATIONS_MODE_TIERS.has((tier ?? "free").toLowerCase());
}

// Looks up the caller's membershipTier + role and enforces the Operator/Empire
// gate. Sends a 403 with an upgrade-prompt-shaped body and returns null on
// failure — callers just `if (!(await requireOperationsTier(req, res, caller.id))) return;`
export async function requireOperationsTier(
  req: Request,
  res: Response,
  userId: number,
): Promise<boolean> {
  const [user] = await db
    .select({ membershipTier: usersTable.membershipTier, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (hasOperationsModeAccess(user?.membershipTier, user?.role)) return true;

  res.status(403).json({
    error: "ASH Operations Mode is available on the Operator and Empire plans. Upgrade to enable continuous monitoring, content, and scheduling automation.",
    code: "operations_mode_upgrade_required",
    requiredTiers: ["operator", "empire"],
  });
  return false;
}
