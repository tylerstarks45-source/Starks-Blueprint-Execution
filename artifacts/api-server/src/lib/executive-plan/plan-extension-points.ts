// ─── Plan Extension Points (Build 009) ───────────────────────────────────────
//
// Six seams where future intelligence layers attach to the Planning Engine.
// Uses the Build 001 extension-point registry — no new infrastructure.
//
// DO NOT implement:
//   Execution, Scheduling, Task Automation, Learning, Reflection,
//   Adaptive Planning, Self-modifying Plans, Autonomous Execution.
//   Only extension points.

import {
  declareExtensionPoint,
  registerExtension,
  getExtensions,
} from "../cognitive-foundation/extension-points";
import { logger } from "../logger";
import { PLAN_EXTENSION_POINT_IDS } from "./types";

export { PLAN_EXTENSION_POINT_IDS } from "./types";

export function declarePlanExtensionPoints(): void {
  declareExtensionPoint({
    id: PLAN_EXTENSION_POINT_IDS.PLAN_GENERATED,
    description:
      "Fires after a plan is generated and persisted (milestones + steps created). " +
      "Future Execution systems subscribe here to receive plans ready for action. " +
      "Payload: GeneratedPlanResult.",
    declaredBy: "executive-plan",
  });

  declareExtensionPoint({
    id: PLAN_EXTENSION_POINT_IDS.PLAN_STATUS_CHANGED,
    description:
      "Fires when a plan's status transitions (e.g. draft→active, active→archived). " +
      "Future Reflection systems subscribe here to evaluate planning transitions. " +
      "Payload: { plan, previousStatus, newStatus }.",
    declaredBy: "executive-plan",
  });

  declareExtensionPoint({
    id: PLAN_EXTENSION_POINT_IDS.PLAN_SCORED,
    description:
      "Fires after the Plan Scoring Engine computes scores for a plan. " +
      "Future adaptive-scoring systems can augment or override plan scores. " +
      "Payload: { planId, score, dimensions }.",
    declaredBy: "executive-plan",
  });

  declareExtensionPoint({
    id: PLAN_EXTENSION_POINT_IDS.PLAN_DEPENDENCY_DETECTED,
    description:
      "Fires after dependency analysis finds issues (errors or warnings). " +
      "Future mediation, escalation, or auto-repair systems subscribe here. " +
      "Payload: PlanDependencyReport.",
    declaredBy: "executive-plan",
  });

  declareExtensionPoint({
    id: PLAN_EXTENSION_POINT_IDS.PLAN_MILESTONE_COMPLETED,
    description:
      "Fires when a plan milestone is marked as completed. " +
      "Future Learning systems subscribe to track milestone velocity and success patterns. " +
      "Payload: { plan, milestone }.",
    declaredBy: "executive-plan",
  });

  declareExtensionPoint({
    id: PLAN_EXTENSION_POINT_IDS.PLAN_ARCHIVED,
    description:
      "Fires when a plan is archived or rejected. " +
      "Future Reflection systems subscribe to learn from rejected strategies. " +
      "Payload: { plan, reason? }.",
    declaredBy: "executive-plan",
  });
}

// ─── Hook firing utility ──────────────────────────────────────────────────────

export async function firePlanHooks<T>(pointId: string, payload: T): Promise<void> {
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
        "Plan extension hook failed (non-fatal)",
      );
    }
  }
}

// ─── Public registration helper ───────────────────────────────────────────────

export function registerPlanHook<T>(
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
