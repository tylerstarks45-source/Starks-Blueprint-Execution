// ─────────────────────────────────────────────────────────────────────────────
// Build 021: Strategic Planning Engine — Extension Point Declarations
// ─────────────────────────────────────────────────────────────────────────────
import { declareExtensionPoint } from "../cognitive-foundation";
import {
  EP_PLANNING_FORMED,
  EP_PROGRAM_DEFINED,
  EP_INITIATIVE_DEFINED,
  EP_MILESTONE_DEFINED,
  EP_DEPENDENCY_IDENTIFIED,
  EP_SEQUENCE_DETERMINED,
  EP_READINESS_EVALUATED,
  EP_REPORT_GENERATED,
} from "./types";

export function declarePlanningExtensionPoints(): void {
  declareExtensionPoint({
    id: EP_PLANNING_FORMED,
    description:
      "Hook invoked when a new strategic plan skeleton is formed from executive strategy pillars. Allows enrichment of the plan frame before programs are generated.",
    declaredBy: "strategic-planning-engine",
  });

  declareExtensionPoint({
    id: EP_PROGRAM_DEFINED,
    description:
      "Hook invoked when a strategic program is defined from a pillar. Allows custom program injection, priority re-ordering, or duration adjustment.",
    declaredBy: "strategic-planning-engine",
  });

  declareExtensionPoint({
    id: EP_INITIATIVE_DEFINED,
    description:
      "Hook invoked when a strategic initiative is created beneath a program. Allows external knowledge bases to adjust initiative type, effort, or complexity.",
    declaredBy: "strategic-planning-engine",
  });

  declareExtensionPoint({
    id: EP_MILESTONE_DEFINED,
    description:
      "Hook invoked when a planning milestone checkpoint is defined. Allows outcome criteria calibration based on business-specific benchmarks.",
    declaredBy: "strategic-planning-engine",
  });

  declareExtensionPoint({
    id: EP_DEPENDENCY_IDENTIFIED,
    description:
      "Hook invoked when a cross-program/initiative/technology/resource/cross-functional dependency is identified. Allows graph-derived dependency injection.",
    declaredBy: "strategic-planning-engine",
  });

  declareExtensionPoint({
    id: EP_SEQUENCE_DETERMINED,
    description:
      "Hook invoked when the logical execution order is determined. Allows dependency-aware sequencing adjustment without scheduling.",
    declaredBy: "strategic-planning-engine",
  });

  declareExtensionPoint({
    id: EP_READINESS_EVALUATED,
    description:
      "Hook invoked when planning readiness is evaluated across 5 dimensions. Allows live financial/capacity data integration for readiness scoring.",
    declaredBy: "strategic-planning-engine",
  });

  declareExtensionPoint({
    id: EP_REPORT_GENERATED,
    description:
      "Hook invoked when the immutable planning report is generated. Allows distribution to connected platforms or downstream planning systems.",
    declaredBy: "strategic-planning-engine",
  });
}
