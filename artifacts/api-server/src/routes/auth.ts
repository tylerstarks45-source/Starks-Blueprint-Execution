import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import { usersTable, referralCodesTable, referralEventsTable, whiteLabelConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import crypto from "crypto";
import { adjustCredits, SIGNUP_GRANT } from "../lib/credits";
import { getActiveCallerPayload } from "../lib/auth";
import {
  sendPasswordResetEmail,
  sendEmailVerification,
  sendWelcomeEmail,
} from "../lib/email";
import { notifyUser } from "../lib/notify";

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

if (!process.env["SESSION_SECRET"]) {
  throw new Error("SESSION_SECRET environment variable must be set — refusing to start without a signing key.");
}
const JWT_SECRET = process.env["SESSION_SECRET"];
const JWT_EXPIRY = "7d";

const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RegisterInput = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
  referralCode: z.string().max(20).optional(),
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
    walletBalance: user.walletBalance ?? 0,
    onboardingCompleted: user.onboardingCompleted ?? false,
    createdAt: user.createdAt,
    notifyRevenue: user.notifyRevenue ?? true,
    notifyMilestone: user.notifyMilestone ?? true,
    notifyBuild: user.notifyBuild ?? true,
    notifyPlatform: user.notifyPlatform ?? true,
  };
}

// POST /api/auth/register
router.post("/auth/register", authLimiter, async (req, res) => {
  const parsed = RegisterInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
  }

  const { email: rawEmail, password, name, referralCode } = parsed.data;
  const email = rawEmail.toLowerCase().trim();

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
    membershipTier: "free",
    membershipStatus: "active",
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

  // Process referral attribution — fire-and-forget, never block the response
  if (referralCode) {
    (async () => {
      try {
        const [refCodeRow] = await db
          .select()
          .from(referralCodesTable)
          .where(eq(referralCodesTable.code, referralCode.toUpperCase()));
        if (refCodeRow && refCodeRow.userId !== newUser.id) {
          await db.insert(referralEventsTable).values({
            referrerId: refCodeRow.userId,
            referredUserId: newUser.id,
            eventType: "signup",
            creditsAwarded: 0,
          });
        }
      } catch (err) {
        req.log.warn({ err, referralCode }, "Failed to record referral signup event");
      }
    })();
  }

  // Auto-generate a referral code for the new user (fire-and-forget)
  ;(async () => {
    try {
      const { getOrCreateReferralCode } = await import("./referrals");
      await getOrCreateReferralCode(newUser.id);
    } catch {}
  })();

  // Resolve agency white-label brand from Origin/Referer header (if registering via a custom domain)
  let wlBrandName: string | null = null;
  try {
    const origin = req.headers.origin ?? req.headers.referer ?? "";
    if (origin) {
      const hostname = origin.replace(/^https?:\/\//i, "").split("/")[0].split(":")[0].toLowerCase();
      const knownPlatformHosts = ["starksglobalgroup.net", "replit.app", "replit.dev", "localhost"];
      const isPlatformHost = knownPlatformHosts.some(h => hostname === h || hostname.endsWith(`.${h}`));
      if (!isPlatformHost && hostname) {
        const [wlRow] = await db
          .select({ brandName: whiteLabelConfigsTable.brandName })
          .from(whiteLabelConfigsTable)
          .where(eq(whiteLabelConfigsTable.customDomain, hostname))
          .limit(1);
        if (wlRow?.brandName) wlBrandName = wlRow.brandName;
      }
    }
  } catch {
    // Non-blocking — fall back to platform brand
  }

  // Send emails fire-and-forget (never block the response)
  sendEmailVerification(newUser.email, verifyRaw, wlBrandName).catch((err: unknown) => {
    req.log.warn({ err, userId: newUser.id }, "Email verification send failed");
  });
  sendWelcomeEmail(newUser.email, name || "", wlBrandName).catch((err: unknown) => {
    req.log.warn({ err, userId: newUser.id }, "Welcome email send failed");
    notifyUser({
      userId: newUser.id,
      notificationType: "warn",
      title: "Welcome email not delivered",
      message: "We couldn't send your welcome email. Your account is fully active — this is just a delivery notice.",
      linkUrl: "/dashboard",
      dedupeKey: `welcome_email_failed_${newUser.id}`,
    }).catch(() => {});
  });

  const token = signToken(newUser.id, newUser.email, newUser.role ?? "USER");

  return res.status(201).json({ token, user: userResponse({ ...newUser, creditsBalance: balance }) });
});

