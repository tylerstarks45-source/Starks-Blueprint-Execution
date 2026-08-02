// ── Build 046: Global Command Engine ─────────────────────────────────────────
// Allows any application to expose commands; ASH invokes after authority validation.
import { db }                from "@workspace/db";
import { platformCommands }  from "@workspace/db/schema";
import { eq, and }           from "drizzle-orm";
import type { CommandDescriptor } from "./types";

// ── Register commands ─────────────────────────────────────────────────────────

export async function registerCommands(
  appId:    string,
  commands: CommandDescriptor[],
): Promise<number> {
  let registered = 0;
  for (const cmd of commands) {
    const existing = await db
      .select({ id: platformCommands.id })
      .from(platformCommands)
      .where(eq(platformCommands.commandId, cmd.commandId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(platformCommands)
        .set({
          commandName:         cmd.commandName,
          description:         cmd.description,
          requiredPermissions: cmd.requiredPermissions,
          route:               cmd.route ?? null,
          method:              cmd.method,
          parameters:          cmd.parameters ?? {},
          active:              true,
        })
        .where(eq(platformCommands.commandId, cmd.commandId));
    } else {
      await db.insert(platformCommands).values({
        commandId:           cmd.commandId,
        appId,
        commandName:         cmd.commandName,
        description:         cmd.description,
        requiredPermissions: cmd.requiredPermissions,
        route:               cmd.route ?? null,
        method:              cmd.method,
        parameters:          cmd.parameters ?? {},
        active:              true,
      });
      registered++;
    }
  }
  return registered;
}

// ── List commands ─────────────────────────────────────────────────────────────

export async function listCommands(appId?: string): Promise<typeof platformCommands.$inferSelect[]> {
  if (appId) {
    return db
      .select()
      .from(platformCommands)
      .where(and(eq(platformCommands.appId, appId), eq(platformCommands.active, true)));
  }
  return db.select().from(platformCommands).where(eq(platformCommands.active, true));
}

export async function getCommand(commandId: string): Promise<typeof platformCommands.$inferSelect | null> {
  const rows = await db
    .select()
    .from(platformCommands)
    .where(eq(platformCommands.commandId, commandId))
    .limit(1);
  return rows[0] ?? null;
}

// ── Authority validation ──────────────────────────────────────────────────────
// Validates that the requesting context has the required permissions before routing.

export function validateCommandAuthority(
  command:            typeof platformCommands.$inferSelect,
  userPermissions:    string[],
): { authorized: boolean; missingPermissions: string[] } {
  const required = (command.requiredPermissions as string[]) ?? [];
  if (required.length === 0) return { authorized: true, missingPermissions: [] };
  const missing = required.filter((p) => !userPermissions.includes(p));
  return { authorized: missing.length === 0, missingPermissions: missing };
}

// ── Count ─────────────────────────────────────────────────────────────────────

export async function countActiveCommands(): Promise<number> {
  const rows = await db.select({ id: platformCommands.id }).from(platformCommands).where(eq(platformCommands.active, true));
  return rows.length;
}

// ── Deactivate all commands for an app ───────────────────────────────────────

export async function deactivateAppCommands(appId: string): Promise<void> {
  await db
    .update(platformCommands)
    .set({ active: false })
    .where(eq(platformCommands.appId, appId));
}
