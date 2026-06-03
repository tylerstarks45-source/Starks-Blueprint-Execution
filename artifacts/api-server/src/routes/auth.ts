import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import crypto from "crypto";
import { adjustCredits, SIGNUP_GRANT } from "../lib/credits";
import {
  sendPasswordResetEmail,
  sendEmailVerification,
  sendWelcomeEmail,
} from "../lib/email";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
});

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password reset requests. Please try again later." },
});

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
    creditsBalance: user.creditsBalance ?? 0,
    createdAt: user.createdAt,
  };
}

// POST /api/auth/register
router.post("/auth/register", authLimiter, async (req, res) => {
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

  const balance = await adjustCredits(newUser.id, SIGNUP_GRANT, "signup_grant", {
    reason: "Welcome credits",
  });

  // Generate email verification token
  const verifyRaw = crypto.randomBytes(32).toString("hex");
  const verifyHash = crypto.createHash("sha256").update(verifyRaw).digest("hex");
  const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await db.update(usersTable)
    .set({ emailVerifyToken: verifyHash, emailVerifyExpiry: verifyExpiry })
    .where(eq(usersTable.id, newUser.id));

  // Send emails fire-and-forget (never block the response)
  sendEmailVerification(newUser.email, verifyRaw).catch(() => {});
  sendWelcomeEmail(newUser.email, name || "").catch(() => {});

  const token = signToken(newUser.id, newUser.email, newUser.role ?? "USER");

  return res.status(201).json({ token, user: userResponse({ ...newUser, creditsBalance: balance }) });
});

// POST /api/auth/login
router.post("/auth/login", authLimiter, async (req, res) => {
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
router.post("/auth/request-reset", resetLimiter, async (req, res) => {
  const parsed = ResetRequestInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid email." });
  }

  const GENERIC = { success: true, message: "If an account exists, a reset link will be sent." };

  const users = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email)).limit(1);
  if (users.length === 0) {
    // Always return the same response to prevent account-existence enumeration.
    return res.json(GENERIC);
  }

  // Generate a random token; store only its SHA-256 hash in the DB so that
  // a database read alone cannot be used to reset any account.
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.update(usersTable)
    .set({ resetToken: tokenHash, resetTokenExpiry: expiry })
    .where(eq(usersTable.email, parsed.data.email));

  // Log only safe metadata — never log the raw token or the full reset URL.
  req.log.info({ email: parsed.data.email, tokenExpiry: expiry.toISOString() }, "Password reset requested");

  // Send password reset email — fire-and-forget so response is always fast
  sendPasswordResetEmail(parsed.data.email, rawToken).catch(() => {});
  return res.json(GENERIC);
});

// POST /api/auth/reset-password
const ResetPasswordInput = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

router.post("/auth/reset-password", async (req, res) => {
  const parsed = ResetPasswordInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input." });
  }

  // Hash the incoming raw token and look up the stored hash — never compare plaintext tokens.
  const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
  const users = await db.select().from(usersTable)
    .where(eq(usersTable.resetToken, tokenHash)).limit(1);

  if (users.length === 0) {
    return res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." });
  }

  const user = users[0];
  if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    return res.status(400).json({ error: "This reset link has expired. Please request a new one." });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db.update(usersTable)
    .set({ passwordHash, resetToken: null, resetTokenExpiry: null })
    .where(eq(usersTable.id, user.id));

  req.log.info({ userId: user.id }, "Password reset completed");
  return res.json({ success: true, message: "Password updated. You can now log in." });
});

// GET /api/auth/verify-email?token=X
router.get("/auth/verify-email", async (req, res) => {
  const token = req.query["token"] as string | undefined;
  if (!token) return res.status(400).json({ error: "Missing verification token." });

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const users = await db.select().from(usersTable)
    .where(eq(usersTable.emailVerifyToken, tokenHash)).limit(1);

  if (users.length === 0) {
    return res.status(400).json({ error: "Invalid or already-used verification link." });
  }

  const user = users[0];
  if (!user.emailVerifyExpiry || user.emailVerifyExpiry < new Date()) {
    return res.status(400).json({ error: "Verification link has expired. Please sign up again or contact support." });
  }

  await db.update(usersTable)
    .set({ emailVerified: true, emailVerifyToken: null, emailVerifyExpiry: null })
    .where(eq(usersTable.id, user.id));

  req.log.info({ userId: user.id }, "Email verified");
  return res.json({ success: true, message: "Email verified successfully. You can now log in." });
});

// POST /api/auth/resend-verification
router.post("/auth/resend-verification", resetLimiter, async (req, res) => {
  const parsed = ResetRequestInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid email." });

  const GENERIC = { success: true, message: "If an unverified account exists, a new link will be sent." };

  const users = await db.select().from(usersTable)
    .where(eq(usersTable.email, parsed.data.email)).limit(1);
  if (users.length === 0 || users[0].emailVerified) return res.json(GENERIC);

  const verifyRaw = crypto.randomBytes(32).toString("hex");
  const verifyHash = crypto.createHash("sha256").update(verifyRaw).digest("hex");
  const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.update(usersTable)
    .set({ emailVerifyToken: verifyHash, emailVerifyExpiry: verifyExpiry })
    .where(eq(usersTable.id, users[0].id));

  sendEmailVerification(parsed.data.email, verifyRaw).catch(() => {});
  return res.json(GENERIC);
});

export default router;
