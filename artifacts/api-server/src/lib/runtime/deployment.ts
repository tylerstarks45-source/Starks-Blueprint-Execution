import { db, systemInstancesTable, systemConnectorsTable, userToolSelectionsTable, toolsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { enqueue, cancelSystemJobs, upsertConnectorStatus } from "./jobs";
import { canTransition } from "./state-machine";
import { getConnector, isKnownConnector } from "../connectors/registry";
import { logger } from "../logger";

export class DeploymentError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "DeploymentError";
  }
}

// Look up which connectors are needed for a system based on its selected tools.
async function getSystemConnectors(systemInstanceId: number): Promise<string[]> {
  const toolSelections = await db
    .select({ toolId: userToolSelectionsTable.toolId })
    .from(userToolSelectionsTable)
    .where(eq(userToolSelectionsTable.systemInstanceId, systemInstanceId));

  if (toolSelections.length === 0) return ["openrouter"]; // every system needs AI

  const toolIds = toolSelections.map((t) => t.toolId).filter((id): id is number => id != null);
  if (toolIds.length === 0) return ["openrouter"];

  // Map tool names to connector IDs
  const toolMap: Record<string, string> = {
    openrouter: "openrouter",
    stripe: "stripe",
    resend: "email",
    gmail: "gmail",
    "google sheets": "google_sheets",
    tiktok: "tiktok",
    meta: "meta",
    facebook: "meta",
    instagram: "meta",
    youtube: "youtube",
    shopify: "shopify",
    cloudflare: "cloudflare",
  };

  const tools = await db
    .select({ name: toolsTable.name })
    .from(toolsTable)
    .where(eq(toolsTable.id, toolIds[0]!));

  const connectors = new Set(["openrouter"]); // always include AI
  for (const tool of tools) {
    const lower = (tool.name ?? "").toLowerCase();
    for (const [keyword, connectorId] of Object.entries(toolMap)) {
      if (lower.includes(keyword) && isKnownConnector(connectorId)) {
        connectors.add(connectorId);
      }
    }
  }

  return [...connectors];
}

// Deploy a system: validate state → test connectors → mark running → schedule health checks
export async function deploySystem(systemInstanceId: number): Promise<void> {
  const [instance] = await db
    .select()
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, systemInstanceId));

  if (!instance) throw new DeploymentError("System not found", "system_not_found");

  if (!canTransition(instance.buildStatus, "deploying")) {
    throw new DeploymentError(
      `Cannot deploy a system in '${instance.buildStatus}' state. Build it first.`,
      "invalid_state",
    );
  }

  // Mark as deploying
  await db
    .update(systemInstancesTable)
    .set({ buildStatus: "deploying", healthStatus: "starting" })
    .where(eq(systemInstancesTable.id, systemInstanceId));

  logger.info({ systemInstanceId }, "Deployment started");

  const connectorIds = await getSystemConnectors(systemInstanceId);

  // Mark all connectors as pending test
  for (const connectorId of connectorIds) {
    await upsertConnectorStatus(systemInstanceId, connectorId, "testing");
  }

  // Enqueue a startup job that will set the system to 'running' after connector tests
  await enqueue(
    "system_startup",
    { systemInstanceId },
    { systemInstanceId, priority: 1, maxAttempts: 3 },
  );

  // Enqueue connector tests (high priority, run immediately)
  for (const connectorId of connectorIds) {
    await enqueue(
      "connector_test",
      { systemInstanceId, connectorId },
      { systemInstanceId, priority: 2, maxAttempts: 2 },
    );
  }

  logger.info({ systemInstanceId, connectorIds }, "Deployment jobs enqueued");
}

// Pause: cancel pending jobs, mark paused
export async function pauseSystem(systemInstanceId: number): Promise<void> {
  const [instance] = await db
    .select({ buildStatus: systemInstancesTable.buildStatus })
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, systemInstanceId));

  if (!instance) throw new DeploymentError("System not found", "system_not_found");
  if (!canTransition(instance.buildStatus, "paused")) {
    throw new DeploymentError(`Cannot pause a system in '${instance.buildStatus}' state`, "invalid_state");
  }

  await cancelSystemJobs(systemInstanceId);
  await db
    .update(systemInstancesTable)
    .set({ buildStatus: "paused", healthStatus: "paused" })
    .where(eq(systemInstancesTable.id, systemInstanceId));

  logger.info({ systemInstanceId }, "System paused");
}

// Restart: from paused or failed → queue deployment
export async function restartSystem(systemInstanceId: number): Promise<void> {
  const [instance] = await db
    .select({ buildStatus: systemInstancesTable.buildStatus })
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, systemInstanceId));

  if (!instance) throw new DeploymentError("System not found", "system_not_found");
  if (!canTransition(instance.buildStatus, "deploying")) {
    throw new DeploymentError(`Cannot restart from '${instance.buildStatus}' state`, "invalid_state");
  }

  // Reset to 'built' so deploySystem() can pick it up
  await db
    .update(systemInstancesTable)
    .set({ buildStatus: "built", healthStatus: "unknown" })
    .where(eq(systemInstancesTable.id, systemInstanceId));

  await deploySystem(systemInstanceId);
  logger.info({ systemInstanceId }, "System restart initiated");
}

// Archive (soft delete): cancel all jobs, mark archived
export async function archiveSystem(systemInstanceId: number): Promise<void> {
  await cancelSystemJobs(systemInstanceId);
  await db
    .update(systemInstancesTable)
    .set({ buildStatus: "archived", healthStatus: "offline" })
    .where(eq(systemInstancesTable.id, systemInstanceId));

  logger.info({ systemInstanceId }, "System archived");
}
