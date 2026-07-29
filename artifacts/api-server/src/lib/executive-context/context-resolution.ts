// ─── Context Resolution Engine (Build 006) ───────────────────────────────────
//
// Before every Executive reasoning cycle, this engine:
//   1. Selects all active contexts for the user
//   2. Finds contexts relevant to the current objective
//   3. Detects conflicts between active contexts
//   4. Determines priority order
//   5. Enriches the snapshot with related cognitive infrastructure
//   6. Produces ONE immutable Executive Context Snapshot
//
// The Executive Brain consumes only the frozen snapshot — never raw contexts.
// This separation is the architectural guarantee that future replay, auditing,
// and learning are possible: the full reasoning context is preserved.
//
// DO NOT implement:
//   - Automatic context discovery or prediction
//   - Context merging or splitting
//   - Context inheritance or expiration

import { db, contextSnapshotsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { logger } from "../logger";
import { listContexts } from "./context-registry";
import { listBrains } from "../cognitive-foundation/brain-registry";
import type {
  ExecutiveContextModel,
  ExecutiveContextSnapshot,
  ContextResolutionResult,
} from "./types";
import { CONTEXT_EXTENSION_POINT_IDS, fireContextHooks } from "./context-extension-points";

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToSnapshot(row: typeof contextSnapshotsTable.$inferSelect): ExecutiveContextSnapshot {
  return {
    ...row,
    contextIds: (row.contextIds as string[]) ?? [],
    activeObjectives: (row.activeObjectives as string[]) ?? [],
    activeConstraints: (row.activeConstraints as string[]) ?? [],
    activePriorities: (row.activePriorities as string[]) ?? [],
    activeRisks: (row.activeRisks as string[]) ?? [],
    relatedArtifactIds: (row.relatedArtifactIds as string[]) ?? [],
    relatedClusterIds: (row.relatedClusterIds as string[]) ?? [],
    relatedBrainNames: (row.relatedBrainNames as string[]) ?? [],
    relatedCapabilityIds: (row.relatedCapabilityIds as string[]) ?? [],
    environmentalMetadata: (row.environmentalMetadata as Record<string, unknown>) ?? {},
    conflictFlags: (row.conflictFlags as string[]) ?? [],
  };
}

// ─── Internal resolution helpers ─────────────────────────────────────────────

/** Select all active contexts for a user. */
async function selectActiveContexts(userId: number): Promise<ExecutiveContextModel[]> {
  return listContexts(userId, "active");
}

/** Keyword-relevance scoring: does this context seem related to the objective?
 *  Returns a relevance score 0–1. Future builds replace with semantic scoring. */
function scoreContextRelevance(context: ExecutiveContextModel, objective: string): number {
  if (!objective.trim()) return 0.5; // No objective: treat all equally relevant
  const tokens = objective.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length >= 3);
  if (tokens.length === 0) return 0.5;

  const haystack = [
    context.name,
    context.description ?? "",
    context.purpose ?? "",
    context.mission ?? "",
    context.scope ?? "",
    ...context.objectives,
    ...context.priorities,
  ].join(" ").toLowerCase();

  const matches = tokens.filter((t) => haystack.includes(t)).length;
  return matches / tokens.length;
}

/** Detect simple conflicts between active contexts.
 *  Currently: marks pairs with the same name as potential conflicts.
 *  Future builds implement semantic conflict detection. */
function detectConflicts(
  contexts: ExecutiveContextModel[],
): Array<{ contextA: string; contextB: string; reason: string }> {
  const conflicts: Array<{ contextA: string; contextB: string; reason: string }> = [];
  for (let i = 0; i < contexts.length; i++) {
    for (let j = i + 1; j < contexts.length; j++) {
      const a = contexts[i]!;
      const b = contexts[j]!;
      // Heuristic: contradicting constraints
      const aConstraintSet = new Set(a.constraints.map((c) => c.toLowerCase().trim()));
      for (const bc of b.constraints) {
        const bcLower = bc.toLowerCase().trim();
        // Very simple heuristic: "must X" vs "must not X" or "no X"
        if (aConstraintSet.has(`must not ${bcLower}`) || aConstraintSet.has(`no ${bcLower}`)) {
          conflicts.push({
            contextA: a.id,
            contextB: b.id,
            reason: `Constraint conflict: "${bc}" in ${b.name} appears to contradict a constraint in ${a.name}`,
          });
        }
      }
    }
  }
  return conflicts;
}

