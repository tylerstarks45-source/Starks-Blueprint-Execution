// Build 056 — Unified Revenue, Commerce & Monetization Platform (URCMP)
// Orchestrator: builds the URCMP summary and handles registry maintenance.

import { db } from "@workspace/db";
import {
  commerceRegistry,
  commerceSnapshots,
} from "@workspace/db/schema";
import { sql, type SQL } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { URCMPSummary } from "./types.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

async function count(table: string, where?: SQL): Promise<number> {
  const clause = where ? sql` WHERE ${where}` : sql``;
  const result = await db.execute(sql`SELECT COUNT(*) AS cnt FROM ${sql.identifier(table)}${clause}`);
  return Number(((result as any).rows ?? [])[0]?.cnt ?? 0);
}

async function sumColumn(table: string, column: string, where?: SQL): Promise<number> {
  const clause = where ? sql` WHERE ${where}` : sql``;
  const result = await db.execute(
    sql`SELECT COALESCE(SUM(${sql.identifier(column)}), 0) AS total FROM ${sql.identifier(table)}${clause}`
  );
  return Number(((result as any).rows ?? [])[0]?.total ?? 0);
}

// ─── Catalog Health Engine ────────────────────────────────────────────────────

async function computeCatalogHealthScore(businessId?: number): Promise<number> {
  const bCond = businessId ? sql`business_id = ${businessId}` : sql`TRUE`;
  const catalogs  = await count("commerce_catalogs",  bCond);
  const products  = await count("commerce_products",  sql`${bCond} AND status = 'active'`);
  const services  = await count("commerce_services",  sql`${bCond} AND status = 'available'`);
  const offers    = await count("commerce_offers",    sql`${bCond} AND status = 'active'`);

  if (catalogs === 0) return 0;
  let score = 0;
  if (catalogs  >= 1) score += 20;
  if (products  >= 1) score += 20;
  if (services  >= 1) score += 15;
  if (offers    >= 1) score += 20;
  if (products  >= 5) score += 10;
  if (offers    >= 3) score += 10;
  if (services  >= 3) score +=  5;
  return Math.min(100, score);
}

async function computePricingCompletenessScore(businessId?: number): Promise<number> {
  const bCond = businessId ? sql`business_id = ${businessId}` : sql`TRUE`;
  const models  = await count("pricing_models", bCond);
  const offers  = await count("commerce_offers", sql`${bCond} AND price IS NOT NULL`);
  const total   = await count("commerce_offers", bCond);
  if (models === 0 && total === 0) return 0;
  let score = 0;
  if (models >= 1) score += 30;
  if (models >= 3) score += 20;
  if (total > 0 && offers === total) score += 50;
  else if (total > 0) score += Math.round((offers / total) * 50);
  return Math.min(100, score);
}

async function computeCheckoutReadinessScore(businessId?: number): Promise<number> {
  const bCond = businessId ? sql`business_id = ${businessId}` : sql`TRUE`;
  const profiles = await count("checkout_profiles", bCond);
  if (profiles === 0) return 0;
  const ready = await count("checkout_profiles", sql`${bCond} AND status = 'ready'`);
  return Math.min(100, Math.round((ready / profiles) * 100));
}

async function computeMonetizationScore(
  catalogHealth: number,
  pricingCompleteness: number,
  checkoutReadiness: number,
  streams: number
): Promise<number> {
  const streamBonus = Math.min(20, streams * 4);
  return Math.min(100, Math.round(
    catalogHealth * 0.35 + pricingCompleteness * 0.30 + checkoutReadiness * 0.20 + streamBonus * 0.15
  ));
}

// ─── Governance Engine ────────────────────────────────────────────────────────

async function findMissingMonetization(businessId?: number): Promise<string[]> {
  const bCond = businessId ? sql`business_id = ${businessId}` : sql`TRUE`;
  const missing: string[] = [];
  const subscriptions = await count("subscription_contracts", sql`${bCond} AND status = 'active'`);
  if (subscriptions === 0) missing.push("No active subscription revenue stream");
  const offers = await count("commerce_offers", bCond);
  if (offers === 0) missing.push("No offers configured — customers cannot purchase");
  const pricing = await count("pricing_models", bCond);
  if (pricing === 0) missing.push("No pricing models defined");
  const streams = await count("revenue_streams", sql`${bCond} AND status = 'active'`);
  if (streams === 0) missing.push("No active revenue streams tracked");
  return missing;
}

