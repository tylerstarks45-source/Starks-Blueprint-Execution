// ─── Build 020: Strategic Constraint Engine ───────────────────────────────────
//
// Evaluates strategic constraints across 6 types.
// Deterministic — no AI, no mutation.

import { randomUUID } from "crypto";
import type {
  StrategicConstraint,
  ConstraintType,
  ImpactLevel,
} from "./types";

interface ConstraintSpec {
  constraintType: ConstraintType;
  title: string;
  description: (scenarioType: string, riskScore: number) => string;
  impact: (riskScore: number) => ImpactLevel;
  adaptationNote: string;
}

const UNIVERSAL_CONSTRAINTS: ConstraintSpec[] = [
  {
    constraintType: "budget",
    title: "Strategic Investment Budget",
    description: (t, r) => `The ${t.replace(/_/g, " ")} strategy is bounded by available capital. ${r > 0.6 ? "Risk levels are elevated — budget flexibility may be limited." : "Moderate financial headroom exists for strategic investment."}`,
    impact: (r) => r > 0.7 ? "high" : r > 0.4 ? "medium" : "low",
    adaptationNote: "Phase initiatives by ROI. Seek internal reallocation or external funding if capital is insufficient.",
  },
  {
    constraintType: "capacity",
    title: "Operational Capacity Limits",
    description: (_t, r) => `Existing team and operational capacity may constrain the pace of strategy execution. ${r > 0.6 ? "Risk-adjusted capacity may be further reduced." : ""}`,
    impact: (_r) => "medium",
    adaptationNote: "Prioritise initiatives, sequence for capacity, and invest in talent or automation where capacity is the bottleneck.",
  },
  {
    constraintType: "technology",
    title: "Technology Capability Limits",
    description: (t) => `The ${t.replace(/_/g, " ")} strategy may be constrained by the current state of technology infrastructure and available integrations.`,
    impact: (_r) => "medium",
    adaptationNote: "Audit technology capabilities before committing to technology-dependent strategy timelines.",
  },
  {
    constraintType: "governance",
    title: "Governance & Policy Constraints",
    description: () => "Internal governance policies and approval requirements may limit the speed and scope of strategic decisions.",
    impact: (_r) => "low",
    adaptationNote: "Map governance requirements early. Align strategy pacing with approval cycles.",
  },
  {
    constraintType: "legal",
    title: "Legal & Regulatory Boundaries",
    description: (t) => `The ${t.replace(/_/g, " ")} strategy must operate within applicable legal and regulatory boundaries that vary by market and jurisdiction.`,
    impact: (_r) => "medium",
    adaptationNote: "Conduct legal review before entering new markets or launching new products. Maintain regulatory compliance monitoring.",
  },
  {
    constraintType: "time",
    title: "Strategic Time Horizon",
    description: () => "Results from strategic initiatives take time to materialise. Short-term performance pressures may create tension with long-term strategic investment.",
    impact: (_r) => "medium",
    adaptationNote: "Separate short-term operational targets from long-term strategic milestones. Protect long-horizon investments from short-term cuts.",
  },
];

export function generateConstraints(
  strategyId: string,
  reportId: string,
  businessId: number,
  scenarioType: string,
  riskScore: number,
): StrategicConstraint[] {
  return UNIVERSAL_CONSTRAINTS.map((spec): StrategicConstraint => ({
    id: randomUUID(),
    strategyId,
    reportId,
    businessId,
    constraintType: spec.constraintType,
    title: spec.title,
    description: spec.description(scenarioType, riskScore),
    impact: spec.impact(riskScore),
    adaptationNote: spec.adaptationNote,
  }));
}
