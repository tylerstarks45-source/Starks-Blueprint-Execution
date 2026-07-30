// ─── Reflection Report Engine (Build 012) ────────────────────────────────────
//
// Produces immutable Reflection Reports from completed Executive Cases.
// Combines: timeline, causal analysis, factors, quality scores.
// Explanation only — no recommendations.
// Pure computation.

import type {
  ExecutiveCase,
  CaseTimelineEvent,
  QualityAssessment,
  ReflectionReport,
  ReflectionEvidence,
  EvidenceType,
} from "./types";
import type { FactorCandidate } from "./factor-engine";
import type { CausalAnalysis } from "./types";
import { reconstructReasoningSequence } from "./decision-reconstruction";

// ── Report content assembly ────────────────────────────────────────────────────

export interface ReportDraft {
  executiveSummary: string;
  primaryFactors: string[];
  strengths: string[];
  weaknesses: string[];
  missedOpportunities: string[];
  unexpectedOutcomes: string[];
  businessImpact: string;
  reflectionConfidence: number;
  evidenceQuality: number;
  overallQualityScore: number;
}

export function assembleReportDraft(
  ec: ExecutiveCase,
  events: CaseTimelineEvent[],
  factors: FactorCandidate[],
  causal: CausalAnalysis,
  quality: QualityAssessment,
): ReportDraft {
  const reasoning = reconstructReasoningSequence(events);
  const durationText = ec.durationMs != null
    ? `${Math.round(ec.durationMs / 1000)}s`
    : "unknown duration";

  // ── Executive summary ─────────────────────────────────────────────────────
  const executiveSummary = buildExecutiveSummary(ec, reasoning, quality, durationText);

  // ── Primary factors (top-5 by influence) ─────────────────────────────────
  const primaryFactors = factors
    .slice(0, 5)
    .map((f) => `[${f.factorCategory}] ${f.factorDescription}`);

  // ── Strengths: positive factors + high-scoring dimensions ─────────────────
  const strengths: string[] = [
    ...factors
      .filter((f) => f.direction === "positive" && f.influenceScore >= 0.4)
      .map((f) => f.factorDescription),
    ...quality.scores
      .filter((s) => s.score >= 0.7)
      .map((s) => `High ${s.dimension.replace(/_/g, " ")} score (${s.score.toFixed(2)}): ${s.explanation}`),
  ].slice(0, 5);

  // ── Weaknesses: negative factors + low-scoring dimensions ─────────────────
  const weaknesses: string[] = [
    ...factors
      .filter((f) => f.direction === "negative" && f.influenceScore >= 0.4)
      .map((f) => f.factorDescription),
    ...quality.scores
      .filter((s) => s.score < 0.4)
      .map((s) => `Low ${s.dimension.replace(/_/g, " ")} score (${s.score.toFixed(2)}): ${s.explanation}`),
  ].slice(0, 5);

  // ── Missed opportunities: neutral factors with high influence ─────────────
  const missedOpportunities = factors
    .filter((f) => f.direction === "neutral" && f.influenceScore >= 0.5)
    .map((f) => f.factorDescription)
    .slice(0, 3);

  // ── Unexpected outcomes: causal links with high strength ──────────────────
  const unexpectedOutcomes = causal.links
    .filter((l) => l.linkType === "direct" && l.strength >= 0.8)
    .slice(0, 3)
    .map((l) => `${l.causeDescription} → ${l.effectDescription}`);

  // ── Business impact ───────────────────────────────────────────────────────
  const businessImpact = buildBusinessImpact(ec, quality);

  // ── Confidence ────────────────────────────────────────────────────────────
  const reflectionConfidence = quality.confidence;
  const evidenceQualityScore = quality.scores.find(
    (s) => s.dimension === "evidence_quality",
  )?.score ?? 0.5;

  return {
    executiveSummary,
    primaryFactors,
    strengths: strengths.length > 0 ? strengths : ["Insufficient evidence to identify strengths"],
    weaknesses: weaknesses.length > 0 ? weaknesses : ["Insufficient evidence to identify weaknesses"],
    missedOpportunities:
      missedOpportunities.length > 0 ? missedOpportunities : ["No missed opportunities identified from recorded evidence"],
    unexpectedOutcomes:
      unexpectedOutcomes.length > 0 ? unexpectedOutcomes : ["No unexpected outcomes detected from recorded evidence"],
    businessImpact,
    reflectionConfidence,
    evidenceQuality: evidenceQualityScore,
    overallQualityScore: quality.overallScore,
  };
}

