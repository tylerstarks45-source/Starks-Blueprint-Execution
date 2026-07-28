/**
 * Memory Engine — Business Context Isolation (ASH Brain v2.0 — Phase 1.5A)
 *
 * Verifies the scope-filter contract shared by Long-Term Memory and
 * Knowledge Memory (memory-engine/{long-term,knowledge}-memory.ts, backed by
 * business-intelligence/context.ts's resolveRelevantKnowledgeScopes):
 *
 *  1. `business`-scoped rows stay confined to the active business.
 *  2. `global_user` / `global` rows are always visible, regardless of the
 *     active business.
 *  3. crossBusinessMode is the only way to lift the restriction — it must be
 *     explicit, never inferred here.
 *  4. Without an ACTIVE business at all (no businessId passed), restriction
 *     is off by design — a documented, honest scope-narrowing limitation,
 *     not a gap accidentally introduced by these tests.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { db, usersTable, businessesTable, userMemoryTable, ashKnowledgeEntriesTable } from "@workspace/db";
import { getRelevantLongTermMemory, upsertLongTermMemory } from "../lib/memory-engine/long-term-memory";
import { getRelevantKnowledge, addKnowledgeEntry } from "../lib/memory-engine/knowledge-memory";

let userId: number;
let businessAId: number;
let businessBId: number;
const EMAIL = `memory_isolation_${Date.now()}@test.internal`;

beforeAll(async () => {
  const [user] = await db.insert(usersTable).values({ email: EMAIL, role: "USER", membershipStatus: "active", membershipTier: "starter" }).returning({ id: usersTable.id });
  userId = user.id;
  const [[businessA], [businessB]] = await Promise.all([
    db.insert(businessesTable).values({ ownerId: userId, name: "Isolation Test — Business A", businessType: "saas" }).returning({ id: businessesTable.id }),
    db.insert(businessesTable).values({ ownerId: userId, name: "Isolation Test — Business B", businessType: "saas" }).returning({ id: businessesTable.id }),
  ]);
  businessAId = businessA.id;
  businessBId = businessB.id;
});

afterAll(async () => {
  await db.delete(usersTable).where(eq(usersTable.id, userId));
});

afterEach(async () => {
  await db.delete(userMemoryTable).where(eq(userMemoryTable.userId, userId));
  await db.delete(ashKnowledgeEntriesTable).where(eq(ashKnowledgeEntriesTable.userId, userId));
});

describe("Memory Engine — Business Context Isolation", () => {
  it("Long-Term Memory: business-scoped rows stay confined to the active business; global_user rows always show", async () => {
    await upsertLongTermMemory({ userId, category: "preference", title: "prefers concise replies", content: "Keep responses short and to the point.", tags: [], importanceScore: 60, confidenceScore: 90 });
    await upsertLongTermMemory({ userId, category: "fact_a", title: "fact about business a", content: "Business A operates a subscription pricing model.", tags: [], importanceScore: 60, confidenceScore: 90, scope: "business", businessId: businessAId });
    await upsertLongTermMemory({ userId, category: "fact_b", title: "fact about business b", content: "Business B operates a one-time purchase model.", tags: [], importanceScore: 60, confidenceScore: 90, scope: "business", businessId: businessBId });

    const scopedToA = await getRelevantLongTermMemory({ userId, message: "what do you know about my business", businessId: businessAId, limit: 10 });
    expect(scopedToA.some((m) => m.memoryValue.includes("subscription pricing"))).toBe(true);
    expect(scopedToA.some((m) => m.memoryValue.includes("one-time purchase"))).toBe(false);
    expect(scopedToA.some((m) => m.memoryValue.includes("Keep responses short"))).toBe(true);

    const scopedToB = await getRelevantLongTermMemory({ userId, message: "what do you know about my business", businessId: businessBId, limit: 10 });
    expect(scopedToB.some((m) => m.memoryValue.includes("one-time purchase"))).toBe(true);
    expect(scopedToB.some((m) => m.memoryValue.includes("subscription pricing"))).toBe(false);
  });

  it("Long-Term Memory: crossBusinessMode is an explicit opt-in that lifts the restriction", async () => {
    await upsertLongTermMemory({ userId, category: "fact_a", title: "fact about business a", content: "Business A operates a subscription pricing model.", tags: [], importanceScore: 60, confidenceScore: 90, scope: "business", businessId: businessAId });
    await upsertLongTermMemory({ userId, category: "fact_b", title: "fact about business b", content: "Business B operates a one-time purchase model.", tags: [], importanceScore: 60, confidenceScore: 90, scope: "business", businessId: businessBId });

    const restricted = await getRelevantLongTermMemory({ userId, message: "compare pricing", businessId: businessAId, limit: 10 });
    expect(restricted.some((m) => m.memoryValue.includes("one-time purchase"))).toBe(false);

    const crossBusiness = await getRelevantLongTermMemory({ userId, message: "compare pricing", businessId: businessAId, crossBusinessMode: true, limit: 10 });
    expect(crossBusiness.some((m) => m.memoryValue.includes("subscription pricing"))).toBe(true);
    expect(crossBusiness.some((m) => m.memoryValue.includes("one-time purchase"))).toBe(true);
  });

  it("Knowledge Memory: business-scoped entries stay confined to the active business; global/reusable entries always show", async () => {
    await addKnowledgeEntry({ userId, category: "playbook", title: "General playbook", content: "A generally useful playbook that applies everywhere.", scope: "global" });
    await addKnowledgeEntry({ userId, category: "playbook", title: "Business A playbook", content: "A playbook specific to business A operations.", scope: "business", businessId: businessAId });
    await addKnowledgeEntry({ userId, category: "playbook", title: "Business B playbook", content: "A playbook specific to business B operations.", scope: "business", businessId: businessBId });

    const scopedToA = await getRelevantKnowledge({ userId, message: "playbook operations", businessId: businessAId, limit: 10 });
    expect(scopedToA.some((k) => k.title === "Business A playbook")).toBe(true);
    expect(scopedToA.some((k) => k.title === "Business B playbook")).toBe(false);
    expect(scopedToA.some((k) => k.title === "General playbook")).toBe(true);

    const crossBusiness = await getRelevantKnowledge({ userId, message: "playbook operations", businessId: businessAId, crossBusinessMode: true, limit: 10 });
    expect(crossBusiness.some((k) => k.title === "Business B playbook")).toBe(true);
  });

  it("without an active business, business-scoped rows from every business are visible (documented scope-narrowing limitation)", async () => {
    await addKnowledgeEntry({ userId, category: "playbook", title: "Business A playbook", content: "A playbook specific to business A operations.", scope: "business", businessId: businessAId });
    await addKnowledgeEntry({ userId, category: "playbook", title: "Business B playbook", content: "A playbook specific to business B operations.", scope: "business", businessId: businessBId });

    const noActiveBusiness = await getRelevantKnowledge({ userId, message: "playbook operations", businessId: null, limit: 10 });
    expect(noActiveBusiness.some((k) => k.title === "Business A playbook")).toBe(true);
    expect(noActiveBusiness.some((k) => k.title === "Business B playbook")).toBe(true);
  });
});
