import app from "./app";
import { logger } from "./lib/logger";
import { db, platformSettingsTable, encryptionKeyRotationsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { setKeyRotatedAt } from "./lib/crypto";
import { startWorker } from "./lib/runtime/worker";
import { startScheduler } from "./lib/runtime/scheduler";
import { startRevenueSync } from "./lib/revenue/sync";
import { backfillBuiltBusinesses } from "./lib/built-businesses";

async function start() {
  const rawPort = process.env["PORT"];

  if (!rawPort) {
    throw new Error(
      "PORT environment variable is required but was not provided.",
    );
  }

  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  // Load persisted rotation timestamp from DB so the key-age warning is
  // accurate immediately after a restart (not just while the process runs).
  // Priority: encryption_key_rotations table (authoritative history) →
  //           platform_settings fallback → env var CREDENTIAL_KEY_ROTATED_AT.
  try {
    const [latestRotation] = await db
      .select({ rotatedAt: encryptionKeyRotationsTable.rotatedAt })
      .from(encryptionKeyRotationsTable)
      .orderBy(desc(encryptionKeyRotationsTable.rotatedAt))
      .limit(1);

    if (latestRotation) {
      const iso = latestRotation.rotatedAt.toISOString();
      setKeyRotatedAt(iso);
      logger.info({ rotatedAt: iso }, "Loaded key rotation timestamp from encryption_key_rotations");
    } else {
      // Fallback: legacy platform_settings entry written by older code versions.
      const [setting] = await db
        .select()
        .from(platformSettingsTable)
        .where(eq(platformSettingsTable.key, "credential_key_rotated_at"));
      if (setting) {
        setKeyRotatedAt(setting.value);
        logger.info({ rotatedAt: setting.value }, "Loaded key rotation timestamp from platform_settings (fallback)");
      }
    }
  } catch (err) {
    logger.warn({ err }, "Could not load key rotation timestamp from DB");
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");

    // Start the runtime job worker loop (polls DB every 5s, no Redis required)
    startWorker();
    // Start the scheduler loop (polls DB every 60s for due scheduled tasks)
    startScheduler();
    // Start the revenue sync worker (polls enabled providers hourly)
    startRevenueSync();
    // Ensure every existing ASH-built system shows up in the Business Portfolio.
    backfillBuiltBusinesses().catch(() => {});
  });
}

start().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
