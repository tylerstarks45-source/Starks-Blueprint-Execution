// ─── Reflection Extension Points (Build 012) ─────────────────────────────────
//
// Eight seams where future intelligence layers attach to the Reflection Engine.
// Uses the Build 001 extension-point registry — no new infrastructure.
//
// DO NOT implement:
//   Learning, Adaptation, Business Optimization, Predictive Reflection,
//   Executive Coaching, Decision Simulation, Counterfactual Analysis,
//   Strategy Evolution.
//   Only extension points.

import {
  declareExtensionPoint,
  registerExtension,
  getExtensions,
} from "../cognitive-foundation/extension-points";
import { logger } from "../logger";
import { REFLECTION_EXTENSION_POINT_IDS } from "./types";

export { REFLECTION_EXTENSION_POINT_IDS } from "./types";

export function declareReflectionEngineExtensionPoints(): void {
  declareExtensionPoint({
    id: REFLECTION_EXTENSION_POINT_IDS.CASE_OPENED,
    description:
      "Fires when a new Executive Case is assembled and opened. " +
      "Future Dashboard and Monitoring systems subscribe here. " +
      "Payload: ExecutiveCase.",
    declaredBy: "executive-reflection",
  });

  declareExtensionPoint({
    id: REFLECTION_EXTENSION_POINT_IDS.CASE_CLOSED,
    description:
      "Fires when an Executive Case is closed (immutable after this point). " +
      "Future Learning systems must subscribe here to begin their work. " +
      "Payload: ExecutiveCase.",
    declaredBy: "executive-reflection",
  });

  declareExtensionPoint({
    id: REFLECTION_EXTENSION_POINT_IDS.REFLECTION_STARTED,
    description:
      "Fires when reflection analysis begins on a completed case. " +
      "Future instrumentation and observability systems subscribe here. " +
      "Payload: { caseId: string, userId: number }.",
    declaredBy: "executive-reflection",
  });

  declareExtensionPoint({
    id: REFLECTION_EXTENSION_POINT_IDS.REFLECTION_REPORT_PRODUCED,
    description:
      "Fires when a Reflection Report is finalized and persisted. " +
      "Future Learning (Build 013) subscribes here. " +
      "Payload: ReflectionReport.",
    declaredBy: "executive-reflection",
  });

  declareExtensionPoint({
    id: REFLECTION_EXTENSION_POINT_IDS.CAUSAL_LINK_IDENTIFIED,
    description:
      "Fires when a causal link between events is identified during analysis. " +
      "Future causal graph systems subscribe here. " +
      "Payload: CausalLink.",
    declaredBy: "executive-reflection",
  });

  declareExtensionPoint({
    id: REFLECTION_EXTENSION_POINT_IDS.QUALITY_THRESHOLD_BREACHED,
    description:
      "Fires when any quality dimension score falls below 0.4. " +
      "Future Alerting and Escalation systems subscribe here. " +
      "Payload: { caseId: string, dimension: string, score: number, threshold: number }.",
    declaredBy: "executive-reflection",
  });

  declareExtensionPoint({
    id: REFLECTION_EXTENSION_POINT_IDS.LEARNING_READY,
    description:
      "Seam for Build 013 (Learning Engine). Fires when a Reflection Report is complete " +
      "and the case is ready for learning extraction. " +
      "Payload: { caseId: string, reportId: string, overallQualityScore: number }.",
    declaredBy: "executive-reflection",
  });

  declareExtensionPoint({
    id: REFLECTION_EXTENSION_POINT_IDS.FACTOR_IDENTIFIED,
    description:
      "Fires when a major contributing factor is identified during causal analysis. " +
      "Future factor-graph systems subscribe here. " +
      "Payload: ReflectionFactor.",
    declaredBy: "executive-reflection",
  });
}

// ─── Hook firing utility ──────────────────────────────────────────────────────

export async function fireReflectionHooks<T>(pointId: string, payload: T): Promise<void> {
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
        "Reflection extension hook failed (non-fatal)",
      );
    }
  }
}

export function registerReflectionHook<T>(
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
