import type { AshResearchType } from "@workspace/db";

// ─── Research & Knowledge Engine (Phase 1.4) shared types ──────────────────
// Sits between the Executive Brain and the existing AI Orchestrator:
// Executive Brain → Research & Knowledge Engine → existing AI Orchestrator
// → existing search/tool systems (see gatherer.ts — it calls the same
// complete()+MODELS.research primitive routes/research.ts and
// ai-orchestrator.ts already use; nothing is reimplemented).

export interface ResearchRequest {
  userId: number;
  projectId: number | null;
  researchType: AshResearchType;
  objective: string; // what the user actually wants to know
}

export interface ResearchPlanStep {
  query: string;
  purpose: string;
}

export interface ResearchPlan {
  steps: ResearchPlanStep[];
}

export interface RawFinding {
  query: string;
  content: string;
  /** Structured results when the active search provider supports them (Tavily/Serper); undefined for prose-only providers like Perplexity. */
  sourceResults?: import("../search-providers").SearchResultItem[];
}

export interface ScoredSource {
  label: string; // the query/finding this source backs
  reliability: number; // 0-100 heuristic score
  reasoning: string;
}

export interface StructuredSummary {
  title: string;
  summary: string;
  keyFindings: string[];
  tags: string[];
  confidenceScore: number; // 0-100
  competitorProfile?: Record<string, unknown>;
  aiToolProfile?: Record<string, unknown>;
}

export type KnowledgeAction = "reused" | "created" | "updated" | "skipped" | "failed";

export interface ResearchEngineResult {
  sessionId: number;
  reusedExistingKnowledge: boolean;
  knowledgeEntryId: number | null;
  /** What happened to Knowledge Memory as a result of this run. */
  knowledgeAction: KnowledgeAction;
  summary: string;
  keyFindings: string[];
  confidenceScore: number;
  contextNote: string; // folded into the same internal context block as
  // Planning/Memory Engine notes — no change to the orchestrator's prompt
  // assembly code.
}
