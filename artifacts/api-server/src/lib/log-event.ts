import { db, systemLogsTable, businessesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { LogCategory, LogSeverity } from "@workspace/db";
import { logger } from "./logger";

export interface LogEventInput {
  systemInstanceId?: number | null;
  businessId?: number | null;
  userId?: number | null;
  category: LogCategory;
  severity?: LogSeverity;
  component?: string;
  action?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

// Best-effort resolution of businessId/userId from a system instance, so callers
// deep in the build/connector/browser paths don't have to plumb them through.
// Cached per call only; never throws — logging must never break a producer path.
async function enrich(input: LogEventInput): Promise<{ businessId: number | null; userId: number | null }> {
  let businessId = input.businessId ?? null;
  let userId = input.userId ?? null;

  if ((businessId == null || userId == null) && input.systemInstanceId != null) {
    try {
      const [biz] = await db
        .select({ id: businessesTable.id, ownerId: businessesTable.ownerId })
        .from(businessesTable)
        .where(eq(businessesTable.systemInstanceId, input.systemInstanceId))
        .limit(1);
      if (biz) {
        if (businessId == null) businessId = biz.id;
        if (userId == null) userId = biz.ownerId;
      }
    } catch {
      /* non-fatal */
    }
  }

  if (userId == null && businessId != null) {
    try {
      const [biz] = await db
        .select({ ownerId: businessesTable.ownerId })
        .from(businessesTable)
        .where(eq(businessesTable.id, businessId))
        .limit(1);
      if (biz) userId = biz.ownerId;
    } catch {
      /* non-fatal */
    }
  }

  return { businessId, userId };
}

/**
 * Unified log sink. Writes a single row into `system_logs`. Never throws —
 * a logging failure must never break the code path that produced the event.
 * Returns the inserted row id, or null on failure.
 */
export async function logEvent(input: LogEventInput): Promise<number | null> {
  try {
    const { businessId, userId } = await enrich(input);
    const [row] = await db
      .insert(systemLogsTable)
      .values({
        systemInstanceId: input.systemInstanceId ?? null,
        businessId,
        userId,
        category: input.category,
        severity: input.severity ?? "info",
        component: input.component ?? null,
        action: input.action ?? null,
        message: input.message,
        metadata: input.metadata ?? {},
      })
      .returning({ id: systemLogsTable.id });
    return row?.id ?? null;
  } catch (err) {
    logger.warn({ err, category: input.category, action: input.action }, "logEvent failed");
    return null;
  }
}
