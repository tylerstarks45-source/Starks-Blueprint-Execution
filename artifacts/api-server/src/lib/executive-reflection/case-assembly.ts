// ─── Case Assembly Engine (Build 012) ────────────────────────────────────────
//
// Automatically assembles Executive Cases from cognitive objects.
// Cases are deterministic. No inference. No recommendations.
//
// An Executive Case spans from the first user request through to
// execution completion (or abandonment).
//
// This module contains ONLY pure assembly logic.
// All DB reads/writes go through reflection-registry.ts.

import type {
  ExecutiveCase,
  CaseMember,
  CaseMemberObjectType,
  CaseMemberRole,
  CaseCompletionStatus,
  OpenCaseInput,
} from "./types";

// ── Case completion detection ─────────────────────────────────────────────────

const TERMINAL_EXECUTION_STATUSES = new Set([
  "completed",
  "failed",
  "cancelled",
]);

export function isCaseComplete(executionStatus: string | null | undefined): boolean {
  if (!executionStatus) return false;
  return TERMINAL_EXECUTION_STATUSES.has(executionStatus);
}

export function deriveCompletionStatus(
  executionStatus: string | null | undefined,
  hasFailedSignals: boolean,
): CaseCompletionStatus {
  if (!executionStatus) return "in_progress";
  if (executionStatus === "completed") return hasFailedSignals ? "partial" : "completed";
  if (executionStatus === "failed") return "failed";
  if (executionStatus === "cancelled") return "abandoned";
  return "in_progress";
}

// ── Primary outcome derivation ─────────────────────────────────────────────────

export function deriveOutcome(
  executionStatus: string | null | undefined,
  goalText: string | null | undefined,
  rootRequest: string | null | undefined,
): string | null {
  if (!executionStatus) return null;
  const subject = goalText
    ? goalText.slice(0, 60)
    : rootRequest
    ? rootRequest.slice(0, 60)
    : "request";
  if (executionStatus === "completed") return `Successfully ${subject}`;
  if (executionStatus === "failed") return `Failed to ${subject}`;
  if (executionStatus === "cancelled") return `Abandoned: ${subject}`;
  return null;
}

// ── Member builder ─────────────────────────────────────────────────────────────

export interface MemberSpec {
  objectId: string;
  objectType: CaseMemberObjectType;
  role: CaseMemberRole;
}

export function buildMemberSpecs(input: OpenCaseInput): MemberSpec[] {
  const specs: MemberSpec[] = [];

  if (input.primaryGoalId) {
    specs.push({ objectId: input.primaryGoalId, objectType: "goal", role: "primary" });
  }
  if (input.primaryPlanId) {
    specs.push({ objectId: input.primaryPlanId, objectType: "plan", role: "primary" });
  }
  if (input.primaryExecutionId) {
    specs.push({ objectId: input.primaryExecutionId, objectType: "execution", role: "primary" });
  }
  if (input.primaryChainId) {
    specs.push({ objectId: input.primaryChainId, objectType: "observation_chain", role: "primary" });
  }
  return specs;
}

// ── Business domain inference ──────────────────────────────────────────────────

const DOMAIN_KEYWORDS: Array<[string, string]> = [
  ["social", "social_media"],
  ["email", "email_marketing"],
  ["website", "web_presence"],
  ["content", "content_marketing"],
  ["analytics", "business_analytics"],
  ["revenue", "revenue_operations"],
  ["customer", "customer_success"],
  ["brand", "branding"],
  ["seo", "seo"],
  ["research", "research"],
];

export function inferBusinessDomain(rootRequest: string | null | undefined): string | null {
  if (!rootRequest) return null;
  const lower = rootRequest.toLowerCase();
  for (const [keyword, domain] of DOMAIN_KEYWORDS) {
    if (lower.includes(keyword)) return domain;
  }
  return "general";
}

const STRATEGY_KEYWORDS: Array<[string, string]> = [
  ["grow", "growth"],
  ["automate", "automation"],
  ["analyze", "analysis"],
  ["create", "content_creation"],
  ["fix", "remediation"],
  ["improve", "optimization"],
  ["research", "research"],
  ["plan", "planning"],
];

export function inferStrategicCategory(rootRequest: string | null | undefined): string | null {
  if (!rootRequest) return null;
  const lower = rootRequest.toLowerCase();
  for (const [keyword, category] of STRATEGY_KEYWORDS) {
    if (lower.includes(keyword)) return category;
  }
  return "general";
}

// ── Duration calculation ───────────────────────────────────────────────────────

export function computeDuration(startedAt: Date, endedAt: Date): number {
  return Math.max(0, endedAt.getTime() - startedAt.getTime());
}

// ── Case summary helper ────────────────────────────────────────────────────────

export function describeCaseOutcome(ec: ExecutiveCase): string {
  const domain = ec.businessDomain ?? "general";
  const status = ec.completionStatus;
  const dur = ec.durationMs != null
    ? ` (${Math.round(ec.durationMs / 1000)}s)`
    : "";
  return `Case ${ec.id.slice(0, 8)} — ${domain} — ${status}${dur}`;
}
