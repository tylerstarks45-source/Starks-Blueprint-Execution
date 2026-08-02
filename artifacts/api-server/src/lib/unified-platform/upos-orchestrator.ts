// ── Build 046: UPOS Orchestrator ──────────────────────────────────────────────
// Coordinates all 6 UPOS engines — seeding, health checks, snapshots.
import { db }                        from "@workspace/db";
import {
  platformWorkspaces,
  platformProjects,
  platformSessions,
  platformNotifications,
} from "@workspace/db/schema";
import { eq, and, count }            from "drizzle-orm";
import { logger }                    from "../logger";
import { seedBuiltinApplications, rebuildRegistry, listApplications } from "./application-registry-engine";
import { registerCommands, countActiveCommands }                       from "./global-command-engine";
import { captureRuntimeSnapshot, expireStaleRuntimeSessions }          from "./platform-runtime-engine";
import { declareUPOSExtensionPoints }                                  from "./upos-extension-points";
import type { UPOSSummary } from "./types";

// ── Boot initialization ───────────────────────────────────────────────────────

let _initialized = false;

export async function initializeUPOS(userId?: number): Promise<{ seededApps: number; rebuiltRegistry: number }> {
  if (!_initialized) {
    declareUPOSExtensionPoints();
    _initialized = true;
  }

  // 1. Seed built-in applications
  const seededApps = await seedBuiltinApplications();

  // 2. Register all commands from all apps
  const apps = await listApplications("active");
  let totalCommands = 0;
  for (const app of apps) {
    const cmds = (app.commands as unknown[]) ?? [];
    if (cmds.length > 0) {
      totalCommands += await registerCommands(app.appId, cmds as any);
    }
  }

  // 3. Rebuild registry entries
  const rebuiltRegistry = await rebuildRegistry();

  // 4. Capture a boot snapshot
  await captureRuntimeSnapshot(await buildSummary(userId));

  logger.info(
    { seededApps, rebuiltRegistry, totalCommands },
    "UPOS: platform operating system initialized",
  );

  return { seededApps, rebuiltRegistry };
}

// ── Full UPOS summary ─────────────────────────────────────────────────────────

export async function buildSummary(userId?: number): Promise<UPOSSummary & { userId?: number }> {
  const apps = await listApplications();
  const activeApps = apps.filter((a) => a.status === "active");
  const commandsAvailable = await countActiveCommands();

  // Workspace + project counts scoped to user (or platform-wide for admin)
  let totalWorkspaces = 0;
  let totalProjects   = 0;
  let activeSessions  = 0;
  let notificationsPending = 0;

  if (userId) {
    const [wsCount] = await db
      .select({ val: count() })
      .from(platformWorkspaces)
      .where(and(eq(platformWorkspaces.userId, userId), eq(platformWorkspaces.status, "active")));
    totalWorkspaces = Number(wsCount?.val ?? 0);

    const [projCount] = await db
      .select({ val: count() })
      .from(platformProjects)
      .where(and(eq(platformProjects.userId, userId), eq(platformProjects.status, "active")));
    totalProjects = Number(projCount?.val ?? 0);

    const [sessCount] = await db
      .select({ val: count() })
      .from(platformSessions)
      .where(and(eq(platformSessions.userId, userId), eq(platformSessions.status, "active")));
    activeSessions = Number(sessCount?.val ?? 0);

    const [notifCount] = await db
      .select({ val: count() })
      .from(platformNotifications)
      .where(and(eq(platformNotifications.userId, userId), eq(platformNotifications.read, false)));
    notificationsPending = Number(notifCount?.val ?? 0);
  } else {
    // Platform-wide counts
    const [wsCount] = await db.select({ val: count() }).from(platformWorkspaces).where(eq(platformWorkspaces.status, "active"));
    totalWorkspaces = Number(wsCount?.val ?? 0);
    const [projCount] = await db.select({ val: count() }).from(platformProjects).where(eq(platformProjects.status, "active"));
    totalProjects = Number(projCount?.val ?? 0);
    const [sessCount] = await db.select({ val: count() }).from(platformSessions).where(eq(platformSessions.status, "active"));
    activeSessions = Number(sessCount?.val ?? 0);
  }

  const lawApplied = apps.length > 0; // law is met as long as apps are registered
  const runtimeHealth = activeApps.length >= apps.length * 0.8 ? "healthy" : "degraded";

  return {
    userId,
    totalApps:            apps.length,
    activeApps:           activeApps.length,
    totalWorkspaces,
    totalProjects,
    activeSessions,
    commandsAvailable,
    notificationsPending,
    runtimeHealth:        runtimeHealth as any,
    lawApplied,
  };
}

// ── Periodic maintenance ──────────────────────────────────────────────────────

export async function runUPOSMaintenance(userId?: number): Promise<void> {
  const expired = await expireStaleRuntimeSessions();
  const summary = await buildSummary(userId);
  await captureRuntimeSnapshot(summary);
  logger.info({ expired, summary }, "UPOS: maintenance cycle complete");
}

export { buildSummary as fetchUPOSSummary };
