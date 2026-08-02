// ── Build 046: Context Engine ─────────────────────────────────────────────────
// Tracks current page, project, builder, workspace, org, permissions — for ASH.
import { db }              from "@workspace/db";
import { platformContext } from "@workspace/db/schema";
import { eq }             from "drizzle-orm";
import type { PlatformContextSnapshot, CommandDescriptor, NavigationNode } from "./types";

// ── Upsert context ────────────────────────────────────────────────────────────
// Called whenever the user navigates or changes active context.

export async function upsertContext(params: {
  userId:              number;
  currentPage?:        string;
  currentAppId?:       string;
  currentProjectId?:   number;
  currentWorkspaceId?: number;
  currentOrgId?:       number;
  permissions?:        string[];
  availableCommands?:  CommandDescriptor[];
  breadcrumb?:         NavigationNode[];
}): Promise<typeof platformContext.$inferSelect> {
  const existing = await db
    .select()
    .from(platformContext)
    .where(eq(platformContext.userId, params.userId))
    .limit(1);

  const values = {
    userId:             params.userId,
    currentPage:        params.currentPage        ?? null,
    currentAppId:       params.currentAppId       ?? null,
    currentProjectId:   params.currentProjectId   ?? null,
    currentWorkspaceId: params.currentWorkspaceId ?? null,
    currentOrgId:       params.currentOrgId       ?? null,
    permissions:        params.permissions        ?? [],
    availableCommands:  params.availableCommands  ?? [],
    breadcrumb:         params.breadcrumb         ?? [],
    updatedAt:          new Date(),
  };

  if (existing.length > 0) {
    const [updated] = await db
      .update(platformContext)
      .set(values)
      .where(eq(platformContext.userId, params.userId))
      .returning();
    return updated;
  }

  const [inserted] = await db
    .insert(platformContext)
    .values(values)
    .returning();
  return inserted;
}

// ── Get context ───────────────────────────────────────────────────────────────

export async function getContext(userId: number): Promise<PlatformContextSnapshot | null> {
  const rows = await db
    .select()
    .from(platformContext)
    .where(eq(platformContext.userId, userId))
    .limit(1);

  if (rows.length === 0) return null;
  const row = rows[0];

  return {
    userId:             row.userId,
    currentPage:        row.currentPage        ?? undefined,
    currentAppId:       row.currentAppId       ?? undefined,
    currentProjectId:   row.currentProjectId   ?? undefined,
    currentWorkspaceId: row.currentWorkspaceId ?? undefined,
    currentOrgId:       row.currentOrgId       ?? undefined,
    permissions:        (row.permissions        as string[])          ?? [],
    availableCommands:  (row.availableCommands  as CommandDescriptor[]) ?? [],
    breadcrumb:         (row.breadcrumb         as NavigationNode[])  ?? [],
  };
}

// ── Build ASH-facing context summary ─────────────────────────────────────────

export function buildContextSummaryForASH(ctx: PlatformContextSnapshot): string {
  const parts: string[] = [];
  if (ctx.currentAppId)  parts.push(`Active app: ${ctx.currentAppId}`);
  if (ctx.currentPage)   parts.push(`Page: ${ctx.currentPage}`);
  if (ctx.currentProjectId) parts.push(`Project #${ctx.currentProjectId}`);
  if (ctx.currentWorkspaceId) parts.push(`Workspace #${ctx.currentWorkspaceId}`);
  if (ctx.permissions.length > 0) parts.push(`Permissions: ${ctx.permissions.slice(0, 5).join(", ")}${ctx.permissions.length > 5 ? "…" : ""}`);
  if (ctx.availableCommands.length > 0) {
    parts.push(`Commands available: ${ctx.availableCommands.slice(0, 4).map((c) => c.commandName).join(", ")}${ctx.availableCommands.length > 4 ? `… (+${ctx.availableCommands.length - 4})` : ""}`);
  }
  return parts.join(" | ");
}
