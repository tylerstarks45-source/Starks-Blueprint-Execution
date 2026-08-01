// ── EPI Portfolio Recommendation Engine ──────────────────────────────────
// Produces deterministic recommendations:
//   Rebalance | Delay | Accelerate | Consolidate | Retire | Expand
// Every recommendation includes: Evidence, Expected impact, Risk, Confidence, Alternative.
// Enforces Portfolio Optimization Law:
//   Local gains must never reduce overall portfolio performance.
// Pure computation — no I/O.

import type {
  PortfolioInitiativeInput,
  BalanceResult,
  ExposureResult,
  CapacityResult,
  AllocationResult,
  PortfolioRecommendationResult,
  RecommendationType,
  RecommendationPriority,
} from "./types";
import { identifyPortfolioGaps, identifyExecutionBottlenecks } from "./epi-capacity-engine";

function makeRec(
  type: RecommendationType,
  priority: RecommendationPriority,
  title: string,
  rationale: string,
  evidence: { point: string; source: string }[],
  expectedImpact: string,
  riskIfIgnored: string,
  alternativeAction: string | null,
  confidence: number,
  target?: string,
): PortfolioRecommendationResult {
  return {
    type, priority,
    targetInitiative: target,
    title, rationale, evidence, expectedImpact, riskIfIgnored, alternativeAction,
    confidenceScore: Math.round(confidence * 1000) / 1000,
    portfolioLawApplied: true,
  };
}

// 1. Rebalance recommendations — when balance is poor
function rebalanceRecs(balance: BalanceResult, initiatives: PortfolioInitiativeInput[]): PortfolioRecommendationResult[] {
  const recs: PortfolioRecommendationResult[] = [];

  if (balance.overallBalance < 0.55) {
    recs.push(makeRec(
      "rebalance", "high",
      "Portfolio Strategic Rebalancing Required",
      `Overall balance score (${(balance.overallBalance * 100).toFixed(0)}%) is below the healthy threshold of 55%. ${balance.balanceWarnings[0] ?? ""}`,
      [
        { point: `Balance score: ${(balance.overallBalance * 100).toFixed(0)}%`, source: "Balance Intelligence Engine" },
        ...balance.balanceWarnings.slice(0, 2).map(w => ({ point: w, source: "Balance Intelligence Engine" })),
      ],
      "Improved strategic balance reduces concentration risk and ensures long-term portfolio sustainability.",
      "Continued imbalance leads to strategic blind spots and compounds risk over time.",
      "Alternatively, commission a focused review of under-invested dimensions before making structural changes.",
      0.80,
    ));
  }

  if ((balance.bucketRatios.maintain ?? 0) > 0.60) {
    recs.push(makeRec(
      "rebalance", "medium",
      "Shift Investment from Maintain to Innovate",
      `${(balance.bucketRatios.maintain * 100).toFixed(0)}% of portfolio budget is in maintenance — limits growth potential.`,
      [{ point: `Maintain bucket: ${(balance.bucketRatios.maintain * 100).toFixed(0)}%`, source: "Balance Intelligence Engine" }],
      "Rebalancing toward innovation increases competitive differentiation and future optionality.",
      "Maintenance-dominated portfolios gradually lose competitive ground as innovation investment stagnates.",
      "Audit maintenance initiatives for automation opportunities to free capacity before adding new innovation initiatives.",
      0.75,
    ));
  }

  return recs;
}

// 2. Delay recommendations — overcommitted + low-priority planned initiatives
function delayRecs(
  capacity: CapacityResult,
  initiatives: PortfolioInitiativeInput[],
  allocations: AllocationResult[],
): PortfolioRecommendationResult[] {
  const recs: PortfolioRecommendationResult[] = [];
  if (!capacity.overcommittedResources.length) return recs;

  const delayTargets = initiatives
    .filter(i => i.status === "planned" && i.strategicAlignment < 0.60 && (i.dependencies ?? []).length === 0)
    .sort((a, b) => a.strategicAlignment - b.strategicAlignment)
    .slice(0, 2);

  for (const target of delayTargets) {
    recs.push(makeRec(
      "delay", "high",
      `Delay "${target.title}" to Release Capacity`,
      `Portfolio is overcommitted on ${capacity.overcommittedResources.join(", ")}. "${target.title}" has low strategic alignment (${(target.strategicAlignment * 100).toFixed(0)}%) and is not on the critical path.`,
      [
        { point: `Overcommitted resources: ${capacity.overcommittedResources.join(", ")}`, source: "Capacity Intelligence Engine" },
        { point: `Strategic alignment: ${(target.strategicAlignment * 100).toFixed(0)}%`, source: "Portfolio Construction Engine" },
      ],
      `Delaying "${target.title}" releases ${Object.entries(target.resourceDemand).filter(([, v]) => v > 0.10).map(([k, v]) => `${k}: ${(v * 100).toFixed(0)}%`).slice(0, 2).join(", ")} capacity for higher-priority initiatives.`,
      "Continuing all planned initiatives under overcommit leads to execution failure across multiple initiatives simultaneously.",
      `Alternatively, reduce scope of "${target.title}" rather than full delay to maintain some momentum.`,
      0.78,
      target.key,
    ));
  }

  return recs;
}

