// ── SDI Orchestrator ───────────────────────────────────────────────────────
// Full Systems Dynamics rebuild pipeline.
// 7 stages: systems → subsystems → feedback → propagation → constraints
//           → leverage → resilience → registry → snapshot
// All stages fail-open. Registry upserted last before snapshot.

import { db } from "@workspace/db";
import {
  systems,
  subsystems,
  feedbackLoops,
  propagationPaths,
  systemConstraints,
  leveragePoints,
  systemResilience,
  systemsRegistry,
  systemsSnapshots,
} from "@workspace/db/schema";
import pino from "pino";
import { getSystemCatalog, getSubsystemCatalog } from "./sdi-mapping-engine";
import { getFeedbackLoopCatalog, identifyHarmfulLoops } from "./sdi-feedback-engine";
import { getPropagationCatalog, getCriticalPropagationPaths, computePropagationRiskScore } from "./sdi-propagation-engine";
import { getConstraintCatalog, getPrimaryConstraints, getCriticalConstraints } from "./sdi-constraint-engine";
import { getLeveragePointCatalog, getTopLeveragePoints, computeNetLeverageScore } from "./sdi-leverage-engine";
import { getResilienceCatalog, computeCompositeResilienceScore, getPlatformResilienceScore, getLowResilienceSystems } from "./sdi-resilience-engine";
import type { SystemsDynamicsSummary } from "./types";

const logger = pino({ name: "sdi-orchestrator" });

