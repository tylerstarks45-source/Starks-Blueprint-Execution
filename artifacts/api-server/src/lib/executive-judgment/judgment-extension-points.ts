// ─── Judgment Extension Points (Build 007) ───────────────────────────────────
//
// Declares five seams where future intelligence layers can attach to the
// Judgment Engine without modifying core judgment logic. Uses the existing
// Build 001 extension-point registry — no new infrastructure introduced.
//
// DO NOT implement:
//   Automatic policy generation, ethical reasoning engines, predictive
//   simulations, self-adjusting score weights, learning-based optimization,
//   or outcome feedback loops. Only extension points.

import {
  declareExtensionPoint,
  registerExtension,
  getExtensions,
} from "../cognitive-foundation/extension-points";
import { logger } from "../logger";
import { JUDGMENT_EXTENSION_POINT_IDS, type JudgmentHookHandler } from "./types";

export { JUDGMENT_EXTENSION_POINT_IDS } from "./types";

// ─── Declare judgment extension points ────────────────────────────────────────

export function declareJudgmentExtensionPoints(): void {
  declareExtensionPoint({
    id: JUDGMENT_EXTENSION_POINT_IDS.PRE_EVALUATION,
    description:
      "Fires before the Judgment Engine scores any options. " +
      "Future Brains can inject additional options or enrich raw scores. " +
      "Payload: JudgmentRequest.",
    declaredBy: "executive-judgment",
  });

  declareExtensionPoint({
    id: JUDGMENT_EXTENSION_POINT_IDS.POST_SCORING,
    description:
      "Fires after all options are scored but before a recommendation is selected. " +
      "Future policy layers can override scores (e.g. ethical constraints). " +
      "Payload: ScoredJudgmentOption[].",
    declaredBy: "executive-judgment",
  });

  declareExtensionPoint({
    id: JUDGMENT_EXTENSION_POINT_IDS.PRE_RECOMMENDATION,
    description:
      "Fires after the recommendation is selected but before explanation is generated. " +
      "Future confidence-calibration layers can adjust the selected key. " +
      "Payload: { selectedKey, rankedOptions }.",
    declaredBy: "executive-judgment",
  });

  declareExtensionPoint({
    id: JUDGMENT_EXTENSION_POINT_IDS.EXPLANATION_GENERATED,
    description:
      "Fires after the structured explanation is generated. " +
      "Future Brains can enrich explanations (e.g. add external context). " +
      "Payload: JudgmentExplanation.",
    declaredBy: "executive-judgment",
  });

  declareExtensionPoint({
    id: JUDGMENT_EXTENSION_POINT_IDS.JUDGMENT_COMPLETED,
    description:
      "Fires after a judgment is fully persisted and consolidated into memory. " +
      "Future learning systems can consume completed judgments for training. " +
      "Payload: ExecutiveJudgment.",
    declaredBy: "executive-judgment",
  });
}

// ─── Hook firing utility ──────────────────────────────────────────────────────

export async function fireJudgmentHooks<T>(pointId: string, payload: T): Promise<T> {
  const extensions = getExtensions(pointId);
  if (extensions.length === 0) return payload;

  let current = payload;
  for (const ext of extensions) {
    try {
      const handler = ext.handler as JudgmentHookHandler<T> | undefined;
      if (typeof handler === "function") {
        current = await handler(current);
      }
    } catch (err) {
      logger.warn(
        { err, pointId, providerBrain: ext.providerBrain },
        "Judgment extension hook failed (non-fatal)",
      );
    }
  }
  return current;
}

// ─── Public registration helper ───────────────────────────────────────────────

export function registerJudgmentHook<T>(
  pointId: string,
  providerBrain: string,
  description: string,
  handler: JudgmentHookHandler<T>,
): void {
  registerExtension({
    extensionPointId: pointId,
    providerBrain,
    description,
    handler: handler as (...args: unknown[]) => unknown,
  });
}
