// ── Build 046: Workspace Engine ───────────────────────────────────────────────
// Owns workspaces across every builder and application.
import { db }                          from "@workspace/db";
import { platformWorkspaces, platformActivity } from "@workspace/db/schema";
import { eq, and, desc }               from "drizzle-orm";
import { appendActivity }              from "./platform-runtime-engine";
import type { WorkspaceType, WorkspaceStatus } from "./types";

// ── Create ────────────────────────────────────────────────────────────────────

export async function createWorkspace(params: {
  userId:        number;
  workspaceName: string;
  workspaceType?: WorkspaceType;
  configuration?: Record<string, unknown>;
}): Promise<typeof platformWorkspaces.$inferSelect> {
  const [workspace] = await db
    .insert(platformWorkspaces)
    .values({
      userId:        params.userId,
      workspaceName: params.workspaceName,
      workspaceType: params.workspaceType ?? "personal",
      configuration: params.configuration ?? {},
    })
    .returning();
  await appendActivity(params.userId, "workspace_created", { workspaceId: workspace.id }, {
    workspaceId: workspace.id,
    actor:       "user",
    summary:     `Workspace created: ${params.workspaceName}`,
  });
  return workspace;
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listWorkspaces(
  userId: number,
  statusFilter?: WorkspaceStatus,
): Promise<typeof platformWorkspaces.$inferSelect[]> {
  const conditions = [eq(platformWorkspaces.userId, userId)];
  if (statusFilter) {
    conditions.push(eq(platformWorkspaces.status, statusFilter));
  }
  return db
    .select()
    .from(platformWorkspaces)
    .where(and(...conditions))
    .orderBy(desc(platformWorkspaces.createdAt));
}

export async function getWorkspace(
  workspaceId: number,
  userId: number,
): Promise<typeof platformWorkspaces.$inferSelect | null> {
  const rows = await db
    .select()
    .from(platformWorkspaces)
    .where(and(eq(platformWorkspaces.id, workspaceId), eq(platformWorkspaces.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

// ── Archive ───────────────────────────────────────────────────────────────────

export async function archiveWorkspace(workspaceId: number, userId: number): Promise<void> {
  await db
    .update(platformWorkspaces)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(platformWorkspaces.id, workspaceId), eq(platformWorkspaces.userId, userId)));
  await appendActivity(userId, "workspace_archived", { workspaceId }, {
    workspaceId,
    actor:   "user",
    summary: `Workspace ${workspaceId} archived`,
  });
}

// ── Counts ────────────────────────────────────────────────────────────────────

export async function countWorkspaces(userId: number): Promise<number> {
  const rows = await db
    .select({ id: platformWorkspaces.id })
    .from(platformWorkspaces)
    .where(and(eq(platformWorkspaces.userId, userId), eq(platformWorkspaces.status, "active")));
  return rows.length;
}
