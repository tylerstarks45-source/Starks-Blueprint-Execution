// Build 056 — Unified Revenue, Commerce & Monetization Platform (URCMP)
// REST API: /api/commerce/*  (19 endpoints)

import { Router } from "express";
import { db } from "@workspace/db";
import {
  commerceCatalogs,
  commerceProducts,
  commerceServices,
  commerceOffers,
  commerceBundles,
  pricingModels,
  subscriptionContracts,
  quotes,
  contracts,
  invoiceProfiles,
} from "@workspace/db/schema";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth } from "../lib/auth.js";
import { buildURCMPSummary, upsertCommerceRegistry } from "../lib/unified-revenue-commerce/urcmp-orchestrator.js";

const router = Router();

// ─── POST /commerce/catalogs ──────────────────────────────────────────────────
router.post("/catalogs", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const {
      title, description, catalogType = "general",
      defaultCurrency = "USD", supportedCurrencies = [], businessId, isDefault = false,
    } = req.body as Record<string, any>;
    if (!title) res.status(400).json({ error: "title is required" }); return;

    const rows = (await db.insert(commerceCatalogs).values({
      catalogId: `cat-${randomUUID()}`,
      userId,
      businessId: businessId ? Number(businessId) : undefined,
      title, description, catalogType, defaultCurrency, isDefault,
      supportedCurrencies: JSON.stringify(supportedCurrencies),
    }).returning()) as any[];
    res.json({ success: true, catalog: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /commerce/products ──────────────────────────────────────────────────
router.post("/products", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const {
      title, description, productType, catalogId, businessId,
      sku, basePrice, currency = "USD", isDigital = false,
      inventoryPolicy = "unlimited", inventoryQty,
    } = req.body as Record<string, any>;
    if (!title || !productType) res.status(400).json({ error: "title and productType are required" }); return;

    const rows = (await db.insert(commerceProducts).values({
      productId: `prod-${randomUUID()}`,
      userId,
      businessId: businessId ? Number(businessId) : undefined,
      catalogId, title, description, productType, sku,
      basePrice: basePrice != null ? Number(basePrice) : undefined,
      currency, isDigital, inventoryPolicy,
      inventoryQty: inventoryQty != null ? Number(inventoryQty) : undefined,
    }).returning()) as any[];
    res.json({ success: true, product: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /commerce/services ──────────────────────────────────────────────────
router.post("/services", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const {
      title, description, serviceType, catalogId, businessId,
      deliveryMode = "remote", basePrice, pricingModel = "fixed", currency = "USD",
      durationHours, capacityLimit, requiresBooking = false,
    } = req.body as Record<string, any>;
    if (!title || !serviceType) res.status(400).json({ error: "title and serviceType are required" }); return;

    const rows = (await db.insert(commerceServices).values({
      serviceId: `svc-${randomUUID()}`,
      userId,
      businessId: businessId ? Number(businessId) : undefined,
      catalogId, title, description, serviceType, deliveryMode, pricingModel,
      basePrice: basePrice != null ? Number(basePrice) : undefined,
      currency,
      durationHours: durationHours != null ? Number(durationHours) : undefined,
      capacityLimit: capacityLimit != null ? Number(capacityLimit) : undefined,
      requiresBooking,
    }).returning()) as any[];
    res.json({ success: true, service: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /commerce/offers ────────────────────────────────────────────────────
router.post("/offers", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const {
      title, headline, description, offerType, catalogId, businessId,
      price, compareAtPrice, currency = "USD", pricingModelId,
      productIds = [], serviceIds = [], validFrom, validUntil, maxRedemptions,
    } = req.body as Record<string, any>;
    if (!title || !offerType) res.status(400).json({ error: "title and offerType are required" }); return;

    const rows = (await db.insert(commerceOffers).values({
      offerId: `offer-${randomUUID()}`,
      userId,
      businessId: businessId ? Number(businessId) : undefined,
      catalogId, title, headline, description, offerType,
      price: price != null ? Number(price) : undefined,
      compareAtPrice: compareAtPrice != null ? Number(compareAtPrice) : undefined,
      currency, pricingModelId,
      productIds: JSON.stringify(productIds),
      serviceIds: JSON.stringify(serviceIds),
      validFrom: validFrom ? new Date(validFrom) : undefined,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      maxRedemptions: maxRedemptions != null ? Number(maxRedemptions) : undefined,
    }).returning()) as any[];
    res.json({ success: true, offer: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /commerce/bundles ────────────────────────────────────────────────────
router.post("/bundles", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const {
      title, description, bundleType = "curated", catalogId, businessId,
      bundlePrice, currency = "USD", discountType = "none", discountValue,
      offerIds = [], productIds = [], serviceIds = [], isLimitedTime = false, expiresAt,
    } = req.body as Record<string, any>;
    if (!title) res.status(400).json({ error: "title is required" }); return;

    const rows = (await db.insert(commerceBundles).values({
      bundleId: `bundle-${randomUUID()}`,
      userId,
      businessId: businessId ? Number(businessId) : undefined,
      catalogId, title, description, bundleType,
      bundlePrice: bundlePrice != null ? Number(bundlePrice) : undefined,
      currency, discountType,
      discountValue: discountValue != null ? Number(discountValue) : undefined,
      offerIds: JSON.stringify(offerIds),
      productIds: JSON.stringify(productIds),
      serviceIds: JSON.stringify(serviceIds),
      isLimitedTime,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    }).returning()) as any[];
    res.json({ success: true, bundle: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /commerce/pricing ────────────────────────────────────────────────────
router.post("/pricing", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const {
      title, modelType, catalogId, businessId,
      currency = "USD", baseAmount, billingInterval, trialDays, setupFee,
      tiers = [], usageMetric, regionOverrides = {},
    } = req.body as Record<string, any>;
    if (!title || !modelType) res.status(400).json({ error: "title and modelType are required" }); return;

    const rows = (await db.insert(pricingModels).values({
      modelId: `price-${randomUUID()}`,
      userId,
      businessId: businessId ? Number(businessId) : undefined,
      catalogId, title, modelType, currency,
      baseAmount: baseAmount != null ? Number(baseAmount) : undefined,
      billingInterval,
      trialDays: trialDays != null ? Number(trialDays) : undefined,
      setupFee: setupFee != null ? Number(setupFee) : undefined,
      tiers: JSON.stringify(tiers),
      usageMetric,
      regionOverrides: JSON.stringify(regionOverrides),
    }).returning()) as any[];
    res.json({ success: true, pricingModel: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /commerce/subscriptions ─────────────────────────────────────────────
router.post("/subscriptions", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const {
      customerId, offerId, pricingModelId, businessId, planTitle,
      amount, currency = "USD", billingInterval = "monthly", trialDays,
    } = req.body as Record<string, any>;
    if (!billingInterval) res.status(400).json({ error: "billingInterval is required" }); return;

    const trialEndsAt = trialDays
      ? new Date(Date.now() + Number(trialDays) * 86400_000)
      : undefined;

    const rows = (await db.insert(subscriptionContracts).values({
      contractId: `sub-${randomUUID()}`,
      userId,
      businessId: businessId ? Number(businessId) : undefined,
      customerId, offerId, pricingModelId, planTitle,
      amount: amount != null ? Number(amount) : undefined,
      currency, billingInterval,
      status: trialEndsAt ? "trialing" : "pending",
      trialEndsAt,
    }).returning()) as any[];
    res.json({ success: true, subscription: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /commerce/contracts ──────────────────────────────────────────────────
router.post("/contracts", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const {
      title, contractType, customerId, businessId, totalValue, currency = "USD",
      termStartDate, termEndDate, renewalTerms, clauses = [], relatedQuoteId,
    } = req.body as Record<string, any>;
    if (!title || !contractType) res.status(400).json({ error: "title and contractType are required" }); return;

    const rows = (await db.insert(contracts).values({
      contractDocId: `contract-${randomUUID()}`,
      userId,
      businessId: businessId ? Number(businessId) : undefined,
      customerId, title, contractType,
      totalValue: totalValue != null ? Number(totalValue) : undefined,
      currency,
      termStartDate: termStartDate ? new Date(termStartDate) : undefined,
      termEndDate: termEndDate ? new Date(termEndDate) : undefined,
      renewalTerms, relatedQuoteId,
      clauses: JSON.stringify(clauses),
    }).returning()) as any[];
    res.json({ success: true, contract: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /commerce/quotes ─────────────────────────────────────────────────────
router.post("/quotes", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const {
      title, description, customerId, businessId,
      lineItems = [], subtotal, total, currency = "USD", validUntil, terms, notes,
    } = req.body as Record<string, any>;
    if (!title) res.status(400).json({ error: "title is required" }); return;

    const rows = (await db.insert(quotes).values({
      quoteId: `quote-${randomUUID()}`,
      userId,
      businessId: businessId ? Number(businessId) : undefined,
      customerId, title, description,
      lineItems: JSON.stringify(lineItems),
      subtotal: subtotal != null ? Number(subtotal) : undefined,
      total: total != null ? Number(total) : undefined,
      currency, terms, notes,
      validUntil: validUntil ? new Date(validUntil) : undefined,
    }).returning()) as any[];
    res.json({ success: true, quote: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /commerce/invoices ───────────────────────────────────────────────────
router.post("/invoices", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const {
      title, customerId, businessId, contractDocId, subscriptionContractId,
      lineItems = [], subtotal, total, currency = "USD", dueDate, notes,
    } = req.body as Record<string, any>;

    const rows = (await db.insert(invoiceProfiles).values({
      invoiceId: `inv-${randomUUID()}`,
      userId,
      businessId: businessId ? Number(businessId) : undefined,
      customerId, title, contractDocId, subscriptionContractId,
      lineItems: JSON.stringify(lineItems),
      subtotal: subtotal != null ? Number(subtotal) : undefined,
      total: total != null ? Number(total) : undefined,
      currency, notes,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    }).returning()) as any[];
    res.json({ success: true, invoice: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /commerce/catalogs ────────────────────────────────────────────────────
router.get("/catalogs", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { businessId } = req.query as Record<string, any>;
    const where = businessId
      ? sql`WHERE user_id = ${userId} AND business_id = ${Number(businessId)}`
      : sql`WHERE user_id = ${userId}`;
    const result = await db.execute(sql`SELECT * FROM commerce_catalogs ${where} ORDER BY created_at DESC`);
    res.json({ catalogs: (result as any).rows ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /commerce/products ────────────────────────────────────────────────────
router.get("/products", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { catalogId, status, productType } = req.query as Record<string, any>;
    let where = sql`WHERE user_id = ${userId}`;
    if (catalogId) where = sql`${where} AND catalog_id = ${catalogId}`;
    if (status)    where = sql`${where} AND status = ${status}`;
    if (productType) where = sql`${where} AND product_type = ${productType}`;
    const result = await db.execute(sql`SELECT * FROM commerce_products ${where} ORDER BY created_at DESC LIMIT 100`);
    res.json({ products: (result as any).rows ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /commerce/offers ──────────────────────────────────────────────────────
router.get("/offers", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { catalogId, status, offerType } = req.query as Record<string, any>;
    let where = sql`WHERE user_id = ${userId}`;
    if (catalogId) where = sql`${where} AND catalog_id = ${catalogId}`;
    if (status)    where = sql`${where} AND status = ${status}`;
    if (offerType) where = sql`${where} AND offer_type = ${offerType}`;
    const result = await db.execute(sql`SELECT * FROM commerce_offers ${where} ORDER BY created_at DESC LIMIT 100`);
    res.json({ offers: (result as any).rows ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /commerce/revenue ─────────────────────────────────────────────────────
router.get("/revenue", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { businessId } = req.query as Record<string, any>;
    const bWhere = businessId
      ? sql`WHERE user_id = ${userId} AND business_id = ${Number(businessId)}`
      : sql`WHERE user_id = ${userId}`;
    const streams = await db.execute(sql`SELECT * FROM revenue_streams ${bWhere} ORDER BY estimated_monthly_revenue DESC NULLS LAST`);
    const subscriptions = await db.execute(sql`
      SELECT status, COUNT(*) AS cnt, COALESCE(SUM(amount), 0) AS total
        FROM subscription_contracts
       ${bWhere}
       GROUP BY status
    `);
    res.json({
      revenueStreams: (streams as any).rows ?? [],
      subscriptionSummary: (subscriptions as any).rows ?? [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /commerce/forecast ────────────────────────────────────────────────────
router.get("/forecast", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { businessId } = req.query as Record<string, any>;
    const where = businessId
      ? sql`WHERE user_id = ${userId} AND business_id = ${Number(businessId)}`
      : sql`WHERE user_id = ${userId}`;
    const result = await db.execute(sql`SELECT * FROM revenue_forecasts ${where} ORDER BY created_at DESC LIMIT 20`);
    res.json({ forecasts: (result as any).rows ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /commerce/diagnostics ─────────────────────────────────────────────────
router.get("/diagnostics", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { businessId, severity } = req.query as Record<string, any>;
    let where = sql`WHERE user_id = ${userId} AND is_resolved = false`;
    if (businessId) where = sql`${where} AND business_id = ${Number(businessId)}`;
    if (severity)   where = sql`${where} AND severity = ${severity}`;
    const result = await db.execute(sql`SELECT * FROM commerce_diagnostics ${where} ORDER BY created_at DESC LIMIT 100`);
    res.json({ diagnostics: (result as any).rows ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /commerce/search ──────────────────────────────────────────────────────
router.get("/search", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { q = "" } = req.query as Record<string, any>;
    const term = `%${String(q).toLowerCase()}%`;
    const [products, services, offers] = await Promise.all([
      db.execute(sql`SELECT 'product' AS type, product_id AS id, title, status FROM commerce_products WHERE user_id = ${userId} AND LOWER(title) LIKE ${term} LIMIT 10`),
      db.execute(sql`SELECT 'service' AS type, service_id AS id, title, status FROM commerce_services WHERE user_id = ${userId} AND LOWER(title) LIKE ${term} LIMIT 10`),
      db.execute(sql`SELECT 'offer'   AS type, offer_id   AS id, title, status FROM commerce_offers   WHERE user_id = ${userId} AND LOWER(title) LIKE ${term} LIMIT 10`),
    ]);
    const results = [
      ...((products as any).rows ?? []),
      ...((services as any).rows ?? []),
      ...((offers   as any).rows ?? []),
    ];
    res.json({ query: q, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /commerce/snapshots ───────────────────────────────────────────────────
router.get("/snapshots", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { businessId } = req.query as Record<string, any>;
    const where = businessId
      ? sql`WHERE user_id = ${userId} AND business_id = ${Number(businessId)}`
      : sql`WHERE user_id = ${userId}`;
    const result = await db.execute(sql`SELECT * FROM commerce_snapshots ${where} ORDER BY created_at DESC LIMIT 30`);
    res.json({ snapshots: (result as any).rows ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /commerce/registry ────────────────────────────────────────────────────
router.get("/registry", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { businessId, refresh } = req.query as Record<string, any>;

    if (refresh === "true") {
      await upsertCommerceRegistry(userId, businessId ? Number(businessId) : undefined);
    }

    const where = businessId
      ? sql`WHERE user_id = ${userId} AND business_id = ${Number(businessId)}`
      : sql`WHERE user_id = ${userId}`;
    const result = await db.execute(sql`SELECT * FROM commerce_registry ${where} ORDER BY updated_at DESC LIMIT 1`);
    const row = ((result as any).rows ?? [])[0];

    if (!row) {
      // Build on demand if no registry exists yet
      const summary = await buildURCMPSummary(userId);
      res.json({ registry: null, summary });
      return;
    }

    res.json({ registry: row });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
