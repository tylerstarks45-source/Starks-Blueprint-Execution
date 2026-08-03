import { db } from "@workspace/db";
import { customerRegistry, customerSnapshots } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import type { UCIESummary } from "./types.js";

export async function buildUCIESummary(userId?: number): Promise<UCIESummary> {
  try {
    const whereClause = userId ? sql`WHERE user_id = ${userId}` : sql`WHERE 1=1`;

    const totals = await db.execute(sql`
      SELECT COUNT(*) AS total_customers,
             COUNT(CASE WHEN is_active = true THEN 1 END) AS active_customers,
             AVG(COALESCE(engagement_score, 0)) AS avg_engagement,
             AVG(COALESCE(lifetime_value, 0))   AS avg_ltv,
             COUNT(CASE WHEN duplicate_flag = true THEN 1 END) AS dup_count
        FROM customer_registry
        ${whereClause}
    `);
    const r = ((totals as any).rows ?? [])[0] ?? {};

    const stageResult = await db.execute(sql`
      SELECT current_stage, COUNT(*) AS cnt
        FROM customer_lifecycle
        ${whereClause}
       GROUP BY current_stage
    `);
    const stageBreakdown: Record<string, number> = {};
    for (const row of (stageResult as any).rows ?? []) {
      stageBreakdown[row.current_stage] = Number(row.cnt);
    }

    const healthResult = await db.execute(sql`
      SELECT health_status, COUNT(*) AS cnt
        FROM customer_registry
        ${whereClause}
       GROUP BY health_status
    `);
    const healthBreakdown: Record<string, number> = {};
    for (const row of (healthResult as any).rows ?? []) {
      healthBreakdown[row.health_status] = Number(row.cnt);
    }

    const entityResult = await db.execute(sql`
      SELECT entity_type, COUNT(*) AS cnt
        FROM customer_profiles
        ${whereClause}
       GROUP BY entity_type
    `);
    const entityTypeBreakdown: Record<string, number> = {};
    for (const row of (entityResult as any).rows ?? []) {
      entityTypeBreakdown[row.entity_type] = Number(row.cnt);
    }

    const orgCount = await db.execute(sql`SELECT COUNT(*) AS cnt FROM organization_profiles`);
    const intCount = await db.execute(sql`SELECT COUNT(*) AS cnt FROM customer_interactions`);
    const segCount = await db.execute(sql`SELECT COUNT(*) AS cnt FROM customer_segments`);

    return {
      totalCustomers:       Number(r.total_customers ?? 0),
      totalOrganizations:   Number(((orgCount as any).rows ?? [])[0]?.cnt ?? 0),
      totalInteractions:    Number(((intCount as any).rows ?? [])[0]?.cnt ?? 0),
      totalSegments:        Number(((segCount as any).rows ?? [])[0]?.cnt ?? 0),
      activeCustomers:      Number(r.active_customers ?? 0),
      averageEngagement:    Number(r.avg_engagement ?? 0),
      averageLifetimeValue: Number(r.avg_ltv ?? 0),
      stageBreakdown,
      healthBreakdown,
      entityTypeBreakdown,
      duplicateFlagCount:   Number(r.dup_count ?? 0),
      computedAt:           new Date().toISOString(),
    };
  } catch {
    return {
      totalCustomers: 0, totalOrganizations: 0, totalInteractions: 0,
      totalSegments: 0, activeCustomers: 0, averageEngagement: 0,
      averageLifetimeValue: 0, stageBreakdown: {}, healthBreakdown: {},
      entityTypeBreakdown: {}, duplicateFlagCount: 0,
      computedAt: new Date().toISOString(),
    };
  }
}

export async function captureUCIESnapshot(userId?: number) {
  const s = await buildUCIESummary(userId);
  const rows = (await db.insert(customerSnapshots).values({
    totalCustomers:        s.totalCustomers,
    totalOrganizations:    s.totalOrganizations,
    totalInteractions:     s.totalInteractions,
    totalSegments:         s.totalSegments,
    activeCustomers:       s.activeCustomers,
    stageBreakdown:        s.stageBreakdown,
    healthBreakdown:       s.healthBreakdown,
    entityTypeBreakdown:   s.entityTypeBreakdown,
    averageEngagement:     s.averageEngagement,
    averageLifetimeValue:  s.averageLifetimeValue,
    duplicateFlagCount:    s.duplicateFlagCount,
    lawApplied:            true,
    snapshotData:          { computedAt: s.computedAt },
  }).returning()) as any[];
  return rows[0];
}

export async function runUCIEMaintenance(userId?: number): Promise<void> {
  await captureUCIESnapshot(userId);
}
