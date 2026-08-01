// ── ETI Orchestrator ───────────────────────────────────────────────────────
// Two entry points:
//   1. evaluateTradeoff(request)  — runtime evaluation of a live decision
//   2. runPlatformRebuild()       — seeds platform-level trade-off scenarios for EB context
// All stages fail-open.

import { db } from "@workspace/db";
import {
  tradeoffScenarios,
  constraintSets,
  optimizationProfiles,
  tradeoffMatrices,
  decisionFrontiers,
  sensitivityAnalyses,
  tradeoffRegistry,
  tradeoffSnapshots,
  executivePreferences,
} from "@workspace/db/schema";
import pino from "pino";
import { eq, desc } from "drizzle-orm";
import { validateConstraintSet, detectConstraintViolations, summariseConstraints, getPlatformDefaultConstraints } from "./eti-constraint-engine";
import { normalizeWeights } from "./eti-optimization-engine";
import { buildTradeoffMatrix, markDominanceOnMatrix } from "./eti-matrix-engine";
import { computeDecisionFrontier } from "./eti-frontier-engine";
import { runSensitivityAnalysis, hasCriticalSensitivity } from "./eti-sensitivity-engine";
import { buildExecutiveRecommendation } from "./eti-recommendation-engine";
import type {
  TradeoffEvaluationRequest,
  TradeoffEvaluationResult,
  TradeoffIntelligenceSummary,
  TradeoffOption,
  TradeoffObjective,
  TradeoffConstraint,
} from "./types";

const logger = pino({ name: "eti-orchestrator" });

