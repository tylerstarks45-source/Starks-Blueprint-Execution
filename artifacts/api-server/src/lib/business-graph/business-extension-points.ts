// ─── Build 015: Business Graph Extension Points ───────────────────────────────

import { declareExtensionPoint } from "../cognitive-foundation/index";
import { BUSINESS_GRAPH_EXTENSION_POINT_IDS } from "./types";

export function declareBusinessGraphExtensionPoints(): void {
  declareExtensionPoint({
    id: BUSINESS_GRAPH_EXTENSION_POINT_IDS.BUSINESS_GRAPH_CREATED,
    description: "A new Business Graph has been initialized for a business entity.",
    declaredBy: "business-graph-engine",
  });

  declareExtensionPoint({
    id: BUSINESS_GRAPH_EXTENSION_POINT_IDS.BUSINESS_NODE_ADDED,
    description: "A new node has been added to the Business Graph.",
    declaredBy: "business-graph-engine",
  });

  declareExtensionPoint({
    id: BUSINESS_GRAPH_EXTENSION_POINT_IDS.BUSINESS_RELATIONSHIP_CREATED,
    description: "A new typed relationship (edge) has been created between two business nodes.",
    declaredBy: "business-graph-engine",
  });

  declareExtensionPoint({
    id: BUSINESS_GRAPH_EXTENSION_POINT_IDS.BUSINESS_KPI_UPDATED,
    description: "A Business KPI value has been recorded or updated.",
    declaredBy: "business-graph-engine",
  });

  declareExtensionPoint({
    id: BUSINESS_GRAPH_EXTENSION_POINT_IDS.BUSINESS_HEALTH_CALCULATED,
    description: "A 7-dimension Business Health score has been computed for a business.",
    declaredBy: "business-graph-engine",
  });

  declareExtensionPoint({
    id: BUSINESS_GRAPH_EXTENSION_POINT_IDS.BUSINESS_DEPENDENCY_DETECTED,
    description: "A business dependency (critical path, SPOF, blocked initiative) has been detected.",
    declaredBy: "business-graph-engine",
  });

  declareExtensionPoint({
    id: BUSINESS_GRAPH_EXTENSION_POINT_IDS.BUSINESS_OPPORTUNITY_DETECTED,
    description: "A business opportunity has been identified from the Business Graph state.",
    declaredBy: "business-graph-engine",
  });

  declareExtensionPoint({
    id: BUSINESS_GRAPH_EXTENSION_POINT_IDS.BUSINESS_SNAPSHOT_CREATED,
    description: "A point-in-time snapshot of the Business Graph has been persisted.",
    declaredBy: "business-graph-engine",
  });
}
