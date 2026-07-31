// ─────────────────────────────────────────────────────────────────────────────
// Build 024: Execution Orchestration Engine — Owner Classification Engine
// Builds the set of unique execution owners from assignments.
// One owner row per owner type per plan.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { ExecutionOwner, ExecutionAssignment, ExecutionOwnerType, ComplexityLevel } from "./types";
import { ownerTypeToClass, buildOwnerName, buildOwnerDescription } from "./assignment-engine";

const COMPLEXITY_RANK: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const RANK_TO_COMPLEXITY: ComplexityLevel[] = ["low", "medium", "high", "critical"];

function avgComplexity(levels: string[]): ComplexityLevel {
  if (levels.length === 0) return "medium";
  const avg = levels.reduce((s, l) => s + (COMPLEXITY_RANK[l] ?? 2), 0) / levels.length;
  return RANK_TO_COMPLEXITY[Math.round(avg) - 1] ?? "medium";
}

function deriveOwnerReadiness(ownerType: ExecutionOwnerType, avgComplex: ComplexityLevel): number {
  // Automated owners are always more ready than manual ones, adjusted for complexity
  const baseScores: Record<ExecutionOwnerType, number> = {
    automation: 0.88,
    integration: 0.85,
    ai_agent: 0.82,
    department: 0.72,
    human: 0.65,
    external_system: 0.60,
    future_capability: 0.25,
  };
  const complexityPenalty: Record<ComplexityLevel, number> = { low: 0, medium: 0.03, high: 0.07, critical: 0.12 };
  return Math.round(Math.max(0.2, (baseScores[ownerType] ?? 0.65) - (complexityPenalty[avgComplex] ?? 0)) * 100) / 100;
}

export function classifyOwners(params: {
  assignments: ExecutionAssignment[];
  planId: string;
  reportId: string;
  businessId: number;
}): { owners: ExecutionOwner[]; ownerIds: Map<ExecutionOwnerType, string> } {
  const { assignments, planId, reportId, businessId } = params;

  // Group assignments by owner type
  const byOwnerType = new Map<ExecutionOwnerType, ExecutionAssignment[]>();
  for (const a of assignments) {
    const arr = byOwnerType.get(a.ownerType) ?? [];
    arr.push(a);
    byOwnerType.set(a.ownerType, arr);
  }

  const ownerIds = new Map<ExecutionOwnerType, string>();
  const owners: ExecutionOwner[] = [];

  for (const [ownerType, asgns] of byOwnerType.entries()) {
    const id = randomUUID();
    ownerIds.set(ownerType, id);

    const complexities = asgns.map((a) => a.complexityLevel);
    const avgComplex = avgComplexity(complexities);
    const readinessScore = deriveOwnerReadiness(ownerType, avgComplex);

    owners.push({
      id,
      planId,
      reportId,
      businessId,
      ownerType,
      ownerName: buildOwnerName(ownerType, asgns[0]?.phaseType ?? "implementation"),
      ownerDescription: buildOwnerDescription(ownerType),
      executionClass: ownerTypeToClass(ownerType),
      assignmentCount: asgns.length,
      averageComplexity: avgComplex,
      readinessScore,
    });
  }

  return { owners, ownerIds };
}
