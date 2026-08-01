// ── TEI Orchestrator ────────────────────────────────────────────────────────
// Coordinates the full Technology Evolution Intelligence rebuild pipeline.
// 6 stages: lifecycle → trends → velocity → adoption → outlook → recommendations
// All stages fail-open. Snapshot + registry written last.

import { db } from "@workspace/db";
import {
  technologyLifecycle,
  technologyTrends,
  technologyVelocity,
  technologyAdoption,
  technologyOutlook,
  technologyEvolutionRegistry,
  technologyEvolutionSnapshots,
  technologyRecommendationsHistory,
  technologyChangeEvents,
} from "@workspace/db/schema";
import pino from "pino";
import { getLifecycleCatalog, computeOverallMaturity, getDeprecationCandidates, getEmergingTechnologies } from "./tei-lifecycle-engine";
import { getTrendCatalog, getTrendLeaders } from "./tei-trend-engine";
import { getVelocityCatalog, computeVelocityScore } from "./tei-velocity-engine";
import { getAdoptionCatalog, computeCompositeAdoptionScore } from "./tei-adoption-engine";
import { getOutlookCatalog, getUpgradePriorities, getCriticalRiskTechnologies } from "./tei-outlook-engine";
import { generateAllEvolutionRecommendations } from "./tei-recommendation-engine";
import type { TechnologyEvolutionSummary } from "./types";

const logger = pino({ name: "tei-orchestrator" });

