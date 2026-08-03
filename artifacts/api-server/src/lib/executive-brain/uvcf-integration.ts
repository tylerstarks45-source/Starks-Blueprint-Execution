// ─────────────────────────────────────────────────────────────────────────────
// Build 051 — UVCF Executive Brain Integration
// ─────────────────────────────────────────────────────────────────────────────
import { buildUVCFSummary, captureUVCFSnapshot } from "../unified-visual-component-framework/uvcf-orchestrator";
export type { UVCFSummary } from "../unified-visual-component-framework/types";

export async function fetchUVCFView(_userId: number): Promise<import("../unified-visual-component-framework/types").UVCFSummary> {
  return buildUVCFSummary();
}

export async function triggerUVCFMaintenance(_userId: number): Promise<void> {
  await captureUVCFSnapshot();
}

export function buildUVCFAdvisory(summary: import("../unified-visual-component-framework/types").UVCFSummary | null): string | null {
  if (!summary) return null;
  const parts: string[] = [
    `UVCF — ${summary.totalComponents} component(s) | ${summary.totalFamilies} families | ${summary.totalTokens} tokens | ${summary.totalVariants} variants`,
    `a11y: ${summary.accessibilityCoverage}% | semantic: ${summary.ashSemanticCoverage}%`,
  ];
  if (summary.deprecatedCount > 0) parts.push(`⚠ ${summary.deprecatedCount} deprecated`);
  if (summary.recentDiagnostics > 0) parts.push(`🔴 ${summary.recentDiagnostics} diagnostic(s)`);
  return parts.join(" | ");
}
