import { pool, db, systemRevenueProvidersTable, systemActivityEventsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { connectorScope, loadConnectorCredentials, type ConnectorScope } from "../connector-actions";
import { getRevenueProvider } from "./registry";
import { logger } from "../logger";
import { notifyAdmins } from "../admin-alerts";
import { runIfLockAcquired, REVENUE_SYNC_LOCK_KEY } from "../runtime/single-runner";
import { checkMilestones } from "../milestones";
import { sendPushNotification } from "../push";
import type { RevenueProvider } from "./types";

const POLL_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let running = false;
let inFlight: Promise<void> = Promise.resolve();

// Parse stored credentialKey column — either JSON map (new) or plain key name (legacy).
// Returns { providerKeyName → stored credential key }.
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
export async function loadMappedRevenueCredentials(
  scope: ConnectorScope,
  provider: RevenueProvider,
  keyMap: Record<string, string>,
): Promise<Record<string, string> | null> {
  const keys = provider.credentialKeys.map(key => keyMap[key]);
  if (!keys.every((key): key is string => typeof key === "string" && key.length > 0)) return null;
  const scoped = await loadConnectorCredentials(scope, keys);
  if (!keys.every(key => scoped[key])) return null;
  return Object.fromEntries(provider.credentialKeys.map(key => [key, scoped[keyMap[key]!]!]));
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

  const scope = await connectorScope(record.userId, record.systemInstanceId);
  const keyMap = parseCredentialKeyMap(record.credentialKey, provider);
  const creds = scope ? await loadMappedRevenueCredentials(scope, provider, keyMap) : null;
  if (!creds) {
    const error = "Reconnect this provider with active credentials for the system's workspace.";
    await db.update(systemRevenueProvidersTable)
      .set({ syncStatus: "error", syncMessage: error })
      .where(eq(systemRevenueProvidersTable.id, providerId));
    return { synced: 0, errors: [error] };
  }

  await db
    .update(systemRevenueProvidersTable)
    .set({ syncStatus: "syncing" })
    .where(eq(systemRevenueProvidersTable.id, providerId));

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
      void notifyAdmins({
        title: "Revenue sync failed",
        message: `Revenue sync for provider connection #${p.id} (${p.provider}) threw: ${String((err as Error)?.message ?? err).slice(0, 200)}`,
        dedupeKey: `admin_revenue_sync_${p.id}`,
      });
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
      const outcome = await runIfLockAcquired(REVENUE_SYNC_LOCK_KEY, runSyncCycle);
      if (!outcome.ran) logger.debug("Revenue sync skipped: another instance holds the lock");
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
