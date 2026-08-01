// ── EPI Orchestrator ───────────────────────────────────────────────────────
// Two entry points:
//   1. evaluatePortfolio(request)  — runtime evaluation of a live portfolio
//   2. runPortfolioPlatformRebuild() — seeds platform-level portfolios for EB context
// All stages fail-open.

import { db } from "@workspace/db";
import {
  executivePortfolios,
  portfolioInitiatives,
  portfolioAllocations,
  portfolioExposures,
  portfolioCapacity,
  portfolioRecommendations,
  portfolioRegistry,
  portfolioSnapshots,
  portfolioHistory,
} from "@workspace/db/schema";
import pino from "pino";
import { desc, eq } from "drizzle-orm";
import { constructPortfolio } from "./epi-construction-engine";
import { computeAllAllocations, isPortfolioOvercommitted, computeAllocationHealthScore } from "./epi-allocation-engine";
import { computePortfolioBalance } from "./epi-balance-engine";
import { detectAllExposures, computeCompositeExposureScore } from "./epi-exposure-engine";
import { computePortfolioCapacity } from "./epi-capacity-engine";
import { buildPortfolioRecommendations } from "./epi-recommendation-engine";
import type {
  PortfolioEvaluationRequest,
  PortfolioEvaluationResult,
  PortfolioIntelligenceSummary,
  PortfolioHealthScores,
} from "./types";

const logger = pino({ name: "epi-orchestrator" });

