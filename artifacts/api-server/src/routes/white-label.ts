/**
 * White-Label routes — Empire tier only.
 *
 * GET  /api/white-label/config              — get caller's config (creates if missing)
 * PUT  /api/white-label/config              — upsert branding settings
 * POST /api/white-label/verify-domain       — verify CNAME for custom domain
 * GET  /api/white-label/by-domain/:domain   — public: look up config by custom domain
 */
import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, usersTable, whiteLabelConfigsTable } from "@workspace/db";
import { requireAuthActive } from "../lib/auth";
import { serialize } from "../lib/serialize";
import { verifyDnsCname } from "../lib/namecheap";

const router: IRouter = Router();

const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

/** Normalize a domain: lowercase, trim, strip protocol and trailing slashes. */
function normalizeDomain(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return raw
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "")
    || null;
}

const DATA_URL_RE = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/i;
const MAX_LOGO_BYTES = 512 * 1024; // 512 KB

const upsertSchema = z.object({
  brandName: z.string().min(1).max(80).optional(),
  // Accept either an HTTPS URL or a base64 data URL (for logo uploads)
  logoUrl: z.string().nullable().optional().refine(
    v => v == null || v === "" || /^https?:\/\//i.test(v) || DATA_URL_RE.test(v),
    "Must be an https URL or a base64 image data URL",
  ),
  primaryColor: z.string().regex(HEX_COLOR, "Must be a hex color (#rrggbb)").optional(),
  accentColor: z.string().regex(HEX_COLOR, "Must be a hex color (#rrggbb)").optional(),
  customDomain: z.string().min(3).max(253).nullable().optional(),
});

/** Assert the caller is on an Empire (or higher) plan. */
async function requireEmpire(
  userId: number,
  res: Parameters<typeof requireAuthActive>[1],
): Promise<boolean> {
  const [user] = await db
    .select({ membershipTier: usersTable.membershipTier, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return false;
  }

  const tier = (user.membershipTier ?? "").toLowerCase();
  const isPrivileged =
    tier === "empire" ||
    tier === "operator" ||
    user.role === "SUPER_ADMIN" ||
    user.role === "FOUNDER_ADMIN" ||
    user.role === "ADMIN";

  if (!isPrivileged) {
    res.status(403).json({
      error: "White-label features require an Empire tier subscription.",
      upgradeUrl: "/credits",
    });
    return false;
  }
  return true;
}

/** Get or create the caller's white-label config. */
async function getOrCreate(userId: number) {
  const [existing] = await db
    .select()
    .from(whiteLabelConfigsTable)
    .where(eq(whiteLabelConfigsTable.userId, userId));

  if (existing) return existing;

  const [created] = await db
    .insert(whiteLabelConfigsTable)
    .values({ userId })
    .returning();

  return created;
}

// ── POST /api/white-label/logo ────────────────────────────────────────────────
// Accepts { dataUrl: "data:image/...;base64,..." } and stores it as the logo.
router.post("/white-label/logo", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await requireEmpire(userId, res))) return;

  const { dataUrl } = req.body ?? {};
  if (typeof dataUrl !== "string" || !DATA_URL_RE.test(dataUrl)) {
    res.status(400).json({ error: "Must be a valid base64 image data URL (png/jpeg/gif/webp/svg)" });
    return;
  }

  // Validate size: base64 string overhead is ~4/3 × raw bytes
  const base64Part = dataUrl.split(",")[1] ?? "";
  const approxBytes = Math.ceil(base64Part.length * 0.75);
  if (approxBytes > MAX_LOGO_BYTES) {
    res.status(413).json({ error: "Logo exceeds 512 KB limit. Please compress your image first." });
    return;
  }

  const [updated] = await db
    .update(whiteLabelConfigsTable)
    .set({ logoUrl: dataUrl, updatedAt: new Date() })
    .where(eq(whiteLabelConfigsTable.userId, userId))
    .returning({ logoUrl: whiteLabelConfigsTable.logoUrl });

  if (!updated) {
    // Config may not exist yet — create it first then set logo
    await db.insert(whiteLabelConfigsTable).values({ userId, logoUrl: dataUrl });
    res.json({ logoUrl: dataUrl });
    return;
  }

  res.json({ logoUrl: updated.logoUrl });
});

// ── GET /api/white-label/config ───────────────────────────────────────────────
router.get("/white-label/config", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await requireEmpire(userId, res))) return;

  const config = await getOrCreate(userId);
  res.json(serialize(config));
});

