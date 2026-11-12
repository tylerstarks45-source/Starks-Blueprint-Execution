import { pool, db, systemRevenueProvidersTable, systemActivityEventsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { decrypt } from "../crypto";
import { getRevenueProvider } from "./registry";
import { logger } from "../logger";
import { checkMilestones } from "../milestones";
import { sendPushNotification } from "../push";
import type { RevenueProvider } from "./types";

const POLL_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let running = false;
let inFlight: Promise<void> = Promise.resolve();

// Parse stored credentialKey column — either JSON map (new) or plain key name (legacy).
// Returns { providerKeyName → decryptedValue }.
function parseCredentialKeyMap(credentialKey: string, provider: RevenueProvider): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(credentialKey);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // Old format: single plain-text credential key name
  }
  // Backward compat: map plain key to the provider's first required key
  const firstKey = provider.credentialKeys[0];
  return firstKey ? { [firstKey]: credentialKey } : {};
}

// Load and decrypt only the specific credentials needed, remapped to provider key names.
async function loadMappedCredentials(
  userId: number,
  keyMap: Record<string, string>, // { providerKeyName → userStoredCredentialKey }
): Promise<Record<string, string>> {
  const creds: Record<string, string> = {};
  for (const [providerKey, userCredKey] of Object.entries(keyMap)) {
    const rows = await pool.query<{ encrypted_value: string | null }>(
      `SELECT encrypted_value FROM user_credentials WHERE user_id = $1 AND credential_key = $2 LIMIT 1`,
      [userId, userCredKey],
    );
    const row = rows.rows[0];
    if (row?.encrypted_value) {
      try {
        creds[providerKey] = await decrypt(row.encrypted_value);
      } catch {
        // skip malformed entry
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

  // Build credentials using only the keys linked to this provider record
  const keyMap = parseCredentialKeyMap(record.credentialKey, provider);
  const creds = await loadMappedCredentials(record.userId, keyMap);

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
        // Use the actual transaction date so time-series analytics are accurate
        createdAt: tx.occurredAt,
        metadata: JSON.stringify({ provider: record.provider, currency: tx.currency }),
      });
      // Check and record any newly crossed lifetime earning milestones
      checkMilestones(record.userId, record.systemInstanceId).catch(() => {});

      // Push notification for new revenue event
      (async () => {
        try {
          const [user] = await db.select({
            expoPushToken: usersTable.expoPushToken,
            notifyRevenue: usersTable.notifyRevenue,
          }).from(usersTable).where(eq(usersTable.id, record.userId)).limit(1);
          if (user?.notifyRevenue && user.expoPushToken) {
            const dollars = (tx.amountCents / 100).toFixed(2);
            await sendPushNotification(
              user.expoPushToken,
              "💸 Revenue Received",
              `$${dollars} ${tx.currency ?? "USD"} — ${tx.description ?? record.provider}`,
              { type: "revenue", systemInstanceId: record.systemInstanceId },
            );
          }
        } catch { /* non-fatal */ }
      })();

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
    let done!: () => void;
    inFlight = new Promise<void>((r) => (done = r));
    try {
      await runSyncCycle();
    } catch (err) {
      logger.error({ err }, "Revenue sync loop error");
    } finally {
      done();
      if (running) setTimeout(loop, POLL_INTERVAL_MS);
    }
  }

  loop();
  logger.info({ pollIntervalMs: POLL_INTERVAL_MS }, "Revenue sync worker started");
}

// Resolves once the tick in progress (if any) has finished.
export function stopRevenueSync(): Promise<void> {
  running = false;
  logger.info("Revenue sync worker stopped");
  return inFlight;
}
