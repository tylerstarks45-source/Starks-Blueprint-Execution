import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { customerRelationships, organizationProfiles, customerRegistry } from "@workspace/db/schema";
import { eq, or, and, sql } from "drizzle-orm";
import type { RelationshipType, OrgType } from "./types.js";

// ─── Organization ──────────────────────────────────────────────────────────
export interface CreateOrgInput {
  userId:         number;
  businessId?:    number;
  orgType:        OrgType;
  name:           string;
  domain?:        string;
  email?:         string;
  industry?:      string;
  employeeCount?: number;
  parentOrgId?:   string;
}

export async function createOrganizationProfile(input: CreateOrgInput) {
  const orgId = `org_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const parentDepth = input.parentOrgId ? 1 : 0;

  const rows = (await db.insert(organizationProfiles).values({
    orgId,
    userId:       input.userId,
    businessId:   input.businessId ?? null,
    orgType:      input.orgType,
    name:         input.name,
    domain:       input.domain ?? null,
    email:        input.email ?? null,
    industry:     input.industry ?? null,
    employeeCount: input.employeeCount ?? null,
    parentOrgId:  input.parentOrgId ?? null,
    hierarchyDepth: parentDepth,
  }).returning()) as any[];
  return rows[0];
}

export async function listOrganizations(userId: number, businessId?: number) {
  if (businessId) {
    return db.select().from(organizationProfiles)
      .where(and(eq(organizationProfiles.userId, userId), eq(organizationProfiles.businessId, businessId)));
  }
  return db.select().from(organizationProfiles).where(eq(organizationProfiles.userId, userId));
}

// ─── Relationships ─────────────────────────────────────────────────────────
export interface CreateRelationshipInput {
  sourceId:         string;
  sourceType:       "customer" | "organization";
  targetId:         string;
  targetType:       "customer" | "organization";
  relationshipType: RelationshipType;
  strength?:        number;
  isBidirectional?: boolean;
  metadata?:        Record<string, unknown>;
}

export async function createRelationship(input: CreateRelationshipInput) {
  const relationshipId = `rel_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const rows = (await db.insert(customerRelationships).values({
    relationshipId,
    sourceId:         input.sourceId,
    sourceType:       input.sourceType,
    targetId:         input.targetId,
    targetType:       input.targetType,
    relationshipType: input.relationshipType,
    strength:         input.strength ?? 0.5,
    isBidirectional:  input.isBidirectional ?? false,
    metadata:         input.metadata ?? {},
  }).returning()) as any[];

  // Update registry relationship count for both nodes
  await db.execute(sql`
    UPDATE customer_registry
       SET relationship_count = relationship_count + 1,
           updated_at         = NOW()
     WHERE customer_id IN (${input.sourceId}, ${input.targetId})
  `);

  return rows[0];
}

export async function listRelationships(customerId: string) {
  return db.select().from(customerRelationships)
    .where(or(
      eq(customerRelationships.sourceId, customerId),
      eq(customerRelationships.targetId, customerId),
    ));
}

/** Return a lightweight adjacency structure for graph traversal (BFS, depth ≤ 3). */
export async function buildRelationshipGraph(rootId: string, maxDepth = 3): Promise<{
  nodes: Array<{ id: string; type: string }>;
  edges: Array<{ source: string; target: string; relationship: string; strength: number }>;
}> {
  const visited = new Set<string>([rootId]);
  const queue: Array<{ id: string; depth: number }> = [{ id: rootId, depth: 0 }];
  const edges: Array<{ source: string; target: string; relationship: string; strength: number }> = [];

  while (queue.length > 0) {
    const item = queue.shift()!;
    if (item.depth >= maxDepth) continue;

    const rels = await db.select().from(customerRelationships)
      .where(or(
        eq(customerRelationships.sourceId, item.id),
        eq(customerRelationships.targetId, item.id),
      ));

    for (const r of rels) {
      const otherId = r.sourceId === item.id ? r.targetId : r.sourceId;
      edges.push({
        source:       r.sourceId,
        target:       r.targetId,
        relationship: r.relationshipType,
        strength:     r.strength ?? 0.5,
      });
      if (!visited.has(otherId)) {
        visited.add(otherId);
        queue.push({ id: otherId, depth: item.depth + 1 });
      }
    }
  }

  return {
    nodes: Array.from(visited).map((id) => ({ id, type: "customer" })),
    edges,
  };
}
