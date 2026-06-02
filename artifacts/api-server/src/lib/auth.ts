import jwt from "jsonwebtoken";
import type { Request, Response } from "express";

const isProduction = process.env.REPLIT_DEPLOYMENT === "1" || process.env.NODE_ENV === "production";

// Fail closed in production: a fallback secret would let anyone forge tokens (auth/billing bypass).
if (isProduction && !process.env["SESSION_SECRET"]) {
  throw new Error("SESSION_SECRET must be set in production");
}

const JWT_SECRET = process.env["SESSION_SECRET"] || "sbep-fallback-secret-change-in-prod";

// Returns the authenticated user id from a valid Bearer token, or null if absent/invalid.
export function getUserId(req: Request): number | null {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as jwt.JwtPayload;
    const id = Number(payload.sub);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

// Derives the authenticated user id or sends a 401 and returns null.
export function requireAuth(req: Request, res: Response): number | null {
  const id = getUserId(req);
  if (id === null) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return id;
}
