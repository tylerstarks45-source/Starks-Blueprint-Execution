// ── Build 043: Execution Channel Engine ──────────────────────────────────
// Provides standardized channels for each operating domain.
import { db } from "@workspace/db";
import { executionChannels } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import type { ExecutionChannelType, OperatingDomain, ChannelStatus } from "./types";

// Open a channel for a session on the specified domain.
export async function openChannel(params: {
  channelType: ExecutionChannelType;
  domain:      OperatingDomain;
  sessionId:   number;
  metadata?:   Record<string, unknown>;
}): Promise<{ channelId: number; status: ChannelStatus }> {
  const [row] = await db.insert(executionChannels).values({
    channelType: params.channelType,
    domain:      params.domain,
    status:      "ready",
    sessionId:   params.sessionId,
    metadata:    params.metadata ?? { openedAt: new Date().toISOString() },
  }).returning({ id: executionChannels.id, status: executionChannels.status });

  return { channelId: row.id, status: (row.status ?? "ready") as ChannelStatus };
}

// Update channel status (ready → busy → ready/error/closed).
export async function updateChannelStatus(channelId: number, status: ChannelStatus): Promise<void> {
  await db
    .update(executionChannels)
    .set({ status })
    .where(eq(executionChannels.id, channelId));
}

// Close a channel at the end of a session.
export async function closeChannel(channelId: number): Promise<void> {
  await db
    .update(executionChannels)
    .set({ status: "closed" })
    .where(eq(executionChannels.id, channelId));
}

export async function getChannelsBySession(sessionId: number): Promise<Array<{
  id: number; channelType: string; domain: string; status: string;
}>> {
  const rows = await db
    .select()
    .from(executionChannels)
    .where(eq(executionChannels.sessionId, sessionId));
  return rows.map((r) => ({
    id:          r.id,
    channelType: r.channelType,
    domain:      r.domain,
    status:      r.status,
  }));
}

// Count total channels across all sessions.
export async function countTotalChannels(): Promise<number> {
  const rows = await db.select({ id: executionChannels.id }).from(executionChannels);
  return rows.length;
}

// List all channels (for admin overview).
export async function listAllChannels(limit = 50): Promise<Array<{
  id: number; channelType: string; domain: string; status: string; sessionId: number | null;
}>> {
  const rows = await db.select().from(executionChannels).limit(limit);
  return rows.map((r) => ({
    id:          r.id,
    channelType: r.channelType,
    domain:      r.domain,
    status:      r.status,
    sessionId:   r.sessionId ?? null,
  }));
}
