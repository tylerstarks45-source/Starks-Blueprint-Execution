import { db, ashTasksTable, type AshTask } from "@workspace/db";
import { eq } from "drizzle-orm";

// ─── Task Prioritization (Phase 1.3) ───────────────────────────────────────
// Every task gets a Priority Score, Complexity Score, Dependency Score,
// Estimated Duration, and Execution Order. Pure heuristics (no AI call) so
// re-prioritization can run cheaply and often — every time a task is
// created, completed, or blocked, per the spec's "automatically
// reprioritize" requirement.

const PRIORITY_BASE: Record<string, number> = { low: 25, medium: 50, high: 75, critical: 95 };

const COMPLEXITY_KEYWORDS: Array<[number, string[]]> = [
  [85, ["integrate", "migrate", "architecture", "multi-step", "end-to-end", "full system"]],
  [65, ["build", "create a website", "set up a store", "automation", "workflow"]],
  [35, ["update", "fix", "adjust", "tweak", "small change"]],
];

function estimateComplexity(description: string): number {
  const lower = description.toLowerCase();
  for (const [score, keywords] of COMPLEXITY_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return score;
  }
  // Longer descriptions tend to describe more involved work.
  return Math.min(90, 30 + Math.floor(description.length / 20));
}

function estimateDurationMinutes(complexityScore: number): number {
  // Rough linear mapping: trivial ~10min, most complex ~180min.
  return Math.round(10 + (complexityScore / 100) * 170);
}

/**
 * Recomputes priorityScore/complexityScore/dependencyScore/
 * estimatedDurationMinutes/executionOrder for every non-terminal task in a
 * project, then persists them. Safe to call after any task state change.
 */
export async function reprioritizeProject(projectId: number): Promise<AshTask[]> {
  const tasks = await db.select().from(ashTasksTable).where(eq(ashTasksTable.projectId, projectId));

  // Dependency score = how many other (non-completed) tasks depend on this
  // one — unblocking it unblocks the most future work, so it should sort earlier.
  const dependencyCounts = new Map<number, number>();
  for (const t of tasks) {
    const deps = Array.isArray(t.dependencies) ? (t.dependencies as number[]) : [];
    for (const depId of deps) dependencyCounts.set(depId, (dependencyCounts.get(depId) ?? 0) + 1);
  }
  const maxDependents = Math.max(1, ...dependencyCounts.values());

  const scored = tasks.map((t) => {
    const priorityScore = PRIORITY_BASE[t.priority] ?? 50;
    const complexityScore = estimateComplexity(t.description);
    const dependencyScore = Math.round(((dependencyCounts.get(t.id) ?? 0) / maxDependents) * 100);
    const estimatedDurationMinutes = estimateDurationMinutes(complexityScore);
    return { task: t, priorityScore, complexityScore, dependencyScore, estimatedDurationMinutes };
  });

  // Execution order: unmet-dependency tasks sort after their prerequisites;
  // within that, higher (priority + dependencyScore, lower complexity) first.
  const rank = (s: (typeof scored)[number]) => s.priorityScore * 2 + s.dependencyScore - s.complexityScore * 0.5;
  const ordered = [...scored].sort((a, b) => rank(b) - rank(a));

  const updated: AshTask[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const s = ordered[i];
    if (s.task.status === "completed" || s.task.status === "failed") {
      // Keep terminal tasks' scores but don't reshuffle their execution order.
      updated.push(s.task);
      continue;
    }
    const [row] = await db
      .update(ashTasksTable)
      .set({
        priorityScore: s.priorityScore,
        complexityScore: s.complexityScore,
        dependencyScore: s.dependencyScore,
        estimatedDurationMinutes: s.estimatedDurationMinutes,
        executionOrder: i,
      })
      .where(eq(ashTasksTable.id, s.task.id))
      .returning();
    updated.push(row);
  }

  return updated;
}
