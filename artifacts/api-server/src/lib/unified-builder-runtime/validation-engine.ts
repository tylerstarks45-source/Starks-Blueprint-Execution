// ── Build 049: Validation Engine ──────────────────────────────────────────────
// Runs builder-independent validation pipeline before publish.
import { db } from "@workspace/db";
import { builderValidation, builderEvents, runtimeRegistry } from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type { BuilderType } from "./types";

// ── Built-in validation rules ─────────────────────────────────────────────────
interface RuleResult { pass: boolean; message?: string; path?: string }

interface BuiltinRule {
  ruleId:       string;
  ruleName:     string;
  severity:     "error" | "warning" | "info";
  builderTypes: BuilderType[] | "all";
  check:        (content: Record<string, unknown>) => RuleResult;
}

const BUILTIN_RULES: BuiltinRule[] = [
  {
    ruleId:       "content_not_empty",
    ruleName:     "Content must not be empty",
    severity:     "error",
    builderTypes: "all",
    check: (c) => ({ pass: c && Object.keys(c).length > 0, message: "Builder content is empty" }),
  },
  {
    ruleId:       "website_has_title",
    ruleName:     "Website must have a page title",
    severity:     "error",
    builderTypes: ["website_builder", "application_builder"],
    check: (c) => ({
      pass: Boolean((c as any)?.title || (c as any)?.pages?.[0]?.title),
      message: "Website must have at least one page with a title",
      path:    "pages[0].title",
    }),
  },
  {
    ruleId:       "workflow_has_trigger",
    ruleName:     "Workflow must have a trigger",
    severity:     "error",
    builderTypes: ["workflow_builder", "automation_builder"],
    check: (c) => ({
      pass: Boolean((c as any)?.trigger || (c as any)?.steps?.some?.((s: any) => s.type === "trigger")),
      message: "Workflow must define a trigger event",
      path:    "trigger",
    }),
  },
  {
    ruleId:       "ai_agent_has_prompt",
    ruleName:     "AI Agent must have a system prompt",
    severity:     "error",
    builderTypes: ["ai_agent_builder"],
    check: (c) => ({
      pass: Boolean((c as any)?.systemPrompt || (c as any)?.prompt),
      message: "AI Agent must have a system prompt",
      path:    "systemPrompt",
    }),
  },
  {
    ruleId:       "database_has_tables",
    ruleName:     "Database must define at least one table",
    severity:     "warning",
    builderTypes: ["database_builder"],
    check: (c) => ({
      pass: Array.isArray((c as any)?.tables) && (c as any).tables.length > 0,
      message: "Database has no tables defined",
      path:    "tables",
    }),
  },
  {
    ruleId:       "content_has_description",
    ruleName:     "Content should have a description",
    severity:     "info",
    builderTypes: "all",
    check: (c) => ({
      pass: Boolean((c as any)?.description),
      message: "Consider adding a description for discoverability",
      path:    "description",
    }),
  },
];

interface ValidationResult {
  ruleId:   string;
  ruleName: string;
  status:   "pass" | "warn" | "fail";
  severity: "error" | "warning" | "info";
  message?: string;
  path?:    string;
}

export async function runValidation(params: {
  sessionId:      number;
  userId:         number;
  builderType:    BuilderType;
  content:        Record<string, unknown>;
  draftId?:       number;
  validationType: "pre_publish" | "on_save" | "manual" | "autosave";
}): Promise<{
  validationId: number;
  overallStatus: "pass" | "warn" | "fail";
  errorCount: number;
  warningCount: number;
  isPublishBlocked: boolean;
  results: ValidationResult[];
}> {
  // Run applicable rules
  const results: ValidationResult[] = [];
  let errorCount = 0;
  let warningCount = 0;

  for (const rule of BUILTIN_RULES) {
    const applies = rule.builderTypes === "all" || rule.builderTypes.includes(params.builderType);
    if (!applies) continue;

    const { pass, message, path } = rule.check(params.content);
    const status: "pass" | "warn" | "fail" = pass ? "pass" : rule.severity === "error" ? "fail" : rule.severity === "warning" ? "warn" : "pass";

    results.push({ ruleId: rule.ruleId, ruleName: rule.ruleName, status, severity: rule.severity, message: pass ? undefined : message, path });
    if (!pass && rule.severity === "error")   errorCount++;
    if (!pass && rule.severity === "warning") warningCount++;
  }

  const overallStatus: "pass" | "warn" | "fail" = errorCount > 0 ? "fail" : warningCount > 0 ? "warn" : "pass";
  const isPublishBlocked = params.validationType === "pre_publish" && errorCount > 0;

  const dbResult = await db.insert(builderValidation).values({
    sessionId:        params.sessionId,
    userId:           params.userId,
    builderType:      params.builderType,
    draftId:          params.draftId ?? null,
    validationType:   params.validationType,
    overallStatus,
    errorCount,
    warningCount,
    results,
    isPublishBlocked,
  }).returning({ id: builderValidation.id });

  const validationId = (dbResult as any[])[0]?.id as number;

  // Update registry
  await db.update(runtimeRegistry).set({
    lastValidationStatus: overallStatus,
    lastValidatedAt:      new Date(),
    isPublishReady:       !isPublishBlocked && overallStatus !== "fail",
    updatedAt:            new Date(),
  }).where(eq(runtimeRegistry.sessionId, params.sessionId));

  await db.insert(builderEvents).values({
    sessionId:   params.sessionId,
    userId:      params.userId,
    builderType: params.builderType,
    eventType:   "validated",
    severity:    overallStatus === "fail" ? "error" : overallStatus === "warn" ? "warn" : "info",
    summary:     `Validation ${overallStatus}: ${errorCount} errors, ${warningCount} warnings${isPublishBlocked ? " (publish blocked)" : ""}`,
    details:     { validationId, errorCount, warningCount, isPublishBlocked },
  });

  return { validationId, overallStatus, errorCount, warningCount, isPublishBlocked, results };
}

export async function getLatestValidation(sessionId: number) {
  const rows = await db.select().from(builderValidation)
    .where(eq(builderValidation.sessionId, sessionId))
    .orderBy(desc(builderValidation.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getValidationPassRate(userId: number): Promise<number> {
  const rows = await db.select({
    total: sql<string>`count(*)`,
    passed: sql<string>`sum(case when overall_status = 'pass' then 1 else 0 end)`,
  }).from(builderValidation).where(eq(builderValidation.userId, userId));

  const total = Number(rows[0]?.total ?? 0);
  const passed = Number(rows[0]?.passed ?? 0);
  if (total === 0) return 100;
  return Math.round((passed / total) * 100);
}