// ── Executive summary builder ─────────────────────────────────────────────────

function buildExecutiveSummary(
  ec: ExecutiveCase,
  reasoning: ReturnType<typeof reconstructReasoningSequence>,
  quality: QualityAssessment,
  durationText: string,
): string {
  const domain = ec.businessDomain ?? "unclassified domain";
  const strategy = ec.strategicCategory ?? "general strategy";
  const status = ec.completionStatus;
  const outcome = ec.primaryOutcome ?? `Case ${status}`;
  const qualityGrade = quality.overallScore >= 0.8 ? "high"
    : quality.overallScore >= 0.6 ? "moderate"
    : quality.overallScore >= 0.4 ? "below-average" : "low";

  const stagesText = [
    reasoning.hasGoalFormation  ? "goal formation"   : null,
    reasoning.hasPlanGeneration ? "plan generation"  : null,
    reasoning.hasExecution      ? "execution"        : null,
    reasoning.hasObservation    ? "observation"      : null,
  ].filter(Boolean).join(", ");

  return (
    `Executive Case ${ec.id.slice(0, 8)} (${domain}, ${strategy}) ` +
    `${status} in ${durationText}. ` +
    `Outcome: ${outcome}. ` +
    `Pipeline covered: ${stagesText || "unknown stages"}. ` +
    `Overall quality: ${qualityGrade} (${quality.overallScore.toFixed(2)}). ` +
    `Confidence: ${(quality.confidence * 100).toFixed(0)}%.`
  );
}

function buildBusinessImpact(ec: ExecutiveCase, quality: QualityAssessment): string {
  const domain = ec.businessDomain ?? "general";
  const status = ec.completionStatus;
  const score  = quality.overallScore;

  if (status === "completed" && score >= 0.7) {
    return `Positive business impact in ${domain} domain — high-quality execution of a completed case`;
  }
  if (status === "completed" && score < 0.7) {
    return `Moderate business impact in ${domain} domain — case completed but with quality gaps`;
  }
  if (status === "failed") {
    return `Negative business impact in ${domain} domain — case failed; understanding causal factors is key`;
  }
  if (status === "partial") {
    return `Partial business impact in ${domain} domain — case partially completed`;
  }
  return `Business impact in ${domain} domain is undetermined (status: ${status})`;
}

// ── Evidence item builders ─────────────────────────────────────────────────────

export interface EvidenceItem {
  evidenceType: EvidenceType;
  sourceObjectId: string | null;
  sourceObjectType: string | null;
  summary: string;
  strength: number;
  payload: Record<string, unknown>;
}

export function buildEvidenceItems(
  events: CaseTimelineEvent[],
  causal: CausalAnalysis,
): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  // Top causal links as evidence
  for (const link of causal.links.slice(0, 5)) {
    items.push({
      evidenceType: "execution_event",
      sourceObjectId: null,
      sourceObjectType: "causal_link",
      summary: `Causal link (${link.linkType}, strength ${link.strength.toFixed(2)}): ${link.causeDescription} → ${link.effectDescription}`,
      strength: link.strength,
      payload: { link },
    });
  }

  // High-attention observations (by eventCategory=observation)
  const obsEvents = events
    .filter((e) => e.eventCategory === "observation")
    .slice(0, 5);
  for (const evt of obsEvents) {
    items.push({
      evidenceType: "observation",
      sourceObjectId: evt.sourceObjectId,
      sourceObjectType: evt.sourceObjectType,
      summary: evt.eventDescription ?? evt.eventType,
      strength: 0.6,
      payload: { eventId: evt.id, sequenceNumber: evt.sequenceNumber },
    });
  }

  // Execution failures as evidence
  const failureEvents = events
    .filter((e) => e.eventCategory === "execution" && e.eventType.includes("failed"))
    .slice(0, 3);
  for (const evt of failureEvents) {
    items.push({
      evidenceType: "execution_event",
      sourceObjectId: evt.sourceObjectId,
      sourceObjectType: evt.sourceObjectType,
      summary: evt.eventDescription ?? evt.eventType,
      strength: 0.8,
      payload: { eventId: evt.id, sequenceNumber: evt.sequenceNumber },
    });
  }

  return items;
}
