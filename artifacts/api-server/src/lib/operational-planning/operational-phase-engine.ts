// ─────────────────────────────────────────────────────────────────────────────
// Build 023: Operational Planning Engine — Operational Phase Engine
// Organizes work into 5 logical phases.
// Phase order: preparation(1) → foundation(2) → implementation(3)
//              → validation(4) → optimization(5)
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { OperationalPhase, OperationalPhaseType, WorkPackage } from "./types";

export const PHASE_SPECS: Record<OperationalPhaseType, { name: string; description: string; order: number; priority: number }> = {
  preparation: {
    name: "Preparation Phase",
    description: "Establishes governance, compliance, leadership alignment, and security foundations before any operational work begins.",
    order: 1,
    priority: 1,
  },
  foundation: {
    name: "Foundation Phase",
    description: "Builds the core technology, infrastructure, integrations, finance, and people capabilities that underpin all operational execution.",
    order: 2,
    priority: 2,
  },
  implementation: {
    name: "Implementation Phase",
    description: "Delivers operational, sales, marketing, customer, and knowledge capabilities that drive core business performance.",
    order: 3,
    priority: 3,
  },
  validation: {
    name: "Validation Phase",
    description: "Verifies that all delivered capabilities meet required maturity levels and governance standards before optimization begins.",
    order: 4,
    priority: 4,
  },
  optimization: {
    name: "Optimization Phase",
    description: "Elevates automation and AI capabilities to drive continuous improvement and competitive differentiation.",
    order: 5,
    priority: 5,
  },
};

export function ALL_PHASE_TYPES(): OperationalPhaseType[] {
  return ["preparation", "foundation", "implementation", "validation", "optimization"];
}

export function buildOperationalPhases(params: {
  planId: string;
  reportId: string;
  businessId: number;
  workPackages: WorkPackage[];
}): { phases: OperationalPhase[]; phaseIds: Map<OperationalPhaseType, string> } {
  const { planId, reportId, businessId, workPackages } = params;

  const phaseIds = new Map<OperationalPhaseType, string>();
  const phaseTypes = ALL_PHASE_TYPES();

  // Pre-assign IDs for all phases
  for (const pt of phaseTypes) {
    phaseIds.set(pt, randomUUID());
  }

  // Group work packages by phase
  const packagesByPhase = new Map<OperationalPhaseType, WorkPackage[]>();
  for (const pt of phaseTypes) packagesByPhase.set(pt, []);
  for (const wp of workPackages) {
    const arr = packagesByPhase.get(wp.phaseType);
    if (arr) arr.push(wp);
  }

  const phases: OperationalPhase[] = phaseTypes.map((pt) => {
    const spec = PHASE_SPECS[pt];
    const pkgs = packagesByPhase.get(pt) ?? [];
    const criticalCount = pkgs.filter((p) => p.complexityLevel === "critical" || p.businessCriticality === "critical").length;

    // Readiness score inversely proportional to critical/high-complexity packages
    const criticalPenalty = criticalCount * 0.08;
    const highCount = pkgs.filter((p) => p.complexityLevel === "high").length;
    const highPenalty = highCount * 0.04;
    const readinessScore = Math.max(0.3, Math.round((0.85 - criticalPenalty - highPenalty) * 100) / 100);

    return {
      id: phaseIds.get(pt)!,
      planId,
      reportId,
      businessId,
      phaseType: pt,
      phaseName: spec.name,
      phaseDescription: spec.description,
      phaseOrder: spec.order,
      workPackageCount: pkgs.length,
      criticalWorkPackageCount: criticalCount,
      readinessScore,
      priority: spec.priority,
      workPackages: pkgs,
    };
  });

  // Add validation phase work packages: quality checks for every non-optimization phase
  // Validation always contains at least one work package: the cross-phase readiness check
  const validationPhase = phases.find((p) => p.phaseType === "validation")!;
  if (validationPhase.workPackages.length === 0) {
    // Synthetic validation package
    const syntheticWp: WorkPackage = {
      id: randomUUID(),
      phaseId: validationPhase.id,
      planId,
      reportId,
      businessId,
      capabilityRequirementId: undefined,
      capabilityName: "Cross-Phase Readiness Validation",
      packageTitle: "Deliver: Cross-Phase Readiness Validation",
      packageDescription: "Validates that all capabilities delivered in preceding phases meet required maturity levels before optimization begins.",
      outcomeStatement: "All prior-phase capabilities are confirmed at their required maturity levels with documented evidence, enabling confidence in the optimization phase.",
      phaseType: "validation",
      complexityLevel: "medium",
      businessCriticality: "high",
      effortScore: 0.5,
      sequencePosition: undefined,
      priority: 1,
    };
    validationPhase.workPackages.push(syntheticWp);
    validationPhase.workPackageCount = 1;
  }

  return { phases, phaseIds };
}
