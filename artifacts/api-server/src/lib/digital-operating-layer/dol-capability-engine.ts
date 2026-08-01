// ── Build 043: Capability Binding Engine ─────────────────────────────────
// Maps approved capabilities to authorized execution channels.
import { db } from "@workspace/db";
import { capabilityBindings } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import type { ExecutionChannelType } from "./types";

const DEFAULT_BINDING_TTL_MS = 60 * 60 * 1000; // 1 hour

// Bind a capability to an authorized session and channel.
export async function bindCapability(params: {
  sessionId:    number;
  capabilityId: string;
  channelType:  ExecutionChannelType;
  ttlMs?:       number;
}): Promise<{ bindingId: number; bound: boolean }> {
  // Check for existing active binding
  const existing = await db
    .select({ id: capabilityBindings.id, bound: capabilityBindings.bound })
    .from(capabilityBindings)
    .where(
      and(
        eq(capabilityBindings.sessionId, params.sessionId),
        eq(capabilityBindings.capabilityId, params.capabilityId),
        eq(capabilityBindings.channelType, params.channelType),
        eq(capabilityBindings.bound, true),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return { bindingId: existing[0].id, bound: true };
  }

  const authorizedAt = new Date();
  const expiresAt    = new Date(authorizedAt.getTime() + (params.ttlMs ?? DEFAULT_BINDING_TTL_MS));

  const [row] = await db.insert(capabilityBindings).values({
    sessionId:    params.sessionId,
    capabilityId: params.capabilityId,
    channelType:  params.channelType,
    bound:        true,
    authorizedAt,
    expiresAt,
  }).returning({ id: capabilityBindings.id, bound: capabilityBindings.bound });

  return { bindingId: row.id, bound: row.bound ?? false };
}

// Unbind a capability (expire it).
export async function unbindCapability(bindingId: number): Promise<void> {
  await db
    .update(capabilityBindings)
    .set({ bound: false, expiresAt: new Date() })
    .where(eq(capabilityBindings.id, bindingId));
}

// Check whether a capability is currently bound for a session.
export async function isCapabilityBound(sessionId: number, capabilityId: string): Promise<boolean> {
  const now  = new Date();
  const rows = await db
    .select({ id: capabilityBindings.id, expiresAt: capabilityBindings.expiresAt })
    .from(capabilityBindings)
    .where(
      and(
        eq(capabilityBindings.sessionId, sessionId),
        eq(capabilityBindings.capabilityId, capabilityId),
        eq(capabilityBindings.bound, true),
      ),
    )
    .limit(1);

  if (rows.length === 0) return false;
  return rows[0].expiresAt == null || rows[0].expiresAt > now;
}

export async function listBindingsForSession(sessionId: number): Promise<Array<{
  id: number; capabilityId: string; channelType: string; bound: boolean;
}>> {
  const rows = await db
    .select()
    .from(capabilityBindings)
    .where(eq(capabilityBindings.sessionId, sessionId));
  return rows.map((r) => ({
    id:           r.id,
    capabilityId: r.capabilityId,
    channelType:  r.channelType,
    bound:        r.bound ?? false,
  }));
}