export async function runSystemsDynamicsRebuild(triggeredBy: string = "manual"): Promise<void> {
  logger.info({ triggeredBy }, "SDI: systems dynamics rebuild started");

  try {
    // 1. Load all catalogs (pure computation, no I/O)
    const systemsCatalog     = getSystemCatalog();
    const subsystemsCatalog  = getSubsystemCatalog();
    const loopsCatalog       = getFeedbackLoopCatalog();
    const propagationCatalog = getPropagationCatalog();
    const constraintsCatalog = getConstraintCatalog();
    const leverageCatalog    = getLeveragePointCatalog();
    const resilienceCatalog  = getResilienceCatalog();

    // 2. Persist system records (upsert by systemKey)
    for (const sys of systemsCatalog) {
      try {
        await db.insert(systems).values({
          systemKey:       sys.systemKey,
          systemName:      sys.systemName,
          systemType:      sys.systemType,
          description:     sys.description,
          boundaryScope:   sys.boundaryScope,
          componentCount:  sys.componentCount,
          connectionCount: sys.connectionCount,
          stabilityScore:  sys.stabilityScore,
          complexityScore: sys.complexityScore,
          healthScore:     sys.healthScore,
          maturityLevel:   sys.maturityLevel,
          criticalPath:    sys.criticalPath,
          systemNotes:     sys.systemNotes ?? null,
          capturedAt:      new Date(),
        });
      } catch (err) {
        logger.warn({ err, key: sys.systemKey }, "SDI: system insert failed (ignored)");
      }
    }

    // 3. Persist subsystem records (append-only)
    for (const sub of subsystemsCatalog) {
      try {
        await db.insert(subsystems).values({
          parentSystemKey:  sub.parentSystemKey,
          subsystemKey:     sub.subsystemKey,
          subsystemName:    sub.subsystemName,
          subsystemType:    sub.subsystemType,
          role:             sub.role,
          autonomyLevel:    sub.autonomyLevel,
          couplingStrength: sub.couplingStrength,
          healthScore:      sub.healthScore,
          stabilityScore:   sub.stabilityScore,
          isBottleneck:     sub.isBottleneck,
          isCritical:       sub.isCritical,
          subsystemNotes:   sub.subsystemNotes ?? null,
          capturedAt:       new Date(),
        });
      } catch (err) {
        logger.warn({ err, key: sub.subsystemKey }, "SDI: subsystem insert failed (ignored)");
      }
    }

    // 4. Persist feedback loops (append-only)
    for (const loop of loopsCatalog) {
      try {
        await db.insert(feedbackLoops).values({
          systemKey:        loop.systemKey,
          loopKey:          loop.loopKey,
          loopName:         loop.loopName,
          loopType:         loop.loopType,
          direction:        loop.direction,
          strength:         loop.strength,
          strengthScore:    loop.strengthScore,
          triggerCondition: loop.triggerCondition,
          effect:           loop.effect,
          components:       loop.components,
          timeConstant:     loop.timeConstant,
          desirability:     loop.desirability,
          loopNotes:        loop.loopNotes ?? null,
          capturedAt:       new Date(),
        });
      } catch (err) {
        logger.warn({ err, key: loop.loopKey }, "SDI: feedback loop insert failed (ignored)");
      }
    }

    // 5. Persist propagation paths (append-only)
    for (const path of propagationCatalog) {
      try {
        await db.insert(propagationPaths).values({
          sourceSystemKey:  path.sourceSystemKey,
          targetSystemKey:  path.targetSystemKey,
          pathKey:          path.pathKey,
          propagationType:  path.propagationType,
          propagationSpeed: path.propagationSpeed,
          impactMagnitude:  path.impactMagnitude,
          impactScore:      path.impactScore,
          probability:      path.probability,
          hopsCount:        path.hopsCount,
          intermediaries:   path.intermediaries,
          mitigationExists: path.mitigationExists,
          mitigationNotes:  path.mitigationNotes ?? null,
          capturedAt:       new Date(),
        });
      } catch (err) {
        logger.warn({ err, key: path.pathKey }, "SDI: propagation path insert failed (ignored)");
      }
    }

    // 6. Persist constraints (append-only)
    for (const constraint of constraintsCatalog) {
      try {
        await db.insert(systemConstraints).values({
          systemKey:          constraint.systemKey,
          constraintKey:      constraint.constraintKey,
          constraintName:     constraint.constraintName,
          constraintType:     constraint.constraintType,
          severity:           constraint.severity,
          severityScore:      constraint.severityScore,
          description:        constraint.description,
          rootCause:          constraint.rootCause,
          downstreamImpact:   constraint.downstreamImpact,
          isPrimary:          constraint.isPrimary,
          isActivelyManaged:  constraint.isActivelyManaged,
          resolutionPath:     constraint.resolutionPath ?? null,
          capturedAt:         new Date(),
        });
      } catch (err) {
        logger.warn({ err, key: constraint.constraintKey }, "SDI: constraint insert failed (ignored)");
      }
    }

    // 7. Persist leverage points (append-only)
    for (const lp of leverageCatalog) {
      try {
        await db.insert(leveragePoints).values({
          systemKey:                lp.systemKey,
          leverageKey:              lp.leverageKey,
          leverageName:             lp.leverageName,
          leverageType:             lp.leverageType,
          leverageScore:            lp.leverageScore,
          expectedImpact:           lp.expectedImpact,
          riskScore:                lp.riskScore,
          confidenceScore:          lp.confidenceScore,
          description:              lp.description,
          mechanism:                lp.mechanism,
          targetComponent:          lp.targetComponent,
          affectedSystems:          lp.affectedSystems,
          implementationComplexity: lp.implementationComplexity,
          timeToImpact:             lp.timeToImpact,
          leverageNotes:            lp.leverageNotes ?? null,
          capturedAt:               new Date(),
        });
      } catch (err) {
        logger.warn({ err, key: lp.leverageKey }, "SDI: leverage point insert failed (ignored)");
      }
    }

    // 8. Persist resilience records (append-only)
    for (const res of resilienceCatalog) {
      try {
        const computedScore = computeCompositeResilienceScore(res);
        await db.insert(systemResilience).values({
          systemKey:                    res.systemKey,
          robustnessScore:              res.robustnessScore,
          redundancyScore:              res.redundancyScore,
          faultToleranceScore:          res.faultToleranceScore,
          recoveryCapacityScore:        res.recoveryCapacityScore,
          operationalResilienceScore:   res.operationalResilienceScore,
          compositeResilienceScore:     computedScore,
          singlePointsOfFailure:        res.singlePointsOfFailure,
          redundantPaths:               res.redundantPaths,
          meanTimeToRecovery:           res.meanTimeToRecovery,
          resilienceLevel:              res.resilienceLevel,
          vulnerabilities:              res.vulnerabilities,
          strengths:                    res.strengths,
          resilienceNotes:              res.resilienceNotes ?? null,
          capturedAt:                   new Date(),
        });
      } catch (err) {
        logger.warn({ err, key: res.systemKey }, "SDI: resilience insert failed (ignored)");
      }
    }

    // 9. Registry upsert — one row per system
    const resilienceMap  = new Map(resilienceCatalog.map(r => [r.systemKey, r]));
    const constraintMap  = new Map<string, number>();
    const leverageMap    = new Map<string, number>();
    const loopMap        = new Map<string, number>();

    for (const c of constraintsCatalog) {
      constraintMap.set(c.systemKey, (constraintMap.get(c.systemKey) ?? 0) + 1);
    }
    for (const lp of leverageCatalog) {
      leverageMap.set(lp.systemKey, (leverageMap.get(lp.systemKey) ?? 0) + 1);
    }
    for (const loop of loopsCatalog) {
      loopMap.set(loop.systemKey, (loopMap.get(loop.systemKey) ?? 0) + 1);
    }

    const topLP = getTopLeveragePoints(leverageCatalog, 1)[0];

    for (const sys of systemsCatalog) {
      const res = resilienceMap.get(sys.systemKey);
      const resScore = res ? computeCompositeResilienceScore(res) : 0.50;
      const propRisk = computePropagationRiskScore(sys.systemKey, propagationCatalog);
      const overallScore = Math.round((
        sys.healthScore    * 0.25 +
        sys.stabilityScore * 0.25 +
        resScore           * 0.25 +
        (1 - propRisk)     * 0.15 +
        (1 - sys.complexityScore) * 0.10
      ) * 1000) / 1000;

      // Find top constraint for this system
      const sysConstraints = constraintsCatalog.filter(c => c.systemKey === sys.systemKey);
      const topConstraint = sysConstraints.sort((a, b) => b.severityScore - a.severityScore)[0]?.constraintKey ?? null;
      const sysLeverage   = leverageCatalog.filter(l => l.systemKey === sys.systemKey).sort((a, b) => b.leverageScore - a.leverageScore)[0]?.leverageKey ?? null;

      try {
        await db.insert(systemsRegistry).values({
          systemKey:           sys.systemKey,
          systemName:          sys.systemName,
          systemType:          sys.systemType,
          healthScore:         sys.healthScore,
          stabilityScore:      sys.stabilityScore,
          resilienceScore:     resScore,
          complexityScore:     sys.complexityScore,
          constraintCount:     constraintMap.get(sys.systemKey) ?? 0,
          leverageCount:       leverageMap.get(sys.systemKey) ?? 0,
          feedbackLoopCount:   loopMap.get(sys.systemKey) ?? 0,
          propagationRiskScore:propRisk,
          overallSystemScore:  overallScore,
          topConstraint,
          topLeveragePoint:    sysLeverage,
          criticalPath:        sys.criticalPath,
          lastRebuiltAt:       new Date(),
        }).onConflictDoUpdate({
          target: systemsRegistry.systemKey,
          set: {
            systemName:          sys.systemName,
            systemType:          sys.systemType,
            healthScore:         sys.healthScore,
            stabilityScore:      sys.stabilityScore,
            resilienceScore:     resScore,
            complexityScore:     sys.complexityScore,
            constraintCount:     constraintMap.get(sys.systemKey) ?? 0,
            leverageCount:       leverageMap.get(sys.systemKey) ?? 0,
            feedbackLoopCount:   loopMap.get(sys.systemKey) ?? 0,
            propagationRiskScore:propRisk,
            overallSystemScore:  overallScore,
            topConstraint,
            topLeveragePoint:    sysLeverage,
            criticalPath:        sys.criticalPath,
            lastRebuiltAt:       new Date(),
          },
        });
      } catch (err) {
        logger.warn({ err, key: sys.systemKey }, "SDI: registry upsert failed (ignored)");
      }
    }

    // 10. Snapshot
    try {
      const criticalConstraints = getCriticalConstraints(constraintsCatalog).length;
      const critPaths = getCriticalPropagationPaths(propagationCatalog);
      const avgHealth    = Math.round(systemsCatalog.reduce((s, x) => s + x.healthScore, 0) / systemsCatalog.length * 1000) / 1000;
      const avgResilience = Math.round(getPlatformResilienceScore(resilienceCatalog) * 1000) / 1000;
      const avgStability  = Math.round(systemsCatalog.reduce((s, x) => s + x.stabilityScore, 0) / systemsCatalog.length * 1000) / 1000;
      const platformScore = Math.round((avgHealth + avgResilience + avgStability) / 3 * 1000) / 1000;
      const lowResil = getLowResilienceSystems(resilienceCatalog);
      const topLevMap = getTopLeveragePoints(leverageCatalog, 1)[0];

      // Find highest risk system by propagation
      const riskBySystem = systemsCatalog.map(s => ({
        key: s.systemKey,
        risk: computePropagationRiskScore(s.systemKey, propagationCatalog),
      })).sort((a, b) => b.risk - a.risk);

      await db.insert(systemsSnapshots).values({
        totalSystems:         systemsCatalog.length,
        totalSubsystems:      subsystemsCatalog.length,
        totalFeedbackLoops:   loopsCatalog.length,
        totalPropagationPaths:propagationCatalog.length,
        totalConstraints:     constraintsCatalog.length,
        criticalConstraints,
        totalLeveragePoints:  leverageCatalog.length,
        averageSystemHealth:  avgHealth,
        averageResilience:    avgResilience,
        averageStability:     avgStability,
        platformSystemsScore: platformScore,
        highestRiskSystem:    riskBySystem[0]?.key ?? null,
        highestLeverageSystem:topLevMap?.systemKey ?? null,
        snapshotData: {
          harmfulLoops:       identifyHarmfulLoops(loopsCatalog).map(l => l.loopKey),
          criticalPropagations: critPaths.map(p => ({ source: p.sourceSystemKey, target: p.targetSystemKey })),
          lowResilienceSystems: lowResil.map(r => r.systemKey),
          topLeveragePoint:   topLevMap?.leverageKey ?? null,
          timestamp:          new Date().toISOString(),
        },
      });
    } catch (err) {
      logger.warn({ err }, "SDI: snapshot insert failed (ignored)");
    }

    logger.info({
      systems:      systemsCatalog.length,
      subsystems:   subsystemsCatalog.length,
      loops:        loopsCatalog.length,
      propagations: propagationCatalog.length,
      constraints:  constraintsCatalog.length,
      leverage:     leverageCatalog.length,
    }, "SDI: systems dynamics rebuild complete");
  } catch (err) {
    logger.error({ err }, "SDI: rebuild pipeline error (fail-open)");
  }
}

