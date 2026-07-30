// ─── Build 013: Pattern Discovery Engine ─────────────────────────────────────
//
// Mines Executive Cases + Reflection Reports for repeated patterns.
// Purely deterministic — no AI, no inference.
// All outputs are DiscoveredPattern objects.

import type { DiscoveredPattern, PatternType } from "./types";

// ── Types re-exported for consumers ──────────────────────────────────────────

export type { DiscoveredPattern } from "./types";

// ── Input shapes (subset of DB rows needed here) ──────────────────────────────

export interface CaseForMining {
  id: string;
  userId: number;
  businessDomain: string | null;
  strategicCategory: string | null;
  completionStatus: string | null;
  primaryGoalId: string | null;
  primaryPlanId: string | null;
  primaryExecutionId: string | null;
  durationMs: number | null;
  startedAt: Date;
  metadata: Record<string, unknown>;
}

export interface ReportForMining {
  id: string;
  caseId: string;
  overallQualityScore: number;
  primaryFactors: unknown[];
  strengths: string[];
  weaknesses: string[];
  reflectionConfidence: number;
  metadata: Record<string, unknown>;
}

export interface ScoreForMining {
  caseId: string;
  reportId: string;
  scoreDimension: string;
  score: number;
}

// ── Internal group helpers ────────────────────────────────────────────────────

interface CaseGroup {
  key: string;
  caseIds: string[];
  domains: string[];
  strategicCategories: string[];
  outcomes: string[];
  qualityScores: number[];
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const item of items) {
    const k = keyFn(item);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(item);
  }
  return m;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function successRate(outcomes: string[]): number {
  if (outcomes.length === 0) return 0;
  return outcomes.filter((o) => o === "completed").length / outcomes.length;
}

function failureRate(outcomes: string[]): number {
  if (outcomes.length === 0) return 0;
  return outcomes.filter((o) => o === "failed").length / outcomes.length;
}

