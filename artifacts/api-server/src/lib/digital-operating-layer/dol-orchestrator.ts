// ── Build 043: Digital Operating Layer Orchestrator ──────────────────────
// Main entry point — runs discovery, diagnostics, and snapshot creation.
// The Operating Layer executes approved work. It never decides or plans.
import { db } from "@workspace/db";
import {
  digitalWorkspaces,
  executionSessions,
  executionReceipts,
  operatingRegistry,
  operatingSnapshots,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { discoverEnvironments } from "./dol-discovery-engine";
import { countActiveSessions } from "./dol-session-engine";
import { countTotalChannels } from "./dol-channel-engine";
import { countTotalReceipts } from "./dol-receipt-engine";
import {
  measureRuntimeDiagnostics,
  computeOverallHealth,
  computeAverageLatency,
} from "./dol-diagnostics-engine";
import type { OperatingLayerSummary, HealthStatus } from "./types";

// Run a full operating layer initialization pass.
export async function initializeOperatingLayer(userId: number | null): Promise<OperatingLayerSummary> {
  // 1. Discover all operating environments
  await discoverEnvironments();

  // 2. Measure runtime diagnostics
  const reports = await measureRuntimeDiagnostics();

  // 3. Gather aggregate stats
  const [activeWorkspaceRows, activeSessions, totalChannels, totalReceipts, regRows] = await Promise.all([
    db.select({ id: digitalWorkspaces.id }).from(digitalWorkspaces).where(eq(digitalWorkspaces.status, "active")),
    countActiveSessions(),
    countTotalChannels(),
    countTotalReceipts(),
    db.select({ domain: operatingRegistry.domain }).from(operatingRegistry),
  ]);

  const overallHealth = await computeOverallHealth(reports);
  const avgLatencyMs  = await computeAverageLatency(reports);

  // 4. Create operating snapshot
  const [snap] = await db.insert(operatingSnapshots).values({
    userId:          userId ?? null,
    activeWorkspaces:activeWorkspaceRows.length,
    activeSessions,
    totalChannels,
    totalReceipts,
    avgLatencyMs,
    overallHealth,
    lawApplied:      true,
    snapshotData:    {
      domains:     regRows.map((r) => r.domain),
      computedAt:  new Date().toISOString(),
    },
  }).returning({ id: operatingSnapshots.id });

  return {
    activeWorkspaces:  activeWorkspaceRows.length,
    activeSessions,
    totalChannels,
    totalReceipts,
    avgLatencyMs,
    overallHealth,
    lawApplied:        true,
    registeredDomains: regRows.length,
    snapshotId:        snap.id,
    computedAt:        new Date(),
  };
}

// Lightweight read — fetches the latest snapshot for EB context.
export async function fetchOperatingLayerSummary(userId: number): Promise<OperatingLayerSummary | null> {
  try {
    const rows = await db
      .select()
      .from(operatingSnapshots)
      .orderBy(desc(operatingSnapshots.createdAt))
      .limit(1);
    if (rows.length === 0) return null;

    const r    = rows[0];
    const regs = await db.select({ domain: operatingRegistry.domain }).from(operatingRegistry);

    return {
      activeWorkspaces:  r.activeWorkspaces,
      activeSessions:    r.activeSessions,
      totalChannels:     r.totalChannels,
      totalReceipts:     r.totalReceipts,
      avgLatencyMs:      r.avgLatencyMs,
      overallHealth:     (r.overallHealth ?? "healthy") as HealthStatus,
      lawApplied:        r.lawApplied ?? true,
      registeredDomains: regs.length,
      snapshotId:        r.id,
      computedAt:        r.createdAt,
    };
  } catch {
    return null;
  }
}

// Summary string for EB advisory.
export async function buildOperatingLayerSummaryText(): Promise<string> {
  try {
    const rows = await db
      .select()
      .from(operatingSnapshots)
      .orderBy(desc(operatingSnapshots.createdAt))
      .limit(1);
    if (rows.length === 0) return "Operating layer not yet initialized.";
    const r = rows[0];
    return `Operating Layer: ${r.activeSessions} active sessions | ${r.totalChannels} channels | ${r.totalReceipts} receipts | health: ${r.overallHealth} | avg latency: ${r.avgLatencyMs}ms.`;
  } catch {
    return "Operating layer summary unavailable.";
  }
}
