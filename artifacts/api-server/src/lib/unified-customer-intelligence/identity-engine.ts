import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { customerProfiles, customerRegistry } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { CustomerEntityType } from "./types.js";

export interface CreateCustomerInput {
  userId:         number;
  businessId?:    number;
  entityType:     CustomerEntityType;
  firstName?:     string;
  lastName?:      string;
  email?:         string;
  phone?:         string;
  source?:        string;
  customFields?:  Record<string, unknown>;
  tags?:          string[];
}

export async function createCustomerProfile(input: CreateCustomerInput) {
  const customerId = `cust_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ") || null;

  const rows = (await db
    .insert(customerProfiles)
    .values({
      customerId,
      userId:       input.userId,
      businessId:   input.businessId ?? null,
      entityType:   input.entityType,
      firstName:    input.firstName ?? null,
      lastName:     input.lastName ?? null,
      fullName,
      displayName:  fullName ?? input.email ?? customerId,
      email:        input.email ?? null,
      phone:        input.phone ?? null,
      source:       input.source ?? "manual",
      customFields: input.customFields ?? {},
      tags:         input.tags ?? [],
    })
    .returning()) as any[];
  const profile = rows[0];

  // Upsert registry row
  await db
    .insert(customerRegistry)
    .values({
      customerId,
      userId:      input.userId,
      businessId:  input.businessId ?? null,
      fullName:    fullName ?? null,
      email:       input.email ?? null,
      entityType:  input.entityType,
      currentStage: "lead",
      profileComplete: computeCompleteness(input),
    })
    .onConflictDoUpdate({
      target: customerRegistry.customerId,
      set: {
        fullName:        sql`EXCLUDED.full_name`,
        email:           sql`EXCLUDED.email`,
        entityType:      sql`EXCLUDED.entity_type`,
        profileComplete: sql`EXCLUDED.profile_complete`,
        updatedAt:       sql`NOW()`,
      },
    });

  return profile;
}

export async function getCustomerProfile(customerId: string) {
  const rows = await db
    .select()
    .from(customerProfiles)
    .where(eq(customerProfiles.customerId, customerId))
    .limit(1);
  return rows[0] ?? null;
}

export async function listCustomerProfiles(userId: number, businessId?: number, limit = 50, offset = 0) {
  const conditions = [eq(customerProfiles.userId, userId)];
  if (businessId) conditions.push(eq(customerProfiles.businessId, businessId));
  return db.select().from(customerProfiles)
    .where(and(...conditions))
    .limit(limit).offset(offset);
}

export async function searchCustomers(userId: number, query: string, limit = 20) {
  const q = `%${query.toLowerCase()}%`;
  return db.execute(sql`
    SELECT * FROM customer_profiles
    WHERE user_id = ${userId}
      AND (LOWER(full_name) LIKE ${q}
           OR LOWER(email) LIKE ${q}
           OR LOWER(display_name) LIKE ${q})
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);
}

function computeCompleteness(input: CreateCustomerInput): number {
  let score = 0;
  if (input.firstName || input.lastName)  score += 25;
  if (input.email)                         score += 30;
  if (input.phone)                         score += 15;
  if (input.entityType)                    score += 10;
  if (input.source)                        score += 10;
  if (input.tags?.length)                  score += 10;
  return Math.min(score, 100);
}
