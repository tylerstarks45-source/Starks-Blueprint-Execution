import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { processRules, processRegistry } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { RuleType } from "./types.js";

export interface CreateRuleInput {
  processId:    string;
  userId:       number;
  title:        string;
  description?: string;
  ruleType:     RuleType;
  triggerEvent?: string;
  conditions?:  Array<{ field: string; operator: string; value: unknown }>;
  actions?:     Array<{ actionType: string; payload: Record<string, unknown> }>;
  priority?:    number;
}

export async function createRule(input: CreateRuleInput) {
  const ruleId = `rule_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const rows = (await db.insert(processRules).values({
    ruleId,
    processId:    input.processId,
    userId:       input.userId,
    title:        input.title,
    description:  input.description ?? null,
    ruleType:     input.ruleType,
    triggerEvent: input.triggerEvent ?? null,
    conditions:   input.conditions ?? [],
    actions:      input.actions ?? [],
    priority:     input.priority ?? 50,
    isActive:     true,
  }).returning()) as any[];
  return rows[0];
}

export async function listRules(processId: string) {
  return db.select().from(processRules)
    .where(and(eq(processRules.processId, processId), eq(processRules.isActive, true)))
    .orderBy(sql`priority ASC`);
}

/** Evaluate all active approval_gate rules for a process — returns pending approvals. */
export async function getPendingApprovals(processId: string): Promise<Array<{
  ruleId: string; title: string; triggerEvent: string | null; priority: number;
}>> {
  const rules = await db.select().from(processRules)
    .where(and(
      eq(processRules.processId, processId),
      eq(processRules.ruleType, "approval_gate"),
      eq(processRules.isActive, true),
    ));

  const pending = rules.filter((r) => {
    // Simplified: a gate is "pending" if trigger_event is present (real resolution needs step state)
    return r.triggerEvent !== null;
  });

  return pending.map((r) => ({
    ruleId:       r.ruleId,
    title:        r.title,
    triggerEvent: r.triggerEvent,
    priority:     r.priority ?? 50,
  }));
}

/** Count platform-wide pending approvals for a user. */
export async function countPendingApprovals(userId: number): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*) AS cnt
      FROM process_rules
     WHERE user_id  = ${userId}
       AND rule_type = 'approval_gate'
       AND is_active = true
  `);
  return Number(((result as any).rows ?? [])[0]?.cnt ?? 0);
}
