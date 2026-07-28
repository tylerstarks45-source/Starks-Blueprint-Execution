import { db, ashProjectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AshProject, AshGoal, AshTask } from "@workspace/db";
import { logger } from "../logger";
import { buildWorkingMemory } from "./working-memory";
import { getRelevantLongTermMemory } from "./long-term-memory";
import { getRelevantProjectMemory } from "./project-memory";
import { getBusinessMemoryForSystemInstance } from "./business-memory";
import { getRelevantKnowledge } from "./knowledge-memory";
import type { RelevantMemoryBundle } from "./types";

export * from "./types";
export * as WorkingMemory from "./working-memory";
export * as LongTermMemory from "./long-term-memory";
export * as ProjectMemory from "./project-memory";
export * as BusinessMemory from "./business-memory";
export * as KnowledgeMemory from "./knowledge-memory";
export { captureAutoMemory } from "./auto-memory";
export { runMemoryMaintenance } from "./maintenance";
export { recordProjectCompletionLessons } from "./learning";

// ─── Memory Engine (ASH Brain v2.0 — Phase 1.2) ────────────────────────────
// Single entry point: retrieve relevant memory across all 5 layers for the
// current request and render it as one compact context note. Called from
// runExecutiveBrain() and appended to the existing brainContextNote, so the
// (untouched) orchestrator sees one combined internal-context block — no
// change to its prompt-assembly code.
//
// Retrieval is intentionally capped and relevance-ranked per layer (see
// relevance.ts) rather than dumping everything — "inject only what's
// relevant, not the entire memory database" per the Phase 1.2 spec.
export async function retrieveRelevantMemory(params: {
  userId: number;
  message: string;
  project: AshProject;
  goal: AshGoal | null;
  tasks: AshTask[];
  history: Array<{ role: "user" | "assistant"; content: string }>;
  // Business Context Isolation: the caller (routes/executive-brain.ts)
  // resolves the active business once and passes it through here so
  // business-scoped Long-Term/Knowledge memory retrieval stays confined to
  // it. crossBusinessMode is the ONLY way that restriction is lifted, and
  // it is always an explicit, caller-provided flag — never inferred here.
  businessId?: number | null;
  crossBusinessMode?: boolean;
}): Promise<RelevantMemoryBundle> {
  const { userId, message, project, goal, tasks, history, businessId, crossBusinessMode } = params;

  const working = buildWorkingMemory({ project, goal, tasks, history });

  const [longTerm, projectMem, business, knowledge] = await Promise.all([
    getRelevantLongTermMemory({ userId, message, businessId, crossBusinessMode }).catch((err) => (logCatch(err, "long-term"), [])),
    getRelevantProjectMemory({ projectId: project.id, message }).catch((err) => (logCatch(err, "project"), [])),
    getBusinessMemoryForSystemInstance(project.systemInstanceId).catch((err) => (logCatch(err, "business"), null)),
    getRelevantKnowledge({ userId, message, businessId, crossBusinessMode }).catch((err) => (logCatch(err, "knowledge"), [])),
  ]);

  const contextNote = renderContextNote({ working, longTerm, project: projectMem, business, knowledge });

  return { working, longTerm, project: projectMem, business, knowledge, contextNote };
}

function logCatch(err: unknown, layer: string): void {
  logger.warn({ err, layer }, "Memory Engine: retrieval failed for a layer, continuing without it");
}

function renderContextNote(bundle: Omit<RelevantMemoryBundle, "contextNote">): string {
  const { working, longTerm, project, business, knowledge } = bundle;
  const lines: string[] = [];

  if (working.currentTasks.length > 0 || working.currentObjective) {
    lines.push(`\n\n=== MEMORY: WORKING (internal — do not repeat verbatim) ===`);
    if (working.currentObjective) lines.push(`Objective: ${working.currentObjective.goalText}`);
    if (working.currentTasks.length > 0) {
      lines.push(`Open tasks: ${working.currentTasks.map((t) => t.description).join("; ")}`);
    }
  }

  if (longTerm.length > 0) {
    lines.push(`\n=== MEMORY: LONG-TERM (about this user) ===`);
    for (const m of longTerm) lines.push(`- ${m.memoryKey.replace(/^auto:[^:]+:/, "")}: ${m.memoryValue}`);
  }

  if (project.length > 0) {
    lines.push(`\n=== MEMORY: THIS PROJECT ===`);
    for (const m of project) lines.push(`- [${m.type}] ${m.title ? `${m.title}: ` : ""}${m.content}`);
  }

  if (business) {
    const bizLines: string[] = [];
    if (business.businessModel) bizLines.push(`Model: ${business.businessModel}`);
    if (Array.isArray(business.products) && business.products.length) bizLines.push(`Products: ${business.products.join(", ")}`);
    if (Array.isArray(business.services) && business.services.length) bizLines.push(`Services: ${business.services.join(", ")}`);
    if (Array.isArray(business.customers) && business.customers.length) bizLines.push(`Customers: ${business.customers.join(", ")}`);
    if (Array.isArray(business.competitors) && business.competitors.length) bizLines.push(`Competitors: ${business.competitors.join(", ")}`);
    if (business.marketingStrategy) bizLines.push(`Marketing strategy: ${business.marketingStrategy}`);
    if (business.seoStrategy) bizLines.push(`SEO strategy: ${business.seoStrategy}`);
    if (business.automationStrategy) bizLines.push(`Automation strategy: ${business.automationStrategy}`);
    if (business.revenueGoals) bizLines.push(`Revenue goals: ${business.revenueGoals}`);
    if (bizLines.length > 0) {
      lines.push(`\n=== MEMORY: BUSINESS ===`, ...bizLines.map((l) => `- ${l}`));
    }
  }

  if (knowledge.length > 0) {
    lines.push(`\n=== MEMORY: KNOWLEDGE (patterns learned from this user's past work) ===`);
    for (const k of knowledge) lines.push(`- [${k.category}] ${k.title}: ${k.content}`);
  }

  return lines.join("\n");
}

// Small helper used by routes/executive-brain.ts to resolve the project row
// fresh (post-brain-phase mutation) before firing auto-memory capture.
export async function getProjectRow(projectId: number): Promise<AshProject | null> {
  const [row] = await db.select().from(ashProjectsTable).where(eq(ashProjectsTable.id, projectId));
  return row ?? null;
}
