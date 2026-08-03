// ─────────────────────────────────────────────────────────────────────────────
// Build 050 — Diagnostics Engine
// Measures application health, availability, compatibility, runtime status,
// and dependency health
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import { applicationDiagnostics, applicationRegistry } from "@workspace/db/schema";
import { eq, desc, and, gt } from "drizzle-orm";
import { updateHealthStatus } from "./registry-engine";
import { getLatestManifest, checkVersionCompatibility } from "./manifest-engine";
import type { HealthState } from "./types";

export async function recordDiagnostic(input: {
  appId?:         string;
  diagnosticType: string;
  severity:       string;
  title:          string;
  details?:       Record<string, unknown>;
}): Promise<void> {
  await db.insert(applicationDiagnostics).values({
    appId:          input.appId,
    diagnosticType: input.diagnosticType,
    severity:       input.severity,
    title:          input.title,
    details:        input.details ?? {},
  });
}

export async function runHealthCheck(appId: string): Promise<{
  appId:        string;
  healthStatus: HealthState;
  checks:       { name: string; status: string; detail?: string }[];
}> {
  const checks: { name: string; status: string; detail?: string }[] = [];
  const app = await db.select().from(applicationRegistry).where(eq(applicationRegistry.appId, appId)).limit(1);

  if (!app.length) {
    return { appId, healthStatus: "offline", checks: [{ name: "registry", status: "fail", detail: "Not found in registry" }] };
  }

  const reg = app[0];

  // Check 1: lifecycle state
  const lifecycleOk = ["enabled", "available"].includes(reg.lifecycleState);
  checks.push({ name: "lifecycle", status: lifecycleOk ? "pass" : "warn", detail: reg.lifecycleState });

  // Check 2: manifest exists
  const manifest = await getLatestManifest(appId);
  checks.push({ name: "manifest", status: manifest ? "pass" : "warn", detail: manifest ? `v${manifest.version}` : "no manifest" });

  // Check 3: version compatibility
  if (manifest) {
    const compat = checkVersionCompatibility(reg.currentVersion, manifest.minPlatformVersion);
    checks.push({ name: "version_compatibility", status: compat.compatible ? "pass" : "fail", detail: compat.reason });
  }

  // Check 4: no recent error diagnostics
  const errors = await db
    .select({ id: applicationDiagnostics.id })
    .from(applicationDiagnostics)
    .where(and(
      eq(applicationDiagnostics.appId, appId),
      eq(applicationDiagnostics.severity, "error"),
      gt(applicationDiagnostics.createdAt, new Date(Date.now() - 3600_000)),
    ))
    .limit(1);
  checks.push({ name: "recent_errors", status: errors.length === 0 ? "pass" : "warn", detail: errors.length > 0 ? "1+ errors in last hour" : undefined });

  const anyFail = checks.some((c) => c.status === "fail");
  const anyWarn = checks.some((c) => c.status === "warn");
  const health: HealthState = anyFail ? "degraded" : anyWarn ? "degraded" : "healthy";

  await updateHealthStatus(appId, health);
  if (health !== "healthy") {
    await recordDiagnostic({
      appId,
      diagnosticType: "health_check",
      severity: health === "degraded" ? "warning" : "error",
      title:    `Health check: ${health} — ${appId}`,
      details:  { checks },
    });
  }

  return { appId, healthStatus: health, checks };
}

export async function runPlatformHealthCheck(): Promise<{
  totalApps:    number;
  healthyApps:  number;
  degradedApps: number;
  offlineApps:  number;
  results:      any[];
}> {
  const apps = await db.select({ appId: applicationRegistry.appId }).from(applicationRegistry);
  const results: any[] = [];
  for (const a of apps) {
    results.push(await runHealthCheck(a.appId));
  }
  return {
    totalApps:    results.length,
    healthyApps:  results.filter((r) => r.healthStatus === "healthy").length,
    degradedApps: results.filter((r) => r.healthStatus === "degraded").length,
    offlineApps:  results.filter((r) => r.healthStatus === "offline").length,
    results,
  };
}

export async function listDiagnostics(appId?: string, limit = 50): Promise<any[]> {
  if (appId) {
    return db
      .select()
      .from(applicationDiagnostics)
      .where(eq(applicationDiagnostics.appId, appId))
      .orderBy(desc(applicationDiagnostics.createdAt))
      .limit(limit);
  }
  return db
    .select()
    .from(applicationDiagnostics)
    .orderBy(desc(applicationDiagnostics.createdAt))
    .limit(limit);
}

export async function getRecentDiagnosticsCount(hoursBack = 24): Promise<number> {
  const rows = await db
    .select({ id: applicationDiagnostics.id })
    .from(applicationDiagnostics)
    .where(gt(applicationDiagnostics.createdAt, new Date(Date.now() - hoursBack * 3600_000)));
  return rows.length;
}
