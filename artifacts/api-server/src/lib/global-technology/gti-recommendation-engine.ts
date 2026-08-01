// ── GTI Recommendation Engine ───────────────────────────────────────────────
// Produces administrator-only recommendations when a technology could measurably improve ASH.
// Every recommendation must include the full evidence package from the spec.
// Never user-facing. Never autonomous. Never installs or provisions.

import type {
  TechnologyEntry,
  BenchmarkScores,
  CompatibilityAssessment,
  TechnologyRecommendationRecord,
  TechnologyOpportunity,
  RecommendationType,
  RecommendationPriority,
} from "./types";

// ── Recommendation thresholds ──────────────────────────────────────────────
const HIGH_COMPOSITE_THRESHOLD = 0.85;   // technologies worth evaluating for addition
const COMPATIBLE_SCORE_THRESHOLD = 0.75; // must be reasonably compatible
const ALREADY_INTEGRATED = new Set([
  "postgresql:database", "pgvector:extension", "nodejs:runtime",
  "nixos:platform", "chromium:browser", "playwright:automation",
  "replit:platform", "openrouter:platform", "stripe:payments", "resend:email",
]);

// ── Complexity → recommendation type mapping ──────────────────────────────
function deriveRecommendationType(entry: TechnologyEntry, compat: CompatibilityAssessment): RecommendationType {
  if (ALREADY_INTEGRATED.has(entry.key)) return "evaluation";  // already in use — reevaluate/upgrade
  if (compat.integrationComplexity === "very_high") return "evaluation";
  if (compat.compatibilityLevel === "incompatible") return "evaluation";
  if (entry.maturityLevel === "experimental" || entry.maturityLevel === "beta") return "evaluation";
  return "addition";
}

// ── Priority from composite + compatibility ────────────────────────────────
function derivePriority(
  benchmark: BenchmarkScores,
  compat: CompatibilityAssessment,
): RecommendationPriority {
  if (benchmark.compositeScore >= 0.92 && compat.compatibilityScore >= 0.85) return "high";
  if (benchmark.compositeScore >= 0.88) return "medium";
  return "low";
}

// ── Evidence package builder ───────────────────────────────────────────────
function buildEvidence(entry: TechnologyEntry, benchmark: BenchmarkScores): string {
  return [
    `${entry.name} by ${entry.vendor} (${entry.category}) scores ${(benchmark.compositeScore * 100).toFixed(1)}% composite across 9 benchmark dimensions.`,
    `Performance: ${(benchmark.performanceScore * 100).toFixed(0)}%.`,
    `Reliability: ${(benchmark.reliabilityScore * 100).toFixed(0)}%.`,
    `Latency: ${(benchmark.latencyScore * 100).toFixed(0)}%.`,
    `Security posture: ${(benchmark.securityPostureScore * 100).toFixed(0)}%.`,
    `Community adoption: ${(benchmark.communityAdoptionScore * 100).toFixed(0)}%.`,
    benchmark.benchmarkNotes ?? "",
  ].filter(Boolean).join(" ");
}

function buildBusinessImpact(entry: TechnologyEntry, benchmark: BenchmarkScores): string {
  const adoption = (benchmark.communityAdoptionScore * 100).toFixed(0);
  const perf = (benchmark.performanceScore * 100).toFixed(0);
  return `Adding ${entry.name} unlocks ${entry.description} Vendor community adoption is ${adoption}%, indicating strong ecosystem support and future-proofing. Performance score of ${perf}% positions this technology as a reliable foundation for production workloads.`;
}

function buildPerformanceImpact(benchmark: BenchmarkScores): string {
  const perf = (benchmark.performanceScore * 100).toFixed(0);
  const lat = (benchmark.latencyScore * 100).toFixed(0);
  const scale = (benchmark.scalabilityScore * 100).toFixed(0);
  return `Expected performance improvement to workloads utilizing this technology: ${perf}% throughput, ${lat}% latency, ${scale}% scalability scores.`;
}

function buildCostImpact(entry: TechnologyEntry, benchmark: BenchmarkScores): string {
  const cost = (benchmark.costScore * 100).toFixed(0);
  const pricing = entry.pricingModel ?? "unknown";
  const license = entry.licenseType ?? "unknown";
  return `Cost efficiency score: ${cost}%. Pricing model: ${pricing}. License: ${license}. Actual cost depends on usage volume and negotiated enterprise agreements. Obtain vendor quotes before adoption.`;
}

function buildSecurityImpact(benchmark: BenchmarkScores): string {
  const sec = (benchmark.securityPostureScore * 100).toFixed(0);
  if (benchmark.securityPostureScore >= 0.90) return `Security posture: ${sec}% — strong. Technology has demonstrated compliance posture, active security patching cadence, and industry trust.`;
  if (benchmark.securityPostureScore >= 0.80) return `Security posture: ${sec}% — adequate. Standard security review recommended before production adoption.`;
  return `Security posture: ${sec}% — below threshold. Comprehensive security audit required before adoption. Do not deploy without administrator security sign-off.`;
}

function buildExpectedImprovement(entry: TechnologyEntry, benchmark: BenchmarkScores, compat: CompatibilityAssessment): string {
  const composite = (benchmark.compositeScore * 100).toFixed(1);
  const compatScore = (compat.compatibilityScore * 100).toFixed(0);
  return `Integration of ${entry.name} is expected to deliver a ${composite}% average capability improvement across benchmark dimensions, with ${compatScore}% compatibility with current ASH infrastructure. Integration complexity: ${compat.integrationComplexity}.`;
}

