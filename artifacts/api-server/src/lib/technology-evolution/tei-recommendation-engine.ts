// ── TEI Recommendation Engine ───────────────────────────────────────────────
// Produces administrator-only technology evolution recommendations.
// 7 fields per recommendation: lifecycle evidence, trend evidence, business impact,
// migration urgency, operational impact, confidence, alternatives.
// 6 recommendation types: upgrade, migration, deprecate, evaluate, monitor, adopt.

import type {
  EvolutionRecommendationType,
} from "./types";
import type { LifecycleRecord } from "./tei-lifecycle-engine";
import type { TrendRecord } from "./tei-trend-engine";
import type { OutlookRecord } from "./tei-outlook-engine";
import type { AdoptionRecord } from "./tei-adoption-engine";

export interface EvolutionRecommendation {
  technologyKey: string;
  recommendationType: EvolutionRecommendationType;
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  lifecycleEvidence: string;
  trendEvidence: string;
  businessImpact: string;
  migrationUrgency: string;
  operationalImpact: string;
  confidence: number;
  alternatives: string[];
}

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function sortByPriority(recs: EvolutionRecommendation[]): EvolutionRecommendation[] {
  return [...recs].sort((a, b) => {
    const po = (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
    return po !== 0 ? po : b.confidence - a.confidence;
  });
}

// ── High-risk technology alerts ─────────────────────────────────────────────
export function generateRiskAlerts(
  outlooks: OutlookRecord[],
  lifecycles: LifecycleRecord[],
): EvolutionRecommendation[] {
  const lifecycleMap = new Map(lifecycles.map(lc => [lc.technologyKey, lc]));
  const recs: EvolutionRecommendation[] = [];

  for (const outlook of outlooks) {
    const lifecycle = lifecycleMap.get(outlook.technologyKey);
    if (!lifecycle) continue;

    // Critical/high risk requires immediate attention
    if (outlook.riskLevel === "critical" || outlook.riskLevel === "high") {
      recs.push({
        technologyKey:     outlook.technologyKey,
        recommendationType:"evaluate",
        priority:          outlook.riskLevel === "critical" ? "critical" : "high",
        title:             `Evaluate risk posture for ${outlook.technologyKey}`,
        description:       `${outlook.technologyKey} carries ${outlook.riskLevel} risk. ${outlook.outlookNotes ?? ""}`,
        lifecycleEvidence: `Lifecycle stage: ${lifecycle.lifecycleStage}. Maturity: ${(lifecycle.maturityScore * 100).toFixed(0)}%. Stability: ${(lifecycle.stabilityScore * 100).toFixed(0)}%.`,
        trendEvidence:     `Obsolescence risk: ${(outlook.obsolescenceRisk * 100).toFixed(0)}%. Replacement likelihood: ${outlook.replacementLikelihood}. Expected longevity: ${outlook.expectedLongevityYears ?? "unknown"} years.`,
        businessImpact:    `${outlook.strategicRelevance.toUpperCase()} strategic relevance. Risk exposure requires immediate assessment and contingency planning.`,
        migrationUrgency:  outlook.upgradeUrgency === "critical" ? "IMMEDIATE — begin migration planning now" : `Urgency: ${outlook.upgradeUrgency}. ${outlook.replacementTimeframe ?? ""}`,
        operationalImpact: `Future compatibility score: ${(outlook.futureCompatibilityScore * 100).toFixed(0)}%. Confidence: ${(outlook.technologyConfidenceScore * 100).toFixed(0)}%.`,
        confidence:        1 - outlook.obsolescenceRisk,
        alternatives:      [],
      });
    }

    // Upgrade urgency alerts
    if (outlook.upgradeUrgency === "critical" || outlook.upgradeUrgency === "high") {
      recs.push({
        technologyKey:     outlook.technologyKey,
        recommendationType:"upgrade",
        priority:          outlook.upgradeUrgency === "critical" ? "critical" : "high",
        title:             `Upgrade ${outlook.technologyKey} — ${outlook.upgradeUrgency} urgency`,
        description:       `${outlook.technologyKey} has ${outlook.upgradeUrgency} upgrade urgency. ${outlook.outlookNotes ?? ""}`,
        lifecycleEvidence: `Stage: ${lifecycle.lifecycleStage}. Support status: ${lifecycle.supportStatus}. EOL: ${lifecycle.expectedEolYear ?? "not announced"}.`,
        trendEvidence:     `Replacement likelihood: ${outlook.replacementLikelihood}. Timeframe: ${outlook.replacementTimeframe ?? "unknown"}.`,
        businessImpact:    `${outlook.strategicRelevance.toUpperCase()} strategic relevance. Delaying upgrade increases security exposure and technical debt.`,
        migrationUrgency:  `${outlook.upgradeUrgency.toUpperCase()} — ${outlook.replacementTimeframe ?? "assess now"}.`,
        operationalImpact: `Innovation potential: ${(outlook.innovationPotential * 100).toFixed(0)}%. Future compatibility: ${(outlook.futureCompatibilityScore * 100).toFixed(0)}%.`,
        confidence:        outlook.technologyConfidenceScore,
        alternatives:      [],
      });
    }
  }

  return recs;
}

// ── Emerging technology opportunities ─────────────────────────────────────
export function generateAdoptionOpportunities(
  trends: TrendRecord[],
  lifecycles: LifecycleRecord[],
  adoptions: AdoptionRecord[],
): EvolutionRecommendation[] {
  const lifecycleMap = new Map(lifecycles.map(lc => [lc.technologyKey, lc]));
  const adoptionMap  = new Map(adoptions.map(a  => [a.technologyKey, a]));
  const recs: EvolutionRecommendation[] = [];

  for (const trend of trends) {
    const lifecycle = lifecycleMap.get(trend.technologyKey);
    const adoption  = adoptionMap.get(trend.technologyKey);
    if (!lifecycle || !adoption) continue;

    // Accelerating + emerging/growing = adoption opportunity
    if (
      (trend.trendDirection === "accelerating" || trend.trendDirection === "growing") &&
      (lifecycle.lifecycleStage === "emerging" || lifecycle.lifecycleStage === "growing") &&
      trend.marketMomentum >= 0.65
    ) {
      recs.push({
        technologyKey:     trend.technologyKey,
        recommendationType:"adopt",
        priority:          trend.adoptionVelocity >= 0.70 ? "high" : "medium",
        title:             `Evaluate adopting ${trend.technologyKey} — ${trend.trendDirection} momentum`,
        description:       `${trend.technologyKey} is ${trend.trendDirection} with ${(trend.adoptionVelocity * 100).toFixed(0)}% adoption velocity. ${trend.trendNotes ?? ""}`,
        lifecycleEvidence: `Lifecycle stage: ${lifecycle.lifecycleStage}. Maturity: ${(lifecycle.maturityScore * 100).toFixed(0)}%. Stability: ${(lifecycle.stabilityScore * 100).toFixed(0)}%.`,
        trendEvidence:     `Trend: ${trend.trendDirection}. Market momentum: ${(trend.marketMomentum * 100).toFixed(0)}%. Community growth: ${(trend.communityGrowthRate * 100).toFixed(0)}%. Job market: ${trend.jobMarketTrend}.`,
        businessImpact:    `Ecosystem size: ${adoption.ecosystemSize}. Enterprise adoption: ${(adoption.enterpriseAdoptionScore * 100).toFixed(0)}%. Developer adoption: ${(adoption.developerAdoptionScore * 100).toFixed(0)}%.`,
        migrationUrgency:  `Evaluate within 1-3 months. Early adoption advantage available while market is still growing.`,
        operationalImpact: `Developer adoption: ${(adoption.developerAdoptionScore * 100).toFixed(0)}%. Community maturity: ${(adoption.communityMaturityScore * 100).toFixed(0)}%.`,
        confidence:        (trend.marketMomentum + lifecycle.maturityScore) / 2,
        alternatives:      [],
      });
    }
  }

  return recs;
}

// ── Deprecation alerts ──────────────────────────────────────────────────────
export function generateDeprecationAlerts(
  lifecycles: LifecycleRecord[],
  outlooks: OutlookRecord[],
): EvolutionRecommendation[] {
  const outlookMap = new Map(outlooks.map(o => [o.technologyKey, o]));
  const recs: EvolutionRecommendation[] = [];

  for (const lifecycle of lifecycles) {
    if (!["declining", "legacy", "end-of-life"].includes(lifecycle.lifecycleStage)) continue;
    const outlook = outlookMap.get(lifecycle.technologyKey);

    recs.push({
      technologyKey:     lifecycle.technologyKey,
      recommendationType:"deprecate",
      priority:          lifecycle.lifecycleStage === "end-of-life" ? "critical" : lifecycle.lifecycleStage === "legacy" ? "high" : "medium",
      title:             `Plan ${lifecycle.technologyKey} deprecation — ${lifecycle.lifecycleStage} stage`,
      description:       `${lifecycle.technologyKey} is in ${lifecycle.lifecycleStage} lifecycle stage. ${lifecycle.lifecycleNotes ?? ""}`,
      lifecycleEvidence: `Stage: ${lifecycle.lifecycleStage}. Support: ${lifecycle.supportStatus}. Longevity score: ${(lifecycle.longevityScore * 100).toFixed(0)}%. EOL: ${lifecycle.expectedEolYear ?? "not announced"}.`,
      trendEvidence:     `Replacement likelihood: ${outlook?.replacementLikelihood ?? "high"}. Obsolescence risk: ${outlook ? (outlook.obsolescenceRisk * 100).toFixed(0) + "%" : "high"}.`,
      businessImpact:    `Strategic relevance: ${outlook?.strategicRelevance ?? "legacy"}. Delaying deprecation creates maintenance burden and growing security risk.`,
      migrationUrgency:  `Plan migration within ${lifecycle.lifecycleStage === "end-of-life" ? "3 months" : lifecycle.lifecycleStage === "legacy" ? "6-12 months" : "12-24 months"}.`,
      operationalImpact: `Stability: ${(lifecycle.stabilityScore * 100).toFixed(0)}%. Future compatibility: ${outlook ? (outlook.futureCompatibilityScore * 100).toFixed(0) + "%" : "low"}.`,
      confidence:        1 - (lifecycle.longevityScore * 0.5),
      alternatives:      [],
    });
  }

  return recs;
}

// ── Monitor candidates: slowing but stable ─────────────────────────────────
export function generateMonitorRecommendations(
  trends: TrendRecord[],
  lifecycles: LifecycleRecord[],
): EvolutionRecommendation[] {
  const lifecycleMap = new Map(lifecycles.map(lc => [lc.technologyKey, lc]));
  const recs: EvolutionRecommendation[] = [];

  for (const trend of trends) {
    const lifecycle = lifecycleMap.get(trend.technologyKey);
    if (!lifecycle) continue;

    // Slowing trend on established/mature technology = watch closely
    if (
      trend.trendDirection === "slowing" &&
      (lifecycle.lifecycleStage === "established" || lifecycle.lifecycleStage === "mature")
    ) {
      recs.push({
        technologyKey:     trend.technologyKey,
        recommendationType:"monitor",
        priority:          "low",
        title:             `Monitor ${trend.technologyKey} — slowing trend on ${lifecycle.lifecycleStage} technology`,
        description:       `${trend.technologyKey} trend is slowing. ${trend.trendNotes ?? ""}`,
        lifecycleEvidence: `Stage: ${lifecycle.lifecycleStage}. Maturity: ${(lifecycle.maturityScore * 100).toFixed(0)}%. Stability: ${(lifecycle.stabilityScore * 100).toFixed(0)}%.`,
        trendEvidence:     `Trend direction: ${trend.trendDirection}. Adoption velocity: ${(trend.adoptionVelocity * 100).toFixed(0)}%. Market momentum: ${(trend.marketMomentum * 100).toFixed(0)}%.`,
        businessImpact:    `No immediate action required. Watch for transition to declining stage in next 12-24 months.`,
        migrationUrgency:  `No urgency. Set review checkpoint in 12 months.`,
        operationalImpact: `Enterprise interest: ${(trend.enterpriseInterestScore * 100).toFixed(0)}%. Job market: ${trend.jobMarketTrend}.`,
        confidence:        lifecycle.maturityScore,
        alternatives:      [],
      });
    }
  }

  return recs;
}

// ── Batch generate all recommendations ────────────────────────────────────
export function generateAllEvolutionRecommendations(
  lifecycles: LifecycleRecord[],
  trends: TrendRecord[],
  outlooks: OutlookRecord[],
  adoptions: AdoptionRecord[],
): EvolutionRecommendation[] {
  const all = [
    ...generateRiskAlerts(outlooks, lifecycles),
    ...generateDeprecationAlerts(lifecycles, outlooks),
    ...generateAdoptionOpportunities(trends, lifecycles, adoptions),
    ...generateMonitorRecommendations(trends, lifecycles),
  ];

  // Deduplicate by key+type
  const seen = new Set<string>();
  const deduped = all.filter(r => {
    const k = `${r.technologyKey}:${r.recommendationType}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return sortByPriority(deduped).slice(0, 25);
}