// ── Runtime trade-off evaluation ───────────────────────────────────────────
export async function evaluateTradeoff(
  request: TradeoffEvaluationRequest,
): Promise<TradeoffEvaluationResult> {
  logger.info({ scenarioKey: request.scenarioKey }, "ETI: evaluating trade-off");

  // Normalize weights
  const objectives = normalizeWeights(request.objectives) as TradeoffObjective[];

  // Validate constraints
  const { valid, conflicts } = validateConstraintSet(request.constraints);
  if (!valid) {
    logger.warn({ conflicts }, "ETI: constraint conflicts detected (proceeding)");
  }

  // Detect constraint violations per option
  const violations = detectConstraintViolations(request.options, request.constraints);

  // Build matrix
  const rawMatrix = buildTradeoffMatrix(request.options, objectives, violations, request.constraints);
  const matrix    = markDominanceOnMatrix(rawMatrix);

  // Compute decision frontier
  const frontier = computeDecisionFrontier(matrix, objectives);

  // Get base recommendation (pre-sensitivity)
  const baseRec = buildExecutiveRecommendation(matrix, frontier, [], objectives, request.constraints);

  // Sensitivity analysis
  const sensitivities = runSensitivityAnalysis(
    request.options,
    objectives,
    request.constraints,
    baseRec.recommendedOption,
  );

  // Final recommendation (with sensitivity info)
  const recommendation = buildExecutiveRecommendation(matrix, frontier, sensitivities, objectives, request.constraints);

  // Persist to DB
  let scenarioId = 0;
  try {
    const [row] = await db.insert(tradeoffScenarios).values({
      scenarioKey:     request.scenarioKey,
      title:           request.title,
      description:     request.description,
      decisionType:    request.decisionType,
      contextDomain:   request.contextDomain,
      optionCount:     request.options.length,
      objectiveCount:  objectives.length,
      constraintCount: request.constraints.length,
      status:          "evaluated",
      triggeredBy:     request.userId ? "user" : "platform",
      userId:          request.userId ?? null,
      capturedAt:      new Date(),
    }).returning({ id: tradeoffScenarios.id });
    scenarioId = row?.id ?? 0;
  } catch (err) {
    logger.warn({ err }, "ETI: scenario insert failed (ignored)");
  }

  if (scenarioId > 0) {
    // Persist constraint set
    for (const c of request.constraints) {
      try {
        await db.insert(constraintSets).values({
          scenarioId,
          constraintKey:   c.key,
          constraintType:  c.type,
          constraintName:  c.name,
          constraintValue: c.value,
          constraintUnit:  c.unit ?? null,
          severity:        c.severity,
          isBindingNow:    c.severity === "hard",
          relatesTo:       c.relatesTo ?? [],
          notes:           c.notes ?? null,
          capturedAt:      new Date(),
        });
      } catch (err) {
        logger.warn({ err, key: c.key }, "ETI: constraint insert failed (ignored)");
      }
    }

    // Persist optimization profile
    for (const o of objectives) {
      try {
        await db.insert(optimizationProfiles).values({
          scenarioId,
          objective:       o.objective,
          weight:          o.weight,
          targetDirection: o.direction,
          rationale:       o.rationale,
          capturedAt:      new Date(),
        });
      } catch (err) {
        logger.warn({ err, obj: o.objective }, "ETI: objective insert failed (ignored)");
      }
    }

    // Persist matrix rows
    for (const row of matrix) {
      try {
        await db.insert(tradeoffMatrices).values({
          scenarioId,
          optionKey:              row.optionKey,
          optionName:             row.optionName,
          optionDescription:      row.optionDescription,
          objectiveScores:        row.objectiveScores,
          constraintViolations:   row.constraintViolations,
          weightedCompositeScore: row.weightedCompositeScore,
          rawCompositeScore:      row.rawCompositeScore,
          dominanceRank:          row.dominanceRank,
          isOnFrontier:           row.isOnFrontier,
          explanations:           row.explanations,
          capturedAt:             new Date(),
        });
      } catch (err) {
        logger.warn({ err, key: row.optionKey }, "ETI: matrix row insert failed (ignored)");
      }
    }

    // Persist frontier
    try {
      await db.insert(decisionFrontiers).values({
        scenarioId,
        frontierOptions:         frontier.frontierOptions,
        dominatedOptions:        frontier.dominatedOptions,
        frontierSize:            frontier.frontierSize,
        dominatedCount:          frontier.dominatedCount,
        objectivesConsidered:    frontier.objectivesConsidered,
        frontierExplanation:     frontier.frontierExplanation,
        recommendedFromFrontier: frontier.recommendedFromFrontier ?? null,
        capturedAt:              new Date(),
      });
    } catch (err) {
      logger.warn({ err }, "ETI: frontier insert failed (ignored)");
    }

    // Persist sensitivity analyses
    for (const s of sensitivities) {
      try {
        await db.insert(sensitivityAnalyses).values({
          scenarioId,
          changedConstraint:       s.changedConstraint,
          changeType:              s.changeType,
          changeDescription:       s.changeDescription,
          originalRecommendation:  s.originalRecommendation,
          sensitizedRecommendation:s.sensitizedRecommendation,
          recommendationChanged:   s.recommendationChanged,
          sensitivityScore:        s.sensitivityScore,
          affectedObjectives:      s.affectedObjectives,
          analysis:                s.analysis,
          capturedAt:              new Date(),
        });
      } catch (err) {
        logger.warn({ err }, "ETI: sensitivity insert failed (ignored)");
      }
    }

    // Upsert registry
    try {
      await db.insert(tradeoffRegistry).values({
        scenarioKey:          request.scenarioKey,
        title:                request.title,
        decisionType:         request.decisionType,
        recommendedOption:    recommendation.recommendedOption,
        runnerUpOption:       recommendation.runnerUpOption ?? null,
        rejectedOptions:      recommendation.rejectedOptions,
        tradeoffExplanation:  recommendation.tradeoffExplanation,
        keyAssumptions:       recommendation.keyAssumptions,
        sensitivityFlag:      recommendation.sensitivityFlag,
        confidenceScore:      recommendation.confidenceScore,
        executiveLawApplied:  true,
        lastEvaluatedAt:      new Date(),
      }).onConflictDoUpdate({
        target: tradeoffRegistry.scenarioKey,
        set: {
          title:               request.title,
          decisionType:        request.decisionType,
          recommendedOption:   recommendation.recommendedOption,
          runnerUpOption:      recommendation.runnerUpOption ?? null,
          rejectedOptions:     recommendation.rejectedOptions,
          tradeoffExplanation: recommendation.tradeoffExplanation,
          keyAssumptions:      recommendation.keyAssumptions,
          sensitivityFlag:     recommendation.sensitivityFlag,
          confidenceScore:     recommendation.confidenceScore,
          executiveLawApplied: true,
          lastEvaluatedAt:     new Date(),
        },
      });
    } catch (err) {
      logger.warn({ err }, "ETI: registry upsert failed (ignored)");
    }
  }

  return {
    scenarioId,
    scenarioKey: request.scenarioKey,
    matrix,
    frontier,
    sensitivities,
    recommendation,
  };
}

