// ── Build 046: Platform Runtime Engine ───────────────────────────────────────
// Owns runtime state for every authenticated user.
import { db }                from "@workspace/db";
import {
  platformSessions,
  platformActivity,
  platformSnapshots,
} from "@workspace/db/schema";
import { eq, and, desc, lt } from "drizzle-orm";
import { logger }            from "../logger";
import type { SessionStatus, RuntimeHealth, UPOSSummary } from "./types";

// ── Session management ────────────────────────────────────────────────────────

export async function startPlatformSession(params: {
  userId:      number;
  workspaceId?: number;
  projectId?:  number;
  appId?:      string;
}): Promise<{ id: number; status: string }> {
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8h TTL
  const [session] = await db
    .insert(platformSessions)
    .values({
      userId:      params.userId,
      workspaceId: params.workspaceId ?? null,
      projectId:   params.projectId   ?? null,
      appId:       params.appId       ?? null,
      status:      "active",
      expiresAt,
    })
    .returning();
  await appendActivity(params.userId, "session_started", {
    workspaceId: params.workspaceId,
    appId:       params.appId,
  });
  return session;
}

export async function closePlatformSession(sessionId: number): Promise<void> {
  await db
    .update(platformSessions)
    .set({ status: "closed" })
    .where(eq(platformSessions.id, sessionId));
}

export async function expireStaleRuntimeSessions(): Promise<number> {
  const now = new Date();
  const rows = await db
    .update(platformSessions)
    .set({ status: "expired" })
    .where(
      and(
        eq(platformSessions.status, "active"),
        lt(platformSessions.expiresAt, now),
      ),
    )
    .returning({ id: platformSessions.id });
  if (rows.length > 0) {
    logger.info({ count: rows.length }, "UPOS: expired stale platform sessions");
  }
  return rows.length;
}

export async function getActiveSessions(userId: number): Promise<typeof platformSessions.$inferSelect[]> {
  return db
    .select()
    .from(platformSessions)
    .where(and(eq(platformSessions.userId, userId), eq(platformSessions.status, "active")))
    .orderBy(desc(platformSessions.createdAt));
}

// ── Activity append ───────────────────────────────────────────────────────────

export async function appendActivity(
  userId:       number,
  activityType: string,
  details?:     Record<string, unknown>,
  options?:     { appId?: string; projectId?: number; workspaceId?: number; actor?: string; summary?: string },
): Promise<void> {
  await db.insert(platformActivity).values({
    userId,
    activityType,
    appId:       options?.appId       ?? null,
    projectId:   options?.projectId   ?? null,
    workspaceId: options?.workspaceId ?? null,
    actor:       options?.actor       ?? "system",
    summary:     options?.summary     ?? activityType,
    details:     details              ?? {},
  });
}

// ── Runtime health ────────────────────────────────────────────────────────────

export function computeRuntimeHealth(summary: Partial<UPOSSummary>): RuntimeHealth {
  if (!summary.totalApps || summary.totalApps === 0) return "degraded";
  if ((summary.activeApps ?? 0) < (summary.totalApps ?? 1) * 0.5) return "degraded";
  return "healthy";
}

// ── Snapshots ────────────────────────────────────────────────────────────────

export async function captureRuntimeSnapshot(params: {
  userId?:              number;
  totalApps:            number;
  activeApps:           number;
  totalWorkspaces:      number;
  totalProjects:        number;
  activeSessions:       number;
  commandsAvailable:    number;
  notificationsPending: number;
  lawApplied:           boolean;
}): Promise<void> {
  const health = computeRuntimeHealth(params);
  await db.insert(platformSnapshots).values({
    userId:               params.userId               ?? null,
    totalApps:            params.totalApps,
    activeApps:           params.activeApps,
    totalWorkspaces:      params.totalWorkspaces,
    totalProjects:        params.totalProjects,
    activeSessions:       params.activeSessions,
    commandsAvailable:    params.commandsAvailable,
    notificationsPending: params.notificationsPending,
    runtimeHealth:        health,
    lawApplied:           params.lawApplied,
    snapshotData: {
      capturedAt: new Date().toISOString(),
      health,
      ...params,
    },
  });
}

export async function getLatestSnapshot(): Promise<typeof platformSnapshots.$inferSelect | null> {
  const rows = await db
    .select()
    .from(platformSnapshots)
    .orderBy(desc(platformSnapshots.createdAt))
    .limit(1);
  return rows[0] ?? null;
}
