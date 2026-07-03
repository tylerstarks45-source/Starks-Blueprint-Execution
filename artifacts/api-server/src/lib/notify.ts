import { and, eq, gt } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { logger } from "./logger";

export interface NotifyInput {
  userId: number;
  title: string;
  message: string;
  /** UI styling bucket: info | success | warn | error | approval_pending | ... */
  notificationType?: string;
  /** Deep-link the bell navigates to on click, e.g. "/wallet", "/connections". */
  linkUrl?: string | null;
  /**
   * Stable key for an ongoing condition (e.g. "credits_paused"). When set, a new
   * notification is suppressed if an unread one with the same key already exists
   * within the dedupe window — so a recurring background failure doesn't spam the
   * user with an identical alert every tick.
   */
  dedupeKey?: string | null;
  dedupeWindowMs?: number;
}

const DEFAULT_DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Insert a user notification, optionally deduped on an unread same-key alert.
 * Returns true if a row was inserted, false if it was suppressed as a duplicate.
 * Never throws — notification delivery is best-effort and must not break the
 * autonomous loop that triggered it.
 */
export async function notifyUser(input: NotifyInput): Promise<boolean> {
  const notificationType = input.notificationType ?? "info";
  const dedupeKey = input.dedupeKey ?? null;

  try {
    if (dedupeKey) {
      const windowStart = new Date(Date.now() - (input.dedupeWindowMs ?? DEFAULT_DEDUPE_WINDOW_MS));
      const [existing] = await db
        .select({ id: notificationsTable.id })
        .from(notificationsTable)
        .where(
          and(
            eq(notificationsTable.userId, input.userId),
            eq(notificationsTable.dedupeKey, dedupeKey),
            eq(notificationsTable.read, false),
            gt(notificationsTable.createdAt, windowStart),
          ),
        )
        .limit(1);
      if (existing) return false;
    }

    await db.insert(notificationsTable).values({
      userId: input.userId,
      title: input.title,
      message: input.message,
      notificationType,
      linkUrl: input.linkUrl ?? null,
      dedupeKey,
    });
    return true;
  } catch (err) {
    logger.warn({ err, userId: input.userId }, "notifyUser failed to insert notification");
    return false;
  }
}