function buildOperationalRisk(compat: CompatibilityAssessment, entry: TechnologyEntry): string {
  const risks: string[] = [];
  if (!compat.infrastructureCompatible) risks.push("infrastructure changes required");
  if (!compat.adapterCompatible) risks.push("adapter development required");
  if (!compat.executionModelCompatible) risks.push("execution model changes required");
  if (compat.blockers.length > 0) risks.push(`blockers: ${compat.blockers.join(", ")}`);
  if (entry.maturityLevel === "experimental") risks.push("experimental maturity level");
  if (entry.maturityLevel === "beta") risks.push("beta maturity — not production-validated");
  return risks.length > 0
    ? `Operational risks: ${risks.join("; ")}. Administrator review required before proceeding.`
    : "Low operational risk. Standard change management process applies.";
}

function buildAlternatives(entry: TechnologyEntry, all: TechnologyEntry[], benchmarks: Map<string, BenchmarkScores>): string[] {
  return all
    .filter(t => t.key !== entry.key && t.category === entry.category)
    .sort((a, b) => {
      const bA = benchmarks.get(a.key)?.compositeScore ?? 0;
      const bB = benchmarks.get(b.key)?.compositeScore ?? 0;
      return bB - bA;
    })
    .slice(0, 3)
    .map(t => {
      const score = benchmarks.get(t.key)?.compositeScore ?? 0;
      return `${t.name} (${t.vendor}) — composite ${(score * 100).toFixed(1)}%`;
    });
}

// ── Generate recommendation for one technology ────────────────────────────
export function generateRecommendation(
  entry: TechnologyEntry,
  benchmark: BenchmarkScores,
  compat: CompatibilityAssessment,
  allTechnologies: TechnologyEntry[],
  allBenchmarks: Map<string, BenchmarkScores>,
): TechnologyRecommendationRecord | null {
  // Only recommend technologies above composite threshold with acceptable compatibility
  if (benchmark.compositeScore < HIGH_COMPOSITE_THRESHOLD) return null;
  if (compat.compatibilityScore < COMPATIBLE_SCORE_THRESHOLD) return null;
  // Skip already-integrated technologies (they get upgrade recommendations separately)
  if (ALREADY_INTEGRATED.has(entry.key)) return null;

  const type = deriveRecommendationType(entry, compat);
  const priority = derivePriority(benchmark, compat);
  const confidence = Math.min(1, benchmark.compositeScore * compat.compatibilityScore * 1.1);

  return {
    technologyKey:            entry.key,
    recommendationType:       type,
    priority,
    title:                    `Evaluate ${entry.name} for ASH platform integration`,
    description:              `${entry.name} (${entry.vendor}) is a ${entry.maturityLevel} technology in the ${entry.category} category that scores ${(benchmark.compositeScore * 100).toFixed(1)}% composite across 9 benchmark dimensions with ${(compat.compatibilityScore * 100).toFixed(0)}% compatibility with current ASH infrastructure.`,
    evidence:                 buildEvidence(entry, benchmark),
    businessImpact:           buildBusinessImpact(entry, benchmark),
    performanceImpact:        buildPerformanceImpact(benchmark),
    costImpact:               buildCostImpact(entry, benchmark),
    securityImpact:           buildSecurityImpact(benchmark),
    compatibilityScore:       compat.compatibilityScore,
    expectedImprovement:      buildExpectedImprovement(entry, benchmark, compat),
    implementationComplexity: compat.integrationComplexity,
    operationalRisk:          buildOperationalRisk(compat, entry),
    confidence,
    alternatives:             buildAlternatives(entry, allTechnologies, allBenchmarks),
  };
}

// ── Identify top technology opportunities ─────────────────────────────────
export function identifyOpportunities(
  technologies: TechnologyEntry[],
  benchmarks: Map<string, BenchmarkScores>,
  compatibility: Map<string, CompatibilityAssessment>,
): TechnologyOpportunity[] {
  return technologies
    .filter(t => !ALREADY_INTEGRATED.has(t.key))
    .map(t => {
      const b = benchmarks.get(t.key);
      const c = compatibility.get(t.key);
      if (!b || !c) return null;
      if (b.compositeScore < 0.80 || c.compatibilityScore < 0.60) return null;

      const impactScore = b.compositeScore * c.compatibilityScore;
      const potentialImpact: TechnologyOpportunity["potentialImpact"] =
        impactScore >= 0.85 ? "transformative" :
        impactScore >= 0.75 ? "significant" :
        impactScore >= 0.65 ? "moderate" : "minor";

      return {
        technologyKey:       t.key,
        name:                t.name,
        category:            t.category,
        opportunityDescription: `${t.name} could enhance ASH's ${t.category} capabilities. ${t.description}`,
        potentialImpact,
        compatibilityScore:  c.compatibilityScore,
        compositeScore:      b.compositeScore,
        estimatedEffort:     c.integrationComplexity,
      } satisfies TechnologyOpportunity;
    })
    .filter((o): o is TechnologyOpportunity => o !== null)
    .sort((a, b) => (b.compositeScore * b.compatibilityScore) - (a.compositeScore * a.compatibilityScore))
    .slice(0, 10);
}

// ── Batch generate all recommendations ────────────────────────────────────
export function generateAllRecommendations(
  technologies: TechnologyEntry[],
  benchmarks: Map<string, BenchmarkScores>,
  compatibility: Map<string, CompatibilityAssessment>,
): TechnologyRecommendationRecord[] {
  const allBenchmarksMap = benchmarks;
  const results: TechnologyRecommendationRecord[] = [];

  for (const entry of technologies) {
    const b = benchmarks.get(entry.key);
    const c = compatibility.get(entry.key);
    if (!b || !c) continue;

    const rec = generateRecommendation(entry, b, c, technologies, allBenchmarksMap);
    if (rec) results.push(rec);
  }

  return results.sort((a, b) => {
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const po = (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
    if (po !== 0) return po;
    return b.confidence - a.confidence;
  });
}
