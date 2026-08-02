// ── Build 047: Business Organization Engine ───────────────────────────────────
// Owns every business workspace and the organization hierarchy.
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { businessWorkspaces } from "@workspace/db/schema";
import { logger } from "../logger";
import type { BusinessWorkspace, WorkspaceType } from "./types";

/** Create a new business workspace */
export async function createBusinessWorkspace(params: {
  userId:        number;
  businessId?:   number;
  orgId?:        number;
  workspaceName: string;
  workspaceType?: WorkspaceType;
  configuration?: Record<string, unknown>;
}): Promise<BusinessWorkspace> {
  const rows = await db
    .insert(businessWorkspaces as any)
    .values({
      userId:        params.userId,
      businessId:    params.businessId ?? null,
      orgId:         params.orgId ?? null,
      workspaceName: params.workspaceName,
      workspaceType: params.workspaceType ?? "business",
      configuration: params.configuration ?? {},
    })
    .returning() as any[];
  const row = rows[0];
  logger.info({ workspaceId: row.id, userId: params.userId }, "UWPS: business workspace created");
  return row as BusinessWorkspace;
}

/** List workspaces for a user (optionally filter by businessId) */
export async function listBusinessWorkspaces(
  userId: number,
  businessId?: number,
): Promise<BusinessWorkspace[]> {
  const where = businessId
    ? sql`user_id = ${userId} AND business_id = ${businessId} AND status != 'archived'`
    : sql`user_id = ${userId} AND status != 'archived'`;
  const rows = await db
    .select()
    .from(businessWorkspaces as any)
    .where(where)
    .orderBy(sql`created_at DESC`) as any[];
  return rows as BusinessWorkspace[];
}

/** Count workspaces per user */
export async function countBusinessWorkspaces(userId: number): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(businessWorkspaces as any)
    .where(sql`user_id = ${userId} AND status != 'archived'`) as any[];
  return rows[0]?.count ?? 0;
}

/** Archive a workspace */
export async function archiveBusinessWorkspace(
  workspaceId: number,
  userId: number,
): Promise<void> {
  await db
    .update(businessWorkspaces as any)
    .set({ status: "archived", updatedAt: new Date() } as any)
    .where(sql`id = ${workspaceId} AND user_id = ${userId}`);
}
