/**
 * Domain management routes.
 * Integrates with Namecheap API for domain search, purchase, and DNS management.
 *
 * GET    /api/domains                    — list user domains
 * POST   /api/domains/search             — check availability + pricing
 * POST   /api/domains/purchase           — purchase via Namecheap
 * PATCH  /api/domains/:id/link           — link domain to a landing page
 * POST   /api/domains/:id/verify-dns     — check DNS propagation
 * GET    /api/domains/:id/dns-setup      — get CNAME setup instructions
 * DELETE /api/domains/:id               — remove domain record
 */
import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, desc } from "drizzle-orm";
import { db, userDomainsTable, landingPagesTable, systemInstancesTable } from "@workspace/db";
import { requireAuthActive } from "../lib/auth";
import { checkDomains, purchaseDomain, verifyDnsCname } from "../lib/namecheap";
import { z } from "zod";

const router: IRouter = Router();

function sbepHost(): string {
  const domains = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  return domains || "starksglobalgroup.net";
}

// ── GET /api/domains ─────────────────────────────────────────────────────────
router.get("/domains", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const rows = await db
    .select({
      id: userDomainsTable.id,
      userId: userDomainsTable.userId,
      domain: userDomainsTable.domain,
      status: userDomainsTable.status,
      namecheapOrderId: userDomainsTable.namecheapOrderId,
      autoRenew: userDomainsTable.autoRenew,
      expiresAt: userDomainsTable.expiresAt,
      purchasedAt: userDomainsTable.purchasedAt,
      linkedPageId: userDomainsTable.linkedPageId,
      dnsVerified: userDomainsTable.dnsVerified,
      dnsVerifiedAt: userDomainsTable.dnsVerifiedAt,
      years: userDomainsTable.years,
      price: userDomainsTable.price,
      createdAt: userDomainsTable.createdAt,
      updatedAt: userDomainsTable.updatedAt,
      linkedPageTitle: landingPagesTable.title,
      linkedPageSlug: landingPagesTable.slug,
    })
    .from(userDomainsTable)
    .leftJoin(landingPagesTable, eq(userDomainsTable.linkedPageId, landingPagesTable.id))
    .where(eq(userDomainsTable.userId, userId))
    .orderBy(desc(userDomainsTable.createdAt));

  res.json(serialize(rows));
});

// ── POST /api/domains/search ─────────────────────────────────────────────────
const searchSchema = z.object({
  query: z.string().min(2).max(63),
});

router.post("/domains/search", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const parsed = searchSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { query } = parsed.data;
  const base = query.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "");

  const tlds = [".com", ".net", ".org", ".io", ".co", ".app", ".dev", ".ai", ".store"];
  const domains = tlds.map(t => `${base}${t}`);

  if (!process.env.NAMECHEAP_API_KEY) {
    res.status(503).json({ error: "Domain search is not configured. Please contact support." });
    return;
  }

  try {
    const results = await checkDomains(domains);
    res.json(results);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Domain search failed";
    res.status(500).json({ error: msg });
  }
});

// ── POST /api/domains/purchase ───────────────────────────────────────────────
const purchaseSchema = z.object({
  domain: z.string().min(3),
  years: z.number().int().min(1).max(10).default(1),
  registrant: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    address1: z.string().min(1),
    city: z.string().min(1),
    stateProvince: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().length(2).default("US"),
    phone: z.string().min(5),
  }),
});

router.post("/domains/purchase", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const parsed = purchaseSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { domain, years, registrant } = parsed.data;

  if (!process.env.NAMECHEAP_API_KEY) {
    res.status(503).json({ error: "Domain purchasing is not configured. Please contact support." });
    return;
  }

  try {
    const result = await purchaseDomain(domain, years, registrant);

    const [created] = await db.insert(userDomainsTable).values({
      userId,
      domain,
      status: "active",
      namecheapOrderId: result.orderId,
      years,
      price: String(result.charged),
      purchasedAt: new Date(),
      expiresAt: new Date(Date.now() + years * 365.25 * 24 * 60 * 60 * 1000),
      registrantFirstName: registrant.firstName,
      registrantLastName: registrant.lastName,
      registrantEmail: registrant.email,
      registrantAddress1: registrant.address1,
      registrantCity: registrant.city,
      registrantStateProvince: registrant.stateProvince,
      registrantPostalCode: registrant.postalCode,
      registrantCountry: registrant.country,
      registrantPhone: registrant.phone,
    }).returning();

    res.status(201).json(serialize(created));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Purchase failed";
    res.status(500).json({ error: msg });
  }
});