// ── Runtime portfolio evaluation ───────────────────────────────────────────
export async function evaluatePortfolio(
  request: PortfolioEvaluationRequest,
): Promise<PortfolioEvaluationResult> {
  logger.info({ portfolioKey: request.portfolioKey }, "EPI: evaluating portfolio");

  // Phase 1: Construction
  const totalResources = request.totalResources;
  const allocations = computeAllAllocations(request.initiatives, totalResources);
  const overcommitted = isPortfolioOvercommitted(allocations);
  const constructed = constructPortfolio(request.initiatives, overcommitted);
  const criticalPath = constructed.filter(i => i.isCriticalPath).map(i => i.key);

  // Phase 2: Balance
  const balance = computePortfolioBalance(request.initiatives);

  // Phase 3: Exposures
  const exposures = detectAllExposures(request.initiatives);
  const compositeExposure = computeCompositeExposureScore(exposures);

  // Phase 4: Capacity
  const capacity = computePortfolioCapacity(request.initiatives, totalResources, allocations);

  // Phase 5: Health scores
  const allocationScore = computeAllocationHealthScore(allocations);
  const exposureHealthScore = Math.max(0, 1 - compositeExposure); // higher exposure = lower health
  const healthScore = Math.round(
    (balance.overallBalance + allocationScore + capacity.capacityScore + exposureHealthScore) / 4 * 1000
  ) / 1000;
  const overallScore = Math.round(
    (healthScore * 0.35 + balance.overallBalance * 0.30 + capacity.capacityScore * 0.20 + exposureHealthScore * 0.15) * 1000
  ) / 1000;

  const health: PortfolioHealthScores = {
    healthScore:   Math.round(healthScore * 1000) / 1000,
    balanceScore:  balance.overallBalance,
    capacityScore: capacity.capacityScore,
    exposureScore: exposureHealthScore,
    overallScore,
  };

  // Phase 6: Recommendations (Portfolio Optimization Law applied)
  const recommendations = buildPortfolioRecommendations(balance, capacity, exposures, allocations, request.initiatives);

  // ── Persist to DB ─────────────────────────────────────────────────────────
  let portfolioId = 0;
  try {
    const [row] = await db.insert(executivePortfolios).values({
      portfolioKey:      request.portfolioKey,
      title:             request.title,
      description:       request.description,
      portfolioDomain:   request.domain,
      initiativeCount:   request.initiatives.length,
      activeInitiatives: request.initiatives.filter(i => i.status === "active").length,
      totalBudgetUnits:  totalResources.budget,
      totalPeopleUnits:  totalResources.people,
      healthScore:       health.healthScore,
      balanceScore:      health.balanceScore,
      capacityScore:     health.capacityScore,
      exposureScore:     health.exposureScore,
      overallScore:      health.overallScore,
      triggeredBy:       request.userId ? "user" : "platform",
      userId:            request.userId ?? null,
      capturedAt:        new Date(),
    }).returning({ id: executivePortfolios.id });
    portfolioId = row?.id ?? 0;
  } catch (err) {
    logger.warn({ err }, "EPI: portfolio insert failed (ignored)");
  }

  if (portfolioId > 0) {
    // Persist initiatives
    for (const init of constructed) {
      try {
        await db.insert(portfolioInitiatives).values({
          portfolioId,
          initiativeKey:      init.key,
          title:              init.title,
          description:        init.description,
          initiativeType:     init.type,
          strategicTheme:     init.theme,
          investmentBucket:   init.investmentBucket,
          status:             init.status,
          riskLevel:          init.riskLevel,
          horizon:            init.horizon,
          strategicAlignment: init.strategicAlignment,
          resourceDemand:     init.resourceDemand,
          dependencies:       init.dependencies ?? [],
          dependencyCount:    init.dependencyCount,
          isCriticalPath:     init.isCriticalPath,
          isOnParetoCut:      init.isOnParetoCut,
          capturedAt:         new Date(),
        });
      } catch (err) {
        logger.warn({ err, key: init.key }, "EPI: initiative insert failed (ignored)");
      }
    }

    // Persist allocations
    for (const alloc of allocations) {
      try {
        await db.insert(portfolioAllocations).values({
          portfolioId,
          resourceType:      alloc.resourceType,
          totalAvailable:    alloc.totalAvailable,
          totalAllocated:    alloc.totalAllocated,
          utilizationRate:   alloc.utilizationRate,
          overcommitted:     alloc.overcommitted,
          overcommitDelta:   alloc.overcommitDelta,
          bucketsBreakdown:  alloc.bucketsBreakdown,
          topConsumers:      alloc.topConsumers,
          allocationScore:   alloc.allocationScore,
          capturedAt:        new Date(),
        });
      } catch (err) {
        logger.warn({ err, resource: alloc.resourceType }, "EPI: allocation insert failed (ignored)");
      }
    }

    // Persist exposures
    for (const exp of exposures) {
      try {
        await db.insert(portfolioExposures).values({
          portfolioId,
          exposureType:        exp.exposureType,
          severity:            exp.severity,
          affectedInitiatives: exp.affectedInitiatives,
          affectedCount:       exp.affectedInitiatives.length,
          concentrationRatio:  exp.concentrationRatio,
          description:         exp.description,
          mitigation:          exp.mitigation,
          exposureScore:       exp.exposureScore,
          capturedAt:          new Date(),
        });
      } catch (err) {
        logger.warn({ err }, "EPI: exposure insert failed (ignored)");
      }
    }

    // Persist capacity
    try {
      await db.insert(portfolioCapacity).values({
        portfolioId,
        currentUtilization:  capacity.currentUtilization,
        availableCapacity:   capacity.availableCapacity,
        growthCapacity:      capacity.growthCapacity,
        constraintPressure:  capacity.constraintPressure,
        expansionReadiness:  capacity.expansionReadiness,
        mostConstrainedResource: capacity.mostConstrainedResource ?? null,
        resourceBreakdown:   capacity.resourceBreakdown,
        overcommittedResources: capacity.overcommittedResources,
        capacityScore:       capacity.capacityScore,
        capturedAt:          new Date(),
      });
    } catch (err) {
      logger.warn({ err }, "EPI: capacity insert failed (ignored)");
    }

    // Persist recommendations
    for (const rec of recommendations) {
      try {
        await db.insert(portfolioRecommendations).values({
          portfolioId,
          recommendationType:  rec.type,
          priority:            rec.priority,
          targetInitiative:    rec.targetInitiative ?? null,
          title:               rec.title,
          rationale:           rec.rationale,
          evidence:            rec.evidence,
          expectedImpact:      rec.expectedImpact,
          riskIfIgnored:       rec.riskIfIgnored,
          alternativeAction:   rec.alternativeAction ?? null,
          confidenceScore:     rec.confidenceScore,
          portfolioLawApplied: true,
          capturedAt:          new Date(),
        });
      } catch (err) {
        logger.warn({ err }, "EPI: recommendation insert failed (ignored)");
      }
    }

    // Upsert registry
    try {
      const topRec = recommendations[0];
      await db.insert(portfolioRegistry).values({
        portfolioKey:        request.portfolioKey,
        title:               request.title,
        portfolioDomain:     request.domain,
        overallScore:        health.overallScore,
        healthScore:         health.healthScore,
        balanceScore:        health.balanceScore,
        capacityScore:       health.capacityScore,
        exposureScore:       health.exposureScore,
        initiativeCount:     request.initiatives.length,
        overcommitted,
        criticalExposures:   exposures.filter(e => e.severity === "critical").length,
        topRecommendation:   topRec?.title ?? null,
        portfolioLawApplied: true,
        lastEvaluatedAt:     new Date(),
      }).onConflictDoUpdate({
        target: portfolioRegistry.portfolioKey,
        set: {
          title:               request.title,
          portfolioDomain:     request.domain,
          overallScore:        health.overallScore,
          healthScore:         health.healthScore,
          balanceScore:        health.balanceScore,
          capacityScore:       health.capacityScore,
          exposureScore:       health.exposureScore,
          initiativeCount:     request.initiatives.length,
          overcommitted,
          criticalExposures:   exposures.filter(e => e.severity === "critical").length,
          topRecommendation:   recommendations[0]?.title ?? null,
          portfolioLawApplied: true,
          lastEvaluatedAt:     new Date(),
        },
      });
    } catch (err) {
      logger.warn({ err }, "EPI: registry upsert failed (ignored)");
    }

    // Immutable history entry
    try {
      await db.insert(portfolioHistory).values({
        portfolioKey:          request.portfolioKey,
        portfolioId,
        evaluatedAt:           new Date(),
        overallScore:          health.overallScore,
        healthScore:           health.healthScore,
        balanceScore:          health.balanceScore,
        capacityScore:         health.capacityScore,
        exposureScore:         health.exposureScore,
        initiativeCount:       request.initiatives.length,
        recommendationCount:   recommendations.length,
        topRecommendationType: recommendations[0]?.type ?? null,
        changeSummary: `Evaluated ${request.initiatives.length} initiatives. Score: ${(health.overallScore * 100).toFixed(0)}%. ${recommendations.length} recommendation(s). ${overcommitted ? "OVERCOMMITTED." : "Capacity healthy."}`,
        snapshotData: {
          timestamp: new Date().toISOString(),
          balance:   health.balanceScore,
          capacity:  health.capacityScore,
          exposures: exposures.length,
        },
      });
    } catch (err) {
      logger.warn({ err }, "EPI: history insert failed (ignored)");
    }
  }

  return {
    portfolioId,
    portfolioKey: request.portfolioKey,
    health,
    allocations,
    balance,
    exposures,
    capacity,
    recommendations,
    initiativeCount: request.initiatives.length,
    criticalPath,
  };
}

