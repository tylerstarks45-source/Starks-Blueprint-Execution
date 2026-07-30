// ─── Build 014: Policy Evaluation Engine ─────────────────────────────────────
//
// Evaluates validated Executive Principles and produces governance decisions.
// Deterministic — no AI, no inference.
// Pure: no DB access. Receives principle data, returns PolicyEvaluationResult.

import { randomUUID } from "crypto";
import type {
  ExecutivePolicy,
  PolicyDecisionType,
  PolicyEvaluationResult,
  PolicyType,
} from "./types";
import { POLICY_THRESHOLDS } from "./types";

// ── Input shape (subset of ExecutivePrinciple needed here) ────────────────────

export interface PrincipleForEvaluation {
  id: string;
  userId: number | null;
  title: string;
  description: string;
  category: string;
  businessDomain: string;
  strategicCategory: string;
  confidence: number;
  reliability: number;
  timesObserved: number;
  timesConfirmed: number;
  timesContradicted: number;
  successRate: number;
  failureRate: number;
  patternType: string | null;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

// ── Map principle category to policy type ─────────────────────────────────────

function inferPolicyType(principle: PrincipleForEvaluation): PolicyType {
  switch (principle.category) {
    case "planning":
      return "planning_guidance";
    case "execution":
    case "resource_management":
      return "execution_guidance";
    case "judgment":
    case "risk_management":
      return "judgment_guidance";
    case "goal_management":
      return "goal_prioritization";
    case "strategy":
      return "execution_strategy";
    case "communication":
    case "operations":
      return "context_weighting";
    default:
      return "general";
  }
}

// ── Compute policy priority from principle confidence + observations ───────────
// Priority 1 = highest (most important). Priority 10 = lowest.

function computePriority(principle: PrincipleForEvaluation): number {
  if (principle.confidence >= POLICY_THRESHOLDS.HIGH_PRIORITY_CONFIDENCE && principle.timesObserved >= 8) return 2;
  if (principle.confidence >= 0.70 && principle.timesObserved >= 5) return 3;
  if (principle.confidence >= 0.60) return 5;
  return 7;
}

// ── Build guidance advisory text ──────────────────────────────────────────────
// This is the text the Executive Brain reads at runtime.

function buildGuidance(principle: PrincipleForEvaluation, policyType: PolicyType): string {
  const domain = principle.businessDomain;
  const patternType = principle.patternType ?? "observed pattern";

  switch (policyType) {
    case "planning_guidance":
      return `[PLANNING] In the ${domain} domain, ${principle.title.toLowerCase()}. Evidence: ${principle.timesObserved} cases, ${(principle.confidence * 100).toFixed(0)}% confidence. Prefer planning strategies that align with this principle when working in this domain.`;
    case "execution_guidance":
      return `[EXECUTION] ${principle.title}. This principle is supported by ${principle.timesConfirmed} of ${principle.timesObserved} observed cases. Apply this guidance when executing in the ${domain} domain.`;
    case "judgment_guidance":
      return `[JUDGMENT] When making decisions in ${domain}, note: ${principle.description} (confidence: ${(principle.confidence * 100).toFixed(0)}%).`;
    case "goal_prioritization":
      return `[GOALS] Prioritize goals that align with the observed pattern: ${principle.title} (${domain} domain, success rate: ${(principle.successRate * 100).toFixed(0)}%).`;
    case "execution_strategy":
      return `[STRATEGY] ${principle.title}. This strategic pattern has been observed in ${principle.timesObserved} cases with ${(principle.successRate * 100).toFixed(0)}% success in ${domain}.`;
    case "context_weighting":
      return `[CONTEXT] Weight context signals from ${domain} domain according to this principle: ${principle.title}.`;
    default:
      return `[POLICY] ${principle.title}: ${principle.description} (${domain}, confidence: ${(principle.confidence * 100).toFixed(0)}%)`;
  }
}

// ── Compute contradiction rate ────────────────────────────────────────────────

function contradictionRate(principle: PrincipleForEvaluation): number {
  if (principle.timesObserved === 0) return 0;
  return principle.timesContradicted / principle.timesObserved;
}

// ── Core evaluation ───────────────────────────────────────────────────────────

export { PolicyEvaluationResult };

export function evaluatePrinciple(
  principle: PrincipleForEvaluation,
  existingApprovedPolicies: ExecutivePolicy[],
): PolicyEvaluationResult {
  const cr = contradictionRate(principle);

  // ── REJECT: low confidence or high contradiction ──────────────────────────
  if (principle.confidence < POLICY_THRESHOLDS.REJECT_BELOW_CONFIDENCE) {
    return {
      decision: "reject",
      rationale: `Principle confidence ${principle.confidence.toFixed(2)} is below rejection threshold ${POLICY_THRESHOLDS.REJECT_BELOW_CONFIDENCE}. Policy would not be reliable.`,
      conflictsDetected: 0,
    };
  }

  if (cr > POLICY_THRESHOLDS.MAX_CONTRADICTION_RATE_FOR_APPROVAL) {
    return {
      decision: "reject",
      rationale: `Contradiction rate ${cr.toFixed(2)} exceeds maximum ${POLICY_THRESHOLDS.MAX_CONTRADICTION_RATE_FOR_APPROVAL}. Policy would produce conflicting guidance.`,
      conflictsDetected: 0,
    };
  }

  // ── Check for existing policy from same principle ─────────────────────────
  const existingFromSamePrinciple = existingApprovedPolicies.find(
    (p) => p.sourcePrincipleIds.includes(principle.id),
  );

  if (existingFromSamePrinciple) {
    // If new principle is significantly better, supersede
    if (
      principle.confidence > ((existingFromSamePrinciple.metadata?.principleConfidence as number) ?? 0) &&
      principle.timesObserved > ((existingFromSamePrinciple.metadata?.principleObservations as number) ?? 0)
    ) {
      const policyType = inferPolicyType(principle);
      return {
        decision: "supersede",
        rationale: `This principle (confidence: ${principle.confidence.toFixed(2)}) supersedes an existing policy from the same source. Updating with stronger evidence.`,
        proposedPolicy: buildProposedPolicy(principle, policyType),
        supersededPolicyId: existingFromSamePrinciple.id,
        conflictsDetected: 0,
      };
    }
    // Otherwise defer — existing policy already covers this principle
    return {
      decision: "defer",
      rationale: `An existing approved policy already covers this principle (policy: ${existingFromSamePrinciple.id}). No additional policy needed.`,
      conflictsDetected: 0,
    };
  }

  // ── Check for mergeable policies (same domain + type) ─────────────────────
  const mergeCandidate = existingApprovedPolicies.find(
    (p) =>
      p.businessDomains.includes(principle.businessDomain) &&
      p.policyType === inferPolicyType(principle) &&
      p.status === "approved",
  );

  if (
    mergeCandidate &&
    principle.confidence < POLICY_THRESHOLDS.MIN_CONFIDENCE_FOR_APPROVAL + 0.10 &&
    principle.timesObserved < POLICY_THRESHOLDS.MIN_OBSERVATIONS_FOR_APPROVAL + 3
  ) {
    // Merge into existing rather than creating a thin new policy
    return {
      decision: "merge",
      rationale: `Similar policy already exists in ${principle.businessDomain} domain. Merging into existing policy ${mergeCandidate.id} rather than creating a duplicate.`,
      mergedIntoId: mergeCandidate.id,
      conflictsDetected: 0,
    };
  }

  // ── DEFER: not enough observations yet ───────────────────────────────────
  if (principle.timesObserved < POLICY_THRESHOLDS.MIN_OBSERVATIONS_FOR_APPROVAL) {
    return {
      decision: "defer",
      rationale: `Only ${principle.timesObserved} observations (minimum: ${POLICY_THRESHOLDS.MIN_OBSERVATIONS_FOR_APPROVAL}). Deferring until more evidence accumulates.`,
      conflictsDetected: 0,
    };
  }

  // ── DEFER: meets minimum but not high-confidence threshold ────────────────
  if (principle.confidence < POLICY_THRESHOLDS.MIN_CONFIDENCE_FOR_APPROVAL) {
    return {
      decision: "defer",
      rationale: `Confidence ${principle.confidence.toFixed(2)} below approval threshold ${POLICY_THRESHOLDS.MIN_CONFIDENCE_FOR_APPROVAL}. Deferring pending higher evidence.`,
      conflictsDetected: 0,
    };
  }

  // ── APPROVE ───────────────────────────────────────────────────────────────
  const policyType = inferPolicyType(principle);
  return {
    decision: "approve",
    rationale: `Principle meets all governance thresholds: confidence ${principle.confidence.toFixed(2)}, reliability ${principle.reliability.toFixed(2)}, ${principle.timesObserved} observations, contradiction rate ${cr.toFixed(2)}.`,
    proposedPolicy: buildProposedPolicy(principle, policyType),
    conflictsDetected: 0,
  };
}

function buildProposedPolicy(
  principle: PrincipleForEvaluation,
  policyType: PolicyType,
): Omit<ExecutivePolicy, "id" | "createdAt" | "updatedAt"> {
  const now = new Date();
  return {
    userId: principle.userId,
    title: `Policy: ${principle.title}`,
    description: `Derived from validated principle "${principle.title}" in the ${principle.businessDomain} domain.`,
    sourcePrincipleIds: [principle.id],
    businessDomains: [principle.businessDomain],
    strategicCategories: [principle.strategicCategory],
    policyType,
    priority: computePriority(principle),
    status: "approved",
    guidance: buildGuidance(principle, policyType),
    effectiveDate: now,
    expirationDate: null,
    version: 1,
    conflictIds: [],
    approvedAt: now,
    rejectedAt: null,
    retiredAt: null,
    metadata: {
      principleConfidence: principle.confidence,
      principleReliability: principle.reliability,
      principleObservations: principle.timesObserved,
      patternType: principle.patternType,
    },
  };
}

// ── Evaluate a batch of principles ────────────────────────────────────────────

export function evaluatePrinciples(
  principles: PrincipleForEvaluation[],
  existingApprovedPolicies: ExecutivePolicy[],
): Array<{ principle: PrincipleForEvaluation; result: PolicyEvaluationResult }> {
  return principles.map((p) => ({
    principle: p,
    result: evaluatePrinciple(p, existingApprovedPolicies),
  }));
}