// ── Platform rebuild — seeds standard scenarios + snapshot ─────────────────
export async function runTradeoffPlatformRebuild(triggeredBy: string = "scheduled"): Promise<void> {
  logger.info({ triggeredBy }, "ETI: platform trade-off rebuild started");

  const platformScenarios: TradeoffEvaluationRequest[] = [
    {
      scenarioKey: "platform-build-vs-buy-ai",
      title: "Build vs. Buy: AI/ML Components",
      description: "Should ASH build custom AI models or buy/license existing model APIs?",
      decisionType: "build-vs-buy",
      contextDomain: "technology",
      options: [
        { key: "build-custom", name: "Build Custom AI", description: "Develop proprietary fine-tuned models in-house", scores: { build: 0.90, long_term: 0.85, flexibility: 0.88, innovation: 0.85, cost: 0.20, speed: 0.20, simplicity: 0.25 } },
        { key: "buy-apis", name: "Buy API Access", description: "Use OpenRouter + provider APIs (current approach)", scores: { buy: 0.95, speed: 0.95, simplicity: 0.90, cost: 0.75, flexibility: 0.70, long_term: 0.60, innovation: 0.60 } },
        { key: "hybrid", name: "Hybrid Approach", description: "Buy for commodity tasks, build for proprietary capabilities", scores: { flexibility: 0.85, long_term: 0.80, innovation: 0.75, cost: 0.60, speed: 0.65, simplicity: 0.55, build: 0.55, buy: 0.70 } },
      ],
      constraints: getPlatformDefaultConstraints("build-vs-buy"),
      objectives: [
        { objective: "cost", weight: 0.20, direction: "minimize", rationale: "Engineering budget is bounded" },
        { objective: "speed", weight: 0.20, direction: "maximize", rationale: "Time to production matters" },
        { objective: "flexibility", weight: 0.20, direction: "maximize", rationale: "Platform must adapt to new models" },
        { objective: "long_term", weight: 0.25, direction: "maximize", rationale: "Strategic value over time" },
        { objective: "innovation", weight: 0.15, direction: "maximize", rationale: "Competitive differentiation" },
      ],
    },
    {
      scenarioKey: "platform-speed-vs-quality-mvp",
      title: "Speed vs. Quality: Feature Development",
      description: "Should new features ship fast with technical debt, or slower with full quality gates?",
      decisionType: "speed-vs-quality",
      contextDomain: "product",
      options: [
        { key: "ship-fast", name: "Ship Fast (MVP First)", description: "Minimal quality gates, fix later", scores: { speed: 0.95, short_term: 0.90, quality: 0.30, stability: 0.25, long_term: 0.35, sustainability: 0.30 } },
        { key: "quality-first", name: "Quality First", description: "Full test coverage, code review, no shortcuts", scores: { quality: 0.95, stability: 0.92, long_term: 0.90, sustainability: 0.85, speed: 0.30, short_term: 0.40 } },
        { key: "balanced-sprints", name: "Balanced Sprints", description: "Ship in 2-week cycles with quality gates on critical paths", scores: { speed: 0.65, quality: 0.72, stability: 0.70, long_term: 0.72, short_term: 0.65, sustainability: 0.68 } },
      ],
      constraints: getPlatformDefaultConstraints("speed-vs-quality"),
      objectives: [
        { objective: "speed", weight: 0.30, direction: "maximize", rationale: "Market window is constrained" },
        { objective: "quality", weight: 0.30, direction: "maximize", rationale: "Technical debt compounds" },
        { objective: "stability", weight: 0.25, direction: "maximize", rationale: "Production reliability is non-negotiable" },
        { objective: "long_term", weight: 0.15, direction: "maximize", rationale: "Sustainability of the codebase" },
      ],
    },
    {
      scenarioKey: "platform-innovation-vs-stability-tech",
      title: "Innovation vs. Stability: Technology Adoption",
      description: "Should the platform adopt emerging technologies or stay on proven stable stack?",
      decisionType: "innovation-vs-stability",
      contextDomain: "technology",
      options: [
        { key: "early-adopt", name: "Early Adopt Emerging Tech", description: "Integrate emerging technologies as they hit production-readiness", scores: { innovation: 0.95, flexibility: 0.88, long_term: 0.80, risk: 0.25, stability: 0.30, simplicity: 0.25 } },
        { key: "proven-stack", name: "Proven Stack Only", description: "Only adopt technology that is 2+ years production-proven", scores: { stability: 0.95, simplicity: 0.90, risk: 0.90, innovation: 0.35, flexibility: 0.50, long_term: 0.60 } },
        { key: "selective-modernisation", name: "Selective Modernisation", description: "Proven stack for core; emerging only in isolated, reversible contexts", scores: { stability: 0.80, innovation: 0.70, risk: 0.75, flexibility: 0.78, simplicity: 0.72, long_term: 0.75 } },
      ],
      constraints: getPlatformDefaultConstraints("innovation-vs-stability"),
      objectives: [
        { objective: "stability", weight: 0.35, direction: "maximize", rationale: "Production reliability is primary" },
        { objective: "innovation", weight: 0.25, direction: "maximize", rationale: "Competitive differentiation through technology" },
        { objective: "risk", weight: 0.25, direction: "minimize", rationale: "Low risk tolerance in production" },
        { objective: "flexibility", weight: 0.15, direction: "maximize", rationale: "Ability to adapt as tech evolves" },
      ],
    },
    {
      scenarioKey: "platform-automation-vs-manual-ops",
      title: "Automation vs. Manual Effort: Business Operations",
      description: "Should business operations be automated via AI agents or rely on manual human oversight?",
      decisionType: "automation-vs-manual",
      contextDomain: "operations",
      options: [
        { key: "full-automation", name: "Full AI Automation", description: "AI agents handle all routine operations autonomously", scores: { automation: 0.95, cost: 0.80, speed: 0.90, quality: 0.65, risk: 0.30, usability: 0.60, stability: 0.55 } },
        { key: "human-first", name: "Human-First with Tools", description: "Humans make all decisions; AI surfaces data only", scores: { risk: 0.90, quality: 0.85, usability: 0.80, cost: 0.30, speed: 0.40, automation: 0.10, stability: 0.85 } },
        { key: "supervised-automation", name: "Supervised Automation", description: "AI executes routine tasks; humans approve high-stakes actions", scores: { automation: 0.75, quality: 0.80, risk: 0.75, cost: 0.65, speed: 0.72, usability: 0.78, stability: 0.78 } },
      ],
      constraints: getPlatformDefaultConstraints("automation-vs-manual"),
      objectives: [
        { objective: "automation", weight: 0.25, direction: "maximize", rationale: "Scale requires automation" },
        { objective: "quality", weight: 0.25, direction: "maximize", rationale: "Output quality is paramount" },
        { objective: "risk", weight: 0.25, direction: "minimize", rationale: "Errors have business consequences" },
        { objective: "cost", weight: 0.15, direction: "minimize", rationale: "Operational cost must be controlled" },
        { objective: "usability", weight: 0.10, direction: "maximize", rationale: "User experience of automation matters" },
      ],
    },
    {
      scenarioKey: "platform-security-vs-usability-auth",
      title: "Security vs. Usability: Authentication Design",
      description: "Should authentication prioritise maximum security or frictionless user experience?",
      decisionType: "security-vs-usability",
      contextDomain: "product",
      options: [
        { key: "max-security", name: "Maximum Security", description: "MFA required, short sessions, strict IP checks", scores: { security: 0.97, risk: 0.95, usability: 0.25, speed: 0.30, growth: 0.40 } },
        { key: "sso-only", name: "SSO + Long Sessions", description: "OAuth SSO with 30-day sessions, no MFA by default", scores: { usability: 0.92, speed: 0.90, growth: 0.85, security: 0.55, risk: 0.55 } },
        { key: "adaptive-auth", name: "Adaptive Authentication", description: "Risk-based auth: stricter for sensitive actions, frictionless for routine", scores: { security: 0.85, usability: 0.82, risk: 0.80, growth: 0.75, speed: 0.70 } },
      ],
      constraints: getPlatformDefaultConstraints("security-vs-usability"),
      objectives: [
        { objective: "security", weight: 0.40, direction: "maximize", rationale: "User data protection is non-negotiable" },
        { objective: "usability", weight: 0.35, direction: "maximize", rationale: "Friction kills adoption" },
        { objective: "risk", weight: 0.15, direction: "minimize", rationale: "Breach risk must be minimised" },
        { objective: "growth", weight: 0.10, direction: "maximize", rationale: "Auth should not limit user acquisition" },
      ],
    },
  ];

  for (const scenario of platformScenarios) {
    try {
      await evaluateTradeoff(scenario);
    } catch (err) {
      logger.warn({ err, key: scenario.scenarioKey }, "ETI: platform scenario failed (ignored)");
    }
  }

  // Snapshot
  try {
    const registryRows = await db.select().from(tradeoffRegistry).limit(100);
    const totalEvaluations = registryRows.length;
    const highConf = registryRows.filter(r => (r.confidenceScore ?? 0) >= 0.75).length;
    const sensitive = registryRows.filter(r => r.sensitivityFlag).length;
    const avgConf = totalEvaluations > 0
      ? Math.round(registryRows.reduce((s, r) => s + (r.confidenceScore ?? 0), 0) / totalEvaluations * 1000) / 1000
      : 0;

    const typeCount: Record<string, number> = {};
    for (const r of registryRows) { typeCount[r.decisionType] = (typeCount[r.decisionType] ?? 0) + 1; }
    const topType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const frontierRows = await db.select().from(decisionFrontiers).limit(100);
    const avgFrontierSize = frontierRows.length > 0
      ? Math.round(frontierRows.reduce((s, r) => s + (r.frontierSize ?? 0), 0) / frontierRows.length * 10) / 10
      : 0;

    await db.insert(tradeoffSnapshots).values({
      totalEvaluations,
      frontierDecisions:       frontierRows.length,
      highConfidenceDecisions: highConf,
      sensitivitiesDetected:   sensitive,
      averageConfidenceScore:  avgConf,
      averageFrontierSize:     avgFrontierSize,
      mostCommonDecisionType:  topType,
      topConstraintType:       "budget",
      snapshotData: {
        timestamp: new Date().toISOString(),
        scenarios: registryRows.slice(0, 5).map(r => ({
          key: r.scenarioKey,
          recommendation: r.recommendedOption,
          confidence: r.confidenceScore,
        })),
      },
    });
  } catch (err) {
    logger.warn({ err }, "ETI: snapshot insert failed (ignored)");
  }

  logger.info("ETI: platform trade-off rebuild complete");
}

