import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import {
  EP_TRI_RELATIONSHIP_DISCOVERED,
  EP_TRI_DEPENDENCY_MAPPED,
  EP_TRI_ECOSYSTEM_CLASSIFIED,
  EP_TRI_SYNERGY_CALCULATED,
  EP_TRI_CONFLICT_DETECTED,
  EP_TRI_MIGRATION_MAPPED,
  EP_TRI_RECOMMENDATION_PRODUCED,
  EP_TRI_GRAPH_REBUILT,
} from "./types";

export function declareTechnologyRelationshipExtensionPoints(): void {
  declareExtensionPoint({
    id: EP_TRI_RELATIONSHIP_DISCOVERED,
    description:
      "Fired when a new technology relationship is discovered; inject live relationship data from package manifests, API documentation, cloud provider reference architectures, or service mesh telemetry to supplement or override the static seed.",
    declaredBy: "technology-relationships",
  });

  declareExtensionPoint({
    id: EP_TRI_DEPENDENCY_MAPPED,
    description:
      "Fired after dependency mapping completes for a technology pair; inject real runtime dependency data (actual npm/pip/cargo dependency trees, OS package dependencies, service call graphs) to refine dependency type classification.",
    declaredBy: "technology-relationships",
  });

  declareExtensionPoint({
    id: EP_TRI_ECOSYSTEM_CLASSIFIED,
    description:
      "Fired after an ecosystem classification is computed; inject market research data, analyst reports, or community surveys to refine ecosystem boundaries, maturity scores, and coherence measurements.",
    declaredBy: "technology-relationships",
  });

  declareExtensionPoint({
    id: EP_TRI_SYNERGY_CALCULATED,
    description:
      "Fired after a synergy score is computed for a technology pair; inject real performance benchmarks, case studies, or production telemetry to replace deterministic baseline synergy estimates with evidence-based scores.",
    declaredBy: "technology-relationships",
  });

  declareExtensionPoint({
    id: EP_TRI_CONFLICT_DETECTED,
    description:
      "Fired when a technology conflict is detected; route to administrator notification systems, incident management, or runbook generation pipelines before the conflict is persisted.",
    declaredBy: "technology-relationships",
  });

  declareExtensionPoint({
    id: EP_TRI_MIGRATION_MAPPED,
    description:
      "Fired after a migration path is computed; inject org-specific migration playbooks, historical migration data, or effort estimates from completed migrations to refine risk and complexity assessments.",
    declaredBy: "technology-relationships",
  });

  declareExtensionPoint({
    id: EP_TRI_RECOMMENDATION_PRODUCED,
    description:
      "Fired when a relationship recommendation is produced; inject org-specific constraints, budget data, team expertise profiles, or strategic priorities to filter or re-rank recommendations before persistence.",
    declaredBy: "technology-relationships",
  });

  declareExtensionPoint({
    id: EP_TRI_GRAPH_REBUILT,
    description:
      "Fired when the full relationship graph rebuild completes; trigger downstream graph analytics (centrality, community detection, critical path analysis), administrator dashboards, or knowledge graph synchronization.",
    declaredBy: "technology-relationships",
  });
}
