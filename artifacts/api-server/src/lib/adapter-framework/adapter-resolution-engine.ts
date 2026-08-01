// ─────────────────────────────────────────────────────────────────────────────
// Build 030: Universal Execution Adapter Framework — Adapter Resolution Engine
// Determines which adapter(s) satisfy an abstract execution request.
// Supports: single, multi, fallback, chained.
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import { executionAdapters, adapterCapabilities } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import type { AdapterResolutionResult, AdapterType, ActionType } from "./types";

const logger = { warn: console.warn.bind(console) };

export interface ResolutionRequest {
  executionClass: string;     // automated|ai_driven|human|external|hybrid
  actionType?: ActionType;
  resourceType?: string;
  platform?: AdapterType;
  preferredAdapterTypes?: AdapterType[];
}

/**
 * Resolve which adapter(s) should handle an execution request.
 * Priority:
 * 1. Explicit preferredAdapterTypes match
 * 2. executionClass → default adapter type mapping
 * 3. actionType + resourceType capability match
 * 4. Any enabled adapter (fallback)
 */
export async function resolveAdapter(req: ResolutionRequest): Promise<AdapterResolutionResult> {
  try {
    const allAdapters = await db
      .select()
      .from(executionAdapters)
      .where(eq(executionAdapters.status, "enabled"));

    if (allAdapters.length === 0) {
      return { resolved: false, adapterIds: [], adapterTypes: [], resolutionMode: "none", reason: "No enabled adapters available." };
    }

    // ── 1. Preferred type match ─────────────────────────────────────────────
    if (req.preferredAdapterTypes && req.preferredAdapterTypes.length > 0) {
      const matched = allAdapters.filter(a => req.preferredAdapterTypes!.includes(a.adapterType as AdapterType));
      if (matched.length > 0) {
        const mode = matched.length === 1 ? "single" : "multi";
        return {
          resolved: true,
          adapterIds: matched.map(a => a.id),
          adapterTypes: matched.map(a => a.adapterType as AdapterType),
          resolutionMode: mode,
          reason: `Resolved via preferred adapter type(s): ${req.preferredAdapterTypes.join(", ")}.`,
        };
      }
    }

    // ── 2. executionClass → default adapter type ────────────────────────────
    const classDefaults: Record<string, AdapterType[]> = {
      automated:  ["api", "database", "filesystem"],
      ai_driven:  ["llms", "api"],
      human:      ["browser", "desktop"],
      external:   ["api", "rest"],
      hybrid:     ["api", "browser"],
    };
    const defaults = classDefaults[req.executionClass] ?? ["api"];
    const classMatched = allAdapters.filter(a => defaults.includes(a.adapterType as AdapterType));
    if (classMatched.length > 0) {
      const primary = classMatched[0]!;
      const mode = classMatched.length > 1 ? "fallback" : "single";
      return {
        resolved: true,
        adapterIds: classMatched.map(a => a.id),
        adapterTypes: classMatched.map(a => a.adapterType as AdapterType),
        resolutionMode: mode,
        reason: `Resolved via execution class "${req.executionClass}" default adapter mapping.`,
      };
    }

    // ── 3. Capability-based resolution ─────────────────────────────────────
    if (req.actionType) {
      const caps = await db
        .select()
        .from(adapterCapabilities)
        .where(and(
          eq(adapterCapabilities.actionType, req.actionType),
          eq(adapterCapabilities.isEnabled, true)
        ));

      const capAdapterIds = [...new Set(caps.map(c => c.adapterId))];
      const capAdapters = allAdapters.filter(a => capAdapterIds.includes(a.id));
      if (capAdapters.length > 0) {
        return {
          resolved: true,
          adapterIds: capAdapters.map(a => a.id),
          adapterTypes: capAdapters.map(a => a.adapterType as AdapterType),
          resolutionMode: capAdapters.length === 1 ? "single" : "chained",
          reason: `Resolved via capability match on action type "${req.actionType}".`,
        };
      }
    }

    // ── 4. Fallback — any enabled adapter ──────────────────────────────────
    const fallback = allAdapters[0]!;
    return {
      resolved: true,
      adapterIds: [fallback.id],
      adapterTypes: [fallback.adapterType as AdapterType],
      resolutionMode: "fallback",
      reason: "Resolved via fallback — no specific match found; using first available enabled adapter.",
    };
  } catch (err) {
    logger.warn({ err }, "adapter-resolution-engine: resolution failed (fail-open)");
    return { resolved: false, adapterIds: [], adapterTypes: [], resolutionMode: "none", reason: "Resolution error — fail-open." };
  }
}
