import { sql } from "drizzle-orm";
import type { GovernedWriteContext } from "../types";

// Columns every governed write wrapper sets itself — never accepted as
// caller-supplied insert/update values, so a call site can't accidentally
// (or silently) override ownership/audit metadata.
export type GovernanceManagedKeys =
  | "id"
  | "createdAt"
  | "updatedAt"
  | "ownerUserId"
  | "teamWorkspaceId"
  | "sourceEngine"
  | "createdByUserId"
  | "updatedByUserId"
  | "governanceStatus"
  | "recordVersion";

export function stampCreate(ctx: GovernedWriteContext) {
  return {
    ownerUserId: ctx.ownerUserId,
    sourceEngine: ctx.sourceEngine,
    createdByUserId: ctx.actor.actorUserId ?? null,
    updatedByUserId: ctx.actor.actorUserId ?? null,
  };
}

export function stampUpdate(ctx: GovernedWriteContext) {
  return {
    updatedByUserId: ctx.actor.actorUserId ?? null,
    // Generic optimistic-concurrency counter — always incremented on any
    // governed update, independent of whatever domain-specific version/status
    // fields the table itself may also carry.
    recordVersion: sql`record_version + 1`,
  };
}

// Shallow before/after diff over only the keys present in `patch`, so an
// audit row never claims a field changed when the caller didn't touch it.
// Compares by JSON serialization so Date/array/object values compare by
// content, not identity.
export function diffChanges<T extends Record<string, unknown>>(
  before: T,
  patch: Partial<Record<keyof T, unknown>>,
): Record<string, { before: unknown; after: unknown }> {
  const changes: Record<string, { before: unknown; after: unknown }> = {};
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const beforeVal = before[key];
    const afterVal = patch[key];
    if (JSON.stringify(beforeVal ?? null) !== JSON.stringify(afterVal ?? null)) {
      changes[key as string] = { before: beforeVal, after: afterVal };
    }
  }
  return changes;
}
