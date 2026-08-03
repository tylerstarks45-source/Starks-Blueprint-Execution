import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { businessProcesses, processRegistry } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { ProcessDomain, ProcessType } from "./types.js";

export interface CreateProcessInput {
  userId:         number;
  businessId?:    number;
  title:          string;
  description?:   string;
  processDomain:  ProcessDomain;
  processType:    ProcessType;
  templateId?:    string;
  slaHours?:      number;
  dueAt?:         Date;
  tags?:          string[];
  metadata?:      Record<string, unknown>;
}

export async function createProcess(input: CreateProcessInput) {
  const processId = `proc_${randomUUID().replace(/-/g, "").slice(0, 20)}`;

  const rows = (await db.insert(businessProcesses).values({
    processId,
    userId:       input.userId,
    businessId:   input.businessId ?? null,
    title:        input.title,
    description:  input.description ?? null,
    processDomain: input.processDomain,
    processType:  input.processType,
    templateId:   input.templateId ?? null,
    slaHours:     input.slaHours ?? null,
    dueAt:        input.dueAt ?? null,
    tags:         input.tags ?? [],
    metadata:     input.metadata ?? {},
    status:       "draft",
    version:      1,
  }).returning()) as any[];
  const process = rows[0];

  // Initialize registry row
  await db.insert(processRegistry)
    .values({
      processId,
      userId:      input.userId,
      businessId:  input.businessId ?? null,
      title:       input.title,
      processDomain: input.processDomain,
      status:      "draft",
    })
    .onConflictDoUpdate({
      target: processRegistry.processId,
      set: {
        title:         sql`EXCLUDED.title`,
        processDomain: sql`EXCLUDED.process_domain`,
        status:        sql`EXCLUDED.status`,
        updatedAt:     sql`NOW()`,
      },
    });

  return process;
}

export async function listProcesses(userId: number, businessId?: number, domain?: ProcessDomain, limit = 50, offset = 0) {
  const conditions = [eq(businessProcesses.userId, userId)];
  if (businessId) conditions.push(eq(businessProcesses.businessId, businessId));
  if (domain)     conditions.push(eq(businessProcesses.processDomain, domain));
  return db.select().from(businessProcesses)
    .where(and(...conditions))
    .orderBy(sql`created_at DESC`)
    .limit(limit).offset(offset);
}

export async function searchProcesses(userId: number, query: string, limit = 20) {
  const q = `%${query.toLowerCase()}%`;
  return db.execute(sql`
    SELECT * FROM business_processes
    WHERE user_id = ${userId}
      AND (LOWER(title) LIKE ${q} OR LOWER(description) LIKE ${q})
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);
}
