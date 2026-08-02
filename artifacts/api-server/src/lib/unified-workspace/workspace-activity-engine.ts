// ── Build 047: Workspace Activity Engine ─────────────────────────────────────
// Records everything that occurs inside a workspace — append-only timeline.
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { projectActivity } from "@workspace/db/schema";

export type ActivityType =
  | "workspace_created"
  | "project_created"
  | "project_archived"
  | "project_phase_advanced"
  | "asset_added"
  | "asset_updated"
  | "asset_deployed"
  | "asset_deleted"
  | "asset_version_recorded"
  | "dependency_added"
  | "health_computed"
  | "template_applied"
  | "snapshot_captured";

/** Append a workspace activity event */
export async function appendActivity(
  userId:       number,
  activityType: ActivityType,
  details:      Record<string, unknown>,
  options?: {
    workspaceId?: number;
    projectId?:   number;
    assetId?:     number;
    businessId?:  number;
    actor?:       "user" | "ash" | "system";
    summary?:     string;
  },
): Promise<void> {
  const summary = options?.summary ?? buildSummary(activityType, details);
  await db
    .insert(projectActivity as any)
    .values({
      userId,
      workspaceId: options?.workspaceId ?? null,
      projectId:   options?.projectId   ?? null,
      assetId:     options?.assetId     ?? null,
      businessId:  options?.businessId  ?? null,
      activityType,
      actor:       options?.actor       ?? "user",
      summary,
      details,
    });
}

/** Get recent activity for a user */
export async function getRecentActivity(
  userId:     number,
  limit:      number = 50,
  projectId?: number,
): Promise<any[]> {
  const cond = projectId
    ? sql`user_id = ${userId} AND project_id = ${projectId}`
    : sql`user_id = ${userId}`;
  const rows = await db
    .select()
    .from(projectActivity as any)
    .where(cond)
    .orderBy(sql`created_at DESC`)
    .limit(limit) as any[];
  return rows;
}

/** Count activity events for a project (within last N days) */
export async function countRecentActivity(
  userId:   number,
  days:     number = 7,
): Promise<number> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projectActivity as any)
    .where(sql`user_id = ${userId} AND created_at >= ${since}`) as any[];
  return rows[0]?.count ?? 0;
}

function buildSummary(activityType: ActivityType, details: Record<string, unknown>): string {
  switch (activityType) {
    case "workspace_created":    return `Workspace created${details.workspaceName ? `: ${details.workspaceName}` : ""}`;
    case "project_created":      return `Project created${details.projectName ? `: ${details.projectName}` : ""}`;
    case "project_archived":     return `Project archived${details.projectName ? `: ${details.projectName}` : ""}`;
    case "asset_added":          return `Asset added${details.assetName ? `: ${details.assetName}` : ""}`;
    case "asset_updated":        return `Asset updated${details.assetName ? `: ${details.assetName}` : ""}`;
    case "asset_deployed":       return `Asset deployed${details.assetName ? `: ${details.assetName}` : ""}`;
    case "health_computed":      return `Project health computed — score: ${details.score ?? "unknown"}`;
    case "template_applied":     return `Template applied${details.templateName ? `: ${details.templateName}` : ""}`;
    case "snapshot_captured":    return `Workspace snapshot captured`;
    default:                     return String(activityType).replace(/_/g, " ");
  }
}
