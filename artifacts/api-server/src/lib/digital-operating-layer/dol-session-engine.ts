// ── Build 043: Runtime Session Engine ────────────────────────────────────
// Creates managed execution sessions with full lifecycle tracking.
import { db } from "@workspace/db";
import { dolExecutionSessions as executionSessions, digitalWorkspaces, operatingRegistry } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import type { ExecutionChannelType, SessionStatus, OperatingSession } from "./types";

const DEFAULT_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Create a new managed execution session.
export async function createSession(params: {
  userId:       number;
  sessionType:  ExecutionChannelType;
  authorityRef: string;
  workspaceId?: number;
  ttlMs?:       number;
  metadata?:    Record<string, unknown>;
}): Promise<OperatingSession> {
  const expiresAt = new Date(Date.now() + (params.ttlMs ?? DEFAULT_SESSION_TTL_MS));

  const [row] = await db.insert(executionSessions).values({
    workspaceId:  params.workspaceId ?? null,
    userId:       params.userId,
    sessionType:  params.sessionType,
    status:       "active",
    authorityRef: params.authorityRef,
    startedAt:    new Date(),
    expiresAt,
    metadata:     params.metadata ?? {},
  }).returning();

  // Update registry session count
  await db
    .update(operatingRegistry)
    .set({
      sessionCount: db.execute(`SELECT COALESCE(session_count, 0) + 1 FROM operating_registry WHERE domain = '${params.sessionType}'` as any) as any,
      lastActive: new Date(),
    })
    .where(eq(operatingRegistry.domain, params.sessionType))
    .catch(() => {}); // best-effort update

  return {
    id:           row.id,
    workspaceId:  row.workspaceId ?? null,
    userId:       row.userId ?? null,
    sessionType:  row.sessionType as ExecutionChannelType,
    status:       row.status as SessionStatus,
    authorityRef: row.authorityRef ?? null,
    startedAt:    row.startedAt,
    expiresAt:    row.expiresAt ?? null,
  };
}

// Complete a session and record completion time.
export async function completeSession(sessionId: number, result: "completed" | "failed" = "completed"): Promise<void> {
  await db
    .update(executionSessions)
    .set({ status: result, completedAt: new Date() })
    .where(eq(executionSessions.id, sessionId));
}

// Expire sessions that have passed their TTL.
export async function expireStaleSessionsLocal(): Promise<number> {
  const now = new Date();
  const rows = await db
    .select({ id: executionSessions.id })
    .from(executionSessions)
    .where(and(
      eq(executionSessions.status, "active"),
    ));

  let expired = 0;
  for (const row of rows) {
    const [full] = await db.select().from(executionSessions).where(eq(executionSessions.id, row.id)).limit(1);
    if (full?.expiresAt && full.expiresAt < now) {
      await db.update(executionSessions).set({ status: "expired" }).where(eq(executionSessions.id, row.id));
      expired++;
    }
  }
  return expired;
}

export async function getActiveSessions(): Promise<OperatingSession[]> {
  const rows = await db
    .select()
    .from(executionSessions)
    .where(eq(executionSessions.status, "active"));
  return rows.map((r) => ({
    id:           r.id,
    workspaceId:  r.workspaceId ?? null,
    userId:       r.userId ?? null,
    sessionType:  r.sessionType as ExecutionChannelType,
    status:       r.status as SessionStatus,
    authorityRef: r.authorityRef ?? null,
    startedAt:    r.startedAt,
    expiresAt:    r.expiresAt ?? null,
  }));
}

export async function countActiveSessions(): Promise<number> {
  const rows = await db
    .select({ id: executionSessions.id })
    .from(executionSessions)
    .where(eq(executionSessions.status, "active"));
  return rows.length;
}