async function findOpenOpportunities(businessId?: number): Promise<string[]> {
  const bCond = businessId ? sql`business_id = ${businessId}` : sql`TRUE`;
  const opps: string[] = [];
  const bundles = await count("commerce_bundles", bCond);
  if (bundles === 0) opps.push("No product bundles — bundle upsell opportunity");
  const quotes = await count("quotes", sql`${bCond} AND status = 'draft'`);
  if (quotes > 0) opps.push(`${quotes} draft quote(s) not yet sent`);
  const abandoned = await count("shopping_carts", sql`${bCond} AND status = 'abandoned'`);
  if (abandoned > 0) opps.push(`${abandoned} abandoned cart(s) — re-engagement opportunity`);
  return opps;
}

// ─── Summary Builder ─────────────────────────────────────────────────────────

export async function buildURCMPSummary(userId?: number): Promise<URCMPSummary> {
  try {
    const bCond = userId ? sql`user_id = ${userId}` : sql`TRUE`;

    const [
      totalCatalogs,
      totalProducts,
      totalServices,
      totalOffers,
      totalBundles,
      totalVariants,
      totalPricingModels,
      totalSubscriptions,
      activeSubscriptions,
      totalContracts,
      totalQuotes,
      totalProposals,
      totalInvoices,
      totalRevenueStreams,
      estimatedMonthlyRevenue,
      openDiagnostics,
      criticalDiagnostics,
    ] = await Promise.all([
      count("commerce_catalogs", bCond),
      count("commerce_products", bCond),
      count("commerce_services", bCond),
      count("commerce_offers", bCond),
      count("commerce_bundles", bCond),
      count("commerce_variants", bCond),
      count("pricing_models", bCond),
      count("subscription_contracts", bCond),
      count("subscription_contracts", sql`${bCond} AND status = 'active'`),
      count("contracts", bCond),
      count("quotes", bCond),
      count("proposals", bCond),
      count("invoice_profiles", bCond),
      count("revenue_streams", sql`${bCond} AND status = 'active'`),
      sumColumn("revenue_streams", "estimated_monthly_revenue", sql`${bCond} AND status = 'active'`),
      count("commerce_diagnostics", sql`${bCond} AND is_resolved = false`),
      count("commerce_diagnostics", sql`${bCond} AND severity = 'critical' AND is_resolved = false`),
    ]);

    const businessId = undefined; // summary is user-scoped
    const [catalogHealthScore, pricingCompletenessScore, checkoutReadinessScore] = await Promise.all([
      computeCatalogHealthScore(),
      computePricingCompletenessScore(),
      computeCheckoutReadinessScore(),
    ]);

    const monetizationScore = await computeMonetizationScore(
      catalogHealthScore, pricingCompletenessScore, checkoutReadinessScore, totalRevenueStreams
    );

    const [missingMonetization, openOpportunities] = await Promise.all([
      findMissingMonetization(),
      findOpenOpportunities(),
    ]);

    return {
      totalCatalogs, totalProducts, totalServices, totalOffers, totalBundles,
      totalVariants, totalPricingModels, totalSubscriptions, activeSubscriptions,
      totalContracts, totalQuotes, totalProposals, totalInvoices, totalRevenueStreams,
      estimatedMonthlyRevenue, monetizationScore, catalogHealthScore, pricingCompletenessScore,
      checkoutReadinessScore, openDiagnostics, criticalDiagnostics,
      missingMonetization, openOpportunities,
      computedAt: new Date().toISOString(),
    };
  } catch {
    return {
      totalCatalogs: 0, totalProducts: 0, totalServices: 0, totalOffers: 0,
      totalBundles: 0, totalVariants: 0, totalPricingModels: 0, totalSubscriptions: 0,
      activeSubscriptions: 0, totalContracts: 0, totalQuotes: 0, totalProposals: 0,
      totalInvoices: 0, totalRevenueStreams: 0, estimatedMonthlyRevenue: 0,
      monetizationScore: 0, catalogHealthScore: 0, pricingCompletenessScore: 0,
      checkoutReadinessScore: 0, openDiagnostics: 0, criticalDiagnostics: 0,
      missingMonetization: [], openOpportunities: [],
      computedAt: new Date().toISOString(),
    };
  }
}

