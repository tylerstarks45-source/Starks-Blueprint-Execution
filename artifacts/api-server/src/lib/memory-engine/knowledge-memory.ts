import { db, ashKnowledgeEntriesTable } from "@workspace/db";
import { eq, and, ne, or } from "drizzle-orm";
import type { AshKnowledgeEntry, AshKnowledgeCategory } from "@workspace/db";
import { topByRelevance } from "./relevance";
import { resolveRelevantKnowledgeScopes } from "../business-intelligence";
import { insertKnowledgeEntry, touchKnowledgeEntryAccess } from "../governance/writes/knowledge-writes";
import { actorFor, type GovernedWriteContext } from "../governance/types";

// ─── Knowledge Memory (Layer 5) ────────────────────────────────────────────
// Per-user patterns/playbooks/recommendations, continuously captured (see
// auto-memory.ts) and specifically written to on project completion (see
// learning.ts). Distinct from the existing cross-user `ash_lessons` table.
//
// Business Context Isolation: only `scope = "business"` rows are restricted
// by active business. `global` / `industry` / `reusable` rows are, by
// design, meant to surface regardless of which business is active — they
// are general-purpose lessons, not business-specific facts. `project` scope
// is left unrestricted here too (project-level isolation is already handled
// correctly and exclusively by `ash_project_memory` — see project-memory.ts
// — so it is not redundantly re-enforced on this table).

export async function getRelevantKnowledge(params: {
  userId: number;
  message: string;
  businessId?: number | null;
  crossBusinessMode?: boolean;
  limit?: number;
}): Promise<AshKnowledgeEntry[]> {
  const scopeFilter = resolveRelevantKnowledgeScopes({ businessId: params.businessId, crossBusinessMode: params.crossBusinessMode });
  const rows = await db.select().from(ashKnowledgeEntriesTable).where(and(
    eq(ashKnowledgeEntriesTable.userId, params.userId),
    scopeFilter.restrictToBusiness ? or(ne(ashKnowledgeEntriesTable.scope, "business"), eq(ashKnowledgeEntriesTable.businessId, scopeFilter.allowedBusinessId)) : undefined,
  ));
  const top = topByRelevance(rows, params.message, (r) => ({
    content: `${r.title} ${r.content}`,
    tags: r.tags,
    importanceScore: r.importanceScore,
    confidenceScore: r.confidenceScore,
    lastAccessedAt: r.lastAccessedAt,
  }), params.limit ?? 3);

  for (const row of top) {
    await touchKnowledgeEntryAccess(db, row.id).catch(() => {});
  }
  return top;
}

export async function addKnowledgeEntry(params: {
  userId: number;
  sourceProjectId?: number | null;
  category: AshKnowledgeCategory;
  title: string;
  content: string;
  tags?: string[];
  importanceScore?: number;
  confidenceScore?: number;
  // Defaults to "global" (visible everywhere). Pass "business" + businessId
  // for a lesson/pattern learned specifically while operating within one
  // business — see Business Context Isolation note above.
  scope?: "global" | "business" | "industry" | "reusable";
  businessId?: number | null;
}): Promise<AshKnowledgeEntry> {
  const scope = params.scope ?? "global";
  // ash_knowledge_entries has no business (it's per-user, optionally
  // business-scoped) so ownerUserId is the entry's own userId directly, not
  // resolved via a business join. Always AI-attributed — see file header
  // (auto-memory capture / completion learning are this table's only writers).
  const ctx: GovernedWriteContext = {
    ownerUserId: params.userId,
    sourceEngine: "business_intelligence.knowledge",
    actor: actorFor("ai"),
    businessId: scope === "business" ? params.businessId ?? null : null,
  };
  return insertKnowledgeEntry(db, ctx, {
    userId: params.userId,
    sourceProjectId: params.sourceProjectId ?? null,
    category: params.category,
    title: params.title,
    content: params.content,
    tags: params.tags ?? [],
    importanceScore: params.importanceScore ?? 50,
    confidenceScore: params.confidenceScore ?? 100,
    scope,
    businessId: scope === "business" ? params.businessId ?? null : null,
    lastAccessedAt: new Date(),
  });
}

export async function listKnowledge(userId: number): Promise<AshKnowledgeEntry[]> {
  return db.select().from(ashKnowledgeEntriesTable).where(eq(ashKnowledgeEntriesTable.userId, userId));
}
