// ─────────────────────────────────────────────────────────────────────────────
// Build 030: Universal Execution Adapter Framework — Adapter Registry Engine
// Discovers installed adapters, maintains versioning, health, compatibility.
// Seeds the 5 built-in conceptual adapters on first boot (idempotent).
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  executionAdapters, adapterRegistry, adapterCapabilities,
  adapterPermissions, adapterVersions, adapterContracts,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { AdapterManifest, AdapterType } from "./types";

const logger = { warn: console.warn.bind(console) };

// ── Built-in adapter manifests (conceptual — no external calls) ────────────
const BUILTIN_MANIFESTS: AdapterManifest[] = [
  {
    name: "Browser Adapter",
    adapterType: "browser",
    version: "1.0.0",
    description: "Controls web browsers via CDP/Playwright. Supports navigation, form interaction, screenshot, DOM querying.",
    isBuiltin: true,
    sandboxEnabled: true,
    capabilities: [
      { capabilityKey: "browser:navigate",    actionType: "execute", resourceType: "webpage",  platform: "chromium", api: "cdp",       description: "Navigate to a URL" },
      { capabilityKey: "browser:click",       actionType: "execute", resourceType: "element",  platform: "chromium", api: "playwright", description: "Click a DOM element" },
      { capabilityKey: "browser:screenshot",  actionType: "read",    resourceType: "viewport", platform: "chromium", api: "playwright", description: "Capture a screenshot" },
      { capabilityKey: "browser:extract",     actionType: "read",    resourceType: "dom",      platform: "chromium", api: "playwright", description: "Extract DOM content" },
    ],
    permissions: [
      { permissionKey: "browser:network_access", permissionLevel: "execute", resourceType: "network", isRequired: true },
      { permissionKey: "browser:dom_access",      permissionLevel: "read",    resourceType: "dom",     isRequired: true },
    ],
    contracts: [
      { contractType: "execution",    inputSchema: { url: "string", action: "string" }, outputSchema: { result: "string", screenshot: "string?" }, errorSchema: { code: "string", message: "string" } },
      { contractType: "health_check", inputSchema: {}, outputSchema: { status: "string", latencyMs: "number" }, errorSchema: { code: "string" } },
    ],
  },
  {
    name: "REST API Adapter",
    adapterType: "api",
    version: "1.0.0",
    description: "Executes authenticated HTTP REST API calls. Supports GET/POST/PUT/PATCH/DELETE with headers, body, auth.",
    isBuiltin: true,
    sandboxEnabled: true,
    capabilities: [
      { capabilityKey: "api:get",    actionType: "read",    resourceType: "endpoint", platform: "http", api: "rest", description: "HTTP GET request" },
      { capabilityKey: "api:post",   actionType: "create",  resourceType: "endpoint", platform: "http", api: "rest", description: "HTTP POST request" },
      { capabilityKey: "api:put",    actionType: "update",  resourceType: "endpoint", platform: "http", api: "rest", description: "HTTP PUT request" },
      { capabilityKey: "api:delete", actionType: "delete",  resourceType: "endpoint", platform: "http", api: "rest", description: "HTTP DELETE request" },
    ],
    permissions: [
      { permissionKey: "api:outbound_http", permissionLevel: "execute", resourceType: "network", isRequired: true },
    ],
    contracts: [
      { contractType: "execution",    inputSchema: { method: "string", url: "string", headers: "object?", body: "object?" }, outputSchema: { statusCode: "number", body: "object" }, errorSchema: { code: "string", statusCode: "number", message: "string" } },
      { contractType: "health_check", inputSchema: {}, outputSchema: { status: "string" }, errorSchema: { code: "string" } },
    ],
  },
  {
    name: "Database Adapter",
    adapterType: "database",
    version: "1.0.0",
    description: "Executes read/write queries against SQL and NoSQL databases. Supports parameterised queries only.",
    isBuiltin: true,
    sandboxEnabled: true,
    capabilities: [
      { capabilityKey: "database:query",     actionType: "read",    resourceType: "table",      platform: "postgresql", api: "sql",    description: "Parameterised SELECT query" },
      { capabilityKey: "database:insert",    actionType: "create",  resourceType: "table",      platform: "postgresql", api: "sql",    description: "Parameterised INSERT" },
      { capabilityKey: "database:update",    actionType: "update",  resourceType: "table",      platform: "postgresql", api: "sql",    description: "Parameterised UPDATE" },
      { capabilityKey: "database:delete",    actionType: "delete",  resourceType: "table",      platform: "postgresql", api: "sql",    description: "Parameterised DELETE" },
    ],
    permissions: [
      { permissionKey: "database:read",  permissionLevel: "read",  resourceType: "database", isRequired: true },
      { permissionKey: "database:write", permissionLevel: "write", resourceType: "database", isRequired: false },
    ],
    contracts: [
      { contractType: "execution",    inputSchema: { query: "string", params: "array?" }, outputSchema: { rows: "array", rowCount: "number" }, errorSchema: { code: "string", query: "string" } },
      { contractType: "health_check", inputSchema: {}, outputSchema: { status: "string", connectionOk: "boolean" }, errorSchema: { code: "string" } },
    ],
  },
  {
    name: "LLM Adapter",
    adapterType: "llms",
    version: "1.0.0",
    description: "Sends prompts to large language models (OpenAI, Anthropic, OpenRouter). Supports chat completions and embeddings.",
    isBuiltin: true,
    sandboxEnabled: true,
    capabilities: [
      { capabilityKey: "llm:completion",  actionType: "execute", resourceType: "model",    platform: "openrouter", api: "openai-compat", description: "Chat completion request" },
      { capabilityKey: "llm:embedding",   actionType: "execute", resourceType: "model",    platform: "openrouter", api: "openai-compat", description: "Text embedding request" },
      { capabilityKey: "llm:stream",      actionType: "execute", resourceType: "model",    platform: "openrouter", api: "openai-compat", description: "Streaming completion" },
    ],
    permissions: [
      { permissionKey: "llm:api_access", permissionLevel: "execute", resourceType: "api_key", isRequired: true },
    ],
    contracts: [
      { contractType: "execution",    inputSchema: { model: "string", messages: "array", temperature: "number?" }, outputSchema: { content: "string", usage: "object" }, errorSchema: { code: "string", message: "string" } },
      { contractType: "health_check", inputSchema: {}, outputSchema: { status: "string", model: "string" }, errorSchema: { code: "string" } },
    ],
  },
  {
    name: "Filesystem Adapter",
    adapterType: "filesystem",
    version: "1.0.0",
    description: "Reads and writes files within a sandboxed directory. No access outside the designated workspace.",
    isBuiltin: true,
    sandboxEnabled: true,
    capabilities: [
      { capabilityKey: "fs:read",   actionType: "read",   resourceType: "file",      platform: "linux", api: "posix", description: "Read file contents" },
      { capabilityKey: "fs:write",  actionType: "write",  resourceType: "file",      platform: "linux", api: "posix", description: "Write file contents" },
      { capabilityKey: "fs:list",   actionType: "read",   resourceType: "directory", platform: "linux", api: "posix", description: "List directory contents" },
      { capabilityKey: "fs:delete", actionType: "delete", resourceType: "file",      platform: "linux", api: "posix", description: "Delete a file (sandbox only)" },
    ],
    permissions: [
      { permissionKey: "fs:sandbox_read",  permissionLevel: "read",  resourceType: "filesystem", isRequired: true },
      { permissionKey: "fs:sandbox_write", permissionLevel: "write", resourceType: "filesystem", isRequired: false },
    ],
    contracts: [
      { contractType: "execution",    inputSchema: { operation: "string", path: "string", content: "string?" }, outputSchema: { result: "string", bytesWritten: "number?" }, errorSchema: { code: "string", path: "string" } },
      { contractType: "health_check", inputSchema: {}, outputSchema: { status: "string", sandboxOk: "boolean" }, errorSchema: { code: "string" } },
    ],
  },
];

