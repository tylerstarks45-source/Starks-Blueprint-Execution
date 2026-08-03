// ─────────────────────────────────────────────────────────────────────────────
// Build 052 — UCE Executive Brain Integration
// ─────────────────────────────────────────────────────────────────────────────
import { buildUCESummary, captureUCESnapshot } from "../universal-canvas-engine/uce-orchestrator";
export type { UCESummary } from "../universal-canvas-engine/types";

export async function fetchUCEView(_userId: number): Promise<import("../universal-canvas-engine/types").UCESummary> {
  return buildUCESummary();
}

export async function triggerUCEMaintenance(_userId: number): Promise<void> {
  await captureUCESnapshot();
}

export function buildUCEAdvisory(summary: import("../universal-canvas-engine/types").UCESummary | null): string | null {
  if (!summary) return null;
  const parts: string[] = [
    `UCE — ${summary.totalCanvases} canvas(es) | ${summary.activeSessions} active session(s) | ${summary.totalRenderers} renderer(s) | ${summary.totalHistoryEntries} history entry/entries`,
    `modes: ${summary.registeredModes.join(", ") || "none"}`,
  ];
  if (summary.recentDiagnostics > 0) parts.push(`🔴 ${summary.recentDiagnostics} diagnostic(s)`);
  return parts.join(" | ");
}
