// ─────────────────────────────────────────────────────────────────────────────
// Build 024: Execution Orchestration Engine — Extension Point Declarations
// ─────────────────────────────────────────────────────────────────────────────
import { declareExtensionPoint } from "../cognitive-foundation";
import {
  EP_EXECUTION_PLAN_FORMED,
  EP_ASSIGNMENT_DETERMINED,
  EP_OWNER_CLASSIFIED,
  EP_QUEUE_CONSTRUCTED,
  EP_POLICY_VALIDATED,
  EP_BLOCKER_DETECTED,
  EP_READINESS_MEASURED,
  EP_ORCHESTRATION_REPORT_GENERATED,
} from "./types";

export function declareExecutionOrchestrationExtensionPoints(): void {
  declareExtensionPoint({
    id: EP_EXECUTION_PLAN_FORMED,
    description:
      "Hook invoked when an execution plan is formed from an operational plan. Allows enrichment of the execution frame before assignment and owner classification.",
    declaredBy: "execution-orchestration-engine",
  });

  declareExtensionPoint({
    id: EP_ASSIGNMENT_DETERMINED,
    description:
      "Hook invoked when an execution assignment is determined for a work package. Allows external HR or resource systems to override or refine the assigned owner type.",
    declaredBy: "execution-orchestration-engine",
  });

  declareExtensionPoint({
    id: EP_OWNER_CLASSIFIED,
    description:
      "Hook invoked when an execution owner is classified into an execution class. Allows live system availability data to adjust class from automated to deferred if the target system is unavailable.",
    declaredBy: "execution-orchestration-engine",
  });

  declareExtensionPoint({
    id: EP_QUEUE_CONSTRUCTED,
    description:
      "Hook invoked when the deterministic execution queue is constructed. Allows downstream execution systems to consume the ordered assignment list without modifying it.",
    declaredBy: "execution-orchestration-engine",
  });

  declareExtensionPoint({
    id: EP_POLICY_VALIDATED,
    description:
      "Hook invoked when execution policies are validated for an assignment. Allows live governance or compliance systems to inject additional policy requirements or change policy status.",
    declaredBy: "execution-orchestration-engine",
  });

  declareExtensionPoint({
    id: EP_BLOCKER_DETECTED,
    description:
      "Hook invoked when an execution blocker is detected for an assignment. Allows real-time integration status data to confirm or dismiss integration blockers.",
    declaredBy: "execution-orchestration-engine",
  });

  declareExtensionPoint({
    id: EP_READINESS_MEASURED,
    description:
      "Hook invoked when execution readiness is measured across 5 dimensions. Allows live operational metrics to calibrate policy and dependency readiness scores.",
    declaredBy: "execution-orchestration-engine",
  });

  declareExtensionPoint({
    id: EP_ORCHESTRATION_REPORT_GENERATED,
    description:
      "Hook invoked when the immutable orchestration report is generated. Allows distribution to connected execution systems, project management platforms, or BI dashboards.",
    declaredBy: "execution-orchestration-engine",
  });
}
