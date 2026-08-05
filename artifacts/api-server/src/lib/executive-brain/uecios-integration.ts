import { buildUECIOSSummary, runUECIOSMaintenance } from "../unified-external-capability/uecios-orchestrator.js";
import type { UECIOSSummary } from "../unified-external-capability/types.js";

export type { UECIOSSummary };

export async function fetchUECIOSView(userId: number): Promise<UECIOSSummary> {
  return buildUECIOSSummary(userId);
}

export async function triggerUECIOSMaintenance(userId: number): Promise<void> {
  const cycles = (globalThis as any).__ueciosCycles ?? 0;
  (globalThis as any).__ueciosCycles = cycles + 1;
  if (cycles % 430 === 0) {
    await runUECIOSMaintenance(userId);
  }
}

export function buildUECIOSAdvisory(summary: UECIOSSummary | null): string | null {
  if (!summary) return null;
  const lines: string[] = [];

  lines.push(
    `UECIOS: ${summary.totalProviders} providers (${summary.connectedProviders} connected, ${summary.existingConnectors} via connectors)`
  );

  if (summary.integrationReadiness < 50) {
    lines.push(`Integration readiness: ${summary.integrationReadiness}/100 — significant coverage gaps`);
  } else {
    lines.push(`Integration readiness: ${summary.integrationReadiness}/100`);
  }

  if (summary.degradedProviders > 0) {
    lines.push(`Degraded providers: ${summary.degradedProviders}`);
  }

  if (summary.expiredCredentials > 0) {
    lines.push(`Expired credentials: ${summary.expiredCredentials} — rotation required`);
  }

  if (summary.criticalDiagnostics > 0) {
    lines.push(`Critical integration issues: ${summary.criticalDiagnostics}`);
  }

  if (summary.missingDomains.length > 0) {
    lines.push(`Uncovered domains: ${summary.missingDomains.slice(0, 3).join(", ")}`);
  }

  if (summary.pendingSync > 0) {
    lines.push(`Pending sync jobs: ${summary.pendingSync}`);
  }

  // Infrastructure recommendations are surfaced via the dedicated admin endpoint,
  // not the general advisory — per UECIOS law (FOUNDER_ADMIN / SUPER_ADMIN only)

  return lines.join(". ");
}
