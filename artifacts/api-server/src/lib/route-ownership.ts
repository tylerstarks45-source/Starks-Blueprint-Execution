import type { Request, RequestHandler } from "express";
import { eq } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db, businessesTable } from "@workspace/db";
import { requireAuthActive } from "./auth";

type BusinessIdResolver = (req: Request) => Promise<number | null | undefined> | number | null | undefined;

/**
 * Middleware: requires an active caller who owns the business resolved from the
 * request. Anything else (missing record, other owner, bad id) gets a 404 so the
 * response does not reveal whether the record exists.
 */
export function requireBusinessOwner(resolve: BusinessIdResolver): RequestHandler {
  return (req, res, next) => {
    (async () => {
      const userId = await requireAuthActive(req, res);
      if (userId === null) return;
      const businessId = await resolve(req);
      const owner =
        businessId != null && Number.isInteger(businessId)
          ? (await db.select({ ownerId: businessesTable.ownerId }).from(businessesTable).where(eq(businessesTable.id, businessId)).limit(1))[0]
          : undefined;
      if (!owner || owner.ownerId !== userId) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      next();
    })().catch(next);
  };
}

// Strict: only plain decimal digits, so the id that is authorized is the id the
// handler later parses (Number("1e2") is 100 but parseInt("1e2") is 1).
export function parseIdParam(value: unknown): number | null {
  return typeof value === "string" && /^\d{1,15}$/.test(value) ? Number(value) : null;
}

export const businessIdParam = (param: string): BusinessIdResolver => (req) => parseIdParam(req.params[param]);

/** Resolves the business that owns the record whose primary key is in `req.params[param]`. */
export function businessIdOfRecord(table: PgTable & { id: PgColumn; businessId: PgColumn }, param: string): BusinessIdResolver {
  return async (req) => {
    const [row] = await db
      .select({ businessId: table.businessId })
      .from(table as PgTable)
      .where(eq(table.id, String(req.params[param])))
      .limit(1);
    return row?.businessId as number | undefined;
  };
}

/** Middleware: a `:userId` path param must be the caller's own id. */
export const requireSelfParam = (param: string): RequestHandler => (req, res, next) => {
  (async () => {
    const userId = await requireAuthActive(req, res);
    if (userId === null) return;
    if (parseIdParam(req.params[param]) !== userId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    next();
  })().catch(next);
};