// ── Platform rebuild ───────────────────────────────────────────────────────
export async function runPortfolioPlatformRebuild(triggeredBy: string = "scheduled"): Promise<void> {
  logger.info({ triggeredBy }, "EPI: platform portfolio rebuild started");

  const platformPortfolios: PortfolioEvaluationRequest[] = [
    {
      portfolioKey: "platform-ash-core",
      title: "ASH Core Platform Portfolio",
      description: "Core cognitive infrastructure: Executive Brain, Orchestration, Memory, Knowledge",
      domain: "technology",
      totalResources: { budget: 1.0, people: 1.0, infrastructure: 1.0, compute: 1.0, time: 1.0, attention: 1.0 },
      initiatives: [
        { key: "executive-brain", title: "Executive Brain v2", description: "Multi-phase cognitive reasoning", type: "technology", theme: "innovation", investmentBucket: "innovate", status: "active", riskLevel: "medium", horizon: "long", strategicAlignment: 0.95, resourceDemand: { budget: 0.35, people: 0.40, infrastructure: 0.30, compute: 0.45, time: 0.40, attention: 0.50 } },
        { key: "cognitive-memory", title: "Cognitive Memory Architecture", description: "L1/L2 dual-layer memory", type: "technology", theme: "stability", investmentBucket: "infrastructure", status: "active", riskLevel: "low", horizon: "medium", strategicAlignment: 0.85, resourceDemand: { budget: 0.15, people: 0.20, infrastructure: 0.25, compute: 0.20, time: 0.20, attention: 0.15 } },
        { key: "ash-orchestrator", title: "ASH Cognitive Orchestrator", description: "Multi-brain orchestration engine", type: "technology", theme: "innovation", investmentBucket: "innovate", status: "active", riskLevel: "medium", horizon: "long", strategicAlignment: 0.90, resourceDemand: { budget: 0.25, people: 0.25, infrastructure: 0.20, compute: 0.30, time: 0.25, attention: 0.30 } },
        { key: "knowledge-graph", title: "Cognitive Knowledge Graph", description: "Typed directed-edge knowledge relationships", type: "technology", theme: "growth", investmentBucket: "grow", status: "active", riskLevel: "low", horizon: "medium", strategicAlignment: 0.80, resourceDemand: { budget: 0.10, people: 0.15, infrastructure: 0.20, compute: 0.15, time: 0.15, attention: 0.20 } },
        { key: "research-engine", title: "Research & Knowledge Engine", description: "Knowledge-first search and retrieval", type: "technology", theme: "innovation", investmentBucket: "innovate", status: "active", riskLevel: "low", horizon: "short", strategicAlignment: 0.78, resourceDemand: { budget: 0.10, people: 0.10, infrastructure: 0.10, compute: 0.20, time: 0.10, attention: 0.15 } },
        { key: "validation-engine", title: "Validation Engine", description: "Rule-based validation framework", type: "technology", theme: "stability", investmentBucket: "maintain", status: "active", riskLevel: "low", horizon: "short", strategicAlignment: 0.70, resourceDemand: { budget: 0.05, people: 0.10, infrastructure: 0.05, compute: 0.05, time: 0.10, attention: 0.10 } },
      ],
    },
    {
      portfolioKey: "platform-intelligence-engines",
      title: "Business Intelligence Portfolio",
      description: "Business analysis, opportunity discovery, decision intelligence, strategy engines",
      domain: "business",
      totalResources: { budget: 1.0, people: 1.0, infrastructure: 1.0, compute: 1.0, time: 1.0, attention: 1.0 },
      initiatives: [
        { key: "business-analysis", title: "Business Analysis Engine", description: "Descriptive business graph analysis", type: "business", theme: "efficiency", investmentBucket: "maintain", status: "active", riskLevel: "low", horizon: "medium", strategicAlignment: 0.85, resourceDemand: { budget: 0.20, people: 0.20, infrastructure: 0.15, compute: 0.20, time: 0.20, attention: 0.15 } },
        { key: "opportunity-discovery", title: "Opportunity Discovery Engine", description: "6-source opportunity detection", type: "business", theme: "growth", investmentBucket: "grow", status: "active", riskLevel: "medium", horizon: "medium", strategicAlignment: 0.90, resourceDemand: { budget: 0.25, people: 0.25, infrastructure: 0.20, compute: 0.30, time: 0.25, attention: 0.30 } },
        { key: "decision-intelligence", title: "Decision Intelligence Engine", description: "First layer authorized to make decisions", type: "strategic", theme: "innovation", investmentBucket: "innovate", status: "active", riskLevel: "high", horizon: "long", strategicAlignment: 0.92, resourceDemand: { budget: 0.30, people: 0.30, infrastructure: 0.25, compute: 0.30, time: 0.30, attention: 0.35 } },
        { key: "executive-strategy", title: "Executive Strategy Engine", description: "Direction and alignment engine", type: "strategic", theme: "transformation", investmentBucket: "innovate", status: "active", riskLevel: "medium", horizon: "long", strategicAlignment: 0.95, resourceDemand: { budget: 0.20, people: 0.20, infrastructure: 0.15, compute: 0.15, time: 0.20, attention: 0.20 } },
        { key: "tradeoff-intelligence", title: "Trade-off Intelligence Engine", description: "Multi-objective decision evaluation", type: "business", theme: "efficiency", investmentBucket: "innovate", status: "active", riskLevel: "low", horizon: "medium", strategicAlignment: 0.88, resourceDemand: { budget: 0.10, people: 0.15, infrastructure: 0.10, compute: 0.15, time: 0.15, attention: 0.15 }, dependencies: ["decision-intelligence"] },
      ],
    },
    {
      portfolioKey: "platform-execution-engines",
      title: "Execution & Planning Portfolio",
      description: "Strategic planning, capability planning, execution orchestration, operational planning",
      domain: "execution",
      totalResources: { budget: 1.0, people: 1.0, infrastructure: 1.0, compute: 1.0, time: 1.0, attention: 1.0 },
      initiatives: [
        { key: "strategic-planning", title: "Strategic Planning Engine", description: "Programme/initiative/milestone organisation", type: "strategic", theme: "transformation", investmentBucket: "innovate", status: "active", riskLevel: "medium", horizon: "long", strategicAlignment: 0.90, resourceDemand: { budget: 0.20, people: 0.25, infrastructure: 0.15, compute: 0.15, time: 0.25, attention: 0.25 } },
        { key: "capability-planning", title: "Capability Planning Engine", description: "16-domain capability requirements", type: "execution", theme: "growth", investmentBucket: "grow", status: "active", riskLevel: "low", horizon: "medium", strategicAlignment: 0.82, resourceDemand: { budget: 0.15, people: 0.20, infrastructure: 0.10, compute: 0.10, time: 0.20, attention: 0.15 } },
        { key: "execution-orchestration", title: "Execution Orchestration Engine", description: "7 owner types, 5 execution classes", type: "execution", theme: "efficiency", investmentBucket: "innovate", status: "active", riskLevel: "high", horizon: "long", strategicAlignment: 0.88, resourceDemand: { budget: 0.25, people: 0.25, infrastructure: 0.25, compute: 0.25, time: 0.25, attention: 0.25 }, dependencies: ["strategic-planning", "capability-planning"] },
        { key: "authority-resolution", title: "Authority Resolution Engine", description: "8 authority types, fail-safe posture", type: "execution", theme: "compliance", investmentBucket: "maintain", status: "active", riskLevel: "medium", horizon: "medium", strategicAlignment: 0.85, resourceDemand: { budget: 0.10, people: 0.15, infrastructure: 0.10, compute: 0.10, time: 0.15, attention: 0.15 }, dependencies: ["execution-orchestration"] },
        { key: "workflow-execution", title: "Workflow Execution Engine", description: "6 phases, checkpoint-based execution", type: "execution", theme: "efficiency", investmentBucket: "innovate", status: "active", riskLevel: "high", horizon: "long", strategicAlignment: 0.87, resourceDemand: { budget: 0.20, people: 0.20, infrastructure: 0.20, compute: 0.25, time: 0.20, attention: 0.20 }, dependencies: ["execution-orchestration"] },
        { key: "portfolio-intelligence", title: "Portfolio Intelligence Engine", description: "Portfolio optimization and balance", type: "strategic", theme: "innovation", investmentBucket: "innovate", status: "active", riskLevel: "low", horizon: "medium", strategicAlignment: 0.91, resourceDemand: { budget: 0.10, people: 0.10, infrastructure: 0.08, compute: 0.10, time: 0.10, attention: 0.15 } },
      ],
    },
    {
      portfolioKey: "platform-technology-intelligence",
      title: "Technology Intelligence Portfolio",
      description: "Global tech, relationships, evolution, systems dynamics, infrastructure intelligence",
      domain: "technology",
      totalResources: { budget: 1.0, people: 1.0, infrastructure: 1.0, compute: 1.0, time: 1.0, attention: 1.0 },
      initiatives: [
        { key: "global-technology", title: "Global Technology Intelligence", description: "54-technology catalog, 12 providers", type: "technology", theme: "innovation", investmentBucket: "grow", status: "active", riskLevel: "low", horizon: "long", strategicAlignment: 0.80, resourceDemand: { budget: 0.20, people: 0.20, infrastructure: 0.20, compute: 0.20, time: 0.20, attention: 0.15 } },
        { key: "tech-relationships", title: "Technology Relationship Engine", description: "21 relationship types, graph analysis", type: "technology", theme: "growth", investmentBucket: "grow", status: "active", riskLevel: "low", horizon: "medium", strategicAlignment: 0.82, resourceDemand: { budget: 0.15, people: 0.15, infrastructure: 0.15, compute: 0.20, time: 0.15, attention: 0.15 } },
        { key: "tech-evolution", title: "Technology Evolution Engine", description: "Lifecycle, trends, velocity, adoption", type: "technology", theme: "innovation", investmentBucket: "innovate", status: "active", riskLevel: "medium", horizon: "long", strategicAlignment: 0.85, resourceDemand: { budget: 0.20, people: 0.20, infrastructure: 0.15, compute: 0.25, time: 0.20, attention: 0.20 } },
        { key: "systems-dynamics", title: "Systems Dynamics Engine", description: "8 systems, feedback loops, resilience", type: "infrastructure", theme: "stability", investmentBucket: "infrastructure", status: "active", riskLevel: "low", horizon: "long", strategicAlignment: 0.83, resourceDemand: { budget: 0.20, people: 0.20, infrastructure: 0.25, compute: 0.20, time: 0.20, attention: 0.20 } },
        { key: "platform-infrastructure", title: "Platform Infrastructure Intelligence", description: "16 resource types, heuristic baseline", type: "infrastructure", theme: "maintenance", investmentBucket: "maintain", status: "active", riskLevel: "low", horizon: "medium", strategicAlignment: 0.75, resourceDemand: { budget: 0.15, people: 0.15, infrastructure: 0.20, compute: 0.10, time: 0.15, attention: 0.15 } },
        { key: "adapter-framework", title: "Universal Execution Adapter Framework", description: "39 first-class adapter types, 5 builtins", type: "infrastructure", theme: "efficiency", investmentBucket: "infrastructure", status: "active", riskLevel: "medium", horizon: "long", strategicAlignment: 0.80, resourceDemand: { budget: 0.10, people: 0.10, infrastructure: 0.05, compute: 0.05, time: 0.10, attention: 0.15 } },
      ],
    },
  ];

  for (const portfolio of platformPortfolios) {
    try {
      await evaluatePortfolio(portfolio);
    } catch (err) {
      logger.warn({ err, key: portfolio.portfolioKey }, "EPI: platform portfolio failed (ignored)");
    }
  }

  // Platform snapshot
  try {
    const registryRows = await db.select().from(portfolioRegistry).limit(100);
    const totalPortfolios = registryRows.length;
    const totalInitiatives = registryRows.reduce((s, r) => s + (r.initiativeCount ?? 0), 0);
    const avgHealth = totalPortfolios > 0 ? registryRows.reduce((s, r) => s + (r.healthScore ?? 0), 0) / totalPortfolios : 0;
    const avgBalance = totalPortfolios > 0 ? registryRows.reduce((s, r) => s + (r.balanceScore ?? 0), 0) / totalPortfolios : 0;
    const overcommitted = registryRows.filter(r => r.overcommitted).length;
    const criticalExposures = registryRows.reduce((s, r) => s + (r.criticalExposures ?? 0), 0);

    const recRows = await db.select().from(portfolioRecommendations).limit(200);
    const highPriorityRecs = recRows.filter(r => r.priority === "critical" || r.priority === "high").length;

    await db.insert(portfolioSnapshots).values({
      capturedAt:          new Date(),
      totalPortfolios,
      totalInitiatives,
      averageHealthScore:  Math.round(avgHealth  * 1000) / 1000,
      averageBalanceScore: Math.round(avgBalance * 1000) / 1000,
      overcommittedCount:  overcommitted,
      criticalExposures,
      highPriorityRecs,
      topRisk:        criticalExposures > 0 ? "Critical exposure detected across portfolio" : null,
      topOpportunity: avgBalance > 0.70 ? "Portfolio is well-balanced — consider expansion" : "Portfolio rebalancing will unlock strategic capacity",
      snapshotData: {
        timestamp: new Date().toISOString(),
        portfolios: registryRows.slice(0, 5).map(r => ({
          key: r.portfolioKey, score: r.overallScore, overcommitted: r.overcommitted
        })),
      },
    });
  } catch (err) {
    logger.warn({ err }, "EPI: snapshot insert failed (ignored)");
  }

  logger.info("EPI: platform portfolio rebuild complete");
}

