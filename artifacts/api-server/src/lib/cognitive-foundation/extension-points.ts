// ─── Extension Points (Build 001) ───────────────────────────────────────────
//
// Named seams where future intelligence layers plug into ASH without
// modifying existing architecture. Build 001 deliberately implements ONLY
// the seam mechanism — none of the future intelligence systems themselves
// (per the build specification: "Do NOT implement those systems now. Only
// prepare the architecture so they plug naturally into the platform later.")
//
// A future Brain ships its own module, calls registerBrain(...) plus
// registerExtension(...) at boot, and consumers discover it through
// getExtensions(pointId) — no existing file needs to change.

import { logger } from "../logger";
import type { ExtensionPointDefinition, ExtensionRegistration } from "./types";

const points = new Map<string, ExtensionPointDefinition>();
const extensions = new Map<string, ExtensionRegistration[]>();

/** The future intelligence areas named by the Master Architecture
 *  Specification / Build 001 specification. Declared at boot so they are
 *  discoverable from day one, even while unimplemented. */
export const FUTURE_INTELLIGENCE_EXTENSION_POINTS: ReadonlyArray<Omit<ExtensionPointDefinition, "declaredBy">> = [
  { id: "decision-intelligence", description: "Smarter request classification and continuation/new-project decisions (upgrades Executive Brain Decision Making beyond keyword heuristics)." },
  { id: "planning-intelligence", description: "Adaptive prioritization, sequencing and decomposition quality improvements layered onto the Planning Engine." },
  { id: "memory-intelligence", description: "Smarter relevance ranking, consolidation and retrieval composition layered onto the Memory Engine." },
  { id: "learning-intelligence", description: "Read-side consumption of distilled lessons during planning and decision making (extends the Self-Improving Brain's write-only loop)." },
  { id: "business-intelligence", description: "Deeper business context, recommendation and opportunity signals folded into cognitive flows (Volume 2 subsystems register here)." },
  { id: "research-intelligence", description: "Adaptive provider selection, source weighting and knowledge lifecycle management layered onto the Research & Knowledge Engine." },
  { id: "strategic-intelligence", description: "Long-horizon, cross-project and cross-business strategy formation above per-request planning." },
  { id: "execution-intelligence", description: "Execution-outcome awareness and recovery coordination (closes the plan→execute→outcome loop for the Executive Brain)." },
  { id: "self-improvement", description: "Retrospective self-review of past resolutions feeding heuristic refinement under human review." },
];

/** Declare a named extension point. First declaration wins; a duplicate
 *  declaration from a different declarer logs a warning and is ignored. */
export function declareExtensionPoint(def: ExtensionPointDefinition): ExtensionPointDefinition {
  const existing = points.get(def.id);
  if (existing) {
    if (existing.declaredBy !== def.declaredBy) {
      logger.warn(
        { extensionPointId: def.id, declaredBy: def.declaredBy, existingDeclaredBy: existing.declaredBy },
        "Extension point already declared by another module; keeping original declaration",
      );
    }
    return existing;
  }
  points.set(def.id, def);
  return def;
}

export function declareFutureIntelligenceExtensionPoints(): void {
  for (const p of FUTURE_INTELLIGENCE_EXTENSION_POINTS) {
    declareExtensionPoint({ ...p, declaredBy: "cognitive-foundation" });
  }
}

/** Register a provider against a declared extension point. Throws on an
 *  undeclared point — silent registration against a typo'd id would be a
 *  silent no-op, and this platform fails loudly rather than silently. */
export function registerExtension(reg: ExtensionRegistration): void {
  if (!points.has(reg.extensionPointId)) {
    throw new Error(
      `Cannot register extension for undeclared extension point "${reg.extensionPointId}". ` +
        `Declare it first via declareExtensionPoint().`,
    );
  }
  const list = extensions.get(reg.extensionPointId) ?? [];
  const withoutSameProvider = list.filter((e) => e.providerBrain !== reg.providerBrain);
  if (withoutSameProvider.length !== list.length) {
    logger.warn(
      { extensionPointId: reg.extensionPointId, providerBrain: reg.providerBrain },
      "Extension re-registered by same provider; replacing previous registration",
    );
  }
  withoutSameProvider.push(reg);
  extensions.set(reg.extensionPointId, withoutSameProvider);
  logger.info(
    { extensionPointId: reg.extensionPointId, providerBrain: reg.providerBrain },
    "Extension registered in cognitive foundation",
  );
}

export function getExtensionPoint(id: string): ExtensionPointDefinition | null {
  return points.get(id) ?? null;
}

export function getExtensions(pointId: string): ExtensionRegistration[] {
  return [...(extensions.get(pointId) ?? [])];
}

export interface ExtensionPointWithProviders extends ExtensionPointDefinition {
  extensions: Array<Omit<ExtensionRegistration, "handler"> & { hasHandler: boolean }>;
}

/** JSON-safe listing of every declared point and its registered providers. */
export function listExtensionPoints(): ExtensionPointWithProviders[] {
  return [...points.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => ({
      ...p,
      extensions: getExtensions(p.id).map(({ handler, ...rest }) => ({ ...rest, hasHandler: typeof handler === "function" })),
    }));
}

/** Test-only/maintenance helper: clear declarations and registrations. */
export function clearExtensionPoints(): void {
  points.clear();
  extensions.clear();
}
