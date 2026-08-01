// ── Build 044: Connection Lifecycle Engine ────────────────────────────────
// Tracks created/connected/suspended/revoked/expired/migrated/archived.
import { db } from "@workspace/db";
import { connectionProfiles, credentialReferences, connectionAudit } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import type { ConnectionStatus, AuditType } from "./types";

// Create or retrieve a connection profile for a user+provider pair.
export async function createConnectionProfile(params: {
  userId:        number;
  providerId:    number;
  authProfileId?:string;
  credentialRefKey?: string;
  credentialType?:   string;
}): Promise<{ profileId: number; status: ConnectionStatus; isNew: boolean }> {
  const existing = await db
    .select({ id: connectionProfiles.id, status: connectionProfiles.status })
    .from(connectionProfiles)
    .where(and(eq(connectionProfiles.userId, params.userId), eq(connectionProfiles.providerId, params.providerId)))
    .limit(1);

  if (existing.length > 0) {
    return { profileId: existing[0].id, status: existing[0].status as ConnectionStatus, isNew: false };
  }

  const [profile] = await db.insert(connectionProfiles).values({
    userId:       params.userId,
    providerId:   params.providerId,
    status:       "created",
    authProfileId:params.authProfileId ?? null,
    metadata:     {},
  }).returning({ id: connectionProfiles.id, status: connectionProfiles.status });

  // If credential ref provided, record it (never the actual credential)
  if (params.credentialRefKey) {
    await db.insert(credentialReferences).values({
      connectionProfileId: profile.id,
      providerId:          params.providerId,
      credentialRefKey:    params.credentialRefKey, // reference only
      credentialType:      params.credentialType ?? "api_key",
      isActive:            true,
    });
  }

  await auditEvent({ providerId: params.providerId, connectionProfileId: profile.id, auditType: "connected", actor: "user" });
  return { profileId: profile.id, status: "created", isNew: true };
}

// Transition a connection profile to a new lifecycle status.
export async function transitionConnectionStatus(
  profileId: number,
  newStatus:  ConnectionStatus,
  actor:      "system" | "user" | "admin" = "system",
): Promise<void> {
  const [profile] = await db.select({ providerId: connectionProfiles.providerId })
    .from(connectionProfiles).where(eq(connectionProfiles.id, profileId)).limit(1);
  if (!profile) return;

  await db.update(connectionProfiles).set({ status: newStatus }).where(eq(connectionProfiles.id, profileId));
  const auditType: AuditType = newStatus === "revoked" ? "revoked" : newStatus === "migrated" ? "migrated" : "disconnected";
  await auditEvent({ providerId: profile.providerId, connectionProfileId: profileId, auditType, actor });
}

export async function countActiveConnections(): Promise<number> {
  return (await db.select({ id: connectionProfiles.id }).from(connectionProfiles)
    .where(eq(connectionProfiles.status, "connected"))).length;
}

export async function listConnectionProfiles(userId: number): Promise<Array<{
  id: number; providerId: number; status: string; connectedAt: Date | null;
}>> {
  const rows = await db.select().from(connectionProfiles).where(eq(connectionProfiles.userId, userId));
  return rows.map((r) => ({ id: r.id, providerId: r.providerId, status: r.status, connectedAt: r.connectedAt ?? null }));
}

async function auditEvent(params: { providerId: number; connectionProfileId: number; auditType: AuditType; actor: string }): Promise<void> {
  await db.insert(connectionAudit).values({
    providerId:          params.providerId,
    connectionProfileId: params.connectionProfileId,
    auditType:           params.auditType,
    actor:               params.actor,
    details:             { ts: new Date().toISOString() },
  });
}