// ── EB summary builder ─────────────────────────────────────────────────────
export async function buildPortfolioIntelligenceSummary(): Promise<PortfolioIntelligenceSummary | null> {
  try {
    const [registryRows, latestSnapshot] = await Promise.all([
      db.select().from(portfolioRegistry).orderBy(desc(portfolioRegistry.lastEvaluatedAt)).limit(10),
      db.select().from(portfolioSnapshots).orderBy(desc(portfolioSnapshots.capturedAt)).limit(1),
    ]);

    if (registryRows.length === 0) return null;

    const snap = latestSnapshot[0];
    const executiveLawCount = registryRows.filter(r => r.portfolioLawApplied).length;
    const portfolioLawCompliance = registryRows.length > 0 ? executiveLawCount / registryRows.length : 1.0;

    return {
      totalPortfolios:         snap?.totalPortfolios         ?? registryRows.length,
      totalInitiatives:        snap?.totalInitiatives        ?? 0,
      averageHealthScore:      snap?.averageHealthScore       ?? 0,
      averageBalanceScore:     snap?.averageBalanceScore      ?? 0,
      overcommittedPortfolios: snap?.overcommittedCount       ?? 0,
      criticalExposures:       snap?.criticalExposures        ?? 0,
      highPriorityRecs:        snap?.highPriorityRecs         ?? 0,
      topRisk:                 snap?.topRisk                  ?? null,
      topOpportunity:          snap?.topOpportunity           ?? null,
      portfolioLawCompliance:  Math.round(portfolioLawCompliance * 1000) / 1000,
      portfolioSummaries: registryRows.map(r => ({
        portfolioKey:      r.portfolioKey,
        title:             r.title,
        overallScore:      r.overallScore ?? 0,
        overcommitted:     r.overcommitted ?? false,
        topRecommendation: r.topRecommendation ?? null,
      })),
    };
  } catch {
    return null;
  }
}
