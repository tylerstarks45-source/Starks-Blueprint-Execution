import { auditTrailEntriesTable } from "@workspace/db";
import type { DbExecutor } from "../business-intelligence/events";
import type { AuditAction, GovernedWriteContext } from "./types";

export interface RecordAuditInput {
  recordTable: string;
  recordId: number;
  action: AuditAction;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// The single place that writes to audit_trail_entries. Scope is mutations
// only (create/update/delete) — reads are never audited here. Callers in
// `lib/governance/writes/*` call this from inside the same transaction as
// the mutation itself, so an audit entry can never exist without its
// underlying write having committed (or vice versa).
export async function recordAudit(tx: DbExecutor, ctx: GovernedWriteContext, input: RecordAuditInput): Promise<void> {
  await tx.insert(auditTrailEntriesTable).values({
    ownerUserId: ctx.ownerUserId,
    businessId: ctx.businessId ?? null,
    recordTable: input.recordTable,
    recordId: input.recordId,
    action: input.action,
    sourceEngine: ctx.sourceEngine,
    actorType: ctx.actor.actorType,
    actorUserId: ctx.actor.actorUserId ?? null,
    changes: input.changes ?? {},
    metadata: input.metadata ?? {},
  });
}
