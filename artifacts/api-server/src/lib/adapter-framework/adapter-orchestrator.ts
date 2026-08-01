// ─────────────────────────────────────────────────────────────────────────────
// Build 030: Universal Execution Adapter Framework — Adapter Orchestrator
// Coordinates: registration, resolution, validation, sandbox, telemetry, lifecycle.
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import { executionAdapters, adapterRegistry } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { AdapterManifest, AdapterFrameworkSummary, AdapterType } from "./types";
import { installAdapter, listAdapters, seedBuiltinAdapters, fetchAdapterRegistrySummary } from "./adapter-registry-engine";
import { resolveAdapter } from "./adapter-resolution-engine";
import { computeCapabilityCoverage, missingAdapterTypes, recommendAdapterTypes } from "./adapter-capability-engine";
import { validateAdapter } from "./adapter-validation-engine";
import { enterSandbox, executeSandboxed, auditSandboxContext } from "./adapter-sandbox-engine";
import { runHealthCheck, applyLifecycleEvent } from "./adapter-lifecycle-engine";
import { recordTelemetry } from "./adapter-telemetry-engine";

const logger = { warn: console.warn.bind(console) };

export interface AdapterExecutionRequest {
  adapterId: string;
  executionClass: string;
  actionType: string;
  inputPayload: Record<string, unknown>;
  sessionId?: string;
}

/**
 * Register a new adapter from a manifest.
 */
export async function registerAdapter(manifest: AdapterManifest): Promise<string> {
  return installAdapter(manifest);
}

/**
 * Execute through an adapter with full validation + sandbox + telemetry.
 */
export async function executeViaAdapter(req: AdapterExecutionRequest): Promise<{
  success: boolean;
  outputPayload: Record<string, unknown>;
  errorPayload: Record<string, unknown> | null;
  durationMs: number;
}> {
  const start = Date.now();

  try {
    // ── 1. Validate adapter ───────────────────────────────────────────────
    const validation = await validateAdapter(req.adapterId);
    if (!validation.passed) {
      return { success: false, outputPayload: {}, errorPayload: { code: "VALIDATION_FAILED", reasons: validation.failureReasons }, durationMs: Date.now() - start };
    }

    // ── 2. Load adapter capabilities for sandbox ──────────────────────────
    const adapterRows = await db.select().from(executionAdapters).where(eq(executionAdapters.id, req.adapterId)).limit(1);
    const adapter = adapterRows[0];
    if (!adapter) {
      return { success: false, outputPayload: {}, errorPayload: { code: "NOT_FOUND" }, durationMs: Date.now() - start };
    }

    // ── 3. Enter sandbox ──────────────────────────────────────────────────
    const ctx = enterSandbox(
      req.adapterId,
      adapter.adapterType as AdapterType,
      [],           // populated by capability engine in real adapters
      [req.actionType],
      "execution",
      req.inputPayload
    );

    // Audit sandbox context before execution
    const violations = auditSandboxContext(ctx);
    if (violations.length > 0) {
      return { success: false, outputPayload: {}, errorPayload: { code: "SANDBOX_VIOLATION", violations }, durationMs: Date.now() - start };
    }

    // ── 4. Execute in sandbox ─────────────────────────────────────────────
    const result = await executeSandboxed(ctx);

    // ── 5. Record telemetry ───────────────────────────────────────────────
    await recordTelemetry({
      adapterId:      req.adapterId,
      sessionId:      req.sessionId,
      executionClass: req.executionClass,
      actionType:     req.actionType,
      latencyMs:      result.durationMs,
      success:        result.success,
      retryCount:     0,
      errorType:      result.errorPayload ? String(result.errorPayload["code"] ?? "") : "",
      capabilityKey:  `${adapter.adapterType}:${req.actionType}`,
    });

    return {
      success:       result.success,
      outputPayload: result.outputPayload,
      errorPayload:  result.errorPayload,
      durationMs:    Date.now() - start,
    };
  } catch (err) {
    logger.warn({ err, adapterId: req.adapterId }, "adapter-orchestrator: executeViaAdapter failed (fail-open)");
    return { success: false, outputPayload: {}, errorPayload: { code: "ORCHESTRATOR_ERROR", message: String(err) }, durationMs: Date.now() - start };
  }
}

/**
 * Build the EB framework summary.
 */
export async function buildFrameworkSummary(): Promise<AdapterFrameworkSummary> {
  try {
    const { total, enabled, healthy, degraded, failed, registryRows } = await fetchAdapterRegistrySummary();
    const adapters = await listAdapters();
    const installedTypes = adapters.map(a => a.adapterType as AdapterType);
    const enabledTypes   = adapters.filter(a => a.status === "enabled").map(a => a.adapterType as AdapterType);

    const capabilityCoverage     = computeCapabilityCoverage(enabledTypes);
    const recommendedAdapterTypes = recommendAdapterTypes(installedTypes);

    return {
      totalAdapters: total,
      enabledAdapters: enabled,
      healthyAdapters: healthy,
      degradedAdapters: degraded,
      failedAdapters: failed,
      capabilityCoverage,
      recommendedAdapterTypes,
      adapterTypes: installedTypes,
    };
  } catch {
    return {
      totalAdapters: 0, enabledAdapters: 0, healthyAdapters: 0,
      degradedAdapters: 0, failedAdapters: 0, capabilityCoverage: 0,
      recommendedAdapterTypes: [], adapterTypes: [],
    };
  }
}

/**
 * Initialize the framework on server boot.
 */
export async function initializeAdapterFramework(): Promise<void> {
  try {
    await seedBuiltinAdapters();
  } catch (err) {
    logger.warn({ err }, "adapter-orchestrator: framework init failed (fail-open)");
  }
}
