import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { processDependencies, processRegistry } from "@workspace/db/schema";
import { eq, or, sql } from "drizzle-orm";
import type { DependencyType } from "./types.js";

export interface CreateDependencyInput {
  sourceProcessId:  string;
  targetProcessId:  string;
  dependencyType:   DependencyType;
  strength?:        number;
  isCriticalPath?:  boolean;
  description?:     string;
}

export async function createDependency(input: CreateDependencyInput) {
  const dependencyId = `dep_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const rows = (await db.insert(processDependencies).values({
    dependencyId,
    sourceProcessId: input.sourceProcessId,
    targetProcessId: input.targetProcessId,
    dependencyType:  input.dependencyType,
    strength:        input.strength ?? 1.0,
    isCriticalPath:  input.isCriticalPath ?? false,
    description:     input.description ?? null,
  }).returning()) as any[];

  // Bump dependency counts in registry for both sides
  await db.execute(sql`
    UPDATE process_registry
       SET dependency_count = dependency_count + 1,
           updated_at       = NOW()
     WHERE process_id IN (${input.sourceProcessId}, ${input.targetProcessId})
  `);

  return rows[0];
}

export async function listDependencies(processId: string) {
  return db.select().from(processDependencies)
    .where(or(
      eq(processDependencies.sourceProcessId, processId),
      eq(processDependencies.targetProcessId, processId),
    ));
}

/** Return the critical-path dependency chain (sourceId chain that is_critical_path). */
export async function getCriticalPath(processId: string): Promise<Array<{
  dependencyId: string;
  sourceProcessId: string;
  targetProcessId: string;
  dependencyType: string;
}>> {
  const result = await db.execute(sql`
    SELECT dependency_id, source_process_id, target_process_id, dependency_type
      FROM process_dependencies
     WHERE (source_process_id = ${processId} OR target_process_id = ${processId})
       AND is_critical_path = true
     ORDER BY created_at ASC
  `);
  return (result as any).rows ?? [];
}
