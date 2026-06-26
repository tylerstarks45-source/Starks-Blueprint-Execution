import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db, usersTable, clientWorkspacesTable } from "@workspace/db";

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

// Returns the authenticated user id from a valid Bearer token OR a pre-validated
// API key caller injected by apiKeyMiddleware, or null if absent/invalid.
export function getUserId(req: Request): number | null {
  // API key auth — injected by middlewares/apiKey.ts after key validation & rate limiting
  const apiCaller = (req as any).apiKeyCaller as { userId: number } | undefined;
  if (apiCaller) return apiCaller.userId;

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
// Note: does NOT check apiKeyCaller because email/role are not cached there — use getActiveCallerPayload.
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
// Accepts both JWT Bearer tokens and pre-validated X-API-Key callers.
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
// API key callers have already been validated (account active check included) by
// apiKeyMiddleware — skip the DB lookup for them to avoid the redundant round-trip.
export async function requireAuthActive(req: Request, res: Response): Promise<number | null> {
  const apiCaller = (req as any).apiKeyCaller as { userId: number } | undefined;
  if (apiCaller) return apiCaller.userId;

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
// Also accepts API key callers from apiKeyMiddleware (does a minimal DB lookup for email+role).
export async function getActiveCallerPayload(
  req: Request,
  res: Response,
): Promise<{ id: number; email: string; role: string } | null> {
  // API key path — middleware already validated account; fetch email+role from DB.
  const apiCaller = (req as any).apiKeyCaller as { userId: number } | undefined;
  if (apiCaller) {
    const [user] = await db
      .select({ email: usersTable.email, role: usersTable.role, active: usersTable.active })
      .from(usersTable)
      .where(eq(usersTable.id, apiCaller.userId));
    if (!user || user.active === false) {
      res.status(403).json({ error: "Account suspended" });
      return null;
    }
    return { id: apiCaller.userId, email: user.email, role: user.role ?? "USER" };
  }

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

// Reads the X-Client-Workspace-Id request header and validates that the workspace
// belongs to callerId. Returns the validated workspaceId, or null if the header is
// absent, malformed, or the workspace does not belong to the caller.
export async function validateClientWorkspaceId(
  req: Request,
  callerId: number,
): Promise<number | null> {
  const raw = req.headers["x-client-workspace-id"];
  if (!raw) return null;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) return null;

  const [workspace] = await db
    .select({ id: clientWorkspacesTable.id })
    .from(clientWorkspacesTable)
    .where(and(
      eq(clientWorkspacesTable.id, id),
      eq(clientWorkspacesTable.agencyUserId, callerId),
    ));

  return workspace ? workspace.id : null;
}

// Accounts authorised for admin access — must have an admin role AND appear in this list.
const ADMIN_EMAILS = new Set(["tylerstarks45@gmail.com", "tylerstarks77@gmail.com"]);

// Verifies the caller is authenticated AND is in ADMIN_EMAILS AND has an admin role AND is not suspended.
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
  if (!ADMIN_EMAILS.has(user.email)) {
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
