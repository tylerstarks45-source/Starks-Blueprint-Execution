import { buildUCIESummary, runUCIEMaintenance } from "../unified-customer-intelligence/ucie-orchestrator.js";
import type { UCIESummary } from "../unified-customer-intelligence/types.js";

export type { UCIESummary };

export async function fetchUCIEView(userId: number): Promise<UCIESummary> {
  return buildUCIESummary(userId);
}

export async function triggerUCIEMaintenance(userId: number): Promise<void> {
  const cycles = (globalThis as any).__ucieCycles ?? 0;
  (globalThis as any).__ucieCycles = cycles + 1;
  if (cycles % 400 === 0) {
    await runUCIEMaintenance(userId);
  }
}

export function buildUCIEAdvisory(summary: UCIESummary | null): string | null {
  if (!summary) return null;
  const lines: string[] = [];
  lines.push(`UCIE: ${summary.totalCustomers} customers (${summary.activeCustomers} active), ${summary.totalOrganizations} orgs, ${summary.totalInteractions} interactions`);
  if (summary.duplicateFlagCount > 0) {
    lines.push(`Duplicates flagged: ${summary.duplicateFlagCount} — merge review recommended`);
  }
  if (summary.averageEngagement > 0) {
    lines.push(`Avg engagement: ${summary.averageEngagement.toFixed(1)}/100, Avg LTV: ${summary.averageLifetimeValue.toFixed(2)}`);
  }
  const topStage = Object.entries(summary.stageBreakdown).sort((a, b) => b[1] - a[1])[0];
  if (topStage) lines.push(`Largest lifecycle stage: ${topStage[0]} (${topStage[1]})`);
  const riskCount = (summary.healthBreakdown["at_risk"] ?? 0) + (summary.healthBreakdown["dormant"] ?? 0);
  if (riskCount > 0) lines.push(`At-risk or dormant customers: ${riskCount}`);
  return lines.join(". ");
}
