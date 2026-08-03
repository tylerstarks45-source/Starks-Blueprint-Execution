// ─────────────────────────────────────────────────────────────────────────────
// Build 051 — UVCF Orchestrator
// Coordinates all 6 UVCF engines; produces summary + snapshots
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import {
  componentSnapshots, visualComponents, componentFamilies,
  designTokens, componentVariants, componentCapabilities,
} from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { getRegistryStats } from "./registry-engine";
import { getTokenCount } from "./token-engine";
import { getVariantCount } from "./variant-engine";
import { getAccessibilityCoveragePercent } from "./accessibility-engine";
import { getSemanticCoveragePercent } from "./semantic-engine";
import { getRecentDiagnosticsCount } from "./diagnostics-engine";
import type { UVCFSummary } from "./types";

export async function buildUVCFSummary(): Promise<UVCFSummary> {
  const [stats, tokenCount, variantCount, a11yCoverage, semanticCoverage, recentDiag] = await Promise.all([
    getRegistryStats(),
    getTokenCount(),
    getVariantCount(),
    getAccessibilityCoveragePercent(),
    getSemanticCoveragePercent(),
    getRecentDiagnosticsCount(24),
  ]);

  const capRows = await db.select({ id: componentCapabilities.id }).from(componentCapabilities);
  const familyRows = await db.select({ id: componentFamilies.id }).from(componentFamilies);

  return {
    totalComponents:       stats.totalComponents,
    enabledComponents:     stats.enabledComponents,
    totalFamilies:         familyRows.length,
    totalTokens:           tokenCount,
    totalVariants:         variantCount,
    totalCapabilities:     capRows.length,
    ashSemanticCoverage:   semanticCoverage,
    accessibilityCoverage: a11yCoverage,
    healthBreakdown:       stats.healthBreakdown,
    categoryBreakdown:     stats.categoryBreakdown,
    deprecatedCount:       stats.deprecatedCount,
    recentDiagnostics:     recentDiag,
  };
}

export async function captureUVCFSnapshot(): Promise<void> {
  const summary = await buildUVCFSummary();
  await db.insert(componentSnapshots).values({
    totalComponents:       summary.totalComponents,
    enabledComponents:     summary.enabledComponents,
    totalFamilies:         summary.totalFamilies,
    totalTokens:           summary.totalTokens,
    totalVariants:         summary.totalVariants,
    totalCapabilities:     summary.totalCapabilities,
    ashSemanticCoverage:   summary.ashSemanticCoverage,
    accessibilityCoverage: summary.accessibilityCoverage,
    healthBreakdown:       summary.healthBreakdown,
    categoryBreakdown:     summary.categoryBreakdown,
    lawApplied:            true,
    snapshotData:          { build: "051", deprecatedCount: summary.deprecatedCount },
  });
}

export async function listSnapshots(limit = 10): Promise<any[]> {
  return db.select().from(componentSnapshots).orderBy(desc(componentSnapshots.createdAt)).limit(limit);
}

export async function performUVCFMaintenance(): Promise<void> {
  await captureUVCFSnapshot();
}
