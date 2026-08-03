import { buildUBPESummary, runUBPEMaintenance } from "../unified-business-process/ubpe-orchestrator.js";
import type { UBPESummary } from "../unified-business-process/types.js";

export type { UBPESummary };

export async function fetchUBPEView(userId: number): Promise<UBPESummary> {
  return buildUBPESummary(userId);
}

export async function triggerUBPEMaintenance(userId: number): Promise<void> {
  const cycles = (globalThis as any).__ubpeCycles ?? 0;
  (globalThis as any).__ubpeCycles = cycles + 1;
  if (cycles % 410 === 0) {
    await runUBPEMaintenance(userId);
  }
}

export function buildUBPEAdvisory(summary: UBPESummary | null): string | null {
  if (!summary) return null;
  const lines: string[] = [];
  lines.push(`UBPE: ${summary.totalProcesses} processes (${summary.activeProcesses} active, ${summary.completedProcesses} completed)`);
  if (summary.blockedProcesses > 0) {
    lines.push(`Blocked processes: ${summary.blockedProcesses} — bottleneck analysis recommended`);
  }
  if (summary.slaBreachedCount > 0) {
    lines.push(`SLA breaches: ${summary.slaBreachedCount} — review process time budgets`);
  }
  if (summary.pendingApprovals > 0) {
    lines.push(`Pending approvals: ${summary.pendingApprovals}`);
  }
  if (summary.averageHealthScore > 0) {
    lines.push(`Avg process health: ${summary.averageHealthScore.toFixed(1)}/100, Avg completion: ${summary.averageCompletion.toFixed(1)}%`);
  }
  const topDomain = Object.entries(summary.domainBreakdown).sort((a, b) => b[1] - a[1])[0];
  if (topDomain) lines.push(`Most active domain: ${topDomain[0]} (${topDomain[1]})`);
  return lines.join(". ");
}
