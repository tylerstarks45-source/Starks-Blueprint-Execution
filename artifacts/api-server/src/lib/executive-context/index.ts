// ─── Executive Context Engine — Public Surface (Build 006) ───────────────────
//
// Barrel export for the Executive Context Engine. Import from here, not from
// individual module files, so the internal structure can evolve without
// changing call sites.

// Types
export * from "./types";

// Context Registry
export {
  registerContext,
  getContext,
  listContexts,
  searchContexts,
  updateContext,
  activateContext,
  deactivateContext,
  archiveContext,
  validateContext,
  recordTimelineEvent,
  addContextEntityLink,
  removeContextEntityLink,
  getContextEntityLinks,
} from "./context-registry";

// Context Resolution Engine
export {
  resolveContextSnapshot,
  getSnapshot,
  getRecentSnapshots,
} from "./context-resolution";

// Shared Context Services
export {
  getCurrentContext,
  getRelevantContext,
  getContextTimeline,
  getContextSummary,
  getContextDiagnostics,
} from "./context-services";

// Extension Points
export {
  declareContextExtensionPoints,
  registerContextHook,
  fireContextHooks,
} from "./context-extension-points";
