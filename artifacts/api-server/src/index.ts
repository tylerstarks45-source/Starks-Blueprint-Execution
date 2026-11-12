import app from "./app";
import { logger } from "./lib/logger";
import { db, platformSettingsTable, encryptionKeyRotationsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { setKeyRotatedAt } from "./lib/crypto";
import { startWorker, stopWorker } from "./lib/runtime/worker";
import { startScheduler, stopScheduler } from "./lib/runtime/scheduler";
import { startRevenueSync, stopRevenueSync } from "./lib/revenue/sync";
import { checkEnv } from "./lib/env-check";
import { pool } from "@workspace/db";
import { backfillBuiltBusinesses } from "./lib/built-businesses";
import { initializeCognitiveFoundation } from "./lib/cognitive-foundation";

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception — exiting");
  process.exit(1);
});

async function start() {
  const env = checkEnv();
  for (const w of env.warnings) logger.warn(w);
  if (env.errors.length) {
    if (process.env["NODE_ENV"] === "production") {
      for (const e of env.errors) logger.fatal(e);
      throw new Error(`Missing or invalid configuration: ${env.errors.join("; ")}`);
    }
    for (const e of env.errors) logger.warn(e);
  }

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

  // Register every core Brain (with capabilities, extension points and
  // health probes) in the Cognitive Foundation before the port opens, so
  // the registry endpoints have data from the first request. Never throws.
  initializeCognitiveFoundation();

  const server = app.listen(port, (err) => {
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
    // M-07 fix: log startup failures instead of silently swallowing them
backfillBuiltBusinesses().catch((err: unknown) => logger.error({ err }, "backfillBuiltBusinesses failed at startup — some imported businesses may be missing health scores"));
  });

  // Graceful shutdown: stop background loops, finish in-flight requests,
  // close the DB pool. Forced exit after 10s so a deploy never hangs.
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Shutting down");
    stopWorker();
    stopScheduler();
    stopRevenueSync();
    setTimeout(() => {
      logger.error("Shutdown timed out — forcing exit");
      process.exit(1);
    }, 10_000).unref();
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
