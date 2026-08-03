// ─────────────────────────────────────────────────────────────────────────────
// Build 050 — Application Registry Engine
// Owns every platform application — registration, state, and discovery
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import { applicationRegistry, applicationCapabilities, platformPages, platformWidgets, platformServices } from "@workspace/db/schema";
import { eq, and, like, or, desc } from "drizzle-orm";
import type { AppRegistration, LifecycleState, HealthState } from "./types";

export async function registerApplication(app: AppRegistration): Promise<{ id: number; appId: string }> {
  const existing = await db
    .select({ id: applicationRegistry.id })
    .from(applicationRegistry)
    .where(eq(applicationRegistry.appId, app.appId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(applicationRegistry)
      .set({
        title:          app.title,
        currentVersion: app.version,
        updatedAt:      new Date(),
      })
      .where(eq(applicationRegistry.appId, app.appId));
    return { id: existing[0].id, appId: app.appId };
  }

  const rows = await db
    .insert(applicationRegistry)
    .values({
      appId:         app.appId,
      title:         app.title,
      lifecycleState:"enabled",
      currentVersion:app.version,
      isEnabled:     true,
      isPlatformApp: app.developer === "platform",
      installContext:"platform",
      enabledAt:     new Date(),
      healthStatus:  "healthy",
      updatedAt:     new Date(),
    })
    .returning() as any[];
  return { id: rows[0].id, appId: rows[0].appId };
}

export async function updateLifecycleState(appId: string, state: LifecycleState): Promise<void> {
  const patch: Record<string, unknown> = { lifecycleState: state, updatedAt: new Date() };
  if (state === "enabled")  patch.enabledAt  = new Date();
  if (state === "disabled") patch.disabledAt = new Date();
  await db.update(applicationRegistry).set(patch).where(eq(applicationRegistry.appId, appId));
}

export async function updateHealthStatus(appId: string, status: HealthState, error?: string): Promise<void> {
  await db.update(applicationRegistry).set({
    healthStatus:      status,
    errorMessage:      error ?? null,
    lastHealthCheckAt: new Date(),
    updatedAt:         new Date(),
  }).where(eq(applicationRegistry.appId, appId));
}

export async function listAllApplications(): Promise<any[]> {
  return db.select().from(applicationRegistry).orderBy(desc(applicationRegistry.isPlatformApp), applicationRegistry.title);
}

export async function getApplication(appId: string): Promise<any | null> {
  const rows = await db.select().from(applicationRegistry).where(eq(applicationRegistry.appId, appId)).limit(1);
  return rows[0] ?? null;
}

export async function searchApplications(query: string): Promise<any[]> {
  const q = `%${query.toLowerCase()}%`;
  return db
    .select()
    .from(applicationRegistry)
    .where(or(
      like(applicationRegistry.appId, q),
      like(applicationRegistry.title, q),
    ))
    .orderBy(applicationRegistry.title)
    .limit(20);
}

export async function getApplicationRegistry(): Promise<{
  totalApps: number;
  enabledApps: number;
  disabledApps: number;
  platformApps: number;
  healthBreakdown: Record<string, number>;
  lifecycleBreakdown: Record<string, number>;
  apps: any[];
}> {
  const apps = await listAllApplications();
  const health: Record<string, number>    = {};
  const lifecycle: Record<string, number> = {};
  for (const a of apps) {
    health[a.healthStatus]       = (health[a.healthStatus]       ?? 0) + 1;
    lifecycle[a.lifecycleState]  = (lifecycle[a.lifecycleState]  ?? 0) + 1;
  }
  return {
    totalApps:         apps.length,
    enabledApps:       apps.filter((a) => a.isEnabled).length,
    disabledApps:      apps.filter((a) => !a.isEnabled).length,
    platformApps:      apps.filter((a) => a.isPlatformApp).length,
    healthBreakdown:   health,
    lifecycleBreakdown:lifecycle,
    apps,
  };
}
