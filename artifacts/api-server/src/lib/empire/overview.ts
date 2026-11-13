import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import {
  db, businessesTable, businessHealthScoresTable, systemActivityEventsTable, revenueStreams, canonicalAssets, pendingApprovalsTable,
  systemRevenueProvidersTable,
} from "@workspace/db";
import { listBusinessTypes, typeNameFor } from "./business-types";

// Empire Command Center data. Verified revenue comes only from the
// system_activity_events revenue rows written by authenticated provider sync
// (revenue_provider set). Hand-logged amounts and unauthenticated affiliate
// pixel/postback conversions are excluded. Income-stream estimates are reported separately as projections
// and never added to verified totals.

const DAY = 86_400_000;

export async function getEmpireOverview(userId: number) {
  const businesses = await db
    .select({
      id: businessesTable.id, name: businessesTable.name, businessType: businessesTable.businessType, typeKey: businessesTable.typeKey,
      status: businessesTable.status, origin: businessesTable.origin, websiteUrl: businessesTable.websiteUrl,
      systemInstanceId: businessesTable.systemInstanceId, createdAt: businessesTable.createdAt,
    })
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, userId))
    .orderBy(desc(businessesTable.createdAt));
  const ids = businesses.map((b) => b.id);
  const instanceIds = businesses.map((b) => b.systemInstanceId).filter((x): x is number => x != null);
  const since30 = new Date(Date.now() - 30 * DAY);

  const [types, streams, assets, approvals, health, revenue, activity, providerRows] = await Promise.all([
    listBusinessTypes(userId),
    db.select({ businessId: revenueStreams.businessId, status: revenueStreams.status, estimated: revenueStreams.estimatedMonthlyRevenue })
      .from(revenueStreams).where(eq(revenueStreams.userId, userId)),
    db.select({ businessId: canonicalAssets.businessId, count: sql<number>`count(*)::int` })
      .from(canonicalAssets).where(and(eq(canonicalAssets.userId, userId), sql`${canonicalAssets.status} <> 'deleted'`))
      .groupBy(canonicalAssets.businessId),
    ids.length
      ? db.select({ businessId: pendingApprovalsTable.businessId, count: sql<number>`count(*)::int` })
        .from(pendingApprovalsTable).where(and(inArray(pendingApprovalsTable.businessId, ids), eq(pendingApprovalsTable.status, "pending")))
        .groupBy(pendingApprovalsTable.businessId)
      : Promise.resolve([] as { businessId: number; count: number }[]),
    ids.length
      ? db.selectDistinctOn([businessHealthScoresTable.businessId], { businessId: businessHealthScoresTable.businessId, overallHealth: businessHealthScoresTable.overallHealth })
        .from(businessHealthScoresTable).where(inArray(businessHealthScoresTable.businessId, ids))
        .orderBy(businessHealthScoresTable.businessId, desc(businessHealthScoresTable.createdAt))
      : Promise.resolve([] as { businessId: number; overallHealth: number | null }[]),
    instanceIds.length
      ? db.select({
        systemInstanceId: systemActivityEventsTable.systemInstanceId,
        lifetime: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)::bigint`,
        last30: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}) filter (where ${systemActivityEventsTable.createdAt} >= ${since30}), 0)::bigint`,
      }).from(systemActivityEventsTable)
        .where(and(inArray(systemActivityEventsTable.systemInstanceId, instanceIds), eq(systemActivityEventsTable.eventType, "revenue"),
          isNotNull(systemActivityEventsTable.revenueProvider)))
        .groupBy(systemActivityEventsTable.systemInstanceId)
      : Promise.resolve([] as { systemInstanceId: number; lifetime: number; last30: number }[]),
    instanceIds.length
      ? db.select({ systemInstanceId: systemActivityEventsTable.systemInstanceId, eventType: systemActivityEventsTable.eventType,
        description: systemActivityEventsTable.description, amountCents: systemActivityEventsTable.amountCents, createdAt: systemActivityEventsTable.createdAt })
        .from(systemActivityEventsTable).where(inArray(systemActivityEventsTable.systemInstanceId, instanceIds))
        .orderBy(desc(systemActivityEventsTable.createdAt)).limit(15)
      : Promise.resolve([] as { systemInstanceId: number; eventType: string; description: string; amountCents: number | null; createdAt: Date }[]),
    instanceIds.length
      ? db.selectDistinct({ systemInstanceId: systemRevenueProvidersTable.systemInstanceId }).from(systemRevenueProvidersTable)
        .where(and(inArray(systemRevenueProvidersTable.systemInstanceId, instanceIds), eq(systemRevenueProvidersTable.enabled, true)))
      : Promise.resolve([] as { systemInstanceId: number }[]),
  ]);
  const connected = new Set<number>(providerRows.map((r) => r.systemInstanceId));

  const revByInstance = new Map(revenue.map((r) => [r.systemInstanceId, { lifetime: Number(r.lifetime), last30: Number(r.last30) }]));
  const assetsBy = new Map(assets.map((a) => [a.businessId, Number(a.count)]));
  const approvalsBy = new Map(approvals.map((a) => [a.businessId, Number(a.count)]));
  const healthBy = new Map(health.map((h) => [h.businessId, h.overallHealth]));
  const bizByInstance = new Map(businesses.filter((b) => b.systemInstanceId != null).map((b) => [b.systemInstanceId!, b]));

  const liveStreams = streams.filter((s) => s.businessId == null || ids.includes(s.businessId));
  const rows = businesses.map((b) => {
    const own = streams.filter((s) => s.businessId === b.id);
    const rev = b.systemInstanceId != null ? revByInstance.get(b.systemInstanceId) : undefined;
    const tracked = rev != null || (b.systemInstanceId != null && connected.has(b.systemInstanceId));
    return {
      id: b.id, name: b.name, status: b.status, origin: b.origin, websiteUrl: b.websiteUrl,
      typeKey: b.typeKey ?? b.businessType, typeName: typeNameFor(types, b.typeKey, b.businessType),
      incomeStreams: own.length,
      activeStreams: own.filter((s) => s.status === "active").length,
      assets: assetsBy.get(b.id) ?? 0,
      pendingApprovals: approvalsBy.get(b.id) ?? 0,
      health: healthBy.get(b.id) ?? null,
      // null = no revenue source connected, so nothing is measured (not the same as $0).
      verifiedRevenueCents: tracked ? { last30: rev?.last30 ?? 0, lifetime: rev?.lifetime ?? 0 } : null,
      revenueTracked: tracked,
      projectedMonthlyUsd: own.reduce((sum, s) => sum + (s.estimated ?? 0), 0),
    };
  });

  return {
    totals: {
      businesses: rows.length,
      activeBusinesses: rows.filter((r) => r.status === "active").length,
      incomeStreams: liveStreams.length,
      activeStreams: liveStreams.filter((s) => s.status === "active").length,
      assets: assets.reduce((s, a) => s + Number(a.count), 0),
      unassignedAssets: assetsBy.get(null) ?? 0,
      pendingApprovals: rows.reduce((s, r) => s + r.pendingApprovals, 0),
      verifiedRevenueCents: {
        last30: rows.reduce((s, r) => s + (r.verifiedRevenueCents?.last30 ?? 0), 0),
        lifetime: rows.reduce((s, r) => s + (r.verifiedRevenueCents?.lifetime ?? 0), 0),
      },
      businessesWithRevenueTracking: rows.filter((r) => r.revenueTracked).length,
      projectedMonthlyUsd: liveStreams.reduce((s, x) => s + (x.estimated ?? 0), 0),
    },
    businesses: rows,
    recentActivity: activity.map((a) => ({
      businessId: bizByInstance.get(a.systemInstanceId)?.id ?? null,
      businessName: bizByInstance.get(a.systemInstanceId)?.name ?? null,
      eventType: a.eventType, description: a.description, amountCents: a.amountCents, createdAt: a.createdAt,
    })),
  };
}
