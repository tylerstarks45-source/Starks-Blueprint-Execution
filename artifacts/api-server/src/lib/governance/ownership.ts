import { db, businessesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import type { DbExecutor } from "../business-intelligence/events";

// Centralized business-ownership AUTHORIZATION check — replaces the
// byte-for-byte identical `findOwnedBusiness` helper that was independently
// duplicated in routes/business-intelligence.ts, routes/business-health.ts,
// routes/business-recommendations.ts, routes/logs.ts, and
// routes/monitoring.ts. One implementation now backs all five; a caller
// passes the authenticated user's id and gets the business back only if that
// user owns it.
export async function findOwnedBusiness(businessId: number, ownerId: number) {
  const [business] = await db
    .select()
    .from(businessesTable)
    .where(and(eq(businessesTable.id, businessId), eq(businessesTable.ownerId, ownerId)));
  return business ?? null;
}

// Plain ownership LOOKUP (not an authorization check) used inside governed
// writes to stamp `ownerUserId` on new/updated rows — e.g. a system-initiated
// DNA reconciliation call that only has a trusted `businessId` in scope, not
// an authenticated caller. Throws if the business doesn't exist: a governed
// write against a nonexistent business indicates a bug upstream (the
// business should have been validated before this point), not a normal
// "not found" condition to swallow.
export async function resolveBusinessOwnerUserId(tx: DbExecutor, businessId: number): Promise<number> {
  const [business] = await tx
    .select({ ownerId: businessesTable.ownerId })
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId));
  if (!business) throw new Error(`Business ${businessId} not found while resolving governance ownership`);
  return business.ownerId;
}
