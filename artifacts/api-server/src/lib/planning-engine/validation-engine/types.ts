import type { AshTask } from "@workspace/db";
import type { ValidationIssue, ValidationResult } from "../types";

// ─── Validation Engine (Phase 1.4 upgrade) ─────────────────────────────────
// Replaces the flat keyword-array validation from the Phase 1.3 foundation
// with a modular rule registry. The core runner (index.ts) knows nothing
// about credentials, files, or risk — it just runs every registered rule
// against the same context and collects issues. New validation logic is
// added by writing a new rule file and appending it to `rules/index.ts`;
// nothing else in the engine changes.

export type { ValidationIssue, ValidationResult };
export type ValidationIssueKind = ValidationIssue["kind"];

export interface ValidationContext {
  task: AshTask;
  userId: number;
  systemInstanceId: number | null;
}

export interface ValidationRule {
  id: string;
  description: string;
  evaluate(ctx: ValidationContext): Promise<ValidationIssue[]>;
}
