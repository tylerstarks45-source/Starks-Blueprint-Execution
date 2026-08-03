// ─────────────────────────────────────────────────────────────────────────────
// Build 050 — Capability Engine
// Declares what every application can do
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import { applicationCapabilities } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import type { AppCapability, CapabilityType } from "./types";

export interface CapabilityInput {
  appId:               string;
  capabilityKey:       string;
  title:               string;
  description:         string;
  capabilityType:      CapabilityType;
  requiresPermissions: string[];
  isPlatformCapability:boolean;
  ashCanInvoke:        boolean;
  metadata?:           Record<string, unknown>;
}

export async function registerCapability(input: CapabilityInput): Promise<any> {
  const existing = await db
    .select({ id: applicationCapabilities.id })
    .from(applicationCapabilities)
    .where(and(
      eq(applicationCapabilities.appId, input.appId),
      eq(applicationCapabilities.capabilityKey, input.capabilityKey),
    ))
    .limit(1);
  if (existing.length > 0) return existing[0];

  const rows = await db
    .insert(applicationCapabilities)
    .values({
      appId:               input.appId,
      capabilityKey:       input.capabilityKey,
      title:               input.title,
      description:         input.description,
      capabilityType:      input.capabilityType,
      requiresPermissions: input.requiresPermissions,
      isPlatformCapability:input.isPlatformCapability,
      ashCanInvoke:        input.ashCanInvoke,
      metadata:            input.metadata ?? {},
    })
    .returning() as any[];
  return rows[0];
}

export async function listCapabilities(appId?: string): Promise<any[]> {
  if (appId) {
    return db.select().from(applicationCapabilities).where(eq(applicationCapabilities.appId, appId));
  }
  return db.select().from(applicationCapabilities);
}

export async function listAshInvocableCapabilities(): Promise<any[]> {
  return db
    .select()
    .from(applicationCapabilities)
    .where(eq(applicationCapabilities.ashCanInvoke, true));
}

export async function getCapabilitySummary(): Promise<{
  total:              number;
  byType:             Record<string, number>;
  ashInvocable:       number;
  platformCapabilities: number;
}> {
  const all = await listCapabilities();
  const byType: Record<string, number> = {};
  for (const c of all) {
    byType[c.capabilityType] = (byType[c.capabilityType] ?? 0) + 1;
  }
  return {
    total:               all.length,
    byType,
    ashInvocable:        all.filter((c) => c.ashCanInvoke).length,
    platformCapabilities:all.filter((c) => c.isPlatformCapability).length,
  };
}

// Seed the standard capabilities for a builder-type app
export async function seedBuilderCapabilities(appId: string): Promise<void> {
  const caps: CapabilityInput[] = [
    { appId, capabilityKey: "view",    title: "View",    description: "View content in this app",    capabilityType: "read",    requiresPermissions: [], isPlatformCapability: false, ashCanInvoke: true },
    { appId, capabilityKey: "edit",    title: "Edit",    description: "Edit content in this app",    capabilityType: "write",   requiresPermissions: [], isPlatformCapability: false, ashCanInvoke: true },
    { appId, capabilityKey: "publish", title: "Publish", description: "Publish from this app",       capabilityType: "execute", requiresPermissions: [], isPlatformCapability: false, ashCanInvoke: true },
    { appId, capabilityKey: "search",  title: "Search",  description: "Search within this app",      capabilityType: "read",    requiresPermissions: [], isPlatformCapability: false, ashCanInvoke: true },
    { appId, capabilityKey: "export",  title: "Export",  description: "Export data from this app",   capabilityType: "execute", requiresPermissions: [], isPlatformCapability: false, ashCanInvoke: true },
  ];
  for (const cap of caps) {
    await registerCapability(cap);
  }
}
