// ─────────────────────────────────────────────────────────────────────────────
// Build 053 — Experience Engine
// Owns every customer-facing experience lifecycle
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import {
  businessExperiences, experiencePages, experienceSections,
  experienceRegistry,
} from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { ExperienceType, ExperienceStatus, PageType, SectionType } from "./types";
import { randomUUID } from "crypto";

export interface ExperienceInput {
  businessId?:    number;
  userId?:        number;
  title:          string;
  experienceType: ExperienceType;
  slug:           string;
  domain?:        string;
  description?:   string;
  targetAudience?:string;
  brandSummary?:  string;
  metadata?:      Record<string, unknown>;
}

export interface PageInput {
  experienceId: string;
  title:        string;
  slug:         string;
  pageType?:    PageType;
  isHomePage?:  boolean;
  seoTitle?:    string;
  seoDescription?: string;
  sortOrder?:   number;
  metadata?:    Record<string, unknown>;
}

export interface SectionInput {
  experienceId: string;
  title:        string;
  sectionType:  SectionType;
  isReusable?:  boolean;
  isGlobal?:    boolean;
  sortOrder?:   number;
  styles?:      Record<string, unknown>;
}

export async function createExperience(input: ExperienceInput): Promise<any> {
  const experienceId = `exp_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const rows = await db.insert(businessExperiences).values({
    experienceId,
    businessId:    input.businessId ?? null,
    userId:        input.userId ?? null,
    title:         input.title,
    experienceType:input.experienceType,
    slug:          input.slug,
    domain:        input.domain ?? null,
    status:        "draft",
    description:   input.description ?? "",
    targetAudience:input.targetAudience ?? "",
    brandSummary:  input.brandSummary ?? "",
    metadata:      input.metadata ?? {},
  }).returning() as any[];

  // Insert into mutable registry
  await db.insert(experienceRegistry).values({
    experienceId,
    title:          input.title,
    experienceType: input.experienceType,
    businessId:     input.businessId ?? null,
    userId:         input.userId ?? null,
    status:         "draft",
    isPublished:    false,
    pageCount:      0,
    seoScore:       0,
    healthStatus:   "healthy",
    updatedAt:      new Date(),
  });

  return rows[0];
}

export async function createPage(input: PageInput): Promise<any> {
  const pageId = `page_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const rows = await db.insert(experiencePages).values({
    experienceId:  input.experienceId,
    pageId,
    title:         input.title,
    slug:          input.slug,
    pageType:      input.pageType ?? "standard",
    layoutTemplate:"blank",
    componentTree: {},
    sectionIds:    [],
    seoTitle:      input.seoTitle ?? null,
    seoDescription:input.seoDescription ?? null,
    isHomePage:    input.isHomePage ?? false,
    isHidden:      false,
    sortOrder:     input.sortOrder ?? 0,
    breakpoints:   {},
    metadata:      input.metadata ?? {},
  }).returning() as any[];

  // Update page count in registry
  await db.execute(
    `UPDATE experience_registry SET page_count = page_count + 1, updated_at = NOW() WHERE experience_id = '${input.experienceId}'`
  );

  return rows[0];
}

export async function createSection(input: SectionInput): Promise<any> {
  const sectionId = `sec_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const rows = await db.insert(experienceSections).values({
    experienceId: input.experienceId,
    sectionId,
    title:        input.title,
    sectionType:  input.sectionType,
    componentTree:{},
    isReusable:   input.isReusable ?? false,
    isGlobal:     input.isGlobal ?? false,
    sortOrder:    input.sortOrder ?? 0,
    styles:       input.styles ?? {},
    metadata:     {},
  }).returning() as any[];
  return rows[0];
}

export async function listExperiences(userId?: number, businessId?: number): Promise<any[]> {
  const rows = await db.select().from(experienceRegistry);
  return rows.filter((r: any) => {
    if (userId    !== undefined && r.userId    !== userId)    return false;
    if (businessId !== undefined && r.businessId !== businessId) return false;
    return true;
  });
}

export async function listPages(experienceId: string): Promise<any[]> {
  return db.select().from(experiencePages)
    .where(eq(experiencePages.experienceId, experienceId))
    .orderBy(experiencePages.sortOrder);
}

export async function listSections(experienceId: string): Promise<any[]> {
  return db.select().from(experienceSections)
    .where(eq(experienceSections.experienceId, experienceId))
    .orderBy(experienceSections.sortOrder);
}

export async function getExperienceCounts(): Promise<{ total: number; published: number; draft: number }> {
  const rows = await db.select({
    status: experienceRegistry.status,
  }).from(experienceRegistry);
  return {
    total:     rows.length,
    published: rows.filter((r: any) => r.status === "published").length,
    draft:     rows.filter((r: any) => r.status === "draft").length,
  };
}
