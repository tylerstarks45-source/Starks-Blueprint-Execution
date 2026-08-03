import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { customerSegments } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { SegmentType } from "./types.js";

export interface CreateSegmentInput {
  userId:       number;
  businessId?:  number;
  title:        string;
  description?: string;
  segmentType:  SegmentType;
  criteria:     Record<string, unknown>;
  isAutomatic?: boolean;
}

export async function createSegment(input: CreateSegmentInput) {
  const segmentId = `seg_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const rows = (await db.insert(customerSegments).values({
    segmentId,
    userId:       input.userId,
    businessId:   input.businessId ?? null,
    title:        input.title,
    description:  input.description ?? null,
    segmentType:  input.segmentType,
    criteria:     input.criteria,
    isAutomatic:  input.isAutomatic ?? true,
    customerIds:  [],
    memberCount:  0,
    lastRefreshedAt: new Date(),
  }).returning()) as any[];
  return rows[0];
}

export async function listSegments(userId: number, businessId?: number) {
  const conditions = [eq(customerSegments.userId, userId)];
  if (businessId) conditions.push(eq(customerSegments.businessId, businessId));
  return db.select().from(customerSegments).where(and(...conditions));
}

/** Deterministic segment membership evaluation. */
export function evaluateSegmentMembership(
  segment: { criteria: unknown; segmentType: string },
  customer: { entityType: string; engagementScore?: number; lifetimeValue?: number; currentStage?: string }
): boolean {
  const criteria = segment.criteria as Record<string, unknown>;
  if (!criteria || Object.keys(criteria).length === 0) return true;

  // Stage filter
  if (criteria.stage && customer.currentStage !== criteria.stage) return false;
  // Entity type filter
  if (criteria.entityType && customer.entityType !== criteria.entityType) return false;
  // Min engagement
  if (criteria.minEngagement !== undefined) {
    const minE = Number(criteria.minEngagement);
    if ((customer.engagementScore ?? 0) < minE) return false;
  }
  // Min LTV
  if (criteria.minLifetimeValue !== undefined) {
    const minL = Number(criteria.minLifetimeValue);
    if ((customer.lifetimeValue ?? 0) < minL) return false;
  }
  return true;
}
