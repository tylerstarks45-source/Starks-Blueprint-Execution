// ─────────────────────────────────────────────────────────────────────────────
// Build 053 — BEB Orchestrator
// Coordinates all 6 BEB engines; produces summary + snapshots
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import {
  businessExperiences, experiencePages, experienceSections,
  experienceThemes, experienceTemplates, experienceSnapshots, experienceRegistry,
} from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { getExperienceCounts } from "./experience-engine";
import { getThemeCount } from "./theme-engine";
import { getAverageSeoScore } from "./seo-engine";
import type { BEBSummary } from "./types";

export async function buildBEBSummary(): Promise<BEBSummary> {
  const [counts, themeCount, avgSeo, pageRows, sectionRows, templateRows] = await Promise.all([
    getExperienceCounts(),
    getThemeCount(),
    getAverageSeoScore(),
    db.select({ id: experiencePages.id }).from(experiencePages),
    db.select({ id: experienceSections.id }).from(experienceSections),
    db.select({ id: experienceTemplates.id }).from(experienceTemplates),
  ]);

  const regRows = await db.select({
    experienceType: experienceRegistry.experienceType,
    status:         experienceRegistry.status,
  }).from(experienceRegistry);

  const typeBreakdown: Record<string, number> = {};
  const statusBreakdown: Record<string, number> = {};
  for (const r of regRows) {
    typeBreakdown[(r as any).experienceType]  = (typeBreakdown[(r as any).experienceType]  ?? 0) + 1;
    statusBreakdown[(r as any).status]         = (statusBreakdown[(r as any).status]         ?? 0) + 1;
  }

  return {
    totalExperiences:     counts.total,
    publishedExperiences: counts.published,
    draftExperiences:     counts.draft,
    totalPages:           pageRows.length,
    totalSections:        sectionRows.length,
    totalThemes:          themeCount,
    totalTemplates:       templateRows.length,
    averageSeoScore:      avgSeo,
    typeBreakdown,
    statusBreakdown,
    recentDiagnostics:    0,
  };
}

export async function captureBEBSnapshot(): Promise<void> {
  const summary = await buildBEBSummary();
  await db.insert(experienceSnapshots).values({
    totalExperiences:     summary.totalExperiences,
    publishedExperiences: summary.publishedExperiences,
    totalPages:           summary.totalPages,
    totalSections:        summary.totalSections,
    totalThemes:          summary.totalThemes,
    totalTemplates:       summary.totalTemplates,
    averageSeoScore:      summary.averageSeoScore,
    typeBreakdown:        summary.typeBreakdown,
    statusBreakdown:      summary.statusBreakdown,
    lawApplied:           true,
    snapshotData:         { build: "053" },
  });
}

export async function listSnapshots(limit = 10): Promise<any[]> {
  return db.select().from(experienceSnapshots).orderBy(desc(experienceSnapshots.createdAt)).limit(limit);
}

export async function performBEBMaintenance(): Promise<void> {
  await captureBEBSnapshot();
}
