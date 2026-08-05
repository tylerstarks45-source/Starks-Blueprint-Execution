import { buildURCMPSummary, runURCMPMaintenance } from "../unified-revenue-commerce/urcmp-orchestrator.js";
import type { URCMPSummary } from "../unified-revenue-commerce/types.js";

export type { URCMPSummary };

export async function fetchURCMPView(userId: number): Promise<URCMPSummary> {
  return buildURCMPSummary(userId);
}

export async function triggerURCMPMaintenance(userId: number): Promise<void> {
  const cycles = (globalThis as any).__urcmpCycles ?? 0;
  (globalThis as any).__urcmpCycles = cycles + 1;
  if (cycles % 420 === 0) {
    await runURCMPMaintenance(userId);
  }
}

export function buildURCMPAdvisory(summary: URCMPSummary | null): string | null {
  if (!summary) return null;
  const lines: string[] = [];

  lines.push(
    `URCMP: ${summary.totalCatalogs} catalog(s), ${summary.totalProducts} products, ` +
    `${summary.totalServices} services, ${summary.totalOffers} offers`
  );

  if (summary.monetizationScore < 40) {
    lines.push(`Monetization score: ${summary.monetizationScore}/100 — platform is under-monetized`);
  } else {
    lines.push(`Monetization score: ${summary.monetizationScore}/100`);
  }

  if (summary.activeSubscriptions > 0) {
    lines.push(`Active subscriptions: ${summary.activeSubscriptions}`);
  }

  if (summary.estimatedMonthlyRevenue > 0) {
    lines.push(`Est. monthly revenue: $${summary.estimatedMonthlyRevenue.toFixed(0)}`);
  }

  if (summary.missingMonetization.length > 0) {
    lines.push(`Missing monetization: ${summary.missingMonetization.slice(0, 2).join("; ")}`);
  }

  if (summary.openOpportunities.length > 0) {
    lines.push(`Revenue opportunities: ${summary.openOpportunities.slice(0, 2).join("; ")}`);
  }

  if (summary.criticalDiagnostics > 0) {
    lines.push(`Critical commerce issues: ${summary.criticalDiagnostics}`);
  }

  if (summary.totalQuotes > 0) {
    lines.push(`${summary.totalQuotes} quote(s), ${summary.totalContracts} contract(s), ${summary.totalInvoices} invoice(s)`);
  }

  return lines.join(". ");
}
