// ─────────────────────────────────────────────────────────────────────────────
// Build 029: Universal Execution Engine — Extension Points (8 EPs)
// ─────────────────────────────────────────────────────────────────────────────
import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import {
  EP_EXECUTION_SESSION_CREATED,
  EP_NODE_EXECUTION_STARTED,
  EP_NODE_EXECUTION_COMPLETED,
  EP_CHECKPOINT_VALIDATED,
  EP_EVIDENCE_COLLECTED,
  EP_ROLLBACK_INITIATED,
  EP_EXECUTION_REPORT_GENERATED,
  EP_EXECUTION_REGISTRY_UPDATED,
} from "./types";

export function declareUniversalExecutionExtensionPoints(): void {
  declareExtensionPoint({
    id: EP_EXECUTION_SESSION_CREATED,
    description: "Invoked when a new execution session is created. Allows injection of session-level metadata, pre-flight checks, or external notifications.",
    declaredBy: "universal-execution",
  });

  declareExtensionPoint({
    id: EP_NODE_EXECUTION_STARTED,
    description: "Invoked immediately before a workflow node begins execution. Allows injection of execution adapters or external system calls.",
    declaredBy: "universal-execution",
  });

  declareExtensionPoint({
    id: EP_NODE_EXECUTION_COMPLETED,
    description: "Invoked after a workflow node completes (succeeded or failed). Allows capture of external results or enrichment of node evidence.",
    declaredBy: "universal-execution",
  });

  declareExtensionPoint({
    id: EP_CHECKPOINT_VALIDATED,
    description: "Invoked after each checkpoint validation. Allows external validators, compliance systems, or approval gates to intercept.",
    declaredBy: "universal-execution",
  });

  declareExtensionPoint({
    id: EP_EVIDENCE_COLLECTED,
    description: "Invoked after evidence is collected for a node. Allows enrichment with external logs, metrics, or artefact references.",
    declaredBy: "universal-execution",
  });

  declareExtensionPoint({
    id: EP_ROLLBACK_INITIATED,
    description: "Invoked when a rollback is initiated for a failed node. Allows external rollback coordinators or incident management systems.",
    declaredBy: "universal-execution",
  });

  declareExtensionPoint({
    id: EP_EXECUTION_REPORT_GENERATED,
    description: "Invoked after the immutable execution report is generated. Allows distribution to dashboards, audit logs, or notification systems.",
    declaredBy: "universal-execution",
  });

  declareExtensionPoint({
    id: EP_EXECUTION_REGISTRY_UPDATED,
    description: "Invoked after the execution registry is upserted. Allows downstream health monitors or dashboards to receive fresh execution state.",
    declaredBy: "universal-execution",
  });
}
