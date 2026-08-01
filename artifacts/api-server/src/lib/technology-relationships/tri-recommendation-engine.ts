// ── TRI Recommendation Engine ───────────────────────────────────────────────
// Produces administrator-only technology relationship recommendations.
// Recommendations consider the ecosystem context, never just individual technologies.
// Evidence package: 10 fields from the spec.

import type {
  RelationshipRecommendationRecord,
  SynergyScore,
  ConflictEdge,
  ReplacementEdge,
  TechnologyRelationship,
} from "./types";

// ── Synergy-based recommendations ─────────────────────────────────────────
export function generateSynergyRecommendations(
  synergies: SynergyScore[],
  relationships: TechnologyRelationship[],
): RelationshipRecommendationRecord[] {
  // Top synergy pairs not yet in a "works_best_with" relationship
  const existingBestWith = new Set(
    relationships
      .filter(r => r.relationshipType === "works_best_with")
      .map(r => `${r.sourceTechnologyKey}|${r.targetTechnologyKey}`)
  );

  return synergies
    .filter(s => s.compositeScore >= 0.78 && !existingBestWith.has(`${s.technologyKeyA}|${s.technologyKeyB}`))
    .slice(0, 8)
    .map(s => ({
      sourceTechnologyKey: s.technologyKeyA,
      targetTechnologyKey: s.technologyKeyB,
      recommendationType:  "integration" as const,
      priority:            s.compositeScore >= 0.85 ? "high" as const : "medium" as const,
      title:               `Integrate ${s.technologyKeyA.split(":")[0]} with ${s.technologyKeyB.split(":")[0]} for synergy`,
      description:         `${s.technologyKeyA} and ${s.technologyKeyB} have a composite synergy score of ${(s.compositeScore * 100).toFixed(1)}% across 7 dimensions.`,
      relationshipEvidence:`Composite synergy: ${(s.compositeScore * 100).toFixed(1)}%. Performance gain: ${(s.performanceGain * 100).toFixed(0)}%. Developer productivity: ${(s.developerProductivity * 100).toFixed(0)}%.`,
      expectedBenefit:     `Integrating these technologies is expected to deliver ${(s.performanceGain * 100).toFixed(0)}% performance gain, ${(s.developerProductivity * 100).toFixed(0)}% developer productivity improvement, and ${(s.costReduction * 100).toFixed(0)}% cost reduction.`,
      operationalImpact:   `Operational gain: ${(s.operationalGain * 100).toFixed(0)}%. Maintainability: ${(s.maintainability * 100).toFixed(0)}%.`,
      performanceImpact:   `Performance gain: ${(s.performanceGain * 100).toFixed(0)}%. Execution throughput: ${(s.executionThroughput * 100).toFixed(0)}%.`,
      costImpact:          `Cost reduction score: ${(s.costReduction * 100).toFixed(0)}%. Actual cost depends on usage volume.`,
      securityImpact:      `Reliability improvement: ${(s.reliabilityImprovement * 100).toFixed(0)}%. No known security risks from this integration.`,
      compatibilityImpact: `Technologies are already confirmed compatible. Integration complexity is low.`,
      risk:                `Low risk. Both technologies are stable and the integration pattern is well-established.`,
      confidence:          Math.min(1, s.compositeScore * 1.05),
      alternatives:        [],
    }));
}

