import { buildTradeoffIntelligenceSummary, runTradeoffPlatformRebuild } from "../tradeoff-intelligence/eti-orchestrator";
import type { TradeoffIntelligenceSummary } from "../tradeoff-intelligence/types";

// ── EB throttle state ─────────────────────────────────────────────────────
let etiCycleCount = 0;
const ETI_THROTTLE_CYCLES = 250;

// ── Fetch summary for EB context ──────────────────────────────────────────
export async function fetchTradeoffIntelligenceSummary(
  _userId: number,
): Promise<TradeoffIntelligenceSummary | null> {
  try {
    return await buildTradeoffIntelligenceSummary();
  } catch {
    return null;
  }
}

// ── Throttled background rebuild ──────────────────────────────────────────
export function triggerTradeoffIntelligenceRebuild(_userId: number): void {
  etiCycleCount++;
  if (etiCycleCount % ETI_THROTTLE_CYCLES !== 0) return;
  runTradeoffPlatformRebuild("scheduled").catch(() => {/* fail-open */});
}

// ── Advisory for buildContextNote ────────────────────────────────────────
export function buildTradeoffIntelligenceAdvisory(
  summary: TradeoffIntelligenceSummary | null,
): string | null {
  if (!summary || summary.totalEvaluations === 0) return null;

  const parts: string[] = [
    `[TradeoffIntelligence] ${summary.totalEvaluations} decision(s) evaluated. Avg confidence: ${(summary.averageConfidenceScore * 100).toFixed(0)}%. Executive Law compliance: ${(summary.executiveLawCompliance * 100).toFixed(0)}%.`,
  ];

  if (summary.sensitivitiesDetected > 0) {
    parts.push(`${summary.sensitivitiesDetected} decision(s) are constraint-sensitive — recommendation changes when constraints shift.`);
  }

  if (summary.highConfidenceDecisions > 0) {
    parts.push(`${summary.highConfidenceDecisions} high-confidence decision(s) on record.`);
  }

  const recent = summary.recentRecommendations.slice(0, 3);
  if (recent.length > 0) {
    const recStr = recent.map(r => `"${r.title}"→${r.recommended}(${(r.confidence * 100).toFixed(0)}%${r.sensitive ? ",⚠️sensitive" : ""})`).join("; ");
    parts.push(`Recent recommendations: ${recStr}.`);
  }

  if (summary.topDecisionType) {
    parts.push(`Most common decision type: ${summary.topDecisionType}.`);
  }

  return parts.join(" ");
}
