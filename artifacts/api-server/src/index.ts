import app from "./app";
import { logger } from "./lib/logger";
import { db, platformSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { setKeyRotatedAt } from "./lib/crypto";

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
  try {
    const [setting] = await db
      .select()
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.key, "credential_key_rotated_at"));
    if (setting) {
      setKeyRotatedAt(setting.value);
      logger.info({ rotatedAt: setting.value }, "Loaded key rotation timestamp from DB");
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
  });
}

start().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
