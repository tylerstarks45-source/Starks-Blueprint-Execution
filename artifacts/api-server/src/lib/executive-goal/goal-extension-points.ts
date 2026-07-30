// ─── Goal Extension Points (Build 008) ───────────────────────────────────────
//
// Six seams where future intelligence layers attach to the Goal Engine.
// Uses the Build 001 extension-point registry — no new infrastructure.
//
// DO NOT implement:
//   Planning, Scheduling, Automatic Goal Creation, Learning, Reflection,
//   Execution, Optimization, Autonomous Goal Changes.
//   Only extension points.

import {
  declareExtensionPoint,
  registerExtension,
  getExtensions,
} from "../cognitive-foundation/extension-points";
import { logger } from "../logger";
import { GOAL_EXTENSION_POINT_IDS } from "./types";

export { GOAL_EXTENSION_POINT_IDS } from "./types";

export function declareGoalExtensionPoints(): void {
  declareExtensionPoint({
    id: GOAL_EXTENSION_POINT_IDS.GOAL_CREATED,
    description:
      "Fires after a new goal is created and persisted. " +
      "Future Planning systems subscribe here to react to new objectives. " +
      "Payload: ExecutiveGoal.",
    declaredBy: "executive-goal",
  });

  declareExtensionPoint({
    id: GOAL_EXTENSION_POINT_IDS.GOAL_STATUS_CHANGED,
    description:
      "Fires when a goal's status transitions (e.g. active→blocked). " +
      "Future Reflection systems subscribe here to evaluate transitions. " +
      "Payload: { goal, previousStatus, newStatus }.",
    declaredBy: "executive-goal",
  });

  declareExtensionPoint({
    id: GOAL_EXTENSION_POINT_IDS.GOAL_PRIORITY_COMPUTED,
    description:
      "Fires after the Priority Engine computes a goal's priority score. " +
      "Future adaptive-priority systems can override or supplement the score. " +
      "Payload: { goalId, priorityScore, dimensions }.",
    declaredBy: "executive-goal",
  });

  declareExtensionPoint({
    id: GOAL_EXTENSION_POINT_IDS.GOAL_CONFLICT_DETECTED,
    description:
      "Fires when the Conflict Engine detects one or more conflicts. " +
      "Future mediation or escalation systems subscribe here. " +
      "Payload: GoalConflict[].",
    declaredBy: "executive-goal",
  });

  declareExtensionPoint({
    id: GOAL_EXTENSION_POINT_IDS.GOAL_PROGRESS_UPDATED,
    description:
      "Fires after a goal's progress percentage or status is updated. " +
      "Future Learning systems subscribe to track velocity and completion patterns. " +
      "Payload: { goal, previousProgressPct, newProgressPct }.",
    declaredBy: "executive-goal",
  });

  declareExtensionPoint({
    id: GOAL_EXTENSION_POINT_IDS.GOAL_HIERARCHY_CHANGED,
    description:
      "Fires when a goal's parentGoalId changes (re-parenting). " +
      "Future structural analysis systems subscribe here. " +
      "Payload: { goalId, previousParentId, newParentId }.",
    declaredBy: "executive-goal",
  });
}

// ─── Hook firing utility ──────────────────────────────────────────────────────

export async function fireGoalHooks<T>(pointId: string, payload: T): Promise<void> {
  const extensions = getExtensions(pointId);
  if (extensions.length === 0) return;
  for (const ext of extensions) {
    try {
      if (typeof ext.handler === "function") {
        await ext.handler(payload);
      }
    } catch (err) {
      logger.warn(
        { err, pointId, providerBrain: ext.providerBrain },
        "Goal extension hook failed (non-fatal)",
      );
    }
  }
}

// ─── Public registration helper ───────────────────────────────────────────────

export function registerGoalHook<T>(
  pointId: string,
  providerBrain: string,
  description: string,
  handler: (payload: T) => Promise<void>,
): void {
  registerExtension({
    extensionPointId: pointId,
    providerBrain,
    description,
    handler: handler as (...args: unknown[]) => unknown,
  });
}
