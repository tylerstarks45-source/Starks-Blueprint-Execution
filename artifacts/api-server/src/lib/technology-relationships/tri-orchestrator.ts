// ── TRI Orchestrator ────────────────────────────────────────────────────────
// Coordinates the full relationship graph rebuild pipeline.
// 9 stages: build relationships → dependencies → ecosystems → synergies →
//            conflicts → migrations → recommendations → registry upsert → snapshot.
// All stages fail-open. Never blocks the EB request path.

import { db } from "@workspace/db";
import {
  technologyRelationships,
  relationshipGraph,
  relationshipClusters,
  technologyEcosystems,
  dependencyGraph,
  conflictGraph,
  replacementGraph,
  relationshipRegistry,
  relationshipSnapshots,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import pino from "pino";
import { buildRelationships, buildAdjacencyMap, computeNetworkStats } from "./tri-relationship-engine";
import { deriveDependencies, detectCircularDependencies } from "./tri-dependency-engine";
import { buildEcosystems, getEcosystemsForTechnology, getPrimaryEcosystem } from "./tri-ecosystem-engine";
import { computeAllSynergies } from "./tri-synergy-engine";
import { buildConflicts, countActiveConflicts } from "./tri-conflict-engine";
import { buildMigrationPaths } from "./tri-migration-engine";
import { generateAllRelationshipRecommendations } from "./tri-recommendation-engine";
import type { TechnologyRelationshipSummary } from "./types";

const logger = pino({ name: "tri-orchestrator" });

// ── Full graph rebuild pipeline ────────────────────────────────────────────
export async function runGraphRebuild(triggeredBy: string = "manual"): Promise<void> {
  logger.info({ triggeredBy }, "TRI: relationship graph rebuild started");

  try {
    // 1. Build relationships (deterministic seed)
    const relationships = buildRelationships();
    const adjacency = buildAdjacencyMap(relationships);
    const networkStats = computeNetworkStats(relationships, adjacency);

    // 2. Derive supporting structures (all pure computation)
    const dependencies       = deriveDependencies(relationships);
    const circularDeps       = detectCircularDependencies(dependencies);
    const allDeps            = [...dependencies, ...circularDeps];
    const ecosystems         = buildEcosystems();
    const synergies          = computeAllSynergies(relationships);
    const conflicts          = buildConflicts(relationships);
    const migrations         = buildMigrationPaths(relationships);
    const recommendations    = generateAllRelationshipRecommendations(synergies, conflicts, migrations, relationships);

    // 3. Persist relationship edges
    for (const rel of relationships) {
      try {
        await db.insert(technologyRelationships).values({
          sourceTechnologyKey: rel.sourceTechnologyKey,
          targetTechnologyKey: rel.targetTechnologyKey,
          relationshipType:    rel.relationshipType,
          strength:            rel.strength,
          directionality:      rel.directionality,
          description:         rel.description ?? null,
          evidence:            rel.evidence ?? null,
          isVerified:          false,
        });
      } catch (err) {
        logger.warn({ err, source: rel.sourceTechnologyKey, target: rel.targetTechnologyKey }, "TRI: relationship insert failed (ignored)");
      }
    }

    // 4. Persist graph metadata
    try {
      await db.insert(relationshipGraph).values({
        totalNodes:              networkStats.totalNodes,
        totalEdges:              networkStats.totalEdges,
        avgDegree:               networkStats.avgDegree,
        networkDensity:          networkStats.networkDensity,
        mostConnectedTechnology: networkStats.mostConnectedTechnology ?? null,
        mostConnectedDegree:     networkStats.mostConnectedDegree,
        relationshipTypeCounts:  networkStats.relationshipTypeCounts,
        networkScore:            networkStats.networkScore,
        graphData:               { adjacencySize: adjacency.nodes.size, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      logger.warn({ err }, "TRI: graph metadata insert failed (ignored)");
    }

    // 5. Persist ecosystems + clusters
    for (const eco of ecosystems) {
      try {
        await db.insert(technologyEcosystems).values({
          ecosystemName:  eco.ecosystemName,
          displayName:    eco.displayName,
          description:    eco.description,
          technologies:   eco.technologies,
          coreTechnology: (eco as any).coreechnology ?? null,
          maturityScore:  eco.maturityScore,
          coherenceScore: eco.coherenceScore,
          coverageScore:  eco.coverageScore,
          techCount:      eco.technologies.length,
        });

        // Build a cluster for each ecosystem
        await db.insert(relationshipClusters).values({
          clusterName:       eco.displayName,
          clusterType:       "ecosystem",
          technologies:      eco.technologies,
          cohesionScore:     eco.coherenceScore,
          primaryTechnology: (eco as any).coreechnology ?? null,
          description:       eco.description,
        });
      } catch (err) {
        logger.warn({ err, ecosystem: eco.ecosystemName }, "TRI: ecosystem/cluster insert failed (ignored)");
      }
    }

    // 6. Persist dependencies
    for (const dep of allDeps) {
      try {
        await db.insert(dependencyGraph).values({
          dependentKey:   dep.dependentKey,
          dependencyKey:  dep.dependencyKey,
          dependencyType: dep.dependencyType,
          reason:         dep.reason ?? null,
          isCurrentlyMet: dep.isCurrentlyMet,
          riskIfMissing:  dep.riskIfMissing ?? null,
        });
      } catch (err) {
        logger.warn({ err }, "TRI: dependency insert failed (ignored)");
      }
    }

    // 7. Persist conflicts
    for (const conflict of conflicts) {
      try {
        await db.insert(conflictGraph).values({
          technologyKeyA: conflict.technologyKeyA,
          technologyKeyB: conflict.technologyKeyB,
          conflictType:   conflict.conflictType,
          severity:       conflict.severity,
          description:    conflict.description,
          resolution:     conflict.resolution ?? null,
          isActive:       true,
        });
      } catch (err) {
        logger.warn({ err }, "TRI: conflict insert failed (ignored)");
      }
    }

    // 8. Persist migration paths
    for (const migration of migrations) {
      try {
        await db.insert(replacementGraph).values({
          sourceTechnologyKey:     migration.sourceTechnologyKey,
          targetTechnologyKey:     migration.targetTechnologyKey,
          replacementType:         migration.replacementType,
          direction:               migration.direction,
          migrationComplexity:     migration.migrationComplexity,
          migrationRisk:           migration.migrationRisk,
          estimatedEffort:         migration.estimatedEffort ?? null,
          rollbackStrategy:        migration.rollbackStrategy ?? null,
          compatibilityConfidence: migration.compatibilityConfidence,
          benefitScore:            migration.benefitScore,
          description:             migration.description ?? null,
        });
      } catch (err) {
        logger.warn({ err }, "TRI: migration insert failed (ignored)");
      }
    }

    // 9. Registry upsert — one row per technology
    for (const techKey of adjacency.nodes) {
      try {
        const outgoing  = adjacency.outgoing.get(techKey)?.length ?? 0;
        const incoming  = adjacency.incoming.get(techKey)?.length ?? 0;
        const ecosys    = getEcosystemsForTechnology(techKey);
        const primary   = getPrimaryEcosystem(techKey);
        const depCount  = allDeps.filter(d => d.dependentKey === techKey).length;
        const depOnCount= allDeps.filter(d => d.dependencyKey === techKey).length;
        const conflCount= conflicts.filter(c => c.technologyKeyA === techKey || c.technologyKeyB === techKey).length;
        const synScore  = synergies.find(s => s.technologyKeyA === techKey || s.technologyKeyB === techKey)?.compositeScore ?? null;
        const centrality= Math.min(1, (outgoing + incoming) / 20);

        await db.insert(relationshipRegistry).values({
          technologyKey:         techKey,
          totalRelationships:    outgoing + incoming,
          outgoingRelationships: outgoing,
          incomingRelationships: incoming,
          ecosystems:            ecosys,
          primaryEcosystem:      primary ?? null,
          dependencyCount:       depCount,
          dependentCount:        depOnCount,
          conflictCount:         conflCount,
          synergyScore:          synScore,
          networkCentralityScore:centrality,
          lastBuiltAt:           new Date(),
        }).onConflictDoUpdate({
          target: relationshipRegistry.technologyKey,
          set: {
            totalRelationships:    outgoing + incoming,
            outgoingRelationships: outgoing,
            incomingRelationships: incoming,
            ecosystems:            ecosys,
            primaryEcosystem:      primary ?? null,
            dependencyCount:       depCount,
            dependentCount:        depOnCount,
            conflictCount:         conflCount,
            synergyScore:          synScore,
            networkCentralityScore:centrality,
            lastBuiltAt:           new Date(),
          },
        });
      } catch (err) {
        logger.warn({ err, techKey }, "TRI: registry upsert failed (ignored)");
      }
    }

    // 10. Snapshot
    try {
      const activeConflicts = countActiveConflicts(conflicts);
      const migOps = migrations.filter(m => m.benefitScore >= 0.75 && m.migrationRisk !== "critical").length;
      const coverage = adjacency.nodes.size > 0
        ? ([...adjacency.nodes].filter(k => (adjacency.outgoing.get(k)?.length ?? 0) > 0).length / adjacency.nodes.size)
        : 0;

      await db.insert(relationshipSnapshots).values({
        totalRelationships:    relationships.length,
        totalEcosystems:       ecosystems.length,
        totalClusters:         ecosystems.length,
        totalDependencies:     allDeps.length,
        totalConflicts:        conflicts.length,
        totalReplacements:     migrations.length,
        networkScore:          networkStats.networkScore,
        synergyOpportunities:  synergies.filter(s => s.compositeScore >= 0.75).length,
        conflictAlerts:        activeConflicts,
        migrationOpportunities:migOps,
        relationshipCoverage:  Math.round(coverage * 1000) / 1000,
        snapshotData: {
          topSynergies:       synergies.slice(0, 5).map(s => ({ a: s.technologyKeyA, b: s.technologyKeyB, score: s.compositeScore })),
          topConflicts:       conflicts.slice(0, 3).map(c => ({ a: c.technologyKeyA, b: c.technologyKeyB, severity: c.severity })),
          timestamp:          new Date().toISOString(),
        },
      });
    } catch (err) {
      logger.warn({ err }, "TRI: snapshot insert failed (ignored)");
    }

    logger.info({
      relationships: relationships.length,
      dependencies:  allDeps.length,
      ecosystems:    ecosystems.length,
      conflicts:     conflicts.length,
      migrations:    migrations.length,
      recommendations: recommendations.length,
    }, "TRI: graph rebuild complete");
  } catch (err) {
    logger.error({ err }, "TRI: graph rebuild pipeline error (fail-open)");
  }
}

// ── Summary builder for EB ─────────────────────────────────────────────────
export async function buildRelationshipSummary(): Promise<TechnologyRelationshipSummary | null> {
  try {
    const [registryRows, latestSnapshot, activeConflicts, topSynergy] = await Promise.all([
      db.select().from(relationshipRegistry).limit(100),
      db.select().from(relationshipSnapshots).orderBy(relationshipSnapshots.capturedAt).limit(1),
      db.select().from(conflictGraph).where(eq(conflictGraph.isActive, true)).limit(50),
      db.select().from(technologyRelationships).limit(1), // presence check
    ]);

    if (registryRows.length === 0 && topSynergy.length === 0) return null;

    const snap = latestSnapshot[0];

    const topEcosystems = [...new Set(
      registryRows
        .filter(r => r.primaryEcosystem)
        .map(r => r.primaryEcosystem!)
    )].slice(0, 5);

    const topSynergyPairs = registryRows
      .filter(r => r.synergyScore !== null && r.synergyScore! > 0)
      .sort((a, b) => (b.synergyScore ?? 0) - (a.synergyScore ?? 0))
      .slice(0, 5)
      .map(r => ({ a: r.technologyKey, b: "partner", score: r.synergyScore ?? 0 }));

    const conflictEdges = activeConflicts.map(c => ({
      technologyKeyA: c.technologyKeyA,
      technologyKeyB: c.technologyKeyB,
      conflictType:   c.conflictType as import("./types").ConflictType,
      severity:       c.severity as import("./types").ConflictSeverity,
      description:    c.description,
      resolution:     c.resolution ?? undefined,
    }));

    return {
      totalRelationships:     snap?.totalRelationships ?? registryRows.reduce((s, r) => s + r.totalRelationships, 0),
      totalEcosystems:        snap?.totalEcosystems ?? 0,
      totalClusters:          snap?.totalClusters ?? 0,
      totalDependencies:      snap?.totalDependencies ?? 0,
      totalConflicts:         snap?.totalConflicts ?? 0,
      totalReplacements:      snap?.totalReplacements ?? 0,
      networkScore:           snap?.networkScore ?? 0,
      relationshipCoverage:   snap?.relationshipCoverage ?? 0,
      synergyOpportunities:   snap?.synergyOpportunities ?? 0,
      conflictAlerts:         snap?.conflictAlerts ?? activeConflicts.length,
      migrationOpportunities: snap?.migrationOpportunities ?? 0,
      topEcosystems,
      activeConflicts:        conflictEdges,
      topSynergyPairs,
    };
  } catch {
    return null;
  }
}
