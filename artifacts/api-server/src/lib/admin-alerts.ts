import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { notifyUser } from "./notify";
import { logger } from "./logger";

export interface AdminAlert {
  title: string;
  message: string;
  /** Same key within 24h is suppressed per admin, so a recurring failure alerts once. */
  dedupeKey?: string;
  linkUrl?: string;
  metadata?: Record<string, unknown>;
}

/** In-app alert to every SUPER_ADMIN. Best-effort: never throws. */
export async function notifyAdmins(alert: AdminAlert): Promise<void> {
  try {
    const admins = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "SUPER_ADMIN"));
    await Promise.all(admins.map((a) => notifyUser({ userId: a.id, notificationType: "error", ...alert })));
  } catch (err) {
    logger.warn({ err, title: alert.title }, "Failed to alert admins");
  }
}
