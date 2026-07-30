// ─── Build 013: Executive Brain ↔ Learning Integration ───────────────────────
//
// Provides three functions consumed by the Executive Brain pipeline:
//
//   fetchLearningSummary   — reads validated principles summary from DB
//   triggerLearningCycle   — fire-and-forget learning cycle (async, never blocks)
//   buildLearningAdvisory  — converts a LearningSummary into a context note fragment
//
// Only VALIDATED principles are surfaced to the Executive Brain.
// Draft and Candidate principles are invisible here.

import { getLearningSummary } from "../executive-learning/learning-registry";
import { runLearningCycle } from "../executive-learning/learning-orchestrator";
import type { LearningSummary } from "../executive-learning/types";
import { logger } from "../logger";

// ── Fetch summary ─────────────────────────────────────────────────────────────

export async function fetchLearningSummary(userId: number): Promise<LearningSummary | null> {
  try {
    return await getLearningSummary(userId);
  } catch (err) {
    logger.warn({ err }, "Executive Brain: fetchLearningSummary failed (non-fatal)");
    return null;
  }
}

// ── Fire-and-forget learning cycle ───────────────────────────────────────────
// Called at most once per N brain cycles (every 20 cycles by default) to avoid
// repeated heavy queries on every request. The trigger count is tracked in
// memory (resets on server restart) — a lightweight approximation is fine here.

let brainCycleCount = 0;
const LEARNING_CYCLE_EVERY = 20; // trigger every 20 brain cycles

export function triggerLearningCycle(userId: number): void {
  brainCycleCount++;
  if (brainCycleCount % LEARNING_CYCLE_EVERY !== 0) return;

  void runLearningCycle({ userId }).catch((err) => {
    logger.warn({ err }, "Executive Brain: background learning cycle failed (non-fatal)");
  });
}

// ── Advisory text ─────────────────────────────────────────────────────────────

export function buildLearningAdvisory(summary: LearningSummary | null): string | null {
  if (!summary || summary.validatedPrincipleCount === 0) return null;

  const lines: string[] = [
    `EXECUTIVE PRINCIPLES (${summary.validatedPrincipleCount} validated):`,
  ];

  for (const p of summary.topValidatedPrinciples) {
    lines.push(`• [${p.businessDomain}] ${p.title} (confidence: ${p.confidence.toFixed(2)})`);
  }

  if (summary.lastCycleAt) {
    const ago = Math.round((Date.now() - summary.lastCycleAt.getTime()) / 60000);
    lines.push(`Last learning cycle: ${ago} min ago. Total cycles: ${summary.learningCycleCount}.`);
  }

  return lines.join("\n");
}
