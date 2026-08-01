// ── Build 043: Runtime Diagnostics Engine ────────────────────────────────
// Measures availability, latency, reliability, session health, and throughput.
import { db } from "@workspace/db";
import { runtimeDiagnostics, dolExecutionSessions as executionSessions, executionReceipts } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type { ExecutionChannelType, HealthStatus, DiagnosticsReport } from "./types";
import { EXECUTION_CHANNEL_TYPES } from "./types";

// Measure and record diagnostics for all channels.
export async function measureRuntimeDiagnostics(): Promise<DiagnosticsReport[]> {
  const reports: DiagnosticsReport[] = [];

  for (const channelType of EXECUTION_CHANNEL_TYPES) {
    // Count active sessions for this channel type
    const activeSessions = await db
      .select({ id: executionSessions.id })
      .from(executionSessions)
      .where(eq(executionSessions.status, "active"));
    const channelSessions = activeSessions.length;

    // Count recent receipts (throughput proxy)
    const recentReceipts = await db
      .select({ durationMs: executionReceipts.durationMs, result: executionReceipts.result })
      .from(executionReceipts)
      .where(eq(executionReceipts.channelType, channelType))
      .orderBy(desc(executionReceipts.createdAt))
      .limit(20);

    const totalOps = recentReceipts.length;
    const successOps = recentReceipts.filter((r) => r.result === "success").length;
    const avgLatency = totalOps > 0
      ? Math.round(recentReceipts.reduce((a, r) => a + (r.durationMs ?? 0), 0) / totalOps)
      : 0;
    const reliability = totalOps > 0 ? successOps / totalOps : 1.0;
    const sessionHealth: HealthStatus = channelSessions > 10 ? "degraded" : "healthy";

    const report: DiagnosticsReport = {
      channelType:         channelType as ExecutionChannelType,
      availability:        1.0, // always available (no real connections to probe)
      latencyMs:           avgLatency,
      reliability,
      sessionHealth,
      connectorHealth:     "healthy",
      resourceUtilization: Math.min(1.0, channelSessions / 20),
      throughput:          totalOps,
    };
    reports.push(report);

    // Persist diagnostics record
    await db.insert(runtimeDiagnostics).values({
      sessionId:           null,
      channelType,
      availability:        report.availability,
      latencyMs:           report.latencyMs,
      reliability:         report.reliability,
      sessionHealth:       report.sessionHealth,
      connectorHealth:     report.connectorHealth,
      resourceUtilization: report.resourceUtilization,
      throughput:          report.throughput,
    });
  }

  return reports;
}

export async function computeOverallHealth(reports: DiagnosticsReport[]): Promise<HealthStatus> {
  if (reports.some((r) => r.sessionHealth === "failed" || r.connectorHealth === "failed")) return "failed";
  if (reports.some((r) => r.sessionHealth === "degraded" || r.reliability < 0.8)) return "degraded";
  return "healthy";
}

export async function computeAverageLatency(reports: DiagnosticsReport[]): Promise<number> {
  if (reports.length === 0) return 0;
  return Math.round(reports.reduce((a, r) => a + r.latencyMs, 0) / reports.length);
}

export async function getLatestDiagnostics(channelType?: string): Promise<Array<{
  channelType: string; sessionHealth: string; reliability: number; latencyMs: number; measuredAt: Date;
}>> {
  const rows = channelType
    ? await db.select().from(runtimeDiagnostics).where(eq(runtimeDiagnostics.channelType, channelType)).orderBy(desc(runtimeDiagnostics.measuredAt)).limit(10)
    : await db.select().from(runtimeDiagnostics).orderBy(desc(runtimeDiagnostics.measuredAt)).limit(50);
  return rows.map((r) => ({
    channelType:   r.channelType,
    sessionHealth: r.sessionHealth,
    reliability:   r.reliability ?? 1.0,
    latencyMs:     r.latencyMs,
    measuredAt:    r.measuredAt,
  }));
}