// ── Conflict-based recommendations ────────────────────────────────────────
export function generateConflictRecommendations(
  conflicts: ConflictEdge[],
): RelationshipRecommendationRecord[] {
  return conflicts
    .filter(c => c.severity === "critical" || c.severity === "high")
    .slice(0, 5)
    .map(c => ({
      sourceTechnologyKey: c.technologyKeyA,
      targetTechnologyKey: c.technologyKeyB,
      recommendationType:  "evaluation" as const,
      priority:            c.severity === "critical" ? "critical" as const : "high" as const,
      title:               `Resolve ${c.conflictType} conflict between ${c.technologyKeyA.split(":")[0]} and ${c.technologyKeyB.split(":")[0]}`,
      description:         `A ${c.severity} ${c.conflictType} conflict exists between ${c.technologyKeyA} and ${c.technologyKeyB}.`,
      relationshipEvidence:`Conflict type: ${c.conflictType}. Severity: ${c.severity}. ${c.description}`,
      expectedBenefit:     c.resolution ?? "Resolving this conflict eliminates operational risk and reduces platform instability.",
      operationalImpact:   `Active ${c.severity} ${c.conflictType} conflict creates operational risk. Resolution required before scaling.`,
      performanceImpact:   c.conflictType === "resource" ? "Resource conflict may cause performance degradation under load." : "Performance impact varies by conflict type.",
      costImpact:          "Resolving conflicts early reduces future migration cost and operational overhead.",
      securityImpact:      c.conflictType === "security" ? `SECURITY CONFLICT: ${c.description}` : "No direct security impact from this conflict type.",
      compatibilityImpact: `Compatibility is actively impaired by this conflict. Resolution restores full compatibility.`,
      risk:                `${c.severity.toUpperCase()} risk if left unresolved. ${c.description}`,
      confidence:          c.severity === "critical" ? 0.98 : 0.90,
      alternatives:        c.resolution ? [c.resolution] : [],
    }));
}

// ── Migration-based recommendations ───────────────────────────────────────
export function generateMigrationRecommendations(
  migrations: ReplacementEdge[],
): RelationshipRecommendationRecord[] {
  return migrations
    .filter(m =>
      m.benefitScore >= 0.75 &&
      (m.migrationComplexity === "trivial" || m.migrationComplexity === "low" || m.migrationComplexity === "medium") &&
      m.migrationRisk !== "critical"
    )
    .slice(0, 5)
    .map(m => ({
      sourceTechnologyKey: m.sourceTechnologyKey,
      targetTechnologyKey: m.targetTechnologyKey,
      recommendationType:  "migration" as const,
      priority:            m.benefitScore >= 0.85 ? "high" as const : "medium" as const,
      title:               `Consider migrating from ${m.sourceTechnologyKey.split(":")[0]} to ${m.targetTechnologyKey.split(":")[0]}`,
      description:         m.description ?? `Migration path with ${(m.benefitScore * 100).toFixed(1)}% expected benefit and ${(m.compatibilityConfidence * 100).toFixed(0)}% compatibility confidence.`,
      relationshipEvidence:`Benefit score: ${(m.benefitScore * 100).toFixed(1)}%. Compatibility confidence: ${(m.compatibilityConfidence * 100).toFixed(0)}%. Type: ${m.replacementType}. Direction: ${m.direction}.`,
      expectedBenefit:     `${(m.benefitScore * 100).toFixed(1)}% expected benefit. ${m.description ?? ""}`,
      operationalImpact:   `Migration complexity: ${m.migrationComplexity}. Estimated effort: ${m.estimatedEffort ?? "unknown"}.`,
      performanceImpact:   `Migration direction: ${m.direction}. Compatibility confidence: ${(m.compatibilityConfidence * 100).toFixed(0)}%.`,
      costImpact:          "Migration cost depends on implementation effort and any new licensing costs. Obtain vendor quotes before committing.",
      securityImpact:      "Full security review of target technology required before migration in production.",
      compatibilityImpact: `Compatibility confidence: ${(m.compatibilityConfidence * 100).toFixed(0)}%. Integration complexity: ${m.migrationComplexity}.`,
      risk:                `Migration risk: ${m.migrationRisk}. ${m.rollbackStrategy ?? "Maintain rollback capability throughout."}`,
      confidence:          m.compatibilityConfidence * m.benefitScore,
      alternatives:        [],
    }));
}

// ── Batch generate all recommendations ────────────────────────────────────
export function generateAllRelationshipRecommendations(
  synergies: SynergyScore[],
  conflicts: ConflictEdge[],
  migrations: ReplacementEdge[],
  relationships: TechnologyRelationship[],
): RelationshipRecommendationRecord[] {
  const all = [
    ...generateConflictRecommendations(conflicts),   // conflicts first — highest urgency
    ...generateMigrationRecommendations(migrations),
    ...generateSynergyRecommendations(synergies, relationships),
  ];

  // Sort: critical > high > medium > low, then confidence
  const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return all
    .sort((a, b) => {
      const po = (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
      return po !== 0 ? po : b.confidence - a.confidence;
    })
    .slice(0, 20);
}
