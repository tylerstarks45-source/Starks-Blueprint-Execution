// ─── Execution Extension Points (Build 010) ──────────────────────────────────
//
// Ten seams where future intelligence layers attach to the Execution Engine.
// Uses the Build 001 extension-point registry — no new infrastructure.
//
// DO NOT implement:
//   Observation, Reflection, Learning, AI Agents, Browser Automation,
//   External APIs, Scheduling, Notifications, Autonomous decision making.
//   Only extension points.

import {
  declareExtensionPoint,
  registerExtension,
  getExtensions,
} from "../cognitive-foundation/extension-points";
import { logger } from "../logger";
import { EXECUTION_EXTENSION_POINT_IDS } from "./types";

export { EXECUTION_EXTENSION_POINT_IDS } from "./types";

export function declareExecutionExtensionPoints(): void {
  declareExtensionPoint({
    id: EXECUTION_EXTENSION_POINT_IDS.EXECUTION_STARTED,
    description:
      "Fires when an execution transitions from approved → running. " +
      "Future Observation systems subscribe here to begin monitoring. " +
      "Payload: ExecutiveExecution.",
    declaredBy: "executive-execution",
  });

  declareExtensionPoint({
    id: EXECUTION_EXTENSION_POINT_IDS.EXECUTION_COMPLETED,
    description:
      "Fires when an execution transitions to completed (success=true). " +
      "Future Learning and Reflection systems subscribe here. " +
      "Payload: ExecutiveExecution.",
    declaredBy: "executive-execution",
  });

  declareExtensionPoint({
    id: EXECUTION_EXTENSION_POINT_IDS.EXECUTION_FAILED,
    description:
      "Fires when an execution transitions to failed. " +
      "Future Recovery Intelligence and Learning systems subscribe here. " +
      "Payload: { execution: ExecutiveExecution, failureReason: string }.",
    declaredBy: "executive-execution",
  });

  declareExtensionPoint({
    id: EXECUTION_EXTENSION_POINT_IDS.EXECUTION_PAUSED,
    description:
      "Fires when an execution is paused. " +
      "Future Notification and Observation systems subscribe here. " +
      "Payload: ExecutiveExecution.",
    declaredBy: "executive-execution",
  });

  declareExtensionPoint({
    id: EXECUTION_EXTENSION_POINT_IDS.EXECUTION_RESUMED,
    description:
      "Fires when a paused execution is resumed. " +
      "Future Observation systems subscribe here to re-attach monitoring. " +
      "Payload: ExecutiveExecution.",
    declaredBy: "executive-execution",
  });

  declareExtensionPoint({
    id: EXECUTION_EXTENSION_POINT_IDS.EXECUTION_CANCELLED,
    description:
      "Fires when an execution is cancelled. " +
      "Future Reflection systems subscribe to evaluate cancellation patterns. " +
      "Payload: { execution: ExecutiveExecution, reason?: string }.",
    declaredBy: "executive-execution",
  });

  declareExtensionPoint({
    id: EXECUTION_EXTENSION_POINT_IDS.EXECUTION_STEP_STARTED,
    description:
      "Fires when an execution step transitions to running. " +
      "Future Adapter Dispatcher systems subscribe here to perform actual work. " +
      "Payload: { execution: ExecutiveExecution, step: ExecutionStep }.",
    declaredBy: "executive-execution",
  });

  declareExtensionPoint({
    id: EXECUTION_EXTENSION_POINT_IDS.EXECUTION_STEP_COMPLETED,
    description:
      "Fires when an execution step is marked completed. " +
      "Future Learning systems subscribe to track step velocity and success rates. " +
      "Payload: { execution: ExecutiveExecution, step: ExecutionStep }.",
    declaredBy: "executive-execution",
  });

  declareExtensionPoint({
    id: EXECUTION_EXTENSION_POINT_IDS.EXECUTION_STEP_FAILED,
    description:
      "Fires when a step fails (before retry is attempted). " +
      "Future Recovery Intelligence systems subscribe here. " +
      "Payload: { execution: ExecutiveExecution, step: ExecutionStep, failureReason: string }.",
    declaredBy: "executive-execution",
  });

  declareExtensionPoint({
    id: EXECUTION_EXTENSION_POINT_IDS.EXECUTION_RETRY_TRIGGERED,
    description:
      "Fires when a retry is initiated on an execution or step. " +
      "Future Observation and Learning systems subscribe to track retry patterns. " +
      "Payload: { executionId: string, stepId?: string, retryCount: number, maxRetries: number }.",
    declaredBy: "executive-execution",
  });
}

// ─── Hook firing utility ──────────────────────────────────────────────────────

export async function fireExecutionHooks<T>(pointId: string, payload: T): Promise<void> {
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
        "Execution extension hook failed (non-fatal)",
      );
    }
  }
}

// ─── Public registration helper ───────────────────────────────────────────────

export function registerExecutionHook<T>(
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