export async function runEvolutionRebuild(triggeredBy: string = "manual"): Promise<void> {
  logger.info({ triggeredBy }, "TEI: evolution rebuild started");

  try {
    // 1. Load all catalogs (pure computation, no I/O)
    const lifecycles   = getLifecycleCatalog();
    const trends       = getTrendCatalog();
    const velocities   = getVelocityCatalog();
    const adoptions    = getAdoptionCatalog();
    const outlooks     = getOutlookCatalog();
    const recommendations = generateAllEvolutionRecommendations(lifecycles, trends, outlooks, adoptions);

    // Build maps for registry upsert
    const trendMap    = new Map(trends.map(t => [t.technologyKey, t]));
    const velocityMap = new Map(velocities.map(v => [v.technologyKey, v]));
    const adoptionMap = new Map(adoptions.map(a => [a.technologyKey, a]));
    const outlookMap  = new Map(outlooks.map(o => [o.technologyKey, o]));

    // 2. Persist lifecycle records (upsert)
    for (const lc of lifecycles) {
      try {
        await db.insert(technologyLifecycle).values({
          technologyKey:       lc.technologyKey,
          lifecycleStage:      lc.lifecycleStage,
          maturityScore:       lc.maturityScore,
          stabilityScore:      lc.stabilityScore,
          longevityScore:      lc.longevityScore,
          supportStatus:       lc.supportStatus,
          latestMajorVersion:  lc.latestMajorVersion ?? null,
          releaseYear:         lc.releaseYear ?? null,
          lastMajorReleaseYear:lc.lastMajorReleaseYear ?? null,
          expectedEolYear:     lc.expectedEolYear ?? null,
          lifecycleNotes:      lc.lifecycleNotes ?? null,
          updatedAt:           new Date(),
        }).onConflictDoUpdate({
          target: technologyLifecycle.technologyKey,
          set: {
            lifecycleStage:      lc.lifecycleStage,
            maturityScore:       lc.maturityScore,
            stabilityScore:      lc.stabilityScore,
            longevityScore:      lc.longevityScore,
            supportStatus:       lc.supportStatus,
            latestMajorVersion:  lc.latestMajorVersion ?? null,
            lastMajorReleaseYear:lc.lastMajorReleaseYear ?? null,
            expectedEolYear:     lc.expectedEolYear ?? null,
            lifecycleNotes:      lc.lifecycleNotes ?? null,
            updatedAt:           new Date(),
          },
        });
      } catch (err) {
        logger.warn({ err, key: lc.technologyKey }, "TEI: lifecycle upsert failed (ignored)");
      }
    }

    // 3. Persist trend records (append-only)
    for (const trend of trends) {
      try {
        await db.insert(technologyTrends).values({
          technologyKey:           trend.technologyKey,
          trendDirection:          trend.trendDirection,
          adoptionVelocity:        trend.adoptionVelocity,
          marketMomentum:          trend.marketMomentum,
          communityGrowthRate:     trend.communityGrowthRate,
          enterpriseInterestScore: trend.enterpriseInterestScore,
          jobMarketTrend:          trend.jobMarketTrend,
          githubStarsTrend:        trend.githubStarsTrend ?? null,
          trendNotes:              trend.trendNotes ?? null,
        });
      } catch (err) {
        logger.warn({ err, key: trend.technologyKey }, "TEI: trend insert failed (ignored)");
      }
    }

    // 4. Persist velocity records (append-only)
    for (const vel of velocities) {
      try {
        const velocityScore = computeVelocityScore(vel);
        await db.insert(technologyVelocity).values({
          technologyKey:                vel.technologyKey,
          releaseFrequency:             vel.releaseFrequency,
          releasesPerYear:              vel.releasesPerYear ?? null,
          breakingChangeFrequency:      vel.breakingChangeFrequency,
          maintenanceActivity:          vel.maintenanceActivity,
          issueResolutionSpeed:         vel.issueResolutionSpeed,
          backwardsCompatibilityScore:  vel.backwardsCompatibilityScore,
          operationalStabilityScore:    vel.operationalStabilityScore,
          velocityScore,
          velocityNotes:                vel.velocityNotes ?? null,
        });
      } catch (err) {
        logger.warn({ err, key: vel.technologyKey }, "TEI: velocity insert failed (ignored)");
      }
    }

    // 5. Persist adoption records (append-only)
    for (const adp of adoptions) {
      try {
        const compositeAdoptionScore = computeCompositeAdoptionScore(adp);
        await db.insert(technologyAdoption).values({
          technologyKey:            adp.technologyKey,
          enterpriseAdoptionScore:  adp.enterpriseAdoptionScore,
          developerAdoptionScore:   adp.developerAdoptionScore,
          communityMaturityScore:   adp.communityMaturityScore,
          industryAcceptanceScore:  adp.industryAcceptanceScore,
          adoptionStage:            adp.adoptionStage,
          fortune500Presence:       adp.fortune500Presence,
          openSourceHealth:         adp.openSourceHealth ?? null,
          ecosystemSize:            adp.ecosystemSize,
          compositeAdoptionScore,
          adoptionNotes:            adp.adoptionNotes ?? null,
        });
      } catch (err) {
        logger.warn({ err, key: adp.technologyKey }, "TEI: adoption insert failed (ignored)");
      }
    }

    // 6. Persist outlook records (append-only)
    for (const outlook of outlooks) {
      try {
        await db.insert(technologyOutlook).values({
          technologyKey:              outlook.technologyKey,
          expectedLongevityYears:     outlook.expectedLongevityYears ?? null,
          replacementLikelihood:      outlook.replacementLikelihood,
          replacementTimeframe:       outlook.replacementTimeframe ?? null,
          upgradeUrgency:             outlook.upgradeUrgency,
          futureCompatibilityScore:   outlook.futureCompatibilityScore,
          technologyConfidenceScore:  outlook.technologyConfidenceScore,
          strategicRelevance:         outlook.strategicRelevance,
          riskLevel:                  outlook.riskLevel,
          obsolescenceRisk:           outlook.obsolescenceRisk,
          innovationPotential:        outlook.innovationPotential,
          outlookNotes:               outlook.outlookNotes ?? null,
        });
      } catch (err) {
        logger.warn({ err, key: outlook.technologyKey }, "TEI: outlook insert failed (ignored)");
      }
    }

    // 7. Persist recommendations (append-only history)
    for (const rec of recommendations) {
      try {
        await db.insert(technologyRecommendationsHistory).values({
          technologyKey:      rec.technologyKey,
          recommendationType: rec.recommendationType,
          priority:           rec.priority,
          title:              rec.title,
          description:        rec.description,
          lifecycleEvidence:  rec.lifecycleEvidence,
          trendEvidence:      rec.trendEvidence,
          businessImpact:     rec.businessImpact,
          migrationUrgency:   rec.migrationUrgency,
          operationalImpact:  rec.operationalImpact,
          confidence:         rec.confidence,
          alternatives:       rec.alternatives,
          isActive:           true,
        });
      } catch (err) {
        logger.warn({ err, key: rec.technologyKey }, "TEI: recommendation insert failed (ignored)");
      }
    }

    // 8. Registry upsert — one row per technology
    const allTechKeys = new Set(lifecycles.map(lc => lc.technologyKey));
    for (const key of allTechKeys) {
      const lc      = lifecycles.find(x => x.technologyKey === key);
      const trend   = trendMap.get(key);
      const vel     = velocityMap.get(key);
      const adp     = adoptionMap.get(key);
      const outlook = outlookMap.get(key);

      if (!lc || !trend || !adp || !outlook) continue;

      try {
        const velocityScore = vel ? computeVelocityScore(vel) : 0.50;
        const adoptionScore = computeCompositeAdoptionScore(adp);
        const overallScore  = Math.round((
          lc.maturityScore         * 0.20 +
          lc.stabilityScore        * 0.20 +
          adoptionScore            * 0.20 +
          velocityScore            * 0.15 +
          outlook.technologyConfidenceScore * 0.15 +
          (1 - outlook.obsolescenceRisk)   * 0.10
        ) * 1000) / 1000;

        await db.insert(technologyEvolutionRegistry).values({
          technologyKey:           key,
          lifecycleStage:          lc.lifecycleStage,
          trendDirection:          trend.trendDirection,
          maturityScore:           lc.maturityScore,
          stabilityScore:          lc.stabilityScore,
          adoptionScore,
          velocityScore,
          confidenceScore:         outlook.technologyConfidenceScore,
          obsolescenceRisk:        outlook.obsolescenceRisk,
          upgradeUrgency:          outlook.upgradeUrgency,
          replacementLikelihood:   outlook.replacementLikelihood,
          strategicRelevance:      outlook.strategicRelevance,
          overallEvolutionScore:   overallScore,
          lastRebuiltAt:           new Date(),
        }).onConflictDoUpdate({
          target: technologyEvolutionRegistry.technologyKey,
          set: {
            lifecycleStage:          lc.lifecycleStage,
            trendDirection:          trend.trendDirection,
            maturityScore:           lc.maturityScore,
            stabilityScore:          lc.stabilityScore,
            adoptionScore,
            velocityScore,
            confidenceScore:         outlook.technologyConfidenceScore,
            obsolescenceRisk:        outlook.obsolescenceRisk,
            upgradeUrgency:          outlook.upgradeUrgency,
            replacementLikelihood:   outlook.replacementLikelihood,
            strategicRelevance:      outlook.strategicRelevance,
            overallEvolutionScore:   overallScore,
            lastRebuiltAt:           new Date(),
          },
        });
      } catch (err) {
        logger.warn({ err, key }, "TEI: registry upsert failed (ignored)");
      }
    }

    // 9. Snapshot
    try {
      const deprecationAlerts  = getDeprecationCandidates(lifecycles).length;
      const emergingCount      = getEmergingTechnologies(lifecycles).length;
      const stableCount        = lifecycles.filter(lc => lc.lifecycleStage === "established" || lc.lifecycleStage === "mature").length;
      const upgradePriorCount  = getUpgradePriorities(outlooks).length;
      const avgMaturity        = Math.round(lifecycles.reduce((s, lc) => s + lc.maturityScore, 0) / lifecycles.length * 1000) / 1000;
      const avgStability       = Math.round(lifecycles.reduce((s, lc) => s + lc.stabilityScore, 0) / lifecycles.length * 1000) / 1000;
      const avgAdoption        = Math.round(adoptions.reduce((s, a) => s + computeCompositeAdoptionScore(a), 0) / adoptions.length * 1000) / 1000;
      const avgConfidence      = Math.round(outlooks.reduce((s, o) => s + o.technologyConfidenceScore, 0) / outlooks.length * 1000) / 1000;
      const platformScore      = Math.round((avgMaturity + avgStability + avgAdoption + avgConfidence) / 4 * 1000) / 1000;

      await db.insert(technologyEvolutionSnapshots).values({
        totalTechnologies:    lifecycles.length,
        deprecationAlerts,
        emergingTechnologies: emergingCount,
        stableTechnologies:   stableCount,
        upgradePriorities:    upgradePriorCount,
        averageMaturityScore: avgMaturity,
        averageStabilityScore:avgStability,
        averageAdoptionScore: avgAdoption,
        averageConfidenceScore:avgConfidence,
        platformEvolutionScore:platformScore,
        snapshotData: {
          trendLeaders:    getTrendLeaders(trends).slice(0, 5),
          criticalRisks:   getCriticalRiskTechnologies(outlooks).slice(0, 5),
          deprecationCandidates: getDeprecationCandidates(lifecycles),
          timestamp:       new Date().toISOString(),
        },
      });
    } catch (err) {
      logger.warn({ err }, "TEI: snapshot insert failed (ignored)");
    }

    logger.info({
      technologies:     lifecycles.length,
      recommendations:  recommendations.length,
      deprecationAlerts: getDeprecationCandidates(lifecycles).length,
    }, "TEI: evolution rebuild complete");
  } catch (err) {
    logger.error({ err }, "TEI: rebuild pipeline error (fail-open)");
  }
}

