import { db, ashProjectMemoryTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import type { ValidationContext, ValidationIssue, ValidationRule } from "../types";

const FILE_REFERENCE_KEYWORDS = ["the uploaded file", "the attached file", "the attached document", "the file i sent", "the file i uploaded"];

export const fileRequirementRule: ValidationRule = {
  id: "file_requirement",
  description: "Flags a task that references an uploaded file with no matching record in project memory.",
  async evaluate(ctx: ValidationContext): Promise<ValidationIssue[]> {
    const lower = ctx.task.description.toLowerCase();
    if (!FILE_REFERENCE_KEYWORDS.some((kw) => lower.includes(kw))) return [];

    const fileRefs = await db
      .select({ id: ashProjectMemoryTable.id })
      .from(ashProjectMemoryTable)
      .where(and(eq(ashProjectMemoryTable.projectId, ctx.task.projectId), eq(ashProjectMemoryTable.type, "file_ref")));

    if (fileRefs.length > 0) return [];
    return [{
      kind: "missing_file",
      ruleId: "file_requirement",
      reason: "References an uploaded file, but no file is on record for this project yet.",
    }];
  },
};
