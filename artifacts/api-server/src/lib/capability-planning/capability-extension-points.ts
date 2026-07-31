// ─────────────────────────────────────────────────────────────────────────────
// Build 022: Capability Planning Engine — Extension Point Declarations
// ─────────────────────────────────────────────────────────────────────────────
import { declareExtensionPoint } from "../cognitive-foundation";
import {
  EP_CAPABILITY_PLAN_FORMED,
  EP_DOMAIN_CLASSIFIED,
  EP_REQUIREMENT_IDENTIFIED,
  EP_GAP_DETECTED,
  EP_DEPENDENCY_MAPPED,
  EP_READINESS_EVALUATED,
  EP_CAPABILITY_EVALUATED,
  EP_REPORT_GENERATED,
} from "./types";

export function declareCapabilityExtensionPoints(): void {
  declareExtensionPoint({
    id: EP_CAPABILITY_PLAN_FORMED,
    description:
      "Hook invoked when a new capability plan is formed from strategic plan programmes. Allows enrichment of the plan frame before domain classification.",
    declaredBy: "capability-planning-engine",
  });

  declareExtensionPoint({
    id: EP_DOMAIN_CLASSIFIED,
    description:
      "Hook invoked when capabilities are grouped into a domain. Allows domain priority adjustment or custom domain injection based on business context.",
    declaredBy: "capability-planning-engine",
  });

  declareExtensionPoint({
    id: EP_REQUIREMENT_IDENTIFIED,
    description:
      "Hook invoked when a specific capability requirement is identified. Allows external knowledge bases to adjust required maturity levels or business criticality.",
    declaredBy: "capability-planning-engine",
  });

  declareExtensionPoint({
    id: EP_GAP_DETECTED,
    description:
      "Hook invoked when a capability gap is detected. Allows business-graph-derived gap enrichment or live system discovery to adjust current capability levels.",
    declaredBy: "capability-planning-engine",
  });

  declareExtensionPoint({
    id: EP_DEPENDENCY_MAPPED,
    description:
      "Hook invoked when a capability dependency is mapped. Allows graph-derived cross-domain dependency injection based on actual business topology.",
    declaredBy: "capability-planning-engine",
  });

  declareExtensionPoint({
    id: EP_READINESS_EVALUATED,
    description:
      "Hook invoked when capability readiness is evaluated per domain. Allows live integration data to calibrate maturity, availability, and governance scores.",
    declaredBy: "capability-planning-engine",
  });

  declareExtensionPoint({
    id: EP_CAPABILITY_EVALUATED,
    description:
      "Hook invoked when the overall capability plan is scored. Allows industry-benchmarked scoring calibration for coverage, completeness, and business impact.",
    declaredBy: "capability-planning-engine",
  });

  declareExtensionPoint({
    id: EP_REPORT_GENERATED,
    description:
      "Hook invoked when the immutable capability report is generated. Allows distribution to connected platforms or downstream operational planning systems.",
    declaredBy: "capability-planning-engine",
  });
}
