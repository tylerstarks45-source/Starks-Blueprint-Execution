// ─────────────────────────────────────────────────────────────────────────────
// Build 030: Universal Execution Adapter Framework — Public Barrel
// ─────────────────────────────────────────────────────────────────────────────
export { registerAdapter, executeViaAdapter, buildFrameworkSummary, initializeAdapterFramework } from "./adapter-orchestrator";
export { resolveAdapter } from "./adapter-resolution-engine";
export { validateAdapter } from "./adapter-validation-engine";
export { runHealthCheck, applyLifecycleEvent } from "./adapter-lifecycle-engine";
export { declareAdapterFrameworkExtensionPoints } from "./adapter-extension-points";
export type { AdapterFrameworkSummary, AdapterManifest, AdapterType, AdapterValidationResult } from "./types";
