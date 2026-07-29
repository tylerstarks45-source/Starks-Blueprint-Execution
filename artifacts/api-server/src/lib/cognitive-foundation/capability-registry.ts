// ─── Capability Registry (Build 001) ────────────────────────────────────────
//
// Platform-wide index of every capability every registered Brain exposes.
// Capabilities become discoverable data instead of knowledge hardcoded into
// callers: a future Brain registers its capabilities at boot and existing
// architecture does not change.
//
// Deterministic by design — lookup is exact/substring matching, never an AI
// call. (An AI-assisted discovery layer is a future extension point, see
// extension-points.ts.)

import { logger } from "../logger";
import type { BrainCapability, CapabilityStatus, RegisteredCapability } from "./types";

const capabilities = new Map<string, RegisteredCapability>();

function keyFor(brainName: string, capabilityId: string): string {
  return `${brainName}:${capabilityId}`;
}

/** Register (or re-register, idempotently) one capability for a Brain.
 *  Called automatically by registerBrain for each declared capability. */
export function registerCapability(brainName: string, cap: BrainCapability): RegisteredCapability {
  const key = keyFor(brainName, cap.id);
  const existing = capabilities.get(key);
  if (existing) {
    logger.debug({ brainName, capabilityId: cap.id }, "Capability re-registered; replacing existing entry");
  }
  const registered: RegisteredCapability = {
    ...cap,
    brainName,
    registeredAt: existing?.registeredAt ?? new Date().toISOString(),
  };
  capabilities.set(key, registered);
  return registered;
}

/** Remove every capability registered for a Brain. Returns the number
 *  removed. registerBrain() calls this before re-adding a brain's
 *  capabilities, so a re-registration that drops a capability can never
 *  leave a stale entry behind. */
export function removeCapabilitiesForBrain(brainName: string): number {
  let removed = 0;
  for (const [key, cap] of capabilities) {
    if (cap.brainName === brainName) {
      capabilities.delete(key);
      removed += 1;
    }
  }
  return removed;
}

export function getCapability(brainName: string, capabilityId: string): RegisteredCapability | null {
  return capabilities.get(keyFor(brainName, capabilityId)) ?? null;
}

export interface ListCapabilitiesFilter {
  brain?: string;
  status?: CapabilityStatus;
}

/** List capabilities, optionally filtered by owning Brain and/or status. */
export function listCapabilities(filter: ListCapabilitiesFilter = {}): RegisteredCapability[] {
  const all = [...capabilities.values()];
  return all
    .filter((c) => (filter.brain ? c.brainName === filter.brain : true))
    .filter((c) => (filter.status ? c.status === filter.status : true))
    .sort((a, b) => (a.brainName === b.brainName ? a.id.localeCompare(b.id) : a.brainName.localeCompare(b.brainName)));
}

/** Case-insensitive substring search across id, name and description. */
export function findCapabilities(query: string, filter: ListCapabilitiesFilter = {}): RegisteredCapability[] {
  const q = query.trim().toLowerCase();
  if (!q) return listCapabilities(filter);
  return listCapabilities(filter).filter(
    (c) =>
      c.id.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q),
  );
}

export function countCapabilities(): number {
  return capabilities.size;
}

/** Test-only/maintenance helper: clear the registry. Not used in request paths. */
export function clearCapabilityRegistry(): void {
  capabilities.clear();
}
