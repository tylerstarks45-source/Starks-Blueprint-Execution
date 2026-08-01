// ── Build 041: Knowledge Graph Extension Points ───────────────────────────
import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import { KG_EP_IDS } from "./types";

export function declareKnowledgeGraphExtensionPoints(): void {
  declareExtensionPoint({
    id: KG_EP_IDS.IDENTITY_RESOLUTION,
    description: "Intercept graph identity resolution — deterministic hashing and canonical ID creation",
    declaredBy: "knowledge-graph",
  });
  declareExtensionPoint({
    id: KG_EP_IDS.MERGE_RESOLUTION,
    description: "Intercept graph merge resolution — duplicate detection and history-preserving merge",
    declaredBy: "knowledge-graph",
  });
  declareExtensionPoint({
    id: KG_EP_IDS.EVIDENCE_LINKING,
    description: "Intercept evidence linking — connecting conclusions to their supporting evidence nodes",
    declaredBy: "knowledge-graph",
  });
  declareExtensionPoint({
    id: KG_EP_IDS.CONFIDENCE_LINKING,
    description: "Intercept confidence linking — propagating certainty through graph edges without losing provenance",
    declaredBy: "knowledge-graph",
  });
  declareExtensionPoint({
    id: KG_EP_IDS.SEMANTIC_TRAVERSAL,
    description: "Intercept semantic traversal — deterministic BFS/DFS across all registered domains",
    declaredBy: "knowledge-graph",
  });
  declareExtensionPoint({
    id: KG_EP_IDS.EXPLANATION_PATH,
    description: "Intercept explanation path generation — reasoning paths showing how any conclusion was reached",
    declaredBy: "knowledge-graph",
  });
  declareExtensionPoint({
    id: KG_EP_IDS.TEMPORAL_EVOLUTION,
    description: "Intercept temporal evolution — time-aware graph snapshots enabling historical comparison",
    declaredBy: "knowledge-graph",
  });
  declareExtensionPoint({
    id: KG_EP_IDS.ADVISORY,
    description: "Intercept unified knowledge graph advisory generation for the Executive Brain context note",
    declaredBy: "knowledge-graph",
  });
}