/** Prioritize contexts: strategic > operational > tactical > exploratory > investigative.
 *  Within the same type, more recently updated contexts come first. */
function prioritizeContexts(contexts: ExecutiveContextModel[]): ExecutiveContextModel[] {
  const typePriority: Record<string, number> = {
    strategic: 0,
    operational: 1,
    tactical: 2,
    exploratory: 3,
    investigative: 4,
  };
  return [...contexts].sort((a, b) => {
    const tp = (typePriority[a.contextType] ?? 99) - (typePriority[b.contextType] ?? 99);
    if (tp !== 0) return tp;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}

/** Merge and de-duplicate context dimension arrays across all contributing contexts.
 *  Priority order is preserved (earlier-priority context items appear first). */
function mergeArrays(contexts: ExecutiveContextModel[], field: keyof ExecutiveContextModel): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const ctx of contexts) {
    const arr = ctx[field] as string[];
    for (const item of arr) {
      const key = item.toLowerCase().trim();
      if (!seen.has(key) && item.trim()) {
        seen.add(key);
        result.push(item);
      }
    }
  }
  return result;
}

/** Freeze and persist an immutable snapshot to the DB. */
async function freezeSnapshot(
  snapshot: Omit<ExecutiveContextSnapshot, "id" | "createdAt">,
): Promise<ExecutiveContextSnapshot> {
  const id = crypto.randomUUID();
  const [row] = await db
    .insert(contextSnapshotsTable)
    .values({
      id,
      userId: snapshot.userId,
      contextIds: snapshot.contextIds,
      objectiveText: snapshot.objectiveText ?? null,
      activeObjectives: snapshot.activeObjectives,
      activeConstraints: snapshot.activeConstraints,
      activePriorities: snapshot.activePriorities,
      activeRisks: snapshot.activeRisks,
      relatedArtifactIds: snapshot.relatedArtifactIds,
      relatedClusterIds: snapshot.relatedClusterIds,
      relatedBrainNames: snapshot.relatedBrainNames,
      relatedCapabilityIds: snapshot.relatedCapabilityIds,
      environmentalMetadata: snapshot.environmentalMetadata,
      conflictFlags: snapshot.conflictFlags,
      resolutionStrategy: snapshot.resolutionStrategy ?? null,
    })
    .returning();
  if (!row) throw new Error("Failed to persist context snapshot");
  return rowToSnapshot(row);
}

// ─── Main resolution entry point ──────────────────────────────────────────────

/** Resolve active contexts for a user into one immutable Executive Context Snapshot.
 *
 *  This is the ONLY function Executive Brain should call. The returned snapshot
 *  is immediately persisted — its id can be stored with a Decision Record for
 *  future replay and auditing.
 *
 *  Options:
 *   - `objectiveText`: the objective being pursued (used for relevance scoring)
 *   - `minRelevanceScore`: threshold for including a context (default: 0.1)
 *   - `persist`: whether to write the snapshot to DB (default: true)
 */
