import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

// Hard fail if SESSION_SECRET is not set — in ANY environment.
// A missing secret means all tokens would be signed with a known public string,
// allowing anyone to forge admin tokens. There is no safe fallback.
if (!process.env["SESSION_SECRET"]) {
  throw new Error(
    "SESSION_SECRET environment variable must be set. " +
    "Generate a cryptographically random 32+ character string and add it to your Replit secrets.",
  );
}

const JWT_SECRET = process.env["SESSION_SECRET"];

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

// Returns full token payload (id, email, role) without a DB round-trip, or null if absent/invalid.
export function getTokenPayload(req: Request): { id: number; email: string; role: string } | null {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as jwt.JwtPayload;
    const id = Number(payload.sub);
    if (!Number.isFinite(id)) return null;
    return { id, email: String(payload.email ?? ""), role: String(payload.role ?? "USER") };
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

// Roles permitted to access admin-only endpoints.
// FOUNDER_ADMIN is the highest privilege level — unrestricted platform access
// while still tracking all usage through production systems.
const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "admin", "FOUNDER_ADMIN"]);

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.has(role);
}

// Returns true only for the FOUNDER_ADMIN role — used to bypass plan limits
// while still allowing full usage tracking.
export function isFounderAdmin(role: string | null | undefined): boolean {
  return role === "FOUNDER_ADMIN";
}

// Async version of requireAuth that also verifies users.active.
// Sends 401 (no/invalid token) or 403 (suspended) and returns null on failure.
export async function requireAuthActive(req: Request, res: Response): Promise<number | null> {
  const id = getUserId(req);
  if (id === null) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const [user] = await db
    .select({ active: usersTable.active })
    .from(usersTable)
    .where(eq(usersTable.id, id));
  if (!user || user.active === false) {
    res.status(403).json({ error: "Account suspended" });
    return null;
  }
  return id;
}

// Async version of getTokenPayload that also verifies users.active.
// Sends its own 401/403 response and returns null on failure — callers just `if (!caller) return;`.
export async function getActiveCallerPayload(
  req: Request,
  res: Response,
): Promise<{ id: number; email: string; role: string } | null> {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as jwt.JwtPayload;
    const id = Number(payload.sub);
    if (!Number.isFinite(id)) {
      res.status(401).json({ error: "Unauthorized" });
      return null;
    }
    const [user] = await db
      .select({ active: usersTable.active, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, id));
    if (!user || user.active === false) {
      res.status(403).json({ error: "Account suspended" });
      return null;
    }
    // Return role from DB — not from JWT — so demotions take effect immediately
    // without waiting for the token to expire.
    return { id, email: String(payload.email ?? ""), role: String(user.role ?? "USER") };
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
}

// The single account authorised for admin access.
// Role-based checks alone are not sufficient — this email lock ensures only
// the founder can reach admin endpoints even if another account's role is elevated.
const ADMIN_EMAIL = "tylerstarks45@gmail.com";

// Verifies the caller is authenticated AND is the authorised admin email AND has an admin role AND is not suspended.
// Sends 401 (no/invalid token), 403 (suspended, not admin, or wrong email) and returns null on failure.
export async function requireAdmin(
  req: Request,
  res: Response,
): Promise<{ id: number; role: string } | null> {
  const id = getUserId(req);
  if (id === null) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const [user] = await db
    .select({ role: usersTable.role, active: usersTable.active, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, id));
  if (!user || user.active === false) {
    res.status(403).json({ error: "Account suspended" });
    return null;
  }
  // Email lock — must match the founder account regardless of role
  if (user.email !== ADMIN_EMAIL) {
    res.status(403).json({ error: "Admin privileges required" });
    return null;
  }
  const role = user.role ?? "USER";
  if (!ADMIN_ROLES.has(role)) {
    res.status(403).json({ error: "Admin privileges required" });
    return null;
  }
  return { id, role };
}