// POST /api/auth/login
router.post("/auth/login", authLimiter, async (req, res) => {
  const parsed = LoginInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid credentials." });
  }

  const { email: rawEmail, password } = parsed.data;
  const email = rawEmail.toLowerCase().trim();

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

// POST /api/auth/admin-bootstrap
// One-time emergency endpoint to reset a user's password and/or role.
// Completely disabled unless ADMIN_BOOTSTRAP_TOKEN env var is set.
// Protected by the token — NEVER remove this check.
const BootstrapInput = z.object({
  email: z.string().email(),
  newPassword: z.string().min(8),
  role: z.enum(["USER", "ADMIN", "SUPER_ADMIN", "FOUNDER_ADMIN"]).optional(),
});

router.post("/auth/change-password", async (req, res) => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const ChangePasswordInput = z.object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(8, "New password must be at least 8 characters."),
  });

  const parsed = ChangePasswordInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input." });
  }

  const users = await db.select().from(usersTable).where(eq(usersTable.id, caller.id)).limit(1);
  if (users.length === 0) return res.status(404).json({ error: "User not found." });

  const user = users[0];
  if (!user.passwordHash) return res.status(400).json({ error: "Account uses external auth." });

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return res.status(400).json({ error: "Current password is incorrect." });

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, caller.id));

  req.log.info({ userId: caller.id }, "Password changed via settings");
  return res.json({ success: true, message: "Password updated successfully." });
});

// ── POST /api/auth/push-token — store Expo push token ─────────────────────────
router.post("/auth/push-token", async (req, res) => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const parsed = z.object({ expoPushToken: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid push token." });

  const token = parsed.data.expoPushToken;
  if (!token.startsWith("ExponentPushToken[") && !token.startsWith("ExpoPushToken[")) {
    return res.status(400).json({ error: "Invalid Expo push token format." });
  }

  await db.update(usersTable).set({ expoPushToken: token }).where(eq(usersTable.id, caller.id));
  req.log.info({ userId: caller.id }, "Expo push token registered");
  return res.json({ success: true });
});

// ── PATCH /api/auth/notification-prefs ────────────────────────────────────────
router.patch("/auth/notification-prefs", async (req, res) => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const parsed = z.object({
    notifyRevenue: z.boolean().optional(),
    notifyMilestone: z.boolean().optional(),
    notifyBuild: z.boolean().optional(),
    notifyPlatform: z.boolean().optional(),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input." });

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (parsed.data.notifyRevenue !== undefined) updates.notifyRevenue = parsed.data.notifyRevenue;
  if (parsed.data.notifyMilestone !== undefined) updates.notifyMilestone = parsed.data.notifyMilestone;
  if (parsed.data.notifyBuild !== undefined) updates.notifyBuild = parsed.data.notifyBuild;
  if (parsed.data.notifyPlatform !== undefined) updates.notifyPlatform = parsed.data.notifyPlatform;

  if (Object.keys(updates).length === 0) return res.json({ success: true });

  await db.update(usersTable).set(updates).where(eq(usersTable.id, caller.id));
  return res.json({ success: true });
});

router.post("/auth/admin-bootstrap", async (req, res) => {
  const bootstrapToken = process.env["ADMIN_BOOTSTRAP_TOKEN"];
  if (!bootstrapToken) {
    return res.status(404).json({ error: "Not found." });
  }

  const authHeader = req.headers["authorization"];
  const provided = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!provided || !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(bootstrapToken))) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  const parsed = BootstrapInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input." });
  }

  const { email, newPassword, role } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const users = await db.select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable).where(eq(usersTable.email, normalizedEmail)).limit(1);

  if (users.length === 0) {
    return res.status(404).json({ error: "User not found." });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const updateData: {
    passwordHash: string;
    resetToken: null;
    resetTokenExpiry: null;
    role?: "USER" | "ADMIN" | "SUPER_ADMIN" | "FOUNDER_ADMIN";
  } = { passwordHash, resetToken: null, resetTokenExpiry: null };
  if (role) updateData.role = role;

  await db.update(usersTable).set(updateData).where(eq(usersTable.id, users[0].id));

  req.log.info({ userId: users[0].id, email: normalizedEmail, roleSet: role ?? "unchanged" }, "Admin bootstrap: user updated");
  return res.json({ success: true, email: normalizedEmail, roleSet: role ?? "unchanged" });
});

export default router;
