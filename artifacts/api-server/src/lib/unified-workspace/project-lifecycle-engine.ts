// ── Build 047: Project Lifecycle Engine ──────────────────────────────────────
// Owns project creation, archival, templates, cloning, and migration.
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { businessProjects, projectTemplates, projectRegistry } from "@workspace/db/schema";
import { logger } from "../logger";
import { BUILTIN_TEMPLATES } from "./types";
import type { BusinessProject, ProjectType, ProjectPhase, ProjectTemplate } from "./types";

// ── Projects ──────────────────────────────────────────────────────────────────

/** Create a new project */
export async function createProject(params: {
  userId:      number;
  workspaceId?: number;
  businessId?:  number;
  projectName: string;
  projectType: ProjectType;
  description?: string;
  tags?:        string[];
  templateId?:  number;
  metadata?:    Record<string, unknown>;
}): Promise<BusinessProject> {
  const rows = await db
    .insert(businessProjects as any)
    .values({
      userId:      params.userId,
      workspaceId: params.workspaceId ?? null,
      businessId:  params.businessId ?? null,
      projectName: params.projectName,
      projectType: params.projectType,
      description: params.description ?? "",
      tags:        params.tags ?? [],
      templateId:  params.templateId ?? null,
      metadata:    params.metadata ?? {},
    })
    .returning() as any[];
  const row = rows[0] as BusinessProject;
  // Upsert into registry
  await upsertProjectRegistry(row);
  logger.info({ projectId: row.id, userId: params.userId }, "UWPS: project created");
  return row;
}

/** List projects for a user (optionally filter by businessId / workspaceId) */
export async function listProjects(
  userId:      number,
  businessId?: number,
  workspaceId?: number,
): Promise<BusinessProject[]> {
  let cond = sql`user_id = ${userId} AND status != 'archived'`;
  if (businessId)  cond = sql`${cond} AND business_id = ${businessId}`;
  if (workspaceId) cond = sql`${cond} AND workspace_id = ${workspaceId}`;
  const rows = await db
    .select()
    .from(businessProjects as any)
    .where(cond)
    .orderBy(sql`updated_at DESC`) as any[];
  return rows as BusinessProject[];
}

/** Update project phase */
export async function advanceProjectPhase(
  projectId: number,
  userId:    number,
  phase:     ProjectPhase,
): Promise<void> {
  await db
    .update(businessProjects as any)
    .set({ phase, updatedAt: new Date() } as any)
    .where(sql`id = ${projectId} AND user_id = ${userId}`);
}

/** Archive a project */
export async function archiveProject(projectId: number, userId: number): Promise<void> {
  await db
    .update(businessProjects as any)
    .set({ status: "archived", updatedAt: new Date() } as any)
    .where(sql`id = ${projectId} AND user_id = ${userId}`);
  await db
    .update(projectRegistry as any)
    .set({ status: "archived", updatedAt: new Date() } as any)
    .where(sql`project_id = ${projectId}`);
}

// ── Templates ─────────────────────────────────────────────────────────────────

/** Seed built-in project templates (idempotent) */
export async function seedProjectTemplates(): Promise<number> {
  let seeded = 0;
  for (const tmpl of BUILTIN_TEMPLATES) {
    const existing = await db
      .select()
      .from(projectTemplates as any)
      .where(sql`template_name = ${tmpl.templateName} AND is_builtin = true`) as any[];
    if (existing.length === 0) {
      await db
        .insert(projectTemplates as any)
        .values({
          templateName:   tmpl.templateName,
          templateType:   tmpl.templateType,
          description:    tmpl.description,
          requiredAssets: tmpl.requiredAssets,
          optionalAssets: tmpl.optionalAssets,
          isBuiltin:      true,
        });
      seeded++;
    }
  }
  return seeded;
}

/** List templates */
export async function listTemplates(type?: string): Promise<ProjectTemplate[]> {
  const cond = type
    ? sql`template_type = ${type}`
    : sql`1=1`;
  const rows = await db
    .select()
    .from(projectTemplates as any)
    .where(cond)
    .orderBy(sql`is_builtin DESC, template_name ASC`) as any[];
  return rows as ProjectTemplate[];
}

// ── Registry (mutable) ────────────────────────────────────────────────────────

export async function upsertProjectRegistry(project: BusinessProject): Promise<void> {
  const existing = await db
    .select()
    .from(projectRegistry as any)
    .where(sql`project_id = ${project.id}`) as any[];
  if (existing.length > 0) {
    await db
      .update(projectRegistry as any)
      .set({
        projectName: project.projectName,
        projectType: project.projectType,
        status:      project.status,
        updatedAt:   new Date(),
      } as any)
      .where(sql`project_id = ${project.id}`);
  } else {
    await db
      .insert(projectRegistry as any)
      .values({
        projectId:   project.id,
        userId:      project.userId,
        businessId:  project.businessId ?? null,
        workspaceId: project.workspaceId ?? null,
        projectName: project.projectName,
        projectType: project.projectType,
        status:      project.status,
        assetCount:  0,
        healthScore: 0,
      });
  }
}

/** Get registry (all projects for user) */
export async function getProjectRegistry(userId: number): Promise<any[]> {
  return db
    .select()
    .from(projectRegistry as any)
    .where(sql`user_id = ${userId}`)
    .orderBy(sql`health_score ASC`) as any;
}
