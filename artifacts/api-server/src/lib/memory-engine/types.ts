import type { AshProject, AshGoal, AshTask, AshProjectMemory, BusinessMemory, AshKnowledgeEntry, UserMemory } from "@workspace/db";

// ─── ASH Brain v2.0 — Memory Engine (Phase 1.2) shared types ───────────────
// Five layers, per the spec:
//   1. Working Memory   — derived live from Executive Brain state + request history (no storage of its own)
//   2. Long-Term Memory — `user_memory` (existing table, extended)
//   3. Project Memory   — `ash_project_memory` (new)
//   4. Business Memory  — `business_memory` (new)
//   5. Knowledge Memory — `ash_knowledge_entries` (new; distinct from the existing cross-user `ash_lessons`)

export interface WorkingMemory {
  activeProject: AshProject | null;
  currentObjective: AshGoal | null;
  currentTasks: AshTask[];
  recentConversation: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface RelevantMemoryBundle {
  working: WorkingMemory;
  longTerm: UserMemory[];
  project: AshProjectMemory[];
  business: BusinessMemory | null;
  knowledge: AshKnowledgeEntry[];
  // Rendered, ready-to-inject prompt note (already relevance-filtered/capped).
  contextNote: string;
}

// What the auto-memory extractor classifies a piece of text into.
export type MemoryLayer = "long_term" | "project" | "business" | "knowledge";

export interface ExtractedMemoryItem {
  layer: MemoryLayer;
  category: string;
  title: string;
  content: string;
  tags: string[];
  importanceScore: number; // 0-100
  confidenceScore: number; // 0-100
}
