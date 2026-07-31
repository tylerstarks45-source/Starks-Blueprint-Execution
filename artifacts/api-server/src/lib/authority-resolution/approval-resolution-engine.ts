// ─────────────────────────────────────────────────────────────────────────────
// Build 025: Authority Resolution Engine — Approval Resolution Engine
// Determines when explicit human approval is required before authority
// can be considered valid. Never grants approvals — only identifies them.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type {
  AuthorityDecision,
  AuthorityRequirement,
  DecisionType,
  ApprovalLevel,
} from "./types";

// ── Decision derivation ────────────────────────────────────────────────────────
function deriveDecisionType(req: AuthorityRequirement): DecisionType {
  if (req.status === "unavailable") return "deferred";
  if (req.status === "denied") return "blocked";
  if (req.status === "granted" && !req.requiresApproval) return "authorized";
  return "pending_approval";
}

function deriveConfidence(req: AuthorityRequirement): number {
  if (req.status === "granted" && !req.requiresApproval) return 0.90;
  if (req.status === "pending" && req.approvalLevel === "none") return 0.65;
  if (req.status === "pending" && req.approvalLevel === "user") return 0.55;
  if (req.status === "pending" && req.approvalLevel === "admin") return 0.45;
  if (req.status === "pending" && req.approvalLevel === "governance") return 0.35;
  if (req.status === "pending" && req.approvalLevel === "executive") return 0.25;
  if (req.status === "denied") return 0.10;
  if (req.status === "unavailable") return 0.05;
  return 0.50;
}

function buildDecisionRationale(req: AuthorityRequirement, decisionType: DecisionType): string {
  switch (decisionType) {
    case "authorized":
      return `Authority "${req.title}" has been granted at ${req.scopeType} scope without requiring additional approval.`;
    case "pending_approval":
      return (
        `Authority "${req.title}" requires explicit ${req.approvalLevel}-level approval before execution can proceed. ` +
        `Scope: ${req.scopeType}. Risk level: ${req.riskLevel}.`
      );
    case "blocked":
      return `Authority "${req.title}" has been denied. Execution cannot proceed without remediation or an authority override.`;
    case "deferred":
      return `Authority "${req.title}" is unavailable at this time. Work package deferred until capability is acquired.`;
  }
}

export interface ApprovalSummary {
  decisions: AuthorityDecision[];
  approvalRequiredCount: number;
  blockedCount: number;
  deferredCount: number;
  authorizedCount: number;
}

export function resolveApprovals(params: {
  planId: string;
  reportId: string;
  businessId: number;
  requirements: AuthorityRequirement[];
}): ApprovalSummary {
  const { planId, reportId, businessId, requirements } = params;
  const decisions: AuthorityDecision[] = [];
  let approvalRequiredCount = 0;
  let blockedCount = 0;
  let deferredCount = 0;
  let authorizedCount = 0;

  for (const req of requirements) {
    const decisionType = deriveDecisionType(req);
    const confidence = deriveConfidence(req);
    const rationale = buildDecisionRationale(req, decisionType);
    const requiresApproval = decisionType === "pending_approval";

    decisions.push({
      id: randomUUID(),
      requirementId: req.id,
      planId,
      reportId,
      businessId,
      decisionType,
      decisionRationale: rationale,
      requiresApproval,
      approvalLevel: req.approvalLevel,
      confidence,
    });

    switch (decisionType) {
      case "authorized": authorizedCount++; break;
      case "pending_approval": approvalRequiredCount++; break;
      case "blocked": blockedCount++; break;
      case "deferred": deferredCount++; break;
    }
  }

  return { decisions, approvalRequiredCount, blockedCount, deferredCount, authorizedCount };
}
