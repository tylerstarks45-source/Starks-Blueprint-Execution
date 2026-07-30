// ─── Build 013: Principle Validation Engine ───────────────────────────────────
//
// Determines whether a principle meets the bar for validated status.
// Pure: no DB access.

import type {
  ExecutivePrinciple,
  PrincipleStatus,
  ValidationCheckResult,
  ValidationResult,
} from "./types";
import { VALIDATION_THRESHOLDS } from "./types";

// ── Business significance heuristic ──────────────────────────────────────────
// A principle is business-significant if it covers a recognised non-generic domain.

const GENERIC_DOMAINS = new Set(["general", "unknown", ""]);

function isBusinessSignificant(principle: ExecutivePrinciple): boolean {
  return !GENERIC_DOMAINS.has(principle.businessDomain ?? "general");
}

function isStrategicallSignificant(principle: ExecutivePrinciple): boolean {
  return !GENERIC_DOMAINS.has(principle.strategicCategory ?? "general");
}

// ── Core validation check ─────────────────────────────────────────────────────

export function validatePrinciple(principle: ExecutivePrinciple): ValidationCheckResult {
  const timesObserved = principle.timesObserved;
  const supportRate =
    timesObserved > 0
      ? principle.timesConfirmed / timesObserved
      : 0;
  const contradictionRate =
    timesObserved > 0
      ? principle.timesContradicted / timesObserved
      : 0;

  const minObservationsMet = timesObserved >= VALIDATION_THRESHOLDS.MIN_OBSERVATIONS;
  const minSupportMet = supportRate >= VALIDATION_THRESHOLDS.MIN_SUPPORT_RATE;
  const maxContradictionMet = contradictionRate <= VALIDATION_THRESHOLDS.MAX_CONTRADICTION_RATE;
  const minConfidenceMet = principle.confidence >= VALIDATION_THRESHOLDS.MIN_CONFIDENCE;
  const businessSignificanceMet = isBusinessSignificant(principle);
  const strategicSignificanceMet = isStrategicallSignificant(principle);

  const failureReasons: string[] = [];
  if (!minObservationsMet)
    failureReasons.push(`Insufficient observations: ${timesObserved} < ${VALIDATION_THRESHOLDS.MIN_OBSERVATIONS}`);
  if (!minSupportMet)
    failureReasons.push(`Support rate too low: ${supportRate.toFixed(2)} < ${VALIDATION_THRESHOLDS.MIN_SUPPORT_RATE}`);
  if (!maxContradictionMet)
    failureReasons.push(`Contradiction rate too high: ${contradictionRate.toFixed(2)} > ${VALIDATION_THRESHOLDS.MAX_CONTRADICTION_RATE}`);
  if (!minConfidenceMet)
    failureReasons.push(`Confidence too low: ${principle.confidence.toFixed(2)} < ${VALIDATION_THRESHOLDS.MIN_CONFIDENCE}`);

  const coreCriteriaMet =
    minObservationsMet && minSupportMet && maxContradictionMet && minConfidenceMet;

  let validationResult: ValidationResult;
  let newStatus: PrincipleStatus;

  if (coreCriteriaMet) {
    validationResult = "passed";
    newStatus = "validated";
  } else if (minObservationsMet && minConfidenceMet && !maxContradictionMet) {
    // Enough observations and confidence but too many contradictions → candidate
    validationResult = "deferred";
    newStatus = "candidate";
  } else if (!minObservationsMet && principle.status === "draft") {
    // Not enough observations yet → stay candidate
    validationResult = "deferred";
    newStatus = "candidate";
  } else {
    validationResult = "failed";
    newStatus = principle.status === "draft" ? "candidate" : principle.status;
  }

  return {
    validationResult,
    minObservationsMet,
    minSupportMet,
    maxContradictionMet,
    minConfidenceMet,
    businessSignificanceMet,
    strategicSignificanceMet,
    failureReasons,
    newStatus,
  };
}

// ── Check whether a validated principle should be deprecated ──────────────────

export function shouldDeprecate(principle: ExecutivePrinciple): boolean {
  if (principle.status !== "validated" && principle.status !== "candidate") return false;
  const contradictionRate =
    principle.timesObserved > 0
      ? principle.timesContradicted / principle.timesObserved
      : 0;
  return (
    contradictionRate >= VALIDATION_THRESHOLDS.DEPRECATION_CONTRADICTION_RATE ||
    principle.confidence < 0.25
  );
}

// ── Confidence delta after new evidence ───────────────────────────────────────

export function adjustConfidence(
  current: number,
  isSupporting: boolean,
  strength: number,
): number {
  const delta = isSupporting ? strength * 0.08 : -(strength * 0.10);
  return Math.max(0.05, Math.min(0.99, current + delta));
}

// ── Apply validation result to a mutable principle copy ───────────────────────

export function applyValidationResult(
  principle: ExecutivePrinciple,
  result: ValidationCheckResult,
  now: Date,
): ExecutivePrinciple {
  const updated: ExecutivePrinciple = { ...principle };
  updated.status = result.newStatus;
  updated.version = principle.version + 1;
  updated.updatedAt = now;
  if (result.newStatus === "validated" && !principle.validatedAt) {
    updated.validatedAt = now;
  }
  return updated;
}

// ── Apply deprecation ─────────────────────────────────────────────────────────

export function applyDeprecation(principle: ExecutivePrinciple, now: Date): ExecutivePrinciple {
  return {
    ...principle,
    status: "deprecated",
    version: principle.version + 1,
    deprecatedAt: now,
    updatedAt: now,
  };
}
