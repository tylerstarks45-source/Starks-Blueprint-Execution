// ─────────────────────────────────────────────────────────────────────────────
// Build 052 — UCE Orchestrator
// Coordinates all 6 UCE engines; produces summary + snapshots
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import {
  canvasRegistry, canvasSessions, canvasLayers,
  canvasRenderers, canvasHistory, canvasGuides, canvasSnapshots,
} from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { getHistoryCount } from "./history-engine";
import type { UCESummary } from "./types";

export async function buildUCESummary(): Promise<UCESummary> {
  const [registryRows, sessionRows, layerRows, rendererRows, guideRows] = await Promise.all([
    db.select().from(canvasRegistry),
    db.select({ id: canvasSessions.id, endedAt: canvasSessions.endedAt }).from(canvasSessions),
    db.select({ id: canvasLayers.id }).from(canvasLayers),
    db.select().from(canvasRenderers).where(eq(canvasRenderers.isActive, true)),
    db.select({ id: canvasGuides.id }).from(canvasGuides),
  ]);

  const totalHistory = await getHistoryCount();
  const activeSessions = sessionRows.filter((s: any) => !s.endedAt).length;

  const modeBreakdown: Record<string, number> = {};
  for (const c of registryRows) {
    const m = (c as any).canvasMode as string;
    modeBreakdown[m] = (modeBreakdown[m] ?? 0) + 1;
  }

  const rendererBreakdown: Record<string, number> = {};
  for (const r of rendererRows) {
    const t = (r as any).rendererType as string;
    rendererBreakdown[t] = (rendererBreakdown[t] ?? 0) + 1;
  }

  return {
    totalCanvases:       registryRows.length,
    activeCanvases:      registryRows.filter((r: any) => r.isActive).length,
    activeSessions,
    totalLayers:         layerRows.length,
    totalRenderers:      rendererRows.length,
    totalHistoryEntries: totalHistory,
    totalGuides:         guideRows.length,
    registeredModes:     Object.keys(modeBreakdown),
    canvasModeBreakdown: modeBreakdown,
    rendererBreakdown,
    recentDiagnostics:   0,
  };
}

export async function captureUCESnapshot(): Promise<void> {
  const summary = await buildUCESummary();
  await db.insert(canvasSnapshots).values({
    canvasId:          null,
    totalCanvases:     summary.totalCanvases,
    activeSessions:    summary.activeSessions,
    totalLayers:       summary.totalLayers,
    totalRenderers:    summary.totalRenderers,
    totalHistory:      summary.totalHistoryEntries,
    canvasModes:       summary.canvasModeBreakdown,
    rendererBreakdown: summary.rendererBreakdown,
    lawApplied:        true,
    snapshotData:      { build: "052" },
  });
}

export async function listSnapshots(limit = 10): Promise<any[]> {
  return db.select().from(canvasSnapshots).orderBy(desc(canvasSnapshots.createdAt)).limit(limit);
}

export async function performUCEMaintenance(): Promise<void> {
  await captureUCESnapshot();
}
