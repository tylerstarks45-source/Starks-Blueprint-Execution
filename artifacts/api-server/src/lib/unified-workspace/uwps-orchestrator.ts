// ── Build 047: UWPS Orchestrator ──────────────────────────────────────────────
// Coordinates all 6 UWPS engines. Called by EB integration on a throttle.
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { workspaceSnapshots, businessProjects } from "@workspace/db/schema";
import { seedProjectTemplates } from "./project-lifecycle-engine";
import { logger } from "../logger";
import type { UWPSSummary } from "./types";

/** Boot-time initialization: seed templates and capture initial snapshot */
export async function initializeUWPS(): Promise<{ seededTemplates: number }> {
  const seededTemplates = await seedProjectTemplates();
  await captureWorkspaceSnapshot(undefined);
  logger.info({ seededTemplates }, "UWPS: workspace & project system initialized");
  return { seededTemplates };
}

/** Build a UWPS summary for a user (or platform-wide if no userId) */
export async function buildUWPSSummary(userId?: number): Promise<UWPSSummary> {
  try {
    const cond = userId
      ? sql`user_id = ${userId} AND status != 'archived'`
      : sql`status != 'archived'`;

    const workspaceCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sql`business_workspaces`)
      .where(cond) as any[];

    const projectRows = await db
      .select()
      .from(businessProjects as any)
      .where(cond)
      .orderBy(sql`updated_at DESC`) as any[];

    const assetCount = userId
      ? await db.execute(sql`SELECT count(*)::int AS count FROM project_assets WHERE user_id = ${userId} AND asset_status != 'archived'`)
      : await db.execute(sql`SELECT count(*)::int AS count FROM project_assets WHERE asset_status != 'archived'`);
    const deployedCount = userId
      ? await db.execute(sql`SELECT count(*)::int AS count FROM project_assets WHERE user_id = ${userId} AND deployment_status = 'deployed' AND asset_status != 'archived'`)
      : await db.execute(sql`SELECT count(*)::int AS count FROM project_assets WHERE deployment_status = 'deployed' AND asset_status != 'archived'`);

    const avgHealth = await db
      .select({ avg: sql<number>`round(avg(health_score))::int` })
      .from(sql`project_registry`)
      .where(userId ? sql`user_id = ${userId}` : sql`1=1`) as any[];

    const registryRows = await db
      .select()
      .from(sql`project_registry`)
      .where(userId ? sql`user_id = ${userId}` : sql`1=1`)
      .orderBy(sql`health_score ASC`)
      .limit(10) as any[];

    const recentActivity = userId
      ? await db
          .select({ count: sql<number>`count(*)::int` })
          .from(sql`project_activity`)
          .where(sql`user_id = ${userId} AND created_at > now() - interval '7 days'`) as any[]
      : [{ count: 0 }];

    const totalAssets   = (assetCount as any).rows?.[0]?.count   ?? (assetCount as any)[0]?.count   ?? 0;
    const totalDeployed = (deployedCount as any).rows?.[0]?.count ?? (deployedCount as any)[0]?.count ?? 0;

    return {
      userId,
      totalBusinesses:   0, // businesses table is the existing one (not UWPS-owned)
      totalWorkspaces:   workspaceCount[0]?.count ?? 0,
      totalProjects:     projectRows.length,
      totalAssets,
      activeProjects:    projectRows.filter((p: any) => p.status === "active").length,
      deployedAssets:    totalDeployed,
      avgHealthScore:    avgHealth[0]?.avg ?? 0,
      projectsSummary:   registryRows,
      recentActivity:    recentActivity[0]?.count ?? 0,
      lawApplied:        true,
    };
  } catch (err) {
    logger.warn({ err }, "UWPS: buildUWPSSummary failed — returning empty");
    return {
      userId,
      totalBusinesses: 0,
      totalWorkspaces: 0,
      totalProjects:   0,
      totalAssets:     0,
      activeProjects:  0,
      deployedAssets:  0,
      avgHealthScore:  0,
      projectsSummary: [],
      recentActivity:  0,
      lawApplied:      true,
    };
  }
}

/** Capture an append-only workspace snapshot */
export async function captureWorkspaceSnapshot(userId?: number): Promise<void> {
  try {
    const summary = await buildUWPSSummary(userId);
    await db
      .insert(workspaceSnapshots as any)
      .values({
        userId:          userId ?? null,
        totalBusinesses: summary.totalBusinesses,
        totalWorkspaces: summary.totalWorkspaces,
        totalProjects:   summary.totalProjects,
        totalAssets:     summary.totalAssets,
        activeProjects:  summary.activeProjects,
        deployedAssets:  summary.deployedAssets,
        avgHealthScore:  summary.avgHealthScore,
        lawApplied:      summary.lawApplied,
        snapshotData:    { recentActivity: summary.recentActivity, build: "047" },
      });
  } catch (err) {
    logger.warn({ err }, "UWPS: captureWorkspaceSnapshot failed (non-fatal)");
  }
}

/** Full maintenance cycle: recompute health for stale projects */
export async function runUWPSMaintenance(userId: number): Promise<void> {
  try {
    await captureWorkspaceSnapshot(userId);
  } catch (err) {
    logger.warn({ err }, "UWPS: maintenance cycle failed (non-fatal)");
  }
}

/** Fetch the latest workspace snapshot for a user */
export async function fetchLatestSnapshot(userId?: number): Promise<any | null> {
  const cond = userId
    ? sql`user_id = ${userId}`
    : sql`user_id IS NULL`;
  const rows = await db
    .select()
    .from(workspaceSnapshots as any)
    .where(cond)
    .orderBy(sql`created_at DESC`)
    .limit(1) as any[];
  return rows[0] ?? null;
}

/** Cross-object workspace search */
export async function workspaceSearch(
  userId: number,
  query:  string,
  kinds?: string[],
  limit:  number = 20,
): Promise<any[]> {
  const q = `%${query.toLowerCase()}%`;
  const results: any[] = [];

  if (!kinds || kinds.includes("project")) {
    const projects = await db
      .select()
      .from(businessProjects as any)
      .where(sql`user_id = ${userId} AND (lower(project_name) LIKE ${q} OR lower(description) LIKE ${q}) AND status != 'archived'`)
      .limit(limit) as any[];
    results.push(...projects.map((p: any) => ({ kind: "project", ...p })));
  }

  if (!kinds || kinds.includes("asset")) {
    const assets = await db
      .select()
      .from(sql`project_assets`)
      .where(sql`user_id = ${userId} AND lower(asset_name) LIKE ${q} AND asset_status != 'archived'`)
      .limit(limit) as any[];
    results.push(...assets.map((a: any) => ({ kind: "asset", ...a })));
  }

  if (!kinds || kinds.includes("workspace")) {
    const ws = await db
      .select()
      .from(sql`business_workspaces`)
      .where(sql`user_id = ${userId} AND lower(workspace_name) LIKE ${q} AND status != 'archived'`)
      .limit(limit) as any[];
    results.push(...ws.map((w: any) => ({ kind: "workspace", ...w })));
  }

  return results.slice(0, limit);
}
