import { pool, db, systemRevenueProvidersTable, systemActivityEventsTable, userCredentialsTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { decrypt } from "../crypto";
import { getRevenueProvider } from "./registry";
import { logger } from "../logger";

const POLL_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let running = false;

async function loadUserCredentials(userId: number): Promise<Record<string, string>> {
  const rows = await pool.query(
    `SELECT credential_key, encrypted_value FROM user_credentials WHERE user_id = $1`,
    [userId],
  );
  const creds: Record<string, string> = {};
  for (const row of rows.rows as { credential_key: string; encrypted_value: string | null }[]) {
    if (row.encrypted_value) {
      try {
        creds[row.credential_key] = await decrypt(row.encrypted_value);
      } catch {
        // skip malformed
      }
    }
  }
  return creds;
}

async function txExists(systemInstanceId: number, externalTxId: string): Promise<boolean> {
  const res = await pool.query(
    `SELECT 1 FROM system_activity_events WHERE system_instance_id = $1 AND external_tx_id = $2 LIMIT 1`,
    [systemInstanceId, externalTxId],
  );
  return res.rowCount !== null && res.rowCount > 0;
}

export async function syncProvider(providerId: number): Promise<{ synced: number; errors: string[] }> {
  const [record] = await db
    .select()
    .from(systemRevenueProvidersTable)
    .where(eq(systemRevenueProvidersTable.id, providerId));

  if (!record || !record.enabled) return { synced: 0, errors: [] };

  const provider = getRevenueProvider(record.provider);
  if (!provider) {
    return { synced: 0, errors: [`Unknown provider: ${record.provider}`] };
  }

  await db
    .update(systemRevenueProvidersTable)
    .set({ syncStatus: "syncing" })
    .where(eq(systemRevenueProvidersTable.id, providerId));

  const creds = await loadUserCredentials(record.userId);
  const since = record.lastSyncAt ? new Date(record.lastSyncAt) : new Date(Date.now() - 30 * 86_400_000);

  const result = await provider.fetchTransactions(creds, since);

  if (!result.ok) {
    await db
      .update(systemRevenueProvidersTable)
      .set({ syncStatus: "error", syncMessage: result.error ?? "Unknown error" })
      .where(eq(systemRevenueProvidersTable.id, providerId));
    return { synced: 0, errors: [result.error ?? "Unknown error"] };
  }

  let synced = 0;
  const errors: string[] = [];

  for (const tx of result.transactions) {
    try {
      const exists = await txExists(record.systemInstanceId, tx.externalId);
      if (exists) continue;

      await db.insert(systemActivityEventsTable).values({
        systemInstanceId: record.systemInstanceId,
        eventType: "revenue",
        amountCents: tx.amountCents,
        description: tx.description,
        externalTxId: tx.externalId,
        revenueProvider: record.provider,
        metadata: JSON.stringify({ provider: record.provider, currency: tx.currency }),
      });
      synced++;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  await db
    .update(systemRevenueProvidersTable)
    .set({
      syncStatus: errors.length > 0 ? "error" : "ok",
      syncMessage: errors.length > 0 ? errors[0] : `Synced ${synced} transactions`,
      lastSyncAt: new Date(),
    })
    .where(eq(systemRevenueProvidersTable.id, providerId));

  return { synced, errors };
}

async function runSyncCycle(): Promise<void> {
  const providers = await db
    .select()
    .from(systemRevenueProvidersTable)
    .where(eq(systemRevenueProvidersTable.enabled, true));

  if (providers.length === 0) return;

  logger.info({ count: providers.length }, "Revenue sync: starting cycle");

  for (const p of providers) {
    try {
      const { synced, errors } = await syncProvider(p.id);
      if (errors.length > 0) {
        logger.warn({ providerId: p.id, provider: p.provider, errors }, "Revenue sync: provider errors");
      } else {
        logger.info({ providerId: p.id, provider: p.provider, synced }, "Revenue sync: provider done");
      }
    } catch (err) {
      logger.error({ providerId: p.id, err }, "Revenue sync: unhandled error");
    }
  }
}

export function startRevenueSync(): void {
  if (running) return;
  running = true;

  async function loop(): Promise<void> {
    try {
      await runSyncCycle();
    } catch (err) {
      logger.error({ err }, "Revenue sync loop error");
    } finally {
      if (running) setTimeout(loop, POLL_INTERVAL_MS);
    }
  }

  loop();
  logger.info({ pollIntervalMs: POLL_INTERVAL_MS }, "Revenue sync worker started");
}

export function stopRevenueSync(): void {
  running = false;
  logger.info("Revenue sync worker stopped");
}