// ─── Snapshot capture ────────────────────────────────────────────────────────

export async function captureURCMPSnapshot(userId?: number): Promise<void> {
  const s = await buildURCMPSummary(userId);
  await db.insert(commerceSnapshots).values({
    snapshotId:               `snap-${randomUUID()}`,
    userId,
    totalCatalogs:            s.totalCatalogs,
    totalProducts:            s.totalProducts,
    totalServices:            s.totalServices,
    totalOffers:              s.totalOffers,
    totalSubscriptions:       s.totalSubscriptions,
    activeSubscriptions:      s.activeSubscriptions,
    estimatedMonthlyRevenue:  s.estimatedMonthlyRevenue,
    monetizationScore:        s.monetizationScore,
    catalogHealthScore:       s.catalogHealthScore,
    pricingCompletenessScore: s.pricingCompletenessScore,
  });
}

// ─── Registry upsert ─────────────────────────────────────────────────────────

export async function upsertCommerceRegistry(userId?: number, businessId?: number): Promise<void> {
  const s = await buildURCMPSummary(userId);
  await db.execute(sql`
    INSERT INTO commerce_registry (
      registry_id, user_id, business_id,
      total_catalogs, total_products, total_services, total_offers, total_bundles,
      total_variants, total_pricing_models, total_subscriptions, active_subscriptions,
      total_contracts, total_quotes, total_proposals, total_invoices, total_revenue_streams,
      estimated_monthly_revenue, monetization_score, catalog_health_score,
      pricing_completeness_score, checkout_readiness_score,
      missing_monetization, open_opportunities, last_analyzed_at, updated_at
    )
    VALUES (
      ${`reg-${randomUUID()}`}, ${userId ?? null}, ${businessId ?? null},
      ${s.totalCatalogs}, ${s.totalProducts}, ${s.totalServices}, ${s.totalOffers}, ${s.totalBundles},
      ${s.totalVariants}, ${s.totalPricingModels}, ${s.totalSubscriptions}, ${s.activeSubscriptions},
      ${s.totalContracts}, ${s.totalQuotes}, ${s.totalProposals}, ${s.totalInvoices}, ${s.totalRevenueStreams},
      ${s.estimatedMonthlyRevenue}, ${s.monetizationScore}, ${s.catalogHealthScore},
      ${s.pricingCompletenessScore}, ${s.checkoutReadinessScore},
      ${JSON.stringify(s.missingMonetization)}, ${JSON.stringify(s.openOpportunities)},
      NOW(), NOW()
    )
    ON CONFLICT (business_id)
    DO UPDATE SET
      total_catalogs             = EXCLUDED.total_catalogs,
      total_products             = EXCLUDED.total_products,
      total_services             = EXCLUDED.total_services,
      total_offers               = EXCLUDED.total_offers,
      total_bundles              = EXCLUDED.total_bundles,
      total_variants             = EXCLUDED.total_variants,
      total_pricing_models       = EXCLUDED.total_pricing_models,
      total_subscriptions        = EXCLUDED.total_subscriptions,
      active_subscriptions       = EXCLUDED.active_subscriptions,
      total_contracts            = EXCLUDED.total_contracts,
      total_quotes               = EXCLUDED.total_quotes,
      total_proposals            = EXCLUDED.total_proposals,
      total_invoices             = EXCLUDED.total_invoices,
      total_revenue_streams      = EXCLUDED.total_revenue_streams,
      estimated_monthly_revenue  = EXCLUDED.estimated_monthly_revenue,
      monetization_score         = EXCLUDED.monetization_score,
      catalog_health_score       = EXCLUDED.catalog_health_score,
      pricing_completeness_score = EXCLUDED.pricing_completeness_score,
      checkout_readiness_score   = EXCLUDED.checkout_readiness_score,
      missing_monetization       = EXCLUDED.missing_monetization,
      open_opportunities         = EXCLUDED.open_opportunities,
      last_analyzed_at           = NOW(),
      updated_at                 = NOW()
  `);
}

// ─── Maintenance ─────────────────────────────────────────────────────────────

export async function runURCMPMaintenance(userId?: number): Promise<void> {
  await captureURCMPSnapshot(userId);
}