function dominantOutcome(outcomes: string[]): string {
  const counts: Record<string, number> = {};
  for (const o of outcomes) counts[o] = (counts[o] ?? 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown";
}

function initialConfidence(frequency: number, supportRate: number): number {
  const freqScore = Math.min(1, frequency / 10);      // caps at 10 observations
  return Math.min(0.95, 0.3 + freqScore * 0.4 + supportRate * 0.3);
}

// ── MIN_FREQUENCY: a pattern needs at least this many cases to be meaningful ──

const MIN_FREQUENCY = 2;

// ─────────────────────────────────────────────────────────────────────────────
// DETECTOR 1 — repeated_business_outcome
// Groups cases by (businessDomain, completionStatus).
// A group with ≥ MIN_FREQUENCY cases is a pattern.
// ─────────────────────────────────────────────────────────────────────────────

export function detectRepeatedBusinessOutcomes(
  cases: CaseForMining[],
  reportMap: Map<string, ReportForMining>,
): DiscoveredPattern[] {
  const groups = groupBy(
    cases,
    (c) => `${c.businessDomain ?? "general"}::${c.completionStatus ?? "unknown"}`,
  );
  const patterns: DiscoveredPattern[] = [];

  for (const [key, group] of groups) {
    if (group.length < MIN_FREQUENCY) continue;
    const [domain, outcome] = key.split("::");
    const qualityScores = group
      .map((c) => reportMap.get(c.id)?.overallQualityScore ?? 0)
      .filter((s) => s > 0);
    const outcomes = group.map((c) => c.completionStatus ?? "unknown");
    const sr = successRate(outcomes);
    const fr = failureRate(outcomes);

    patterns.push({
      patternType: "repeated_business_outcome",
      title: `Repeated ${outcome} outcomes in ${domain} domain`,
      description: `${group.length} cases in the ${domain} domain consistently resulted in ${outcome} status. Average quality score: ${avg(qualityScores).toFixed(2)}.`,
      frequency: group.length,
      domains: [domain ?? "general"],
      strategicCategories: [...new Set(group.map((c) => c.strategicCategory ?? "general"))],
      supportingCaseIds: group.map((c) => c.id),
      averageQualityScore: avg(qualityScores),
      successRate: sr,
      failureRate: fr,
      outcome: outcome ?? "unknown",
      confidence: initialConfidence(group.length, sr > fr ? sr : 1 - fr),
    });
  }
  return patterns;
}

// ─────────────────────────────────────────────────────────────────────────────
// DETECTOR 2 — repeated_planning_strategy
// Groups cases by (strategicCategory, completionStatus).
// ─────────────────────────────────────────────────────────────────────────────

export function detectRepeatedPlanningStrategies(
  cases: CaseForMining[],
  reportMap: Map<string, ReportForMining>,
): DiscoveredPattern[] {
  const groups = groupBy(
    cases,
    (c) => `${c.strategicCategory ?? "general"}::${c.completionStatus ?? "unknown"}`,
  );
  const patterns: DiscoveredPattern[] = [];

  for (const [key, group] of groups) {
    if (group.length < MIN_FREQUENCY) continue;
    const [strategy, outcome] = key.split("::");
    const qualityScores = group
      .map((c) => reportMap.get(c.id)?.overallQualityScore ?? 0)
      .filter((s) => s > 0);
    const sr = successRate(group.map((c) => c.completionStatus ?? "unknown"));

    patterns.push({
      patternType: "repeated_planning_strategy",
      title: `${strategy} strategy consistently leads to ${outcome}`,
      description: `${group.length} cases using the ${strategy} strategic approach resulted in ${outcome}. Average quality: ${avg(qualityScores).toFixed(2)}.`,
      frequency: group.length,
      domains: [...new Set(group.map((c) => c.businessDomain ?? "general"))],
      strategicCategories: [strategy ?? "general"],
      supportingCaseIds: group.map((c) => c.id),
      averageQualityScore: avg(qualityScores),
      successRate: sr,
      failureRate: 1 - sr,
      outcome: outcome ?? "unknown",
      confidence: initialConfidence(group.length, sr),
    });
  }
  return patterns;
}

// ─────────────────────────────────────────────────────────────────────────────
// DETECTOR 3 — repeated_success
// Cases with completionStatus='completed' AND quality >= 0.65
// Group by businessDomain; if ≥ MIN_FREQUENCY → pattern
// ─────────────────────────────────────────────────────────────────────────────

export function detectRepeatedSuccess(
  cases: CaseForMining[],
  reportMap: Map<string, ReportForMining>,
): DiscoveredPattern[] {
  const successCases = cases.filter((c) => {
    const r = reportMap.get(c.id);
    return c.completionStatus === "completed" && (r?.overallQualityScore ?? 0) >= 0.65;
  });
  const groups = groupBy(successCases, (c) => c.businessDomain ?? "general");
  const patterns: DiscoveredPattern[] = [];

  for (const [domain, group] of groups) {
    if (group.length < MIN_FREQUENCY) continue;
    const qualityScores = group.map((c) => reportMap.get(c.id)?.overallQualityScore ?? 0.65);
    patterns.push({
      patternType: "repeated_success",
      title: `High-quality successes repeat in ${domain} domain`,
      description: `${group.length} cases in ${domain} completed with quality >= 0.65 (avg ${avg(qualityScores).toFixed(2)}). This domain shows a consistent success pathway.`,
      frequency: group.length,
      domains: [domain],
      strategicCategories: [...new Set(group.map((c) => c.strategicCategory ?? "general"))],
      supportingCaseIds: group.map((c) => c.id),
      averageQualityScore: avg(qualityScores),
      successRate: 1,
      failureRate: 0,
      outcome: "completed",
      confidence: initialConfidence(group.length, 0.9),
    });
  }
  return patterns;
}

// ─────────────────────────────────────────────────────────────────────────────
// DETECTOR 4 — repeated_failure
// Cases with completionStatus='failed'; group by businessDomain
// ─────────────────────────────────────────────────────────────────────────────

export function detectRepeatedFailure(
  cases: CaseForMining[],
  reportMap: Map<string, ReportForMining>,
): DiscoveredPattern[] {
  const failedCases = cases.filter((c) => c.completionStatus === "failed");
  const groups = groupBy(failedCases, (c) => c.businessDomain ?? "general");
  const patterns: DiscoveredPattern[] = [];

  for (const [domain, group] of groups) {
    if (group.length < MIN_FREQUENCY) continue;
    const qualityScores = group.map((c) => reportMap.get(c.id)?.overallQualityScore ?? 0);
    patterns.push({
      patternType: "repeated_failure",
      title: `Repeated failures observed in ${domain} domain`,
      description: `${group.length} cases in ${domain} failed. Average quality score: ${avg(qualityScores).toFixed(2)}. This domain shows a recurring failure pathway.`,
      frequency: group.length,
      domains: [domain],
      strategicCategories: [...new Set(group.map((c) => c.strategicCategory ?? "general"))],
      supportingCaseIds: group.map((c) => c.id),
      averageQualityScore: avg(qualityScores),
      successRate: 0,
      failureRate: 1,
      outcome: "failed",
      confidence: initialConfidence(group.length, 0.85),
    });
  }
  return patterns;
}

// ─────────────────────────────────────────────────────────────────────────────
// DETECTOR 5 — repeated_bottleneck
// Cases that are partial or failed AND have low execution quality score
// group by businessDomain
// ─────────────────────────────────────────────────────────────────────────────

export function detectRepeatedBottlenecks(
  cases: CaseForMining[],
  scores: ScoreForMining[],
): DiscoveredPattern[] {
  // Build map: caseId → execution_quality score
  const execScoreMap = new Map<string, number>();
  for (const s of scores) {
    if (s.scoreDimension === "execution_quality") {
      const existing = execScoreMap.get(s.caseId);
      if (existing === undefined || s.score < existing) execScoreMap.set(s.caseId, s.score);
    }
  }

  const bottleneckCases = cases.filter((c) => {
    const execScore = execScoreMap.get(c.id) ?? 1;
    const isStalled = c.completionStatus === "partial" || c.completionStatus === "failed";
    return isStalled && execScore < 0.45;
  });

  const groups = groupBy(bottleneckCases, (c) => c.businessDomain ?? "general");
  const patterns: DiscoveredPattern[] = [];

  for (const [domain, group] of groups) {
    if (group.length < MIN_FREQUENCY) continue;
    const execScores = group.map((c) => execScoreMap.get(c.id) ?? 0);
    patterns.push({
      patternType: "repeated_bottleneck",
      title: `Execution bottlenecks repeating in ${domain} domain`,
      description: `${group.length} cases in ${domain} exhibit low execution quality (avg exec score: ${avg(execScores).toFixed(2)}) combined with incomplete or failed outcomes.`,
      frequency: group.length,
      domains: [domain],
      strategicCategories: [...new Set(group.map((c) => c.strategicCategory ?? "general"))],
      supportingCaseIds: group.map((c) => c.id),
      averageQualityScore: avg(execScores),
      successRate: 0,
      failureRate: successRate(group.map((c) => c.completionStatus ?? "unknown")),
      outcome: dominantOutcome(group.map((c) => c.completionStatus ?? "unknown")),
      confidence: initialConfidence(group.length, 0.8),
    });
  }
  return patterns;
}

// ─────────────────────────────────────────────────────────────────────────────
// DETECTOR 6 — repeated_judgment_outcome
// Groups cases where judgment quality is consistently high or low
// Inferred from reflection scores for judgment-adjacent dimensions
// ─────────────────────────────────────────────────────────────────────────────

export function detectRepeatedJudgmentOutcomes(
  cases: CaseForMining[],
  scores: ScoreForMining[],
): DiscoveredPattern[] {
  const judgmentScoreMap = new Map<string, number>();
  for (const s of scores) {
    if (s.scoreDimension === "decision_quality") {
      judgmentScoreMap.set(s.caseId, s.score);
    }
  }

  const highJudgmentCases = cases.filter((c) => (judgmentScoreMap.get(c.id) ?? 0) >= 0.7);
  const lowJudgmentCases = cases.filter((c) => {
    const s = judgmentScoreMap.get(c.id);
    return s !== undefined && s < 0.4;
  });

  const patterns: DiscoveredPattern[] = [];

  // High judgment groups
  const highGroups = groupBy(highJudgmentCases, (c) => c.businessDomain ?? "general");
  for (const [domain, group] of highGroups) {
    if (group.length < MIN_FREQUENCY) continue;
    const scores_ = group.map((c) => judgmentScoreMap.get(c.id) ?? 0.7);
    patterns.push({
      patternType: "repeated_judgment_outcome",
      title: `Consistently strong decision quality in ${domain}`,
      description: `${group.length} cases in ${domain} show high decision quality scores (avg ${avg(scores_).toFixed(2)}), suggesting reliable judgment patterns in this domain.`,
      frequency: group.length,
      domains: [domain],
      strategicCategories: [...new Set(group.map((c) => c.strategicCategory ?? "general"))],
      supportingCaseIds: group.map((c) => c.id),
      averageQualityScore: avg(scores_),
      successRate: successRate(group.map((c) => c.completionStatus ?? "unknown")),
      failureRate: failureRate(group.map((c) => c.completionStatus ?? "unknown")),
      outcome: "high_quality_judgment",
      confidence: initialConfidence(group.length, 0.85),
    });
  }

  // Low judgment groups
  const lowGroups = groupBy(lowJudgmentCases, (c) => c.businessDomain ?? "general");
  for (const [domain, group] of lowGroups) {
    if (group.length < MIN_FREQUENCY) continue;
    const scores_ = group.map((c) => judgmentScoreMap.get(c.id) ?? 0.3);
    patterns.push({
      patternType: "repeated_judgment_outcome",
      title: `Weak decision quality recurring in ${domain}`,
      description: `${group.length} cases in ${domain} show low decision quality scores (avg ${avg(scores_).toFixed(2)}), indicating a recurring judgment gap in this domain.`,
      frequency: group.length,
      domains: [domain],
      strategicCategories: [...new Set(group.map((c) => c.strategicCategory ?? "general"))],
      supportingCaseIds: group.map((c) => c.id),
      averageQualityScore: avg(scores_),
      successRate: successRate(group.map((c) => c.completionStatus ?? "unknown")),
      failureRate: failureRate(group.map((c) => c.completionStatus ?? "unknown")),
      outcome: "low_quality_judgment",
      confidence: initialConfidence(group.length, 0.8),
    });
  }

  return patterns;
}

// ─────────────────────────────────────────────────────────────────────────────
// DETECTOR 7 — repeated_execution_path
// Same businessDomain + strategicCategory with multiple cases sharing similar
// execution completionStatus; at least MIN_FREQUENCY in same path
// ─────────────────────────────────────────────────────────────────────────────

export function detectRepeatedExecutionPaths(
  cases: CaseForMining[],
  reportMap: Map<string, ReportForMining>,
): DiscoveredPattern[] {
  const groups = groupBy(
    cases,
    (c) => `${c.businessDomain ?? "general"}::${c.strategicCategory ?? "general"}`,
  );
  const patterns: DiscoveredPattern[] = [];

  for (const [key, group] of groups) {
    if (group.length < MIN_FREQUENCY) continue;
    const [domain, strategy] = key.split("::");
    const qualityScores = group.map((c) => reportMap.get(c.id)?.overallQualityScore ?? 0).filter((s) => s > 0);
    const outcomes = group.map((c) => c.completionStatus ?? "unknown");
    const dominant = dominantOutcome(outcomes);
    const sr = successRate(outcomes);

    patterns.push({
      patternType: "repeated_execution_path",
      title: `${domain} × ${strategy} is a repeated execution path`,
      description: `${group.length} cases share the ${domain}/${strategy} execution path. Dominant outcome: ${dominant}. Avg quality: ${avg(qualityScores).toFixed(2)}.`,
      frequency: group.length,
      domains: [domain ?? "general"],
      strategicCategories: [strategy ?? "general"],
      supportingCaseIds: group.map((c) => c.id),
      averageQualityScore: avg(qualityScores),
      successRate: sr,
      failureRate: failureRate(outcomes),
      outcome: dominant,
      confidence: initialConfidence(group.length, sr),
    });
  }
  return patterns;
}

// ─────────────────────────────────────────────────────────────────────────────
// DETECTOR 8 — repeated_context_shift
// Cases where goal_alignment score is low but planning was initiated
// (proxy for context drift mid-execution)
// ─────────────────────────────────────────────────────────────────────────────

export function detectRepeatedContextShifts(
  cases: CaseForMining[],
  scores: ScoreForMining[],
): DiscoveredPattern[] {
  const goalAlignmentMap = new Map<string, number>();
  for (const s of scores) {
    if (s.scoreDimension === "goal_alignment") goalAlignmentMap.set(s.caseId, s.score);
  }

  const driftCases = cases.filter((c) => {
    const ga = goalAlignmentMap.get(c.id);
    return ga !== undefined && ga < 0.45 && c.primaryPlanId != null;
  });

  const groups = groupBy(driftCases, (c) => c.businessDomain ?? "general");
  const patterns: DiscoveredPattern[] = [];

  for (const [domain, group] of groups) {
    if (group.length < MIN_FREQUENCY) continue;
    const gaScores = group.map((c) => goalAlignmentMap.get(c.id) ?? 0.4);
    patterns.push({
      patternType: "repeated_context_shift",
      title: `Goal alignment drift repeating in ${domain}`,
      description: `${group.length} cases in ${domain} show low goal alignment (avg ${avg(gaScores).toFixed(2)}) despite having active plans — indicating repeated mid-execution context shifts.`,
      frequency: group.length,
      domains: [domain],
      strategicCategories: [...new Set(group.map((c) => c.strategicCategory ?? "general"))],
      supportingCaseIds: group.map((c) => c.id),
      averageQualityScore: avg(gaScores),
      successRate: successRate(group.map((c) => c.completionStatus ?? "unknown")),
      failureRate: failureRate(group.map((c) => c.completionStatus ?? "unknown")),
      outcome: dominantOutcome(group.map((c) => c.completionStatus ?? "unknown")),
      confidence: initialConfidence(group.length, 0.75),
    });
  }
  return patterns;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN: runPatternDiscovery
// ─────────────────────────────────────────────────────────────────────────────

export function runPatternDiscovery(
  cases: CaseForMining[],
  reports: ReportForMining[],
  scores: ScoreForMining[],
): DiscoveredPattern[] {
  if (cases.length < MIN_FREQUENCY) return [];

  const reportMap = new Map<string, ReportForMining>(reports.map((r) => [r.caseId, r]));

  const all: DiscoveredPattern[] = [
    ...detectRepeatedBusinessOutcomes(cases, reportMap),
    ...detectRepeatedPlanningStrategies(cases, reportMap),
    ...detectRepeatedSuccess(cases, reportMap),
    ...detectRepeatedFailure(cases, reportMap),
    ...detectRepeatedBottlenecks(cases, scores),
    ...detectRepeatedJudgmentOutcomes(cases, scores),
    ...detectRepeatedExecutionPaths(cases, reportMap),
    ...detectRepeatedContextShifts(cases, scores),
  ];

  // Deduplicate: prefer highest-frequency pattern for same title fingerprint
  const seen = new Map<string, DiscoveredPattern>();
  for (const p of all) {
    const key = `${p.patternType}::${p.domains.sort().join(",")}::${p.outcome}`;
    const existing = seen.get(key);
    if (!existing || p.frequency > existing.frequency) seen.set(key, p);
  }

  return [...seen.values()].sort((a, b) => b.frequency - a.frequency);
}
