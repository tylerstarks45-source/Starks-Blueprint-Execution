// ── Build 039: Executive Priority Intelligence Engine — Orchestrator ──────
// Full pipeline: score → dependency → attention → escalation → aging → recommend → persist.
// Fail-open throughout; every section is try/caught.

import { db } from "@workspace/db";
import {
  priorityProfiles,
  priorityScores,
  priorityDependencies,
  priorityAttention,
  priorityEscalations,
  priorityHistory,
  priorityRegistry,
  prioritySnapshots,
  priorityRecommendations,
} from "@workspace/db/schema";
import { desc, sql } from "drizzle-orm";

import type {
  PriorityEvaluationRequest,
  PriorityEvaluationResult,
  PriorityIntelligenceSummary,
} from "./types";
import { buildDependencyCriticalityMap, analyzeDependencies, populateBlockedBy } from "./epri-dependency-engine";
import { scoreItems } from "./epri-scoring-engine";
import { analyzeAttention } from "./epri-attention-engine";
import { classifyEscalations, countCriticalEscalations } from "./epri-escalation-engine";
import { analyzeAging, countStaleItems } from "./epri-aging-engine";
import { buildPriorityRecommendations } from "./epri-recommendation-engine";

// ── Core evaluation ────────────────────────────────────────────────────────

