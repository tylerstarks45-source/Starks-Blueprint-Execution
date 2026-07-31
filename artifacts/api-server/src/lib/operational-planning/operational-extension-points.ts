// ─────────────────────────────────────────────────────────────────────────────
// Build 023: Operational Planning Engine — Extension Point Declarations
// ─────────────────────────────────────────────────────────────────────────────
import { declareExtensionPoint } from "../cognitive-foundation";
import {
  EP_OPERATIONAL_PLAN_FORMED,
  EP_WORK_PACKAGE_CREATED,
  EP_PHASE_ORGANIZED,
  EP_DEPENDENCY_RESOLVED,
  EP_EXECUTION_SEQUENCE_PRODUCED,
  EP_READINESS_VERIFIED,
  EP_OPERATIONAL_EVALUATED,
  EP_OPERATIONAL_REPORT_GENERATED,
} from "./types";

export function declareOperationalExtensionPoints(): void {
  declareExtensionPoint({
    id: EP_OPERATIONAL_PLAN_FORMED,
    description:
      "Hook invoked when a new operational plan is formed from a capability plan. Allows enrichment of the plan frame before phase and work package generation.",
    declaredBy: "operational-planning-engine",
  });

  declareExtensionPoint({
    id: EP_WORK_PACKAGE_CREATED,
    description:
      "Hook invoked when a work package is created from a capability requirement. Allows outcome statement refinement or effort estimation adjustment based on business context.",
    declaredBy: "operational-planning-engine",
  });

  declareExtensionPoint({
    id: EP_PHASE_ORGANIZED,
    description:
      "Hook invoked when work packages are organized into an operational phase. Allows phase priority adjustment or custom sequencing rules based on business topology.",
    declaredBy: "operational-planning-engine",
  });

  declareExtensionPoint({
    id: EP_DEPENDENCY_RESOLVED,
    description:
      "Hook invoked when an execution dependency is resolved. Allows live system data or external constraints to inject additional dependencies or adjust severity.",
    declaredBy: "operational-planning-engine",
  });

  declareExtensionPoint({
    id: EP_EXECUTION_SEQUENCE_PRODUCED,
    description:
      "Hook invoked when the deterministic execution sequence is produced. Allows external scheduling systems to consume the ordered work list without modifying it.",
    declaredBy: "operational-planning-engine",
  });

  declareExtensionPoint({
    id: EP_READINESS_VERIFIED,
    description:
      "Hook invoked when operational readiness is verified across 5 dimensions. Allows live integration readiness data to calibrate governance and technology scores.",
    declaredBy: "operational-planning-engine",
  });

  declareExtensionPoint({
    id: EP_OPERATIONAL_EVALUATED,
    description:
      "Hook invoked when the operational plan is scored across 6 dimensions. Allows industry-benchmark calibration of completeness, feasibility, and confidence scores.",
    declaredBy: "operational-planning-engine",
  });

  declareExtensionPoint({
    id: EP_OPERATIONAL_REPORT_GENERATED,
    description:
      "Hook invoked when the immutable operational report is generated. Allows distribution to connected execution systems or downstream operational tracking platforms.",
    declaredBy: "operational-planning-engine",
  });
}
