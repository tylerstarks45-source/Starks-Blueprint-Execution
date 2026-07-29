// ─── Executive Context Extension Points (Build 006) ─────────────────────────
//
// Extension framework for the Executive Context Engine. Declares six seams
// where future intelligence layers (judgment, planning, learning, reflection)
// can attach without modifying core context logic.
//
// Uses the existing extension-point registry from Build 001 — no new registry
// infrastructure is introduced. These six points extend the existing 21.

import {
  declareExtensionPoint,
  registerExtension,
  getExtensions,
} from "../cognitive-foundation/extension-points";
import { logger } from "../logger";
import { CONTEXT_EXTENSION_POINT_IDS, type ContextHookHandler } from "./types";

// Re-export so callers can import from context-extension-points without
// having to also import from ./types.
export { CONTEXT_EXTENSION_POINT_IDS } from "./types";

// ─── Declare context extension points ────────────────────────────────────────
// Called once at boot during context engine initialization.

export function declareContextExtensionPoints(): void {
  declareExtensionPoint({
    id: CONTEXT_EXTENSION_POINT_IDS.PRE_RESOLVE,
    description:
      "Fires before the Context Resolution Engine selects active contexts. " +
      "Future Brains can inject additional selection criteria. Payload: { userId, objectiveText }.",
    declaredBy: "executive-context",
  });

  declareExtensionPoint({
    id: CONTEXT_EXTENSION_POINT_IDS.POST_RESOLVE,
    description:
      "Fires after resolution is complete but before the snapshot is frozen. " +
      "Future Brains can enrich the resolution result (e.g. add related artifacts). " +
      "Payload: ContextResolutionResult.",
    declaredBy: "executive-context",
  });

  declareExtensionPoint({
    id: CONTEXT_EXTENSION_POINT_IDS.SNAPSHOT_FROZEN,
    description:
      "Fires after an immutable snapshot is created and persisted. " +
      "Future systems can trigger downstream actions on new snapshots. " +
      "Payload: ExecutiveContextSnapshot.",
    declaredBy: "executive-context",
  });

  declareExtensionPoint({
    id: CONTEXT_EXTENSION_POINT_IDS.HEALTH_CHECK,
    description:
      "Fires during health assessment. Future systems can contribute custom " +
      "health metrics (e.g. objective staleness, external alignment scores). " +
      "Payload: ContextDiagnosticsReport (in-progress).",
    declaredBy: "executive-context",
  });

  declareExtensionPoint({
    id: CONTEXT_EXTENSION_POINT_IDS.CONTEXT_REGISTERED,
    description:
      "Fires after a new Executive Context is successfully registered. " +
      "Future systems can trigger auto-linking, cluster membership, etc. " +
      "Payload: ExecutiveContextModel.",
    declaredBy: "executive-context",
  });

  declareExtensionPoint({
    id: CONTEXT_EXTENSION_POINT_IDS.CONTEXT_ARCHIVED,
    description:
      "Fires when a Context is archived. Future cleanup systems can " +
      "cascade graceful shutdown of related plans and strategies. " +
      "Payload: { contextId, triggeredBy }.",
    declaredBy: "executive-context",
  });
}

// ─── Hook firing utility ──────────────────────────────────────────────────────
// Runs all registered handlers for a context extension point in order.
// Handlers may enrich the payload. Failures are non-fatal (logged, ignored).
// Returns the final payload after all handlers have run.

export async function fireContextHooks<T>(
  pointId: string,
  payload: T,
): Promise<T> {
  const extensions = getExtensions(pointId);
  if (extensions.length === 0) return payload;

  let current = payload;
  for (const ext of extensions) {
    try {
      const handler = ext.handler as ContextHookHandler<T> | undefined;
      if (typeof handler === "function") {
        current = await handler(current);
      }
    } catch (err) {
      logger.warn(
        { err, pointId, providerBrain: ext.providerBrain },
        "Context extension hook failed (non-fatal)",
      );
    }
  }
  return current;
}

// ─── Public registration helper ──────────────────────────────────────────────
// Wraps registerExtension for context-specific hooks with type safety.

export function registerContextHook<T>(
  pointId: string,
  providerBrain: string,
  description: string,
  handler: ContextHookHandler<T>,
): void {
  registerExtension({
    extensionPointId: pointId,
    providerBrain,
    description,
    handler: handler as (...args: unknown[]) => unknown,
  });
}
