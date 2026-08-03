// ─────────────────────────────────────────────────────────────────────────────
// Build 050 — UAF Executive Brain Integration
// ─────────────────────────────────────────────────────────────────────────────
import { buildUAFSummary, captureUAFSnapshot } from "../unified-application-framework/uaf-orchestrator";
export type { UAFSummary } from "../unified-application-framework/types";

export async function fetchUAFView(_userId: number): Promise<import("../unified-application-framework/types").UAFSummary> {
  return buildUAFSummary();
}

export async function triggerUAFMaintenance(_userId: number): Promise<void> {
  await captureUAFSnapshot();
}

export function buildUAFAdvisory(summary: import("../unified-application-framework/types").UAFSummary | null): string | null {
  if (!summary) return null;
  const parts: string[] = [
    `UAF — ${summary.totalApps} app(s) | ${summary.enabledApps} enabled`,
  ];
  if (summary.disabledApps > 0) {
    parts.push(`⚠ ${summary.disabledApps} disabled`);
  }
  parts.push(
    `${summary.availableCapabilities} capabilities (${summary.ashInvocableCapabilities} ASH-invocable)`,
    `${summary.availablePages} pages | ${summary.availableWidgets} widgets | ${summary.availableServices} services`,
  );
  if (summary.recentDiagnostics > 0) {
    parts.push(`🔴 ${summary.recentDiagnostics} diagnostic(s) in last 24h`);
  }
  return parts.join(" | ");
}