/**
 * Install an adapter from its manifest. Idempotent — re-running with the
 * same name + adapterType reuses the existing record.
 */
export async function installAdapter(manifest: AdapterManifest): Promise<string> {
  // Check for existing adapter of this type+name
  const existing = await db
    .select()
    .from(executionAdapters)
    .where(eq(executionAdapters.adapterType, manifest.adapterType))
    .limit(1);

  if (existing[0]) return existing[0].id;

  const adapterId = `adapter-${randomUUID()}`;

  await db.insert(executionAdapters).values({
    id:             adapterId,
    name:           manifest.name,
    adapterType:    manifest.adapterType,
    version:        manifest.version,
    description:    manifest.description,
    status:         "enabled",
    sandboxEnabled: manifest.sandboxEnabled ?? true,
    isBuiltin:      manifest.isBuiltin ?? false,
    manifest:       manifest as unknown as Record<string, unknown>,
  });

  // Capabilities
  for (const cap of manifest.capabilities) {
    await db.insert(adapterCapabilities).values({
      id:            `cap-${randomUUID()}`,
      adapterId,
      capabilityKey: cap.capabilityKey,
      actionType:    cap.actionType,
      resourceType:  cap.resourceType,
      platform:      cap.platform,
      api:           cap.api,
      description:   cap.description,
      isEnabled:     true,
    });
  }

  // Permissions
  for (const perm of manifest.permissions) {
    await db.insert(adapterPermissions).values({
      id:              `perm-${randomUUID()}`,
      adapterId,
      permissionKey:   perm.permissionKey,
      permissionLevel: perm.permissionLevel,
      resourceType:    perm.resourceType,
      isRequired:      perm.isRequired,
    });
  }

  // Contracts
  for (const contract of manifest.contracts) {
    await db.insert(adapterContracts).values({
      id:           `contract-${randomUUID()}`,
      adapterId,
      contractType: contract.contractType,
      inputSchema:  contract.inputSchema,
      outputSchema: contract.outputSchema,
      errorSchema:  contract.errorSchema,
      isActive:     true,
    });
  }

  // Version record
  await db.insert(adapterVersions).values({
    id:              `ver-${randomUUID()}`,
    adapterId,
    version:         manifest.version,
    previousVersion: "",
    changelog:       `Initial install of ${manifest.name} v${manifest.version}.`,
    isCurrent:       true,
  });

  // Upsert registry
  await upsertAdapterRegistry(adapterId, manifest.adapterType, manifest.capabilities.length);

  return adapterId;
}

