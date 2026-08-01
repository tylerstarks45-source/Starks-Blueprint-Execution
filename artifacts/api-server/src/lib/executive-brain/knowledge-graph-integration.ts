// ── Build 041: Knowledge Graph — Executive Brain Integration ─────────────
import { logger } from "../logger";
import {
  fetchUnifiedGraphView,
  buildUnifiedGraphSummary,
  buildUnifiedKnowledgeGraph,
} from "../knowledge-graph/kg-orchestrator";
import type { UnifiedGraphView } from "../knowledge-graph/types";
import { GRAPH_THROTTLE_CYCLES } from "../knowledge-graph/types";

export type { UnifiedGraphView };

// Fetch the latest unified graph view for the EB context note (read-only).
export async function fetchKnowledgeGraphView(userId: number): Promise<UnifiedGraphView | null> {
  try {
    return await fetchUnifiedGraphView(userId);
  } catch (err) {
    logger.warn({ err }, "Knowledge Graph: fetchKnowledgeGraphView failed (fail-open)");
    return null;
  }
}

// Fire-and-forget graph rebuild — triggered every GRAPH_THROTTLE_CYCLES EB cycles.
let _rebuildCycleCounter = 0;
export function triggerGraphRebuild(userId: number): void {
  _rebuildCycleCounter++;
  if (_rebuildCycleCounter % GRAPH_THROTTLE_CYCLES !== 0) return;
  buildUnifiedKnowledgeGraph(userId).catch((err) =>
    logger.warn({ err }, "Knowledge Graph: background rebuild failed (ignored)"),
  );
}

// Build the EB advisory section for the unified knowledge graph.
export function buildGraphAdvisory(view: UnifiedGraphView | null): string {
  if (!view) return "";
  const parts: string[] = [];
  parts.push(
    `Unified Knowledge Graph: ${view.totalNodes} nodes | ${view.totalEdges} edges | ${view.totalDomains} domains | ${view.evidenceItems} evidence items | avg confidence ${(view.confidenceAvg * 100).toFixed(0)}%.`,
  );
  if (!view.lawApplied) {
    parts.push("WARNING: Unified Knowledge Law not applied — some cognitive artifacts may be orphaned.");
  }
  const topDomains = view.domainRegistry
    .filter((d) => d.nodeCount > 0)
    .sort((a, b) => b.nodeCount - a.nodeCount)
    .slice(0, 5)
    .map((d) => `${d.domain}(${d.nodeCount})`)
    .join(", ");
  if (topDomains) {
    parts.push(`Top domains: ${topDomains}.`);
  }
  return parts.join(" ");
}
