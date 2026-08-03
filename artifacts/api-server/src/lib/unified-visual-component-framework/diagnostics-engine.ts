// ─────────────────────────────────────────────────────────────────────────────
// Build 051 — UVCF Diagnostics Engine
// Tracks component usage, compatibility, health, and version consistency
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import {
  componentDiagnostics, componentRegistry, componentUsage,
} from "@workspace/db/schema";
import { eq, desc, gt, and } from "drizzle-orm";

export async function recordDiagnostic(input: {
  componentKey?: string;
  diagnosticType: string;
  severity:       string;
  title:          string;
  details?:       Record<string, unknown>;
}): Promise<void> {
  await db.insert(componentDiagnostics).values({
    componentKey:   input.componentKey,
    diagnosticType: input.diagnosticType,
    severity:       input.severity,
    title:          input.title,
    details:        input.details ?? {},
  });
}

export async function recordUsage(componentKey: string, appId?: string, context?: string): Promise<void> {
  // Always insert a new usage row (append-only log)
  await db.insert(componentUsage).values({
    componentKey,
    appId:      appId ?? null,
    context:    context ?? "",
    usageCount: 1,
    lastUsedAt: new Date(),
  });
  // Update registry usage counter
  await db.execute(
    `UPDATE component_registry SET usage_count = usage_count + 1, last_used_at = NOW() WHERE component_key = '${componentKey}'`
  );
}

export async function listDiagnostics(componentKey?: string, limit = 50): Promise<any[]> {
  if (componentKey) {
    return db
      .select()
      .from(componentDiagnostics)
      .where(eq(componentDiagnostics.componentKey, componentKey))
      .orderBy(desc(componentDiagnostics.createdAt))
      .limit(limit);
  }
  return db
    .select()
    .from(componentDiagnostics)
    .orderBy(desc(componentDiagnostics.createdAt))
    .limit(limit);
}

export async function getRecentDiagnosticsCount(hoursBack = 24): Promise<number> {
  const rows = await db
    .select({ id: componentDiagnostics.id })
    .from(componentDiagnostics)
    .where(gt(componentDiagnostics.createdAt, new Date(Date.now() - hoursBack * 3_600_000)));
  return rows.length;
}

export async function listUsage(limit = 50): Promise<any[]> {
  return db.select().from(componentUsage).orderBy(desc(componentUsage.lastUsedAt)).limit(limit);
}

export async function runHealthCheck(componentKey: string): Promise<{
  componentKey: string;
  healthStatus: "healthy" | "degraded" | "offline";
  checks:       { name: string; status: string; detail?: string }[];
}> {
  const checks: { name: string; status: string; detail?: string }[] = [];
  const reg = await db.select().from(componentRegistry).where(eq(componentRegistry.componentKey, componentKey)).limit(1);

  if (!reg.length) {
    return { componentKey, healthStatus: "offline", checks: [{ name: "registry", status: "fail", detail: "Not found" }] };
  }

  const r = reg[0];
  checks.push({ name: "enabled",     status: r.isEnabled    ? "pass" : "warn",  detail: r.isEnabled    ? "enabled" : "disabled" });
  checks.push({ name: "deprecated",  status: r.deprecated   ? "warn" : "pass",  detail: r.deprecated   ? "deprecated" : "active" });
  checks.push({ name: "health",      status: r.healthStatus === "healthy" ? "pass" : "warn", detail: r.healthStatus });

  const anyFail = checks.some((c) => c.status === "fail");
  const anyWarn = checks.some((c) => c.status === "warn");
  const health = anyFail ? "offline" : anyWarn ? "degraded" : "healthy";

  if (health !== "healthy") {
    await db.update(componentRegistry)
      .set({ healthStatus: health, updatedAt: new Date() })
      .where(eq(componentRegistry.componentKey, componentKey));
  }

  return { componentKey, healthStatus: health as "healthy" | "degraded" | "offline", checks };
}