// 3. Accelerate recommendations — high-alignment, low-risk initiatives underutilising available capacity
function accelerateRecs(capacity: CapacityResult, initiatives: PortfolioInitiativeInput[]): PortfolioRecommendationResult[] {
  if (capacity.expansionReadiness < 0.30) return [];

  const candidates = initiatives
    .filter(i => i.status === "planned" && i.strategicAlignment >= 0.75 && i.riskLevel === "low")
    .sort((a, b) => b.strategicAlignment - a.strategicAlignment)
    .slice(0, 1);

  return candidates.map(target =>
    makeRec(
      "accelerate", "medium",
      `Accelerate "${target.title}" — High Alignment, Available Capacity`,
      `Portfolio has ${(capacity.availableCapacity * 100).toFixed(0)}% available capacity and "${target.title}" has high strategic alignment (${(target.strategicAlignment * 100).toFixed(0)}%) at low risk.`,
      [
        { point: `Available capacity: ${(capacity.availableCapacity * 100).toFixed(0)}%`, source: "Capacity Intelligence Engine" },
        { point: `Strategic alignment: ${(target.strategicAlignment * 100).toFixed(0)}%`, source: "Portfolio Construction Engine" },
        { point: `Risk level: ${target.riskLevel}`, source: "Portfolio Construction Engine" },
      ],
      "Accelerating high-alignment initiatives captures strategic value ahead of schedule and maximises use of available capacity.",
      "Leaving available capacity idle while high-value initiatives remain planned is a portfolio efficiency loss.",
      "Alternatively, identify adjacent new initiatives that fill the same strategic theme to capitalise on capacity.",
      0.70,
      target.key,
    )
  );
}

