// ── SDI Leverage Point Engine ─────────────────────────────────────────────
// Identifies the smallest changes that create the greatest system-wide improvement.
// Calculates leverage score, expected impact, risk, and confidence.
// Pure computation — no I/O.

import type { LeveragePointProfile } from "./types";

export function getLeveragePointCatalog(): LeveragePointProfile[] {
  return [
    {
      systemKey: "execution-system",
      leverageKey: "parallel-job-workers",
      leverageName: "Parallel Job Worker Pool",
      leverageType: "structural",
      leverageScore: 0.91,
      expectedImpact: 0.88,
      riskScore: 0.35,
      confidenceScore: 0.85,
      description: "Replace single-threaded job worker with a small pool of 3-5 parallel workers.",
      mechanism: "Parallel job execution eliminates the primary throughput constraint without requiring architectural changes.",
      targetComponent: "runtime-worker",
      affectedSystems: ["execution-system", "intelligence-system", "business-system", "user-system"],
      implementationComplexity: "medium",
      timeToImpact: "short-term",
      leverageNotes: "Highest leverage point on the platform. Addresses primary execution bottleneck.",
    },
    {
      systemKey: "intelligence-system",
      leverageKey: "eb-advisory-prioritization",
      leverageName: "Executive Brain Advisory Prioritization",
      leverageType: "information",
      leverageScore: 0.85,
      expectedImpact: 0.82,
      riskScore: 0.15,
      confidenceScore: 0.90,
      description: "Rank and present EB advisory sections by urgency score rather than fixed order.",
      mechanism: "Most critical intelligence surfaces at top of context note; model attention focused on highest-priority signals.",
      targetComponent: "executive-brain",
      affectedSystems: ["intelligence-system", "execution-system", "business-system"],
      implementationComplexity: "low",
      timeToImpact: "immediate",
      leverageNotes: "Highest confidence, lowest risk leverage point. Pure information architecture improvement.",
    },
    {
      systemKey: "data-system",
      leverageKey: "intelligent-db-indexing",
      leverageName: "Intelligence Query Index Optimization",
      leverageType: "technical",
      leverageScore: 0.82,
      expectedImpact: 0.78,
      riskScore: 0.20,
      confidenceScore: 0.88,
      description: "Add composite indexes on high-frequency EB pipeline query patterns.",
      mechanism: "Faster intelligence reads → lower EB cycle time → higher context freshness → better decisions.",
      targetComponent: "postgresql",
      affectedSystems: ["data-system", "intelligence-system", "execution-system"],
      implementationComplexity: "low",
      timeToImpact: "immediate",
    },
    {
      systemKey: "integration-system",
      leverageKey: "credential-health-monitoring",
      leverageName: "Proactive Credential Health Monitoring",
      leverageType: "process",
      leverageScore: 0.79,
      expectedImpact: 0.75,
      riskScore: 0.10,
      confidenceScore: 0.92,
      description: "Add a scheduler task that tests credentials every hour and alerts users before expiry.",
      mechanism: "Early detection eliminates silent connector failures; users fix credentials proactively.",
      targetComponent: "connections-hub",
      affectedSystems: ["integration-system", "execution-system", "user-system"],
      implementationComplexity: "low",
      timeToImpact: "short-term",
    },
    {
      systemKey: "intelligence-system",
      leverageKey: "cross-system-pattern-detection",
      leverageName: "Cross-System Pattern Detection",
      leverageType: "structural",
      leverageScore: 0.88,
      expectedImpact: 0.85,
      riskScore: 0.30,
      confidenceScore: 0.75,
      description: "Enable the Executive Brain to detect patterns that span multiple intelligence domains (e.g., tech + business + execution correlation).",
      mechanism: "Cross-domain pattern detection enables emergent insights not visible in any single engine.",
      targetComponent: "executive-brain",
      affectedSystems: ["intelligence-system", "business-system", "technology-system", "execution-system"],
      implementationComplexity: "high",
      timeToImpact: "medium-term",
      leverageNotes: "Highest structural leverage. Unlocks true systems reasoning (this build foundation).",
    },
    {
      systemKey: "business-system",
      leverageKey: "onboarding-data-seeding",
      leverageName: "Intelligent Business Onboarding Data Seeding",
      leverageType: "process",
      leverageScore: 0.74,
      expectedImpact: 0.72,
      riskScore: 0.12,
      confidenceScore: 0.85,
      description: "Pre-seed new businesses with industry benchmarks so intelligence engines produce useful outputs immediately.",
      mechanism: "Eliminates zero-data empty states; accelerates time-to-value for new users.",
      targetComponent: "business-registry",
      affectedSystems: ["business-system", "intelligence-system", "user-system"],
      implementationComplexity: "medium",
      timeToImpact: "short-term",
    },
    {
      systemKey: "infrastructure-system",
      leverageKey: "graceful-job-drain",
      leverageName: "Graceful Job Drain on Shutdown",
      leverageType: "process",
      leverageScore: 0.72,
      expectedImpact: 0.68,
      riskScore: 0.08,
      confidenceScore: 0.93,
      description: "Add SIGTERM handler to drain in-flight jobs before process exit, eliminating hung-job recovery delay.",
      mechanism: "Jobs complete before shutdown → reclaimHungJobs() watchdog never needed for restart scenarios.",
      targetComponent: "runtime-worker",
      affectedSystems: ["infrastructure-system", "execution-system"],
      implementationComplexity: "low",
      timeToImpact: "immediate",
    },
    {
      systemKey: "technology-system",
      leverageKey: "dynamic-tech-catalog-updates",
      leverageName: "Admin-Curated Dynamic Technology Registration",
      leverageType: "governance",
      leverageScore: 0.65,
      expectedImpact: 0.63,
      riskScore: 0.18,
      confidenceScore: 0.80,
      description: "Allow admin users to register new technologies beyond the static 54-tech catalog via API.",
      mechanism: "Removes code deployment requirement for catalog updates; admin can respond to new tech trends immediately.",
      targetComponent: "global-tech-catalog",
      affectedSystems: ["technology-system", "intelligence-system"],
      implementationComplexity: "medium",
      timeToImpact: "short-term",
    },
  ];
}

export function computeNetLeverageScore(lp: LeveragePointProfile): number {
  // Net leverage = (leverage × expected_impact × confidence) - (risk × 0.30)
  return Math.max(
    lp.leverageScore * lp.expectedImpact * lp.confidenceScore - lp.riskScore * 0.30,
    0
  );
}

export function getTopLeveragePoints(points: LeveragePointProfile[], topN = 5): LeveragePointProfile[] {
  return [...points]
    .sort((a, b) => computeNetLeverageScore(b) - computeNetLeverageScore(a))
    .slice(0, topN);
}

export function getLowRiskHighImpactPoints(points: LeveragePointProfile[]): LeveragePointProfile[] {
  return points.filter(p => p.riskScore <= 0.20 && p.expectedImpact >= 0.70);
}

export function getLeveragePointsBySystem(points: LeveragePointProfile[], systemKey: string): LeveragePointProfile[] {
  return points.filter(p => p.systemKey === systemKey || p.affectedSystems.includes(systemKey));
}
