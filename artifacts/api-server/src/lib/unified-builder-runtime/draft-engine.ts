// ── Build 049: Draft Engine ────────────────────────────────────────────────────
// Manages immutable draft revisions — autosave, manual save, preview, publish.
import { db } from "@workspace/db";
import { builderDrafts, builderSessions, builderEvents, runtimeRegistry } from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { createHash } from "crypto";

function checksumContent(content: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(content)).digest("hex").slice(0, 16);
}

export async function saveDraft(params: {
  sessionId:     number;
  userId:        number;
  builderType:   string;
  assetId?:      number;
  content:       Record<string, unknown>;
  changesSummary?: string;
  isAutosave?:   boolean;
}): Promise<{ draftId: number; draftVersion: number }> {
  // Get current max version for this session
  const prev = await db
    .select({ maxVer: sql<string>`max(draft_version)` })
    .from(builderDrafts)
    .where(eq(builderDrafts.sessionId, params.sessionId));

  const draftVersion = (Number(prev[0]?.maxVer ?? 0)) + 1;
  const checksum = checksumContent(params.content);

  const result = await db.insert(builderDrafts).values({
    sessionId:      params.sessionId,
    userId:         params.userId,
    builderType:    params.builderType,
    assetId:        params.assetId ?? null,
    draftVersion,
    draftState:     params.isAutosave ? "autosaved" : "draft",
    content:        params.content,
    contentChecksum: checksum,
    changesSummary:  params.changesSummary ?? null,
    isAutosave:      params.isAutosave ?? false,
    isPublished:     false,
  }).returning({ id: builderDrafts.id });

  const draftId = (result as any[])[0]?.id as number;

  // Update session + registry
  await db.update(builderSessions)
    .set({ draftId, hasUnsavedWork: !params.isAutosave, lastAutosaveAt: params.isAutosave ? new Date() : undefined, lastActivityAt: new Date() })
    .where(eq(builderSessions.id, params.sessionId));

  await db.update(runtimeRegistry)
    .set({
      currentDraftId:      draftId,
      currentDraftVersion: draftVersion,
      hasUnsavedWork:      !params.isAutosave,
      lastAutosaveAt:      params.isAutosave ? new Date() : undefined,
      updatedAt:           new Date(),
    })
    .where(eq(runtimeRegistry.sessionId, params.sessionId));

  // Event
  await db.insert(builderEvents).values({
    sessionId:   params.sessionId,
    userId:      params.userId,
    builderType: params.builderType,
    eventType:   params.isAutosave ? "autosaved" : "draft_saved",
    severity:    "info",
    summary:     `Draft v${draftVersion}${params.isAutosave ? " (autosave)" : ""} saved`,
    details:     { draftId, draftVersion, checksum, changesSummary: params.changesSummary },
  });

  return { draftId, draftVersion };
}

export async function getLatestDraft(sessionId: number) {
  const rows = await db.select().from(builderDrafts)
    .where(eq(builderDrafts.sessionId, sessionId))
    .orderBy(desc(builderDrafts.draftVersion))
    .limit(1);
  return rows[0] ?? null;
}

export async function getDraftHistory(sessionId: number, limit: number = 20) {
  return db.select().from(builderDrafts)
    .where(eq(builderDrafts.sessionId, sessionId))
    .orderBy(desc(builderDrafts.draftVersion))
    .limit(limit);
}

export async function markDraftPublished(draftId: number, userId: number): Promise<void> {
  await db.update(builderDrafts)
    .set({ isPublished: true, publishedAt: new Date(), draftState: "published" })
    .where(and(eq(builderDrafts.id, draftId), eq(builderDrafts.userId, userId)));

  // Mark session as no longer having unsaved work
  const draft = await db.select({ sessionId: builderDrafts.sessionId }).from(builderDrafts).where(eq(builderDrafts.id, draftId)).limit(1);
  if (draft[0]) {
    await db.update(runtimeRegistry).set({ hasUnsavedWork: false, isPublishReady: false, updatedAt: new Date() }).where(eq(runtimeRegistry.sessionId, draft[0].sessionId));
  }
}

export async function countDraftsForUser(userId: number): Promise<number> {
  const rows = await db.select({ cnt: sql<string>`count(*)` }).from(builderDrafts).where(eq(builderDrafts.userId, userId));
  return Number(rows[0]?.cnt ?? 0);
}