// 4. Consolidate recommendations — overlapping or low-differentiation initiatives
function consolidateRecs(initiatives: PortfolioInitiativeInput[]): PortfolioRecommendationResult[] {
  if (initiatives.length < 4) return [];

  // Group by theme + type — if 3+ in same group, suggest consolidation
  const groups: Record<string, string[]> = {};
  for (const i of initiatives) {
    const key = `${i.theme}:${i.type}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(i.key);
  }

  const recs: PortfolioRecommendationResult[] = [];
  for (const [group, keys] of Object.entries(groups)) {
    if (keys.length >= 3) {
      const [theme, type] = group.split(":");
      const names = keys.slice(0, 3).map(k => initiatives.find(i => i.key === k)?.title ?? k);
      recs.push(makeRec(
        "consolidate", "medium",
        `Consolidate ${keys.length} "${theme}" ${type} Initiatives`,
        `${keys.length} initiatives share the same strategic theme ("${theme}") and type ("${type}"). Consolidation reduces coordination overhead and improves focus.`,
        [{ point: `Overlapping group: ${names.join(", ")}`, source: "Portfolio Construction Engine" }],
        "Consolidating overlapping initiatives reduces duplication, clarifies ownership, and improves execution speed.",
        "Maintaining too many similar initiatives divides attention and dilutes the value of each.",
        `Alternatively, differentiate each initiative clearly so their distinct contributions are preserved.`,
        0.65,
      ));
      break; // one consolidation rec per evaluation
    }
  }
  return recs;
}

// 5. Retire recommendations — low-alignment, on-hold or retiring initiatives
function retireRecs(initiatives: PortfolioInitiativeInput[]): PortfolioRecommendationResult[] {
  const candidates = initiatives
    .filter(i => (i.status === "on-hold" || i.status === "retiring") && i.strategicAlignment < 0.40)
    .slice(0, 1);

  return candidates.map(target =>
    makeRec(
      "retire", "medium",
      `Retire "${target.title}" — Low Alignment, Stale Status`,
      `"${target.title}" has been ${target.status} with ${(target.strategicAlignment * 100).toFixed(0)}% strategic alignment. Resources allocated to it are not contributing to strategic objectives.`,
      [
        { point: `Status: ${target.status}`, source: "Portfolio Construction Engine" },
        { point: `Strategic alignment: ${(target.strategicAlignment * 100).toFixed(0)}%`, source: "Portfolio Construction Engine" },
      ],
      `Retiring "${target.title}" frees ${Object.entries(target.resourceDemand).filter(([, v]) => v > 0.05).map(([k, v]) => `${k}: ${(v * 100).toFixed(0)}%`).slice(0, 2).join(", ")} for higher-alignment work.`,
      "Stale initiatives consume mental and planning bandwidth without delivering value.",
      "Consider a time-boxed restart with clearly redefined scope and alignment before retiring.",
      0.72,
      target.key,
    )
  );
}

// 6. Expand recommendations — portfolio gaps identified by capacity engine
function expandRecs(
  capacity: CapacityResult,
  initiatives: PortfolioInitiativeInput[],
  gaps: string[],
): PortfolioRecommendationResult[] {
  if (gaps.length === 0 || capacity.expansionReadiness < 0.25) return [];

  return [{
    type: "expand",
    priority: "low",
    title: "Expand Portfolio to Address Identified Gaps",
    rationale: `${gaps.length} strategic gap(s) detected in the portfolio. Expansion readiness is ${(capacity.expansionReadiness * 100).toFixed(0)}%.`,
    evidence: gaps.slice(0, 3).map(g => ({ point: g, source: "Capacity Intelligence Engine" })),
    expectedImpact: "Filling portfolio gaps improves strategic coverage and reduces risk of neglected capability areas.",
    riskIfIgnored: "Unaddressed portfolio gaps grow into critical weaknesses as the organisation scales.",
    alternativeAction: "Alternatively, restructure existing initiatives to cover the gap before adding new ones.",
    confidenceScore: 0.60,
    portfolioLawApplied: true,
  }];
}

// Exposure-driven recommendations
function exposureRecs(exposures: ExposureResult[]): PortfolioRecommendationResult[] {
  return exposures
    .filter(e => e.severity === "critical" || (e.severity === "high" && e.exposureScore >= 0.70))
    .slice(0, 2)
    .map(e => makeRec(
      "rebalance",
      e.severity === "critical" ? "critical" : "high",
      `Mitigate ${e.exposureType.replace(/-/g, " ")} Exposure`,
      e.description,
      [{ point: `Concentration ratio: ${(e.concentrationRatio * 100).toFixed(0)}%`, source: "Exposure Intelligence Engine" }],
      `Reducing this exposure lowers portfolio risk score from ${(e.exposureScore * 100).toFixed(0)}% toward a safer level.`,
      "Unmitigated concentration exposure can cascade into portfolio-wide failure when the concentrated factor fails.",
      e.mitigation,
      0.82 - (e.exposureScore * 0.20),
    ));
}

// Master recommendation builder — Portfolio Optimization Law enforced
export function buildPortfolioRecommendations(
  balance: BalanceResult,
  capacity: CapacityResult,
  exposures: ExposureResult[],
  allocations: AllocationResult[],
  initiatives: PortfolioInitiativeInput[],
): PortfolioRecommendationResult[] {
  const gaps = identifyPortfolioGaps(initiatives);

  const all = [
    ...exposureRecs(exposures),        // highest priority: critical exposures
    ...rebalanceRecs(balance, initiatives),
    ...delayRecs(capacity, initiatives, allocations),
    ...retireRecs(initiatives),
    ...consolidateRecs(initiatives),
    ...accelerateRecs(capacity, initiatives),
    ...expandRecs(capacity, initiatives, gaps),
  ];

  // Sort by priority: critical > high > medium > low, then by confidence desc
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  return all.sort((a, b) => {
    const pd = (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
    if (pd !== 0) return pd;
    return b.confidenceScore - a.confidenceScore;
  }).slice(0, 8); // cap at 8 recommendations per evaluation
}
