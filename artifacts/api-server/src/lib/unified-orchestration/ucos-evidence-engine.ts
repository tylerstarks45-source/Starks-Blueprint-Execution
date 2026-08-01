// ── Build 040: Unified Cognitive Orchestration Engine — Evidence Propagation ─
// Ensures downstream engines receive upstream evidence without duplication.
// Records which evidence items flow from each source engine to each target engine.
// Pure — no DB access, no side effects.

import type { EngineDiagnostic, EvidenceFlowRecord } from "./types";
import { COGNITIVE_ENGINE_REGISTRY } from "./types";

// ── Evidence types ────────────────────────────────────────────────────────

type EvidenceType = "summary" | "businessId" | "health" | "context" | "recommendations";

interface EvidenceSpec {
  key:  string;
  type: EvidenceType;
}

// Evidence that each engine provides to its dependents
const ENGINE_EVIDENCE_MAP: Record<string, EvidenceSpec[]> = {
  "business-graph":          [{ key: "businessId", type: "businessId" }, { key: "businessGraphSummary", type: "summary" }],
  "business-analysis":       [{ key: "businessAnalysisSummary", type: "summary" }],
  "opportunity-discovery":   [{ key: "opportunityDiscoverySummary", type: "summary" }],
  "future-simulation":       [{ key: "simulationSummary", type: "summary" }],
  "decision-intelligence":   [{ key: "decisionSummary", type: "summary" }],
  "executive-strategy":      [{ key: "strategySummary", type: "summary" }],
  "strategic-planning":      [{ key: "planningSummary", type: "summary" }],
  "capability-planning":     [{ key: "capabilitySummary", type: "summary" }],
  "operational-planning":    [{ key: "operationalSummary", type: "summary" }],
  "execution-orchestration": [{ key: "executionOrchestrationSummary", type: "summary" }],
  "authority-resolution":    [{ key: "authoritySummary", type: "summary" }],
  "execution-risk":          [{ key: "executionRiskSummary", type: "summary" }],
  "execution-simulation":    [{ key: "executionSimulationSummary", type: "summary" }],
  "workflow-execution":      [{ key: "workflowSummary", type: "summary" }],
  "universal-execution":     [{ key: "universalExecutionSummary", type: "summary" }],
  "adapter-framework":       [{ key: "adapterFrameworkSummary", type: "summary" }],
  "capability-intelligence": [{ key: "capabilityIntelligenceSummary", type: "summary" }],
  "platform-infrastructure": [{ key: "platformInfrastructureSummary", type: "summary" }],
  "global-technology":       [{ key: "globalTechnologySummary", type: "summary" }],
  "technology-relationships":[{ key: "technologyRelationshipSummary", type: "summary" }],
  "technology-evolution":    [{ key: "technologyEvolutionSummary", type: "summary" }],
  "systems-dynamics":        [{ key: "systemsDynamicsSummary", type: "summary" }],
  "trade-off-intelligence":  [{ key: "tradeoffIntelligenceSummary", type: "summary" }],
  "portfolio-intelligence":  [{ key: "portfolioIntelligenceSummary", type: "summary" }],
  "priority-intelligence":   [{ key: "priorityIntelligenceSummary", type: "summary" }],
};

// ── Build evidence flows for a cycle ──────────────────────────────────────

export function buildEvidenceFlows(diagnostics: EngineDiagnostic[]): EvidenceFlowRecord[] {
  const diagMap = new Map(diagnostics.map(d => [d.engineId, d]));
  const flows:   EvidenceFlowRecord[] = [];
  const seen     = new Set<string>(); // dedup (source→target→key)

  for (const engine of COGNITIVE_ENGINE_REGISTRY) {
    for (const depId of engine.dependencies) {
      const evidenceItems = ENGINE_EVIDENCE_MAP[depId] ?? [];
      const sourceDiag    = diagMap.get(depId);
      const available     = (sourceDiag?.succeeded && sourceDiag?.hasSummary) ?? false;

      for (const ev of evidenceItems) {
        const dedupeKey = `${depId}→${engine.engineId}→${ev.key}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        flows.push({
          sourceEngineId:    depId,
          targetEngineId:    engine.engineId,
          evidenceType:      ev.type,
          evidenceKey:       ev.key,
          evidenceAvailable: available,
        });
      }
    }
  }

  return flows;
}

// ── Count total evidence items ─────────────────────────────────────────────

export function countEvidenceItems(diagnostics: EngineDiagnostic[]): number {
  return buildEvidenceFlows(diagnostics).filter(f => f.evidenceAvailable).length;
}
