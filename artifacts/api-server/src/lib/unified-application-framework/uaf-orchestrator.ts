// ─────────────────────────────────────────────────────────────────────────────
// Build 050 — UAF Orchestrator
// Coordinates all 6 UAF engines; produces summary + snapshots
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import {
  applicationRegistry, applicationSnapshots, applicationCapabilities,
  platformPages, platformWidgets, platformServices,
} from "@workspace/db/schema";
import { sql } from "drizzle-orm";
import { listAllApplications, getApplicationRegistry } from "./registry-engine";
import { getCapabilitySummary } from "./capability-engine";
import { listWidgets, listPages } from "./navigation-engine";
import { runPlatformHealthCheck } from "./diagnostics-engine";
import { getRecentDiagnosticsCount } from "./diagnostics-engine";
import type { UAFSummary } from "./types";

export async function buildUAFSummary(): Promise<UAFSummary> {
  const [registry, capSummary, widgets, pages, recentDiag] = await Promise.all([
    getApplicationRegistry(),
    getCapabilitySummary(),
    listWidgets(),
    listPages(),
    getRecentDiagnosticsCount(24),
  ]);

  const servicesRows = await db.select({ cnt: sql<string>`count(*)` }).from(platformServices);
  const serviceCount = parseInt(servicesRows[0]?.cnt ?? "0", 10);

  return {
    totalApps:                registry.totalApps,
    enabledApps:              registry.enabledApps,
    disabledApps:             registry.disabledApps,
    platformApps:             registry.platformApps,
    availableCapabilities:    capSummary.total,
    availableWidgets:         widgets.length,
    availableServices:        serviceCount,
    availablePages:           pages.length,
    lifecycleBreakdown:       registry.lifecycleBreakdown,
    healthBreakdown:          registry.healthBreakdown,
    ashInvocableCapabilities: capSummary.ashInvocable,
    recentDiagnostics:        recentDiag,
  };
}

export async function captureUAFSnapshot(): Promise<void> {
  const summary = await buildUAFSummary();
  await db.insert(applicationSnapshots).values({
    totalApps:            summary.totalApps,
    enabledApps:          summary.enabledApps,
    disabledApps:         summary.disabledApps,
    platformApps:         summary.platformApps,
    userApps:             summary.totalApps - summary.platformApps,
    availableCapabilities:summary.availableCapabilities,
    availableWidgets:     summary.availableWidgets,
    availableServices:    summary.availableServices,
    lifecycleBreakdown:   summary.lifecycleBreakdown,
    healthBreakdown:      summary.healthBreakdown,
    lawApplied:           true,
    snapshotData:         { build: "050", ashInvocable: summary.ashInvocableCapabilities },
  });
}

export async function listSnapshots(limit = 10): Promise<any[]> {
  const { desc } = await import("drizzle-orm");
  return db.select().from(applicationSnapshots).orderBy(desc(applicationSnapshots.createdAt)).limit(limit);
}

export async function performUAFMaintenance(): Promise<void> {
  await captureUAFSnapshot();
}
