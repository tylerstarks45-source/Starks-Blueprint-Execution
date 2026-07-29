// ─── Context Registry (Build 006) ────────────────────────────────────────────
//
// The authoritative CRUD layer for Executive Contexts.
// Every context passes through this registry — no direct DB access from
// consumers. The registry enforces validation, increments versions on changes,
// and appends immutable timeline events for every lifecycle transition.
//
// Responsibilities:
//   Register, Retrieve, Update, Archive, Activate, Deactivate, Search,
//   Version, Validate, Monitor Context Health.

import {
  db,
  executiveContextsTable,
  contextTimelineEventsTable,
  contextEntityLinksTable,
} from "@workspace/db";
import { eq, and, desc, ilike, or, type SQL } from "drizzle-orm";
import { logger } from "../logger";
import type {
  ExecutiveContextModel,
  CreateContextInput,
  UpdateContextInput,
  ContextTimelineEvent,
  ContextEntityLink,
  ContextValidationResult,
} from "./types";

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToModel(row: typeof executiveContextsTable.$inferSelect): ExecutiveContextModel {
  return {
    ...row,
    objectives: (row.objectives as string[]) ?? [],
    constraints: (row.constraints as string[]) ?? [],
    assumptions: (row.assumptions as string[]) ?? [],
    priorities: (row.priorities as string[]) ?? [],
    risks: (row.risks as string[]) ?? [],
    dependencies: (row.dependencies as string[]) ?? [],
    stakeholders: (row.stakeholders as string[]) ?? [],
    successCriteria: (row.successCriteria as string[]) ?? [],
    failureConditions: (row.failureConditions as string[]) ?? [],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

// ─── Internal: Timeline event recorder ───────────────────────────────────────

export async function recordTimelineEvent(params: {
  contextId: string;
  eventType: string;
  changedField?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  triggeredBy?: string;
}): Promise<void> {
  try {
    await db.insert(contextTimelineEventsTable).values({
      id: crypto.randomUUID(),
      contextId: params.contextId,
      eventType: params.eventType,
      changedField: params.changedField ?? null,
      oldValue: params.oldValue !== undefined ? (params.oldValue as never) : null,
      newValue: params.newValue !== undefined ? (params.newValue as never) : null,
      reason: params.reason ?? null,
      triggeredBy: params.triggeredBy ?? "system",
    });
  } catch (err) {
    logger.warn({ err, contextId: params.contextId }, "Context registry: timeline event failed (non-fatal)");
  }
}

// ─── Context Validation ───────────────────────────────────────────────────────

/** Validate a context object before persistence. Returns errors and warnings.
 *  A context with errors should not be persisted; one with only warnings may be. */
export function validateContext(input: CreateContextInput | UpdateContextInput): ContextValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if ("name" in input && input.name !== undefined) {
    if (input.name.trim().length === 0) errors.push("name must not be empty");
    if (input.name.length > 200) errors.push("name must be 200 characters or fewer");
  }

  if (input.objectives && input.objectives.some((o) => !o.trim())) {
    warnings.push("one or more objectives are empty strings");
  }
  if (input.constraints && input.constraints.some((c) => !c.trim())) {
    warnings.push("one or more constraints are empty strings");
  }
  if (input.priorities && input.priorities.length > 20) {
    warnings.push("more than 20 priorities may reduce clarity");
  }
  if (input.successCriteria && input.successCriteria.length === 0 && "name" in input) {
    warnings.push("context has no success criteria — how will you know when it is achieved?");
  }

  const validTypes = ["operational", "strategic", "tactical", "exploratory", "investigative"];
  if (input.contextType && !validTypes.includes(input.contextType)) {
    errors.push(`contextType "${input.contextType}" is not a valid type (${validTypes.join(", ")})`);
  }

  const validStatuses = ["draft", "active", "inactive", "archived"];
  if ("status" in input && input.status && !validStatuses.includes(input.status)) {
    errors.push(`status "${input.status}" is not a valid status`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── Registry CRUD ────────────────────────────────────────────────────────────

/** Register (create) a new Executive Context.
 *  Validates input before insertion. Appends a 'created' timeline event. */
export async function registerContext(
  input: CreateContextInput,
  userId: number,
): Promise<ExecutiveContextModel> {
  const validation = validateContext(input);
  if (!validation.valid) {
    throw new Error(`Context validation failed: ${validation.errors.join("; ")}`);
  }
  if (validation.warnings.length > 0) {
    logger.warn({ warnings: validation.warnings, name: input.name }, "Context registered with warnings");
  }

  const id = input.id ?? crypto.randomUUID();
  const [row] = await db
    .insert(executiveContextsTable)
    .values({
      id,
      userId,
      name: input.name,
      contextType: input.contextType ?? "operational",
      description: input.description ?? null,
      purpose: input.purpose ?? null,
      mission: input.mission ?? null,
      scope: input.scope ?? null,
      objectives: input.objectives ?? [],
      constraints: input.constraints ?? [],
      assumptions: input.assumptions ?? [],
      priorities: input.priorities ?? [],
      risks: input.risks ?? [],
      dependencies: input.dependencies ?? [],
      stakeholders: input.stakeholders ?? [],
      successCriteria: input.successCriteria ?? [],
      failureConditions: input.failureConditions ?? [],
      status: input.status ?? "draft",
      confidence: input.confidence ?? "unknown",
      version: 1,
      metadata: input.metadata ?? {},
    })
    .returning();
  if (!row) throw new Error("Failed to insert context");

  const model = rowToModel(row);
  await recordTimelineEvent({
    contextId: id,
    eventType: "created",
    newValue: { name: model.name, contextType: model.contextType, status: model.status },
    reason: "Initial registration",
    triggeredBy: "registry",
  });

  logger.debug({ id, name: model.name, userId }, "Executive context registered");
  return model;
}

/** Retrieve a single context by id. Returns null if not found. */
export async function getContext(id: string): Promise<ExecutiveContextModel | null> {
  const rows = await db
    .select()
    .from(executiveContextsTable)
    .where(eq(executiveContextsTable.id, id))
    .limit(1);
  return rows[0] ? rowToModel(rows[0]) : null;
}

/** List all contexts for a user, optionally filtered by status. */
export async function listContexts(
  userId: number,
  status?: string,
  limit = 50,
): Promise<ExecutiveContextModel[]> {
  const conditions: SQL[] = [eq(executiveContextsTable.userId, userId)];
  if (status) conditions.push(eq(executiveContextsTable.status, status));
  const rows = await db
    .select()
    .from(executiveContextsTable)
    .where(and(...conditions))
    .orderBy(desc(executiveContextsTable.updatedAt))
    .limit(limit);
  return rows.map(rowToModel);
}

/** Search contexts by name or description substring. */
export async function searchContexts(
  userId: number,
  query: string,
  limit = 20,
): Promise<ExecutiveContextModel[]> {
  const term = `%${query.toLowerCase()}%`;
  const rows = await db
    .select()
    .from(executiveContextsTable)
    .where(
      and(
        eq(executiveContextsTable.userId, userId),
        or(
          ilike(executiveContextsTable.name, term),
          ilike(executiveContextsTable.description, term),
          ilike(executiveContextsTable.purpose, term),
        ),
      ),
    )
    .orderBy(desc(executiveContextsTable.updatedAt))
    .limit(limit);
  return rows.map(rowToModel);
}

/** Update an existing context. Increments version, records timeline events
 *  for each changed dimension. Returns the updated model. */
export async function updateContext(
  id: string,
  patch: UpdateContextInput,
  triggeredBy = "system",
): Promise<ExecutiveContextModel> {
  const existing = await getContext(id);
  if (!existing) throw new Error(`Context "${id}" not found`);
  if (existing.status === "archived") throw new Error(`Context "${id}" is archived and cannot be updated`);

  const validation = validateContext(patch);
  if (!validation.valid) {
    throw new Error(`Context update validation failed: ${validation.errors.join("; ")}`);
  }

  const updates: Record<string, unknown> = {
    version: existing.version + 1,
    updatedAt: new Date(),
  };

  // Track which fields changed for timeline events
  const changedFields: Array<{ field: string; oldVal: unknown; newVal: unknown }> = [];

  const scalarFields = [
    "name", "contextType", "description", "purpose", "mission", "scope",
    "status", "confidence",
  ] as const;
  for (const field of scalarFields) {
    if (patch[field] !== undefined && patch[field] !== existing[field]) {
      updates[field === "contextType" ? "contextType" : field] = patch[field];
      changedFields.push({ field, oldVal: existing[field], newVal: patch[field] });
    }
  }

  const arrayFields = [
    "objectives", "constraints", "assumptions", "priorities", "risks",
    "dependencies", "stakeholders", "successCriteria", "failureConditions",
  ] as const;
  for (const field of arrayFields) {
    if (patch[field] !== undefined) {
      updates[field] = patch[field];
      changedFields.push({ field, oldVal: existing[field], newVal: patch[field] });
    }
  }

  if (patch.metadata !== undefined) {
    updates["metadata"] = patch.metadata;
  }

  await db
    .update(executiveContextsTable)
    .set(updates)
    .where(eq(executiveContextsTable.id, id));

  // Emit targeted timeline events
  for (const { field, oldVal, newVal } of changedFields) {
    const eventType =
      field === "objectives" ? "objective_changed" :
      field === "constraints" ? "constraint_changed" :
      field === "priorities" ? "priority_changed" :
      "updated";
    await recordTimelineEvent({
      contextId: id, eventType, changedField: field,
      oldValue: oldVal, newValue: newVal, triggeredBy,
    });
  }

  // Always record a version_changed event
  await recordTimelineEvent({
    contextId: id, eventType: "version_changed",
    changedField: "version",
    oldValue: existing.version, newValue: existing.version + 1,
    triggeredBy,
  });

  const updated = await getContext(id);
  if (!updated) throw new Error("Failed to retrieve updated context");
  return updated;
}

/** Activate a context (draft or inactive → active). */
export async function activateContext(id: string, triggeredBy = "system"): Promise<void> {
  const existing = await getContext(id);
  if (!existing) throw new Error(`Context "${id}" not found`);
  if (existing.status === "active") return;
  if (existing.status === "archived") throw new Error(`Cannot activate archived context "${id}"`);

  await db
    .update(executiveContextsTable)
    .set({ status: "active", version: existing.version + 1, updatedAt: new Date() })
    .where(eq(executiveContextsTable.id, id));

  await recordTimelineEvent({ contextId: id, eventType: "activated", triggeredBy,
    changedField: "status", oldValue: existing.status, newValue: "active" });
}

/** Deactivate a context (active → inactive). */
export async function deactivateContext(id: string, triggeredBy = "system"): Promise<void> {
  const existing = await getContext(id);
  if (!existing) throw new Error(`Context "${id}" not found`);
  if (existing.status !== "active") return;

  await db
    .update(executiveContextsTable)
    .set({ status: "inactive", version: existing.version + 1, updatedAt: new Date() })
    .where(eq(executiveContextsTable.id, id));

  await recordTimelineEvent({ contextId: id, eventType: "deactivated", triggeredBy,
    changedField: "status", oldValue: "active", newValue: "inactive" });
}

/** Archive a context. Archived contexts are preserved but cannot be updated or activated. */
export async function archiveContext(id: string, triggeredBy = "system"): Promise<void> {
  const existing = await getContext(id);
  if (!existing) throw new Error(`Context "${id}" not found`);
  if (existing.status === "archived") return;

  await db
    .update(executiveContextsTable)
    .set({ status: "archived", version: existing.version + 1, updatedAt: new Date() })
    .where(eq(executiveContextsTable.id, id));

  await recordTimelineEvent({ contextId: id, eventType: "archived", triggeredBy,
    changedField: "status", oldValue: existing.status, newValue: "archived" });

  logger.debug({ id, triggeredBy }, "Executive context archived");
}

// ─── Entity Links ─────────────────────────────────────────────────────────────

function linkRowToModel(row: typeof contextEntityLinksTable.$inferSelect): ContextEntityLink {
  return { ...row };
}

/** Create a polymorphic link from a Context to any entity.
 *  Idempotent: duplicate (contextId, entityType, entityId) triples are silently ignored. */
export async function addContextEntityLink(
  contextId: string,
  entityType: string,
  entityId: string,
  description: string | null,
  addedBy: string,
): Promise<void> {
  await db
    .insert(contextEntityLinksTable)
    .values({ id: crypto.randomUUID(), contextId, entityType, entityId,
               relationshipDescription: description, addedBy })
    .onConflictDoNothing();

  await recordTimelineEvent({
    contextId, eventType: "relationship_changed",
    changedField: "entity_links",
    newValue: { entityType, entityId, addedBy },
    triggeredBy: addedBy,
  });
}

/** Remove a polymorphic entity link from a Context. */
export async function removeContextEntityLink(
  contextId: string,
  entityType: string,
  entityId: string,
): Promise<void> {
  await db
    .delete(contextEntityLinksTable)
    .where(
      and(
        eq(contextEntityLinksTable.contextId, contextId),
        eq(contextEntityLinksTable.entityType, entityType),
        eq(contextEntityLinksTable.entityId, entityId),
      ),
    );
}

/** Return all entity links for a Context, optionally filtered by entity type. */
export async function getContextEntityLinks(
  contextId: string,
  entityType?: string,
): Promise<ContextEntityLink[]> {
  const conditions: SQL[] = [eq(contextEntityLinksTable.contextId, contextId)];
  if (entityType) conditions.push(eq(contextEntityLinksTable.entityType, entityType));
  const rows = await db
    .select()
    .from(contextEntityLinksTable)
    .where(and(...conditions))
    .orderBy(desc(contextEntityLinksTable.createdAt));
  return rows.map(linkRowToModel);
}