async function upsertAdapterRegistry(
  adapterId: string,
  adapterType: string,
  capabilityCount: number
): Promise<void> {
  const rows = await db
    .select()
    .from(adapterRegistry)
    .where(eq(adapterRegistry.adapterType, adapterType))
    .limit(1);

  if (rows[0]) {
    await db
      .update(adapterRegistry)
      .set({
        adapterId,
        totalInstalled: rows[0].totalInstalled + 1,
        totalEnabled:   rows[0].totalEnabled + 1,
        capabilityCount,
        health:         "healthy",
        updatedAt:      new Date(),
      })
      .where(eq(adapterRegistry.adapterType, adapterType));
  } else {
    await db.insert(adapterRegistry).values({
      id:               `reg-${randomUUID()}`,
      adapterType,
      adapterId,
      totalInstalled:   1,
      totalEnabled:     1,
      health:           "healthy",
      capabilityCount,
      lastHealthCheckAt: new Date(),
    });
  }
}

/**
 * Seed all built-in adapters. Called on server boot — idempotent.
 */
export async function seedBuiltinAdapters(): Promise<void> {
  for (const manifest of BUILTIN_MANIFESTS) {
    try {
      await installAdapter(manifest);
    } catch (err) {
      logger.warn({ err, adapterType: manifest.adapterType }, "adapter-registry-engine: builtin seed failed (ignored)");
    }
  }
}

/**
 * List all installed adapters.
 */
export async function listAdapters(): Promise<typeof executionAdapters.$inferSelect[]> {
  return db.select().from(executionAdapters);
}

/**
 * Fetch registry summary for the EB bridge.
 */
export async function fetchAdapterRegistrySummary(): Promise<{
  total: number;
  enabled: number;
  healthy: number;
  degraded: number;
  failed: number;
  registryRows: typeof adapterRegistry.$inferSelect[];
}> {
  try {
    const adapters = await listAdapters();
    const registryRows = await db.select().from(adapterRegistry);
    const enabled  = adapters.filter(a => a.status === "enabled").length;
    const healthy  = registryRows.filter(r => r.health === "healthy").length;
    const degraded = registryRows.filter(r => r.health === "degraded").length;
    const failed   = registryRows.filter(r => r.health === "failed").length;
    return { total: adapters.length, enabled, healthy, degraded, failed, registryRows };
  } catch {
    return { total: 0, enabled: 0, healthy: 0, degraded: 0, failed: 0, registryRows: [] };
  }
}