export async function evaluatePriority(
  req: PriorityEvaluationRequest,
): Promise<PriorityEvaluationResult> {
  const { profileKey, title, description, domain, items, userId } = req;

  if (items.length === 0) throw new Error("At least 1 item required for priority evaluation.");

  // ── Phase 1: Dependency criticality map ────────────────────────────────
  const depCritMap = buildDependencyCriticalityMap(items);

  // ── Phase 2: Score items ───────────────────────────────────────────────
  let scoredItems = scoreItems(items, depCritMap);

  // ── Phase 3: Dependency analysis + block population ───────────────────
  const dependencies = analyzeDependencies(items, scoredItems);
  scoredItems        = populateBlockedBy(scoredItems, items);

  // ── Phase 4: Escalation classification ────────────────────────────────
  const escalations = classifyEscalations(scoredItems);

  // ── Phase 5: Attention allocation ─────────────────────────────────────
  const attention = analyzeAttention(scoredItems, escalations);

  // ── Phase 6: Aging analysis (informational) ────────────────────────────
  const _agingResults = analyzeAging(items);

  // ── Phase 7: Recommendations ───────────────────────────────────────────
  const recs = buildPriorityRecommendations(scoredItems, escalations, attention);

  // ── Phase 8: Derived metrics ───────────────────────────────────────────
  const blockedItems       = scoredItems.filter(s => s.isBlocked).length;
  const staleItems         = countStaleItems(items);
  const criticalEscalations= countCriticalEscalations(escalations);
  const overallHealth      = computeOverallHealth(scoredItems, blockedItems, criticalEscalations, items.length);
  const topItem            = scoredItems.find(s => !s.isBlocked) ?? scoredItems[0];

  // ── Phase 9: Persist ───────────────────────────────────────────────────
  const [profile] = await db
    .insert(priorityProfiles)
    .values({
      profileKey,
      title,
      description,
      domain,
      totalItems:          items.length,
      topPriorityKey:      topItem?.itemKey ?? null,
      topPriorityTitle:    topItem?.itemTitle ?? null,
      priorityLawApplied:  true,
      blockedItems,
      staleItems,
      criticalEscalations,
      overallHealth,
      userId:              userId ?? null,
    })
    .returning({ id: priorityProfiles.id });

  const profileId = profile!.id;

  // Persist scores
  for (const s of scoredItems) {
    try {
      await db.insert(priorityScores).values({
        profileId,
        itemKey:               s.itemKey,
        itemTitle:             s.itemTitle,
        itemType:              s.itemType,
        strategicValue:        s.strategicValue,
        businessImpact:        s.businessImpact,
        urgency:               s.urgency,
        dependencyCriticality: s.dependencyCriticality,
        resourceAvailability:  s.resourceAvailability,
        riskReduction:         s.riskReduction,
        confidence:            s.confidence,
        timeSensitivity:       s.timeSensitivity,
        compositeScore:        s.compositeScore,
        rank:                  s.rank,
        escalationLevel:       s.escalationLevel,
        agingStatus:           s.agingStatus,
        isBlocked:             s.isBlocked,
        blockedBy:             s.blockedBy,
        priorityLawApplied:    true,
      });
    } catch { /* fail-open */ }
  }

  // Persist dependencies
  for (const dep of dependencies) {
    try {
      await db.insert(priorityDependencies).values({
        profileId,
        upstreamKey:    dep.upstreamKey,
        downstreamKey:  dep.downstreamKey,
        dependencyType: dep.dependencyType,
        delayRisk:      dep.delayRisk,
        isCriticalPath: dep.isCriticalPath,
        notes:          dep.notes,
      });
    } catch { /* fail-open */ }
  }

  // Persist attention
  try {
    await db.insert(priorityAttention).values({
      profileId,
      attentionLoad:             attention.attentionLoad,
      prioritySaturation:        attention.prioritySaturation,
      focusDrift:                attention.focusDrift,
      criticalWindowUtilization: attention.criticalWindowUtilization,
      attentionScore:            attention.attentionScore,
      topAttentionItems:         attention.topAttentionItems,
      attentionWarnings:         attention.attentionWarnings,
      recommendedFocusArea:      attention.recommendedFocusArea ?? null,
    });
  } catch { /* fail-open */ }

  // Persist escalations (non-normal only)
  for (const esc of escalations.filter(e => e.escalationLevel !== "normal")) {
    try {
      await db.insert(priorityEscalations).values({
        profileId,
        itemKey:           esc.itemKey,
        itemTitle:         esc.itemTitle,
        escalationLevel:   esc.escalationLevel,
        reason:            esc.reason,
        triggerDimensions: esc.triggerDimensions,
        compositeScore:    esc.compositeScore,
        urgencyScore:      esc.urgencyScore,
        businessRisk:      esc.businessRisk,
      });
    } catch { /* fail-open */ }
  }

  // Persist recommendations
  for (const rec of recs) {
    try {
      await db.insert(priorityRecommendations).values({
        profileId,
        itemKey:            rec.itemKey,
        itemTitle:          rec.itemTitle,
        action:             rec.action,
        priority:           rec.priority,
        evidence:           rec.evidence,
        businessImpact:     rec.businessImpact,
        opportunityCost:    rec.opportunityCost,
        riskIfDelayed:      rec.riskIfDelayed,
        confidenceScore:    rec.confidenceScore,
        reasoningTrace:     rec.reasoningTrace,
        priorityLawApplied: true,
      });
    } catch { /* fail-open */ }
  }

  // Upsert registry
  try {
    await db
      .insert(priorityRegistry)
      .values({
        profileKey,
        title,
        domain,
        topPriorityKey:      topItem?.itemKey ?? null,
        topPriorityTitle:    topItem?.itemTitle ?? null,
        totalItems:          items.length,
        blockedItems,
        staleItems,
        criticalEscalations,
        overallHealth,
        priorityLawApplied:  true,
        lastEvaluatedAt:     new Date(),
        updatedAt:           new Date(),
      })
      .onConflictDoUpdate({
        target: priorityRegistry.profileKey,
        set: {
          title,
          domain,
          topPriorityKey:      topItem?.itemKey ?? null,
          topPriorityTitle:    topItem?.itemTitle ?? null,
          totalItems:          items.length,
          blockedItems,
          staleItems,
          criticalEscalations,
          overallHealth,
          priorityLawApplied:  true,
          lastEvaluatedAt:     new Date(),
          updatedAt:           new Date(),
        },
      });
  } catch { /* fail-open */ }

  // Append history
  try {
    await db.insert(priorityHistory).values({
      profileKey,
      profileId,
      topPriorityKey:  topItem?.itemKey ?? null,
      totalItems:      items.length,
      blockedItems,
      criticalCount:   criticalEscalations,
      overallHealth,
      snapshotJson: {
        topPriorityTitle: topItem?.itemTitle ?? null,
        staleItems,
        attentionScore:   attention.attentionScore,
      },
    });
  } catch { /* fail-open */ }

  return {
    profileId,
    profileKey,
    rankedItems:        scoredItems,
    dependencies,
    attention,
    escalations,
    recommendations:    recs,
    totalItems:         items.length,
    blockedItems,
    staleItems,
    criticalEscalations,
    overallHealth,
    topPriorityKey:     topItem?.itemKey ?? null,
    topPriorityTitle:   topItem?.itemTitle ?? null,
  };
}