// ── PUT /api/white-label/config ───────────────────────────────────────────────
router.put("/white-label/config", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await requireEmpire(userId, res))) return;

  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;

  // Normalize the domain before storing so lookups are consistent
  if ("customDomain" in data) {
    data.customDomain = normalizeDomain(data.customDomain);
  }

  // If custom domain changes, reset verification
  const existing = await getOrCreate(userId);
  const domainChanged =
    "customDomain" in data && data.customDomain !== existing.customDomain;

  const updatePayload: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (domainChanged) {
    updatePayload.domainVerified = false;
    updatePayload.domainVerifiedAt = null;
  }

  const [updated] = await db
    .update(whiteLabelConfigsTable)
    .set(updatePayload)
    .where(eq(whiteLabelConfigsTable.userId, userId))
    .returning();

  res.json(serialize(updated));
});

// ── POST /api/white-label/verify-domain ──────────────────────────────────────
router.post("/white-label/verify-domain", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await requireEmpire(userId, res))) return;

  const config = await getOrCreate(userId);
  if (!config.customDomain) {
    res.status(400).json({ error: "No custom domain configured" });
    return;
  }

  const sbepDomains = process.env.REPLIT_DOMAINS?.split(",") ?? [];
  const target = sbepDomains[0]?.trim() || "starksglobalgroup.net";

  const verified = await verifyDnsCname(config.customDomain, target);

  const [updated] = await db
    .update(whiteLabelConfigsTable)
    .set({
      domainVerified: verified,
      domainVerifiedAt: verified ? new Date() : config.domainVerifiedAt,
      updatedAt: new Date(),
    })
    .where(eq(whiteLabelConfigsTable.userId, userId))
    .returning();

  res.json({
    verified,
    domain: config.customDomain,
    target,
    instructions: [
      `1. Log in to your domain registrar`,
      `2. Navigate to DNS management for ${config.customDomain}`,
      `3. Add a CNAME record: Host = @, Value = ${target}`,
      `4. Add a CNAME record: Host = www, Value = ${target}`,
      `5. Save changes — DNS can take up to 24 hours to propagate`,
      `6. Return here and click "Verify DNS" once propagation is complete`,
    ],
    config: serialize(updated),
  });
});

// ── GET /api/white-label/by-domain/:domain ────────────────────────────────────
// Public endpoint — no auth required. Used by the frontend to detect
// white-label theming when the app is loaded on a custom domain.
router.get("/white-label/by-domain/:domain", async (req, res): Promise<void> => {
  const domain = normalizeDomain(req.params.domain);
  if (!domain) {
    res.status(400).json({ error: "Domain required" });
    return;
  }

  const [config] = await db
    .select({
      brandName: whiteLabelConfigsTable.brandName,
      logoUrl: whiteLabelConfigsTable.logoUrl,
      primaryColor: whiteLabelConfigsTable.primaryColor,
      accentColor: whiteLabelConfigsTable.accentColor,
      customDomain: whiteLabelConfigsTable.customDomain,
      domainVerified: whiteLabelConfigsTable.domainVerified,
    })
    .from(whiteLabelConfigsTable)
    .where(
      and(
        eq(whiteLabelConfigsTable.customDomain, domain),
        eq(whiteLabelConfigsTable.domainVerified, true),
      ),
    );

  if (!config) {
    res.status(404).json({ error: "No white-label config for this domain" });
    return;
  }

  res.json(config);
});

// ── GET /api/white-label/by-agency/:userId ────────────────────────────────────
// Public endpoint — returns the brand config for a given agency user id.
// Only returns data if the agency is verified (has a custom domain, or at minimum
// has set a brand name). Used by the client portal to apply white-label theming.
router.get("/white-label/by-agency/:userId", async (req, res): Promise<void> => {
  const agencyUserId = parseInt(req.params.userId ?? "", 10);
  if (isNaN(agencyUserId)) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }

  const [config] = await db
    .select({
      brandName: whiteLabelConfigsTable.brandName,
      logoUrl: whiteLabelConfigsTable.logoUrl,
      primaryColor: whiteLabelConfigsTable.primaryColor,
      accentColor: whiteLabelConfigsTable.accentColor,
      customDomain: whiteLabelConfigsTable.customDomain,
      domainVerified: whiteLabelConfigsTable.domainVerified,
    })
    .from(whiteLabelConfigsTable)
    .where(eq(whiteLabelConfigsTable.userId, agencyUserId));

  if (!config || !config.brandName) {
    res.status(404).json({ error: "No white-label config for this agency" });
    return;
  }

  res.json(config);
});

export default router;
