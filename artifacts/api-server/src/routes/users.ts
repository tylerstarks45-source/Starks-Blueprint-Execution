import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { getActiveCallerPayload, isAdminRole } from "../lib/auth";
import {
  ListUsersResponse,
  GetUserResponse,
  UpdateUserBody,
  GetUserParams,
  UpdateUserParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ── GET /api/users ─────────────────────────────────────────────────────────
// Admin-only: returns the full user list.
// Regular users must use GET /api/users/:id with their own id.
router.get("/users", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  if (!isAdminRole(caller.role)) {
    res.status(403).json({ error: "Admin privileges required" });
    return;
  }
  const rows = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(ListUsersResponse.parse(serialize(rows)));
});

// ── GET /api/users/:id ─────────────────────────────────────────────────────
// Requires authentication. A user may only read their own profile; admins may
// read any profile.
router.get("/users/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!isAdminRole(caller.role) && caller.id !== params.data.id) {
    res.status(403).json({ error: "Forbidden: cannot read another user's profile" });
    return;
  }

  const [row] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(GetUserResponse.parse(serialize(row)));
});

// ── PATCH /api/users/:id ───────────────────────────────────────────────────
// Requires authentication. A user may only update their own profile; admins
// may update any profile.
//
// Privilege-escalation protection: non-admin callers cannot write to the
// following fields regardless of what they send in the body:
//   role, membershipTier, membershipStatus, creditsBalance, active
//
// Only an admin can change those fields (and only via this route or the
// dedicated /admin/platform-users/:id endpoint).
router.patch("/users/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const isAdmin = isAdminRole(caller.role);
  const isSelf = caller.id === params.data.id;

  if (!isAdmin && !isSelf) {
    res.status(403).json({ error: "Forbidden: cannot update another user's profile" });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Strip admin-only fields for non-admin callers.
  // Destructure to produce a clean update object without privileged keys.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { role: _role, membershipTier: _tier, membershipStatus: _ms, creditsBalance: _cb, active: _active, ...userFields } = parsed.data as Record<string, unknown>;
  const updateData = isAdmin ? (parsed.data as object) : userFields;

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "No updatable fields provided" });
    return;
  }

  const [row] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(GetUserResponse.parse(serialize(row)));
});

export default router;