export async function resolveContextSnapshot(
  userId: number,
  objectiveText?: string,
  options: {
    minRelevanceScore?: number;
    persist?: boolean;
  } = {},
): Promise<ExecutiveContextSnapshot> {
  const { minRelevanceScore = 0.1, persist = true } = options;

  // Fire pre-resolve hook (future Brains can inject selection criteria)
  await fireContextHooks(CONTEXT_EXTENSION_POINT_IDS.PRE_RESOLVE, { userId, objectiveText });

  // 1. Select all active contexts
  const activeContexts = await selectActiveContexts(userId);

  // 2. Score and filter for relevance to the current objective
  const relevantContexts =
    objectiveText
      ? activeContexts.filter((c) => scoreContextRelevance(c, objectiveText) >= minRelevanceScore)
      : activeContexts;

  // 3. Prioritize
  const prioritized = prioritizeContexts(relevantContexts);

  // 4. Detect conflicts
  const rawConflicts = detectConflicts(prioritized);
  const conflictFlags = rawConflicts.map((c) => c.reason);

  // 5. Merge context dimensions
  const activeObjectives = mergeArrays(prioritized, "objectives");
  const activeConstraints = mergeArrays(prioritized, "constraints");
  const activePriorities = mergeArrays(prioritized, "priorities");
  const activeRisks = mergeArrays(prioritized, "risks");

  // 6. Collect related cognitive infrastructure from the Brain Registry
  const registeredBrains = listBrains();
  const relatedBrainNames = registeredBrains.map((b) => b.name);

  // 7. Build environment metadata
  const environmentalMetadata: Record<string, unknown> = {
    activeContextCount: activeContexts.length,
    relevantContextCount: relevantContexts.length,
    conflictCount: rawConflicts.length,
    resolvedAt: new Date().toISOString(),
  };

  const resolutionResult: ContextResolutionResult = {
    activeContexts,
    relevantContexts: prioritized,
    conflictingContexts: rawConflicts,
    priorityOrder: prioritized.map((c) => c.id),
    parentContextIds: [],
    childContextIds: [],
    snapshot: {} as ExecutiveContextSnapshot, // filled below
  };

  // Fire post-resolve hook (future Brains can enrich resolution result)
  const enrichedResult = await fireContextHooks(
    CONTEXT_EXTENSION_POINT_IDS.POST_RESOLVE,
    resolutionResult,
  );

  const snapshotInput: Omit<ExecutiveContextSnapshot, "id" | "createdAt"> = {
    userId,
    contextIds: enrichedResult.priorityOrder,
    objectiveText: objectiveText ?? null,
    activeObjectives,
    activeConstraints,
    activePriorities,
    activeRisks,
    relatedArtifactIds: [],
    relatedClusterIds: [],
    relatedBrainNames,
    relatedCapabilityIds: [],
    environmentalMetadata,
    conflictFlags,
    resolutionStrategy:
      rawConflicts.length > 0 ? "priority-order" :
      prioritized.length === 0 ? "empty" :
      "merge",
  };

  if (!persist) {
    return { id: crypto.randomUUID(), ...snapshotInput, createdAt: new Date() };
  }

  const frozen = await freezeSnapshot(snapshotInput);

  // Fire snapshot-frozen hook
  await fireContextHooks(CONTEXT_EXTENSION_POINT_IDS.SNAPSHOT_FROZEN, frozen);

  logger.debug(
    {
      snapshotId: frozen.id,
      userId,
      activeContexts: activeContexts.length,
      relevant: prioritized.length,
      conflicts: rawConflicts.length,
    },
    "Context snapshot resolved and frozen",
  );

  return frozen;
}

/** Retrieve a previously frozen snapshot by id. */
export async function getSnapshot(snapshotId: string): Promise<ExecutiveContextSnapshot | null> {
  const rows = await db
    .select()
    .from(contextSnapshotsTable)
    .where(eq(contextSnapshotsTable.id, snapshotId))
    .limit(1);
  return rows[0] ? rowToSnapshot(rows[0]) : null;
}

/** Return the most recent snapshots for a user (for history/audit). */
export async function getRecentSnapshots(
  userId: number,
  limit = 10,
): Promise<ExecutiveContextSnapshot[]> {
  const rows = await db
    .select()
    .from(contextSnapshotsTable)
    .where(eq(contextSnapshotsTable.userId, userId))
    .orderBy(desc(contextSnapshotsTable.createdAt))
    .limit(limit);
  return rows.map(rowToSnapshot);
}
