// ─────────────────────────────────────────────────────────────────────────────
// Build 053 — BEB Executive Brain Integration
// ─────────────────────────────────────────────────────────────────────────────
import { buildBEBSummary, captureBEBSnapshot } from "../business-experience-builder/beb-orchestrator";
export type { BEBSummary } from "../business-experience-builder/types";

export async function fetchBEBView(_userId: number): Promise<import("../business-experience-builder/types").BEBSummary> {
  return buildBEBSummary();
}

export async function triggerBEBMaintenance(_userId: number): Promise<void> {
  await captureBEBSnapshot();
}

export function buildBEBAdvisory(summary: import("../business-experience-builder/types").BEBSummary | null): string | null {
  if (!summary) return null;
  const parts: string[] = [
    `BEB — ${summary.totalExperiences} experience(s) | ${summary.publishedExperiences} published | ${summary.totalPages} page(s) | ${summary.totalThemes} theme(s) | SEO avg ${summary.averageSeoScore}/100`,
  ];
  if (summary.draftExperiences > 0) parts.push(`📝 ${summary.draftExperiences} draft(s)`);
  if (summary.recentDiagnostics > 0) parts.push(`🔴 ${summary.recentDiagnostics} diagnostic(s)`);
  if (Object.keys(summary.typeBreakdown).length > 0) {
    parts.push(`types: ${Object.entries(summary.typeBreakdown).map(([k, v]) => `${k}×${v}`).join(", ")}`);
  }
  return parts.join(" | ");
}