// ── EB summary builder ─────────────────────────────────────────────────────
export async function buildEvolutionSummary(): Promise<TechnologyEvolutionSummary | null> {
  try {
    const [latestSnapshot, registryRows, urgentRows, recs] = await Promise.all([
      db.select().from(technologyEvolutionSnapshots)
        .orderBy(technologyEvolutionSnapshots.capturedAt)
        .limit(1),
      db.select().from(technologyEvolutionRegistry).limit(200),
      db.select().from(technologyEvolutionRegistry)
        .limit(50),
      db.select().from(technologyRecommendationsHistory)
        .limit(10),
    ]);

    if (registryRows.length === 0) return null;

    const snap = latestSnapshot[0];

    // Derive context arrays from registry
    const criticalTechnologies   = registryRows
      .filter(r => r.upgradeUrgency === "critical" || r.upgradeUrgency === "high")
      .map(r => r.technologyKey);
    const emergingOpportunities  = registryRows
      .filter(r => r.lifecycleStage === "emerging" && r.trendDirection === "accelerating")
      .map(r => r.technologyKey);
    const deprecationCandidates  = registryRows
      .filter(r => r.lifecycleStage === "declining" || r.lifecycleStage === "legacy" || r.lifecycleStage === "end-of-life")
      .map(r => r.technologyKey);
    const trendLeaders           = registryRows
      .filter(r => r.trendDirection === "accelerating")
      .slice(0, 8)
      .map(r => r.technologyKey);
    const migrationPriorities    = registryRows
      .filter(r => r.upgradeUrgency !== "none" && r.upgradeUrgency !== "low")
      .slice(0, 5)
      .map(r => ({ key: r.technologyKey, urgency: r.upgradeUrgency, reason: `Stage: ${r.lifecycleStage}` }));

    return {
      totalTechnologies:     snap?.totalTechnologies      ?? registryRows.length,
      deprecationAlerts:     snap?.deprecationAlerts      ?? deprecationCandidates.length,
      emergingTechnologies:  snap?.emergingTechnologies   ?? emergingOpportunities.length,
      stableTechnologies:    snap?.stableTechnologies     ?? 0,
      upgradePriorities:     snap?.upgradePriorities      ?? criticalTechnologies.length,
      averageMaturityScore:  snap?.averageMaturityScore   ?? 0,
      averageStabilityScore: snap?.averageStabilityScore  ?? 0,
      averageAdoptionScore:  snap?.averageAdoptionScore   ?? 0,
      averageConfidenceScore:snap?.averageConfidenceScore ?? 0,
      platformEvolutionScore:snap?.platformEvolutionScore ?? 0,
      criticalTechnologies,
      emergingOpportunities,
      deprecationCandidates,
      migrationPriorities,
      trendLeaders,
    };
  } catch {
    return null;
  }
}
