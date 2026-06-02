import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

const router: IRouter = Router();

const JWT_SECRET = process.env["SESSION_SECRET"] || "sbep-fallback-secret-change-in-prod";
const JWT_EXPIRY = "7d";

const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RegisterInput = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
});

const ResetRequestInput = z.object({
  email: z.string().email(),
});

function signToken(userId: number, email: string, role: string) {
  return jwt.sign({ sub: userId, email, role }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function userResponse(user: typeof usersTable.$inferSelect) {
  return {
    id: String(user.id),
    email: user.email,
    name: user.name,
    role: user.role ?? "USER",
    membershipStatus: user.membershipStatus,
    membershipTier: user.membershipTier,
    createdAt: user.createdAt,
  };
}

// POST /api/auth/register
router.post("/auth/register", async (req, res) => {
  const parsed = RegisterInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
  }

  const { email, password, name } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [newUser] = await db.insert(usersTable).values({
    email,
    passwordHash,
    name: name || null,
    role: "USER",
    membershipStatus: "inactive",
  }).returning();

  const token = signToken(newUser.id, newUser.email, newUser.role ?? "USER");

  return res.status(201).json({ token, user: userResponse(newUser) });
});

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  const parsed = LoginInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid credentials." });
  }

  const { email, password } = parsed.data;

  const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (users.length === 0) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const user = users[0];

  if (!user.passwordHash) {
    return res.status(401).json({ error: "Account not set up for password login." });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  if (!user.active) {
    return res.status(403).json({ error: "Account is deactivated." });
  }

  const token = signToken(user.id, user.email, user.role ?? "USER");

  return res.json({ token, user: userResponse(user) });
});

// GET /api/auth/me
router.get("/auth/me", async (req, res) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  const token = authHeader.slice(7);
  let payload: jwt.JwtPayload;

  try {
    payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }

  const userId = Number(payload["sub"]);
  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (users.length === 0) {
    return res.status(404).json({ error: "User not found." });
  }

  return res.json({ user: userResponse(users[0]) });
});

// POST /api/auth/logout  (client-side — just confirm)
router.post("/auth/logout", (_req, res) => {
  res.json({ success: true });
});

// POST /api/auth/request-reset
router.post("/auth/request-reset", async (req, res) => {
  const parsed = ResetRequestInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid email." });
  }
  // TODO: send reset email. For now, silently succeed.
  return res.json({ success: true, message: "If an account exists, a reset link will be sent." });
});

export default router;
