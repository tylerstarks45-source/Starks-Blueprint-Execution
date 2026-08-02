// ── Build 049: Recovery Engine ────────────────────────────────────────────────
// Restores interrupted or crashed builder sessions safely.
import { db } from "@workspace/db";
import { builderRecovery, builderSessions, builderDrafts, builderEvents, ubreDiagnostics } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function detectCrashedSessions(): Promise<number[]> {
  // Sessions marked active but with no activity in > 30 minutes
  const rows = await db.execute(
    `SELECT id FROM builder_sessions
     WHERE session_state = 'active'
       AND last_activity_at < NOW() - INTERVAL '30 minutes'` as any,
  ) as any;

  return (rows.rows ?? []).map((r: any) => r.id as number);
}

export async function markSessionCrashed(sessionId: number, crashReason: string): Promise<void> {
  const rows = await db.select().from(builderSessions).where(eq(builderSessions.id, sessionId)).limit(1);
  if (!rows[0]) return;

  const session = rows[0];
  await db.update(builderSessions).set({ sessionState: "crashed" }).where(eq(builderSessions.id, sessionId));

  // Get last good draft
  const lastDraft = await db.select({ id: builderDrafts.id, content: builderDrafts.content })
    .from(builderDrafts)
    .where(eq(builderDrafts.sessionId, sessionId))
    .orderBy(desc(builderDrafts.draftVersion))
    .limit(1);

  // Create recovery record
  await db.insert(builderRecovery).values({
    originalSessionId: sessionId,
    userId:            session.userId,
    builderType:       session.builderType,
    assetId:           session.assetId ?? null,
    recoveryState:     "pending",
    lastGoodDraftId:   lastDraft[0]?.id ?? null,
    recoveredContent:  (lastDraft[0]?.content as Record<string, unknown>) ?? {},
    crashReason,
  });

  await db.insert(ubreDiagnostics).values({
    sessionId,
    userId:          session.userId,
    builderType:     session.builderType,
    diagnosticType:  "crash",
    severity:        "error",
    title:           `${session.builderType} session crashed: ${crashReason}`,
    details:         { sessionId, crashReason, lastDraftId: lastDraft[0]?.id },
  });

  await db.insert(builderEvents).values({
    sessionId,
    userId:      session.userId,
    builderType: session.builderType,
    eventType:   "crash_detected",
    severity:    "critical",
    summary:     `Session crash detected: ${crashReason}`,
    details:     { crashReason },
  });
}

export async function recoverSession(params: {
  recoveryId:   number;
  userId:       number;
  newSessionId?: number;
}): Promise<{ success: boolean; recoveredContent?: Record<string, unknown>; message: string }> {
  const rows = await db.select().from(builderRecovery).where(
    and(eq(builderRecovery.id, params.recoveryId), eq(builderRecovery.userId, params.userId))
  ).limit(1);

  if (!rows[0]) return { success: false, message: "Recovery record not found" };
  const rec = rows[0];

  if (rec.recoveryState === "completed") {
    return { success: true, recoveredContent: rec.recoveredContent as Record<string, unknown>, message: "Already recovered" };
  }

  // Mark in progress → completed
  await db.update(builderRecovery).set({
    recoveryState: "completed",
    recoveredAt:   new Date(),
    recoveryNotes: `Recovered via session ${params.newSessionId ?? "manual"}`,
  }).where(eq(builderRecovery.id, params.recoveryId));

  await db.insert(builderEvents).values({
    sessionId:   rec.originalSessionId,
    userId:      rec.userId,
    builderType: rec.builderType,
    eventType:   "recovered",
    severity:    "info",
    summary:     `Session recovered from crash`,
    details:     { recoveryId: params.recoveryId, lastGoodDraftId: rec.lastGoodDraftId },
  });

  return {
    success:          true,
    recoveredContent: rec.recoveredContent as Record<string, unknown>,
    message:          "Session recovered successfully",
  };
}

export async function listPendingRecoveries(userId: number) {
  return db.select().from(builderRecovery).where(
    and(eq(builderRecovery.userId, userId), eq(builderRecovery.recoveryState, "pending"))
  );
}

export async function countPendingRecoveries(userId: number): Promise<number> {
  const rows = await listPendingRecoveries(userId);
  return rows.length;
}
