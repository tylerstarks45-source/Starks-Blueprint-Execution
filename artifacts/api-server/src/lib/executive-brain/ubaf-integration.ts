// ── Build 048: UBAF → Executive Brain integration ────────────────────────────
import { computeUBAFSummary, triggerUBAFMaintenance } from "../unified-asset/ubaf-orchestrator";
import type { UBAFSummary } from "../unified-asset/types";

export type { UBAFSummary };

export async function fetchUBAFView(userId: number): Promise<UBAFSummary | undefined> {
  try {
    return await computeUBAFSummary(userId);
  } catch {
    return undefined;
  }
}

export { triggerUBAFMaintenance };

export function buildUBAFAdvisory(summary: UBAFSummary | null): string | null {
  if (!summary) return null;

  const parts: string[] = [];
  parts.push(`UBAF — ${summary.totalAssets} canonical assets (${summary.activeAssets} active) across ${summary.totalClasses} classes`);

  if (summary.totalRelationships > 0) {
    parts.push(`${summary.totalRelationships} relationships`);
  }
  if (summary.revenueAssets > 0) {
    parts.push(`${summary.revenueAssets} revenue-generating assets`);
  }
  if (summary.duplicateSlugs.length > 0) {
    parts.push(`⚠ ${summary.duplicateSlugs.length} duplicate asset(s) detected`);
  }
  if (summary.missingClasses.length > 0) {
    const preview = summary.missingClasses.slice(0, 4).join(", ");
    const more = summary.missingClasses.length > 4 ? ` (+${summary.missingClasses.length - 4} more)` : "";
    parts.push(`Missing asset classes: ${preview}${more}`);
  }
  if (summary.topCapabilities.length > 0) {
    parts.push(`Top capabilities: ${summary.topCapabilities.slice(0, 3).join(", ")}`);
  }

  return parts.join(" | ");
}