// ── PATCH /api/domains/:id/link ───────────────────────────────────────────────
const linkSchema = z.object({
  pageId: z.number().int().nullable(),
});

router.patch("/domains/:id/link", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const domainId = parseInt(req.params.id);
  const parsed = linkSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const [existing] = await db.select().from(userDomainsTable)
    .where(and(eq(userDomainsTable.id, domainId), eq(userDomainsTable.userId, userId)));
  if (!existing) { res.status(404).json({ error: "Domain not found" }); return; }

  if (parsed.data.pageId !== null) {
    const [page] = await db.select().from(landingPagesTable)
      .where(and(eq(landingPagesTable.id, parsed.data.pageId), eq(landingPagesTable.userId, userId)));
    if (!page) { res.status(404).json({ error: "Landing page not found" }); return; }

    await db.update(landingPagesTable)
      .set({ customDomain: existing.domain })
      .where(eq(landingPagesTable.id, parsed.data.pageId));
  } else {
    if (existing.linkedPageId) {
      await db.update(landingPagesTable)
        .set({ customDomain: null })
        .where(eq(landingPagesTable.id, existing.linkedPageId));
    }
  }

  const [updated] = await db.update(userDomainsTable)
    .set({ linkedPageId: parsed.data.pageId, updatedAt: new Date() })
    .where(and(eq(userDomainsTable.id, domainId), eq(userDomainsTable.userId, userId)))
    .returning();

  res.json(serialize(updated));
});

// ── POST /api/domains/:id/verify-dns ─────────────────────────────────────────
router.post("/domains/:id/verify-dns", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const domainId = parseInt(req.params.id);
  const [existing] = await db.select().from(userDomainsTable)
    .where(and(eq(userDomainsTable.id, domainId), eq(userDomainsTable.userId, userId)));
  if (!existing) { res.status(404).json({ error: "Domain not found" }); return; }

  const target = sbepHost();
  const verified = await verifyDnsCname(existing.domain, target);

  const [updated] = await db.update(userDomainsTable)
    .set({
      dnsVerified: verified,
      dnsVerifiedAt: verified ? new Date() : existing.dnsVerifiedAt,
      updatedAt: new Date(),
    })
    .where(eq(userDomainsTable.id, domainId))
    .returning();

  res.json({ verified, target, ...serialize(updated) });
});

// ── GET /api/domains/:id/dns-setup ───────────────────────────────────────────
router.get("/domains/:id/dns-setup", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const domainId = parseInt(req.params.id);
  const [existing] = await db.select().from(userDomainsTable)
    .where(and(eq(userDomainsTable.id, domainId), eq(userDomainsTable.userId, userId)));
  if (!existing) { res.status(404).json({ error: "Domain not found" }); return; }

  const target = sbepHost();

  res.json({
    domain: existing.domain,
    target,
    records: [
      { type: "CNAME", host: "www", value: target, ttl: 1800 },
      { type: "CNAME", host: "@", value: target, ttl: 1800 },
    ],
    instructions: [
      `1. Log in to your Namecheap account at namecheap.com`,
      `2. Go to Domain List → click Manage next to ${existing.domain}`,
      `3. Click the Advanced DNS tab`,
      `4. Delete any existing A records for @ and www`,
      `5. Add a CNAME record: Host = @, Value = ${target}`,
      `6. Add a CNAME record: Host = www, Value = ${target}`,
      `7. Save changes — DNS propagation takes up to 24 hours`,
      `8. Return here and click "Verify DNS" once propagation is complete`,
    ],
  });
});

// ── DELETE /api/domains/:id ───────────────────────────────────────────────────
router.delete("/domains/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const domainId = parseInt(req.params.id);
  const [existing] = await db.select().from(userDomainsTable)
    .where(and(eq(userDomainsTable.id, domainId), eq(userDomainsTable.userId, userId)));
  if (!existing) { res.status(404).json({ error: "Domain not found" }); return; }

  if (existing.linkedPageId) {
    await db.update(landingPagesTable)
      .set({ customDomain: null })
      .where(eq(landingPagesTable.id, existing.linkedPageId));
  }

  await db.delete(userDomainsTable).where(eq(userDomainsTable.id, domainId));
  res.status(204).send();
});

export default router;