// ── EB summary builder ─────────────────────────────────────────────────────
export async function buildTradeoffIntelligenceSummary(): Promise<TradeoffIntelligenceSummary | null> {
  try {
    const [registryRows, latestSnapshot] = await Promise.all([
      db.select().from(tradeoffRegistry).orderBy(desc(tradeoffRegistry.lastEvaluatedAt)).limit(10),
      db.select().from(tradeoffSnapshots).orderBy(desc(tradeoffSnapshots.capturedAt)).limit(1),
    ]);

    if (registryRows.length === 0) return null;

    const snap = latestSnapshot[0];

    const recentRecommendations = registryRows.map(r => ({
      scenarioKey: r.scenarioKey,
      title:       r.title,
      recommended: r.recommendedOption,
      confidence:  r.confidenceScore ?? 0,
      sensitive:   r.sensitivityFlag ?? false,
    }));

    const executiveLawCount = registryRows.filter(r => r.executiveLawApplied).length;
    const executiveLawCompliance = registryRows.length > 0 ? executiveLawCount / registryRows.length : 1.0;

    return {
      totalEvaluations:        snap?.totalEvaluations        ?? registryRows.length,
      recentEvaluations:       registryRows.length,
      frontierDecisions:       snap?.frontierDecisions       ?? 0,
      highConfidenceDecisions: snap?.highConfidenceDecisions ?? 0,
      sensitivitiesDetected:   snap?.sensitivitiesDetected   ?? 0,
      averageConfidenceScore:  snap?.averageConfidenceScore  ?? 0,
      topDecisionType:         snap?.mostCommonDecisionType  ?? null,
      topConstraintType:       snap?.topConstraintType       ?? null,
      recentRecommendations,
      pendingDecisions:        [],
      executiveLawCompliance:  Math.round(executiveLawCompliance * 1000) / 1000,
    };
  } catch {
    return null;
  }
}
