// ── Build 047: Project Health Engine ──────────────────────────────────────────
// Measures: completeness, activity, dependency health, deployment readiness,
// documentation coverage, automation coverage.
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { projectHealth, projectRegistry } from "@workspace/db/schema";
import { countAssetsByType } from "./asset-registry-engine";
import { countBrokenDependencies } from "./asset-relationship-engine";
import { countRecentActivity } from "./workspace-activity-engine";
import type { ProjectHealthScore, BusinessProject } from "./types";

const RECOMMENDED_ASSETS: Record<string, string[]> = {
  website:    ["website", "brand_kit", "documentation"],
  crm:        ["crm", "automation"],
  automation: ["automation", "workflow"],
  saas:       ["saas", "database", "api", "documentation"],
  dashboard:  ["dashboard"],
  custom:     [],
};

const DOCUMENTATION_ASSETS = ["documentation", "knowledge_base"] as const;
const AUTOMATION_ASSETS     = ["automation", "workflow", "ai_agent"] as const;

/** Compute health for a project and store an append-only snapshot */
export async function computeProjectHealth(
  project: BusinessProject,
): Promise<ProjectHealthScore> {
  const assetsByType = await countAssetsByType(project.id);
  const brokenDeps   = await countBrokenDependencies(project.id);
  const recentEvents = await countRecentActivity(project.userId, 14);
  const totalAssets  = Object.values(assetsByType).reduce((s, v) => s + v, 0);

  // ── Completeness (0–100): percentage of recommended assets present ────────
  const recommended = RECOMMENDED_ASSETS[project.projectType] ?? [];
  const presentCount = recommended.filter(t => (assetsByType[t] ?? 0) > 0).length;
  const completenessScore = recommended.length > 0
    ? Math.round((presentCount / recommended.length) * 100)
    : totalAssets > 0 ? 60 : 20;

  // ── Activity (0–100): recent events proxy ────────────────────────────────
  const activityScore = Math.min(100, recentEvents * 10);

  // ── Dependency health (0–100) ─────────────────────────────────────────────
  const dependencyScore = brokenDeps === 0 ? 100 : Math.max(0, 100 - brokenDeps * 20);

  // ── Deployment readiness (0–100) ──────────────────────────────────────────
  const totalDeployed = await countDeployedAssets(project.id);
  const deploymentScore = totalAssets > 0
    ? Math.round((totalDeployed / totalAssets) * 100)
    : 0;

  // ── Documentation coverage (0–100) ───────────────────────────────────────
  const docCount = DOCUMENTATION_ASSETS.reduce((s, t) => s + (assetsByType[t] ?? 0), 0);
  const documentationScore = docCount > 0 ? 80 : 0;

  // ── Automation coverage (0–100) ───────────────────────────────────────────
  const autoCount = AUTOMATION_ASSETS.reduce((s, t) => s + (assetsByType[t] ?? 0), 0);
  const automationScore = autoCount > 0 ? 80 : 0;

  // ── Overall: weighted composite ───────────────────────────────────────────
  const overallScore = Math.round(
    completenessScore  * 0.30 +
    activityScore      * 0.15 +
    dependencyScore    * 0.20 +
    deploymentScore    * 0.15 +
    documentationScore * 0.10 +
    automationScore    * 0.10,
  );

  // ── Warnings & recommendations ────────────────────────────────────────────
  const missingAssets: string[] = recommended.filter(t => (assetsByType[t] ?? 0) === 0);
  const healthWarnings: string[] = [];
  const recommendations: string[] = [];

  if (brokenDeps > 0)         healthWarnings.push(`${brokenDeps} broken required dependencies`);
  if (activityScore < 20)     healthWarnings.push("No recent activity in the last 14 days");
  if (deploymentScore === 0)  recommendations.push("Deploy at least one asset to improve deployment readiness");
  if (documentationScore === 0) recommendations.push("Add documentation to improve knowledge coverage");
  if (missingAssets.length > 0) recommendations.push(`Add missing assets: ${missingAssets.join(", ")}`);

  const score: ProjectHealthScore = {
    projectId:          project.id,
    overallScore,
    completenessScore,
    activityScore,
    dependencyScore,
    deploymentScore,
    documentationScore,
    automationScore,
    missingAssets,
    healthWarnings,
    recommendations,
    computedAt:         new Date(),
  };

  // Persist health snapshot
  await db
    .insert(projectHealth as any)
    .values({
      projectId:          project.id,
      userId:             project.userId,
      overallScore,
      completenessScore,
      activityScore,
      dependencyScore,
      deploymentScore,
      documentationScore,
      automationScore,
      missingAssets,
      healthWarnings,
      recommendations,
    });

  // Update registry with latest score
  await db
    .update(projectRegistry as any)
    .set({ healthScore: overallScore, updatedAt: new Date() } as any)
    .where(sql`project_id = ${project.id}`);

  return score;
}

/** Get latest health score for a project */
export async function getLatestProjectHealth(projectId: number): Promise<ProjectHealthScore | null> {
  const rows = await db
    .select()
    .from(projectHealth as any)
    .where(sql`project_id = ${projectId}`)
    .orderBy(sql`computed_at DESC`)
    .limit(1) as any[];
  return rows.length > 0 ? rows[0] as ProjectHealthScore : null;
}

/** Get health for all projects for a user */
export async function getAllProjectHealth(userId: number): Promise<ProjectHealthScore[]> {
  const rows = await db.execute(sql`
    SELECT DISTINCT ON (project_id) *
    FROM project_health
    WHERE user_id = ${userId}
    ORDER BY project_id, computed_at DESC
  `) as any;
  return (rows.rows ?? rows) as ProjectHealthScore[];
}

async function countDeployedAssets(projectId: number): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sql`project_assets`)
    .where(sql`project_id = ${projectId} AND deployment_status = 'deployed' AND asset_status != 'archived'`) as any[];
  return rows[0]?.count ?? 0;
}