// ── Health computation ─────────────────────────────────────────────────────

function computeOverallHealth(
  scoredItems:          { compositeScore: number; isBlocked: boolean }[],
  blockedItems:         number,
  criticalEscalations:  number,
  totalItems:           number,
): number {
  if (totalItems === 0) return 1;

  const avgScore     = scoredItems.reduce((s, i) => s + i.compositeScore, 0) / totalItems;
  const blockedRatio = blockedItems / totalItems;
  const critRatio    = Math.min(1, criticalEscalations / Math.max(1, totalItems));

  return Math.max(0, avgScore - blockedRatio * 0.3 - critRatio * 0.2);
}

// ── Platform rebuild ───────────────────────────────────────────────────────

export async function runPriorityPlatformRebuild(trigger: string): Promise<void> {
  try {
    const registry = await db.select().from(priorityRegistry);
    if (registry.length === 0) return;

    // Seed platform snapshot from registry state
    const totalItems       = registry.reduce((s, r) => s + r.totalItems, 0);
    const totalBlocked     = registry.reduce((s, r) => s + r.blockedItems, 0);
    const totalStale       = registry.reduce((s, r) => s + r.staleItems, 0);
    const totalCritical    = registry.reduce((s, r) => s + r.criticalEscalations, 0);
    const avgHealth        = registry.reduce((s, r) => s + r.overallHealth, 0) / registry.length;
    const topProfile       = registry.sort((a, b) => b.overallHealth - a.overallHealth)[0];
    const lawRate          = registry.filter(r => r.priorityLawApplied).length / registry.length;

    const focusAreas       = registry
      .filter(r => r.criticalEscalations > 0)
      .map(r => r.domain);
    const executiveFocusArea = focusAreas.length > 0 ? focusAreas[0] : null;

    await db.insert(prioritySnapshots).values({
      totalProfiles:       registry.length,
      totalItems,
      avgOverallHealth:    avgHealth,
      totalBlocked,
      totalStale,
      totalCritical,
      topPlatformPriority: topProfile?.topPriorityTitle ?? null,
      executiveFocusArea,
      priorityLawRate:     lawRate,
    });
  } catch (err) {
    void trigger; // suppress unused warning
    throw err;
  }
}

// ── EB summary ────────────────────────────────────────────────────────────

export async function buildPriorityIntelligenceSummary(): Promise<PriorityIntelligenceSummary> {
  try {
    const snapshot = await db
      .select()
      .from(prioritySnapshots)
      .orderBy(desc(prioritySnapshots.id))
      .limit(1);

    const registryRows = await db.select().from(priorityRegistry);

    if (snapshot.length === 0 && registryRows.length === 0) {
      return emptyPrioritySummary();
    }

    const snap = snapshot[0];

    return {
      totalProfiles:       snap?.totalProfiles ?? registryRows.length,
      totalItems:          snap?.totalItems ?? registryRows.reduce((s, r) => s + r.totalItems, 0),
      avgOverallHealth:    snap?.avgOverallHealth ?? 0,
      totalBlocked:        snap?.totalBlocked ?? 0,
      totalStale:          snap?.totalStale ?? 0,
      totalCritical:       snap?.totalCritical ?? 0,
      topPlatformPriority: snap?.topPlatformPriority ?? null,
      executiveFocusArea:  snap?.executiveFocusArea ?? null,
      priorityLawRate:     snap?.priorityLawRate ?? 1,
      profileSummaries:    registryRows.map(r => ({
        profileKey:          r.profileKey,
        title:               r.title,
        overallHealth:       r.overallHealth,
        blockedItems:        r.blockedItems,
        topPriorityKey:      r.topPriorityKey ?? null,
        topPriorityTitle:    r.topPriorityTitle ?? null,
        criticalEscalations: r.criticalEscalations,
      })),
    };
  } catch {
    return emptyPrioritySummary();
  }
}

function emptyPrioritySummary(): PriorityIntelligenceSummary {
  return {
    totalProfiles:       0,
    totalItems:          0,
    avgOverallHealth:    0,
    totalBlocked:        0,
    totalStale:          0,
    totalCritical:       0,
    topPlatformPriority: null,
    executiveFocusArea:  null,
    priorityLawRate:     1,
    profileSummaries:    [],
  };
}
