// ─────────────────────────────────────────────────────────────────────────────
// Build 050 — Lifecycle Engine
// Tracks install, enable, disable, upgrade, compatibility, and deprecation
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import { applicationRegistry, applicationDiagnostics } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { updateLifecycleState, updateHealthStatus } from "./registry-engine";
import { getLatestManifest, checkVersionCompatibility } from "./manifest-engine";
import type { LifecycleState } from "./types";

export async function installApplication(appId: string): Promise<{ success: boolean; message: string }> {
  const app = await db.select().from(applicationRegistry).where(eq(applicationRegistry.appId, appId)).limit(1);
  if (!app.length) return { success: false, message: `Application '${appId}' not registered` };
  await updateLifecycleState(appId, "installed");
  return { success: true, message: `Application '${appId}' installed` };
}

export async function enableApplication(appId: string): Promise<{ success: boolean; message: string }> {
  const rows = await db.select().from(applicationRegistry).where(eq(applicationRegistry.appId, appId)).limit(1);
  if (!rows.length) return { success: false, message: `Application '${appId}' not found` };
  await updateLifecycleState(appId, "enabled");
  await db.update(applicationRegistry).set({ isEnabled: true, updatedAt: new Date() }).where(eq(applicationRegistry.appId, appId));
  return { success: true, message: `Application '${appId}' enabled` };
}

export async function disableApplication(appId: string): Promise<{ success: boolean; message: string }> {
  const rows = await db.select().from(applicationRegistry).where(eq(applicationRegistry.appId, appId)).limit(1);
  if (!rows.length) return { success: false, message: `Application '${appId}' not found` };
  if (rows[0].isPlatformApp) return { success: false, message: `Platform applications cannot be disabled` };
  await updateLifecycleState(appId, "disabled");
  await db.update(applicationRegistry).set({ isEnabled: false, updatedAt: new Date() }).where(eq(applicationRegistry.appId, appId));
  return { success: true, message: `Application '${appId}' disabled` };
}

export async function upgradeApplication(appId: string, newVersion: string): Promise<{ success: boolean; message: string }> {
  const manifest = await getLatestManifest(appId);
  if (!manifest) return { success: false, message: `No manifest found for '${appId}'` };

  const compat = checkVersionCompatibility(newVersion, manifest.minPlatformVersion);
  if (!compat.compatible) {
    return { success: false, message: `Version incompatible: ${compat.reason}` };
  }

  await updateLifecycleState(appId, "upgrading");
  await db.update(applicationRegistry)
    .set({ currentVersion: newVersion, lifecycleState: "enabled", updatedAt: new Date() })
    .where(eq(applicationRegistry.appId, appId));

  return { success: true, message: `Application '${appId}' upgraded to ${newVersion}` };
}

export async function deprecateApplication(appId: string, reason: string): Promise<void> {
  await updateLifecycleState(appId, "deprecated");
  await db.insert(applicationDiagnostics).values({
    appId,
    diagnosticType: "deprecation",
    severity:       "warning",
    title:          `Application '${appId}' deprecated`,
    details:        { reason, deprecatedAt: new Date().toISOString() },
  });
}

export async function getLifecycleSummary(): Promise<{
  stateCounts:     Record<LifecycleState, number>;
  deprecatedApps:  string[];
  upgradingApps:   string[];
}> {
  const all = await db.select().from(applicationRegistry);
  const counts: Record<string, number> = {};
  for (const a of all) {
    counts[a.lifecycleState] = (counts[a.lifecycleState] ?? 0) + 1;
  }
  return {
    stateCounts:    counts as Record<LifecycleState, number>,
    deprecatedApps: all.filter((a) => a.lifecycleState === "deprecated").map((a) => a.appId),
    upgradingApps:  all.filter((a) => a.lifecycleState === "upgrading").map((a) => a.appId),
  };
}
