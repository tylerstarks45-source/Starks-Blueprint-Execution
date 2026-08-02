// ── Build 049: UBRE extension point declarations ──────────────────────────────
import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import { UBRE_EP_IDS } from "./types";

export function declareUBREExtensionPoints(): void {
  declareExtensionPoint({ id: UBRE_EP_IDS.SESSION,     description: "Owns every active builder editing session across all builders — start, pause, resume, end",                      declaredBy: "unified-builder-runtime" });
  declareExtensionPoint({ id: UBRE_EP_IDS.DRAFT,       description: "Manages immutable draft revisions — autosave, manual save, preview, publish, discard",                          declaredBy: "unified-builder-runtime" });
  declareExtensionPoint({ id: UBRE_EP_IDS.HISTORY,     description: "Maintains deterministic undo/redo chains per session — every builder operation recorded",                       declaredBy: "unified-builder-runtime" });
  declareExtensionPoint({ id: UBRE_EP_IDS.VALIDATION,  description: "Runs builder-independent validation pipeline before publish — errors block, warnings advise",                   declaredBy: "unified-builder-runtime" });
  declareExtensionPoint({ id: UBRE_EP_IDS.EVENTS,      description: "Publishes lifecycle events for every builder action — session_started, draft_saved, published, undo, redo…",   declaredBy: "unified-builder-runtime" });
  declareExtensionPoint({ id: UBRE_EP_IDS.RECOVERY,    description: "Restores interrupted or crashed builder sessions safely using the last good draft",                             declaredBy: "unified-builder-runtime" });
  declareExtensionPoint({ id: UBRE_EP_IDS.DIAGNOSTICS, description: "Monitors runtime health — crash detection, performance, memory, latency diagnostics",                          declaredBy: "unified-builder-runtime" });
  declareExtensionPoint({ id: UBRE_EP_IDS.ADVISORY,    description: "Delivers UBRE builder runtime summary into ASH Executive Brain context note each cycle",                       declaredBy: "unified-builder-runtime" });
}