// ── EB summary builder ─────────────────────────────────────────────────────
export async function buildSystemsDynamicsSummary(): Promise<SystemsDynamicsSummary | null> {
  try {
    const [registryRows, latestSnapshot, constraintRows, leverageRows, propagationRows, resilienceRows] = await Promise.all([
      db.select().from(systemsRegistry).limit(20),
      db.select().from(systemsSnapshots).orderBy(systemsSnapshots.capturedAt).limit(1),
      db.select().from(systemConstraints).limit(50),
      db.select().from(leveragePoints).limit(30),
      db.select().from(propagationPaths).limit(50),
      db.select().from(systemResilience).limit(20),
    ]);

    if (registryRows.length === 0) return null;

    const snap = latestSnapshot[0];

    const criticalConstraintNames = constraintRows
      .filter(c => c.severity === "critical" || c.severityScore >= 0.80)
      .map(c => c.constraintName)
      .slice(0, 5);

    const topLeverageOpportunities = leverageRows
      .sort((a, b) => (b.leverageScore ?? 0) - (a.leverageScore ?? 0))
      .slice(0, 3)
      .map(l => ({ key: l.leverageKey, score: l.leverageScore ?? 0, system: l.systemKey }));

    const criticalPropagationPaths = propagationRows
      .filter(p => p.impactMagnitude === "critical" || (p.impactScore ?? 0) >= 0.90)
      .slice(0, 4)
      .map(p => ({ source: p.sourceSystemKey, target: p.targetSystemKey, impact: p.impactMagnitude }));

    const lowResilienceSystems = resilienceRows
      .filter(r => r.resilienceLevel === "low" || r.resilienceLevel === "critical")
      .map(r => r.systemKey);

    return {
      totalSystems:             snap?.totalSystems          ?? registryRows.length,
      totalSubsystems:          snap?.totalSubsystems       ?? 0,
      totalFeedbackLoops:       snap?.totalFeedbackLoops    ?? 0,
      totalPropagationPaths:    snap?.totalPropagationPaths ?? 0,
      totalConstraints:         snap?.totalConstraints      ?? 0,
      criticalConstraints:      snap?.criticalConstraints   ?? criticalConstraintNames.length,
      totalLeveragePoints:      snap?.totalLeveragePoints   ?? 0,
      averageSystemHealth:      snap?.averageSystemHealth   ?? 0,
      averageResilience:        snap?.averageResilience     ?? 0,
      averageStability:         snap?.averageStability      ?? 0,
      platformSystemsScore:     snap?.platformSystemsScore  ?? 0,
      highestRiskSystem:        snap?.highestRiskSystem     ?? null,
      highestLeverageSystem:    snap?.highestLeverageSystem ?? null,
      criticalConstraintNames,
      topLeverageOpportunities,
      criticalPropagationPaths,
      lowResilienceSystems,
    };
  } catch {
    return null;
  }
}
