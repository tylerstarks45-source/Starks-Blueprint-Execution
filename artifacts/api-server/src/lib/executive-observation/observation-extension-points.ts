// ─── Observation Extension Points (Build 011) ────────────────────────────────
//
// Eight seams where future intelligence layers attach to the Observation Engine.
// Uses the Build 001 extension-point registry — no new infrastructure.
//
// DO NOT implement:
//   Reflection, Learning, Adaptation, Alerting, Notifications,
//   Business Analytics, Executive Reports, Predictive Analytics.
//   Only extension points.

import {
  declareExtensionPoint,
  registerExtension,
  getExtensions,
} from "../cognitive-foundation/extension-points";
import { logger } from "../logger";
import { OBSERVATION_EXTENSION_POINT_IDS } from "./types";

export { OBSERVATION_EXTENSION_POINT_IDS } from "./types";

export function declareObservationExtensionPoints(): void {
  declareExtensionPoint({
    id: OBSERVATION_EXTENSION_POINT_IDS.OBSERVATION_RECORDED,
    description:
      "Fires immediately after a new observation is persisted. " +
      "Future Reflection systems subscribe here to receive every observation in order. " +
      "Payload: ExecutiveObservation.",
    declaredBy: "executive-observation",
  });

  declareExtensionPoint({
    id: OBSERVATION_EXTENSION_POINT_IDS.OBSERVATION_CHAIN_UPDATED,
    description:
      "Fires when an observation is added to a chain. " +
      "Future Timeline and Replay systems subscribe here. " +
      "Payload: { chain: ObservationChain, observation: ExecutiveObservation, positionInChain: number }.",
    declaredBy: "executive-observation",
  });

  declareExtensionPoint({
    id: OBSERVATION_EXTENSION_POINT_IDS.ATTENTION_THRESHOLD_EXCEEDED,
    description:
      "Fires when an observation's attention score meets or exceeds 0.8. " +
      "Future Alerting and Escalation systems subscribe here. " +
      "Payload: { observation: ExecutiveObservation, attentionScore: number }.",
    declaredBy: "executive-observation",
  });

  declareExtensionPoint({
    id: OBSERVATION_EXTENSION_POINT_IDS.SIGNAL_EMITTED,
    description:
      "Fires when a cognitive signal is derived from an observation. " +
      "Future Reflection and Dashboard systems subscribe here. " +
      "Payload: ObservationSignal.",
    declaredBy: "executive-observation",
  });

  declareExtensionPoint({
    id: OBSERVATION_EXTENSION_POINT_IDS.ANOMALY_DETECTED,
    description:
      "Fires when the Anomaly Engine detects an abnormal pattern. " +
      "Future Recovery Intelligence and Learning systems subscribe here. " +
      "Payload: ObservationAnomaly.",
    declaredBy: "executive-observation",
  });

  declareExtensionPoint({
    id: OBSERVATION_EXTENSION_POINT_IDS.TREND_DETECTED,
    description:
      "Fires when the Trend Engine detects a measurable trend. " +
      "Future Learning and Reporting systems subscribe here. " +
      "Payload: ObservationTrend.",
    declaredBy: "executive-observation",
  });

  declareExtensionPoint({
    id: OBSERVATION_EXTENSION_POINT_IDS.REFLECTION_READY,
    description:
      "Fires when sufficient high-attention observations have accumulated to " +
      "warrant a Reflection cycle (Build 012). " +
      "Payload: { userId: number, chainId?: string, observationCount: number, topSignals: string[] }.",
    declaredBy: "executive-observation",
  });

  declareExtensionPoint({
    id: OBSERVATION_EXTENSION_POINT_IDS.CORRELATION_FOUND,
    description:
      "Fires when the Correlation Engine establishes a new edge between observations. " +
      "Future graph-analysis systems subscribe here. " +
      "Payload: ObservationCorrelation.",
    declaredBy: "executive-observation",
  });
}

// ─── Hook firing utility ──────────────────────────────────────────────────────

export async function fireObservationHooks<T>(pointId: string, payload: T): Promise<void> {
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
        "Observation extension hook failed (non-fatal)",
      );
    }
  }
}

// ─── Public registration helper ───────────────────────────────────────────────

export function registerObservationHook<T>(
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
