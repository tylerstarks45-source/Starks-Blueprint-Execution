// ─────────────────────────────────────────────────────────────────────────────
// Build 024: Execution Orchestration Engine — Execution Policy Engine
// Evaluates: governance | permissions | security | approval | risk
// Generates policies at plan level and assignment level.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { ExecutionPolicy, ExecutionPolicyType, PolicyStatus, ExecutionAssignment, ExecutionOwnerType } from "./types";

// Universal plan-level policies (always generated)
const PLAN_LEVEL_POLICIES: Array<{
  policyType: ExecutionPolicyType;
  policyTitle: string;
  policyDescription: string;
  policyStatus: PolicyStatus;
  severity: "low" | "medium" | "high" | "critical";
  requiresApproval: boolean;
  mitigationNote?: string;
}> = [
  {
    policyType: "governance",
    policyTitle: "Execution Governance Framework",
    policyDescription: "All execution activities must operate within the approved governance framework established in the preparation phase. No unilateral execution is permitted outside defined governance boundaries.",
    policyStatus: "satisfied",
    severity: "high",
    requiresApproval: false,
  },
  {
    policyType: "permissions",
    policyTitle: "Access Permission Validation",
    policyDescription: "Execution owners must hold the appropriate system and data access permissions before commencing assigned work. Permissions must be confirmed prior to queue entry.",
    policyStatus: "pending",
    severity: "medium",
    requiresApproval: false,
    mitigationNote: "Verify permissions during the preparation phase before work commences.",
  },
  {
    policyType: "security",
    policyTitle: "Security Compliance Gate",
    policyDescription: "All automated and integration-based execution activities must pass a security compliance review before execution begins. Manual activities must follow documented security protocols.",
    policyStatus: "satisfied",
    severity: "high",
    requiresApproval: false,
  },
  {
    policyType: "approval",
    policyTitle: "Critical Work Approval Requirement",
    policyDescription: "All work packages classified as critical business criticality require explicit approval from an authorized governance authority before entering the execution queue.",
    policyStatus: "pending",
    severity: "critical",
    requiresApproval: true,
    mitigationNote: "Obtain approval from the designated governance authority before any critical-criticality execution commences.",
  },
  {
    policyType: "risk",
    policyTitle: "Execution Risk Threshold",
    policyDescription: "Execution activities that carry high or critical risk must have documented risk mitigation measures in place before execution begins. Deferred capabilities are excluded from this threshold.",
    policyStatus: "satisfied",
    severity: "medium",
    requiresApproval: false,
  },
];

// Assignment-level policy overrides for specific owner types
function assignmentPolicies(assignment: ExecutionAssignment): ExecutionPolicy[] {
  const policies: ExecutionPolicy[] = [];

  if (assignment.ownerType === "ai_agent") {
    policies.push({
      id: randomUUID(),
      planId: assignment.planId,
      reportId: assignment.reportId,
      businessId: assignment.businessId,
      assignmentId: assignment.id,
      policyType: "governance",
      policyTitle: "AI Agent Execution Governance",
      policyDescription: `AI agent execution of '${assignment.packageTitle}' must operate within defined safety boundaries and produce auditable outputs.`,
      policyStatus: "pending",
      severity: "high",
      requiresApproval: true,
      mitigationNote: "Define and document AI agent operational boundaries and output review process before execution.",
    });
  }

  if (assignment.ownerType === "external_system") {
    policies.push({
      id: randomUUID(),
      planId: assignment.planId,
      reportId: assignment.reportId,
      businessId: assignment.businessId,
      assignmentId: assignment.id,
      policyType: "permissions",
      policyTitle: "External System Data Access Policy",
      policyDescription: `External system execution of '${assignment.packageTitle}' requires a reviewed data sharing and access agreement.`,
      policyStatus: "pending",
      severity: "high",
      requiresApproval: true,
      mitigationNote: "Establish and sign a data sharing agreement with the external system provider before execution.",
    });
  }

  if (assignment.businessCriticality === "critical") {
    policies.push({
      id: randomUUID(),
      planId: assignment.planId,
      reportId: assignment.reportId,
      businessId: assignment.businessId,
      assignmentId: assignment.id,
      policyType: "approval",
      policyTitle: "Critical Assignment Approval",
      policyDescription: `'${assignment.packageTitle}' is classified as critical business criticality and requires executive approval before execution begins.`,
      policyStatus: "pending",
      severity: "critical",
      requiresApproval: true,
    });
  }

  if (assignment.ownerType === "future_capability") {
    policies.push({
      id: randomUUID(),
      planId: assignment.planId,
      reportId: assignment.reportId,
      businessId: assignment.businessId,
      assignmentId: assignment.id,
      policyType: "risk",
      policyTitle: "Deferred Capability Risk",
      policyDescription: `'${assignment.packageTitle}' is deferred because the required capability does not yet exist. Downstream execution activities that depend on this work are at risk.`,
      policyStatus: "deferred",
      severity: "high",
      requiresApproval: false,
      mitigationNote: "Establish a capability development roadmap and revisit this assignment when the capability is available.",
    });
  }

  return policies;
}

export function validateExecutionPolicies(params: {
  planId: string;
  reportId: string;
  businessId: number;
  assignments: ExecutionAssignment[];
}): ExecutionPolicy[] {
  const { planId, reportId, businessId, assignments } = params;
  const allPolicies: ExecutionPolicy[] = [];

  // Plan-level policies
  for (const p of PLAN_LEVEL_POLICIES) {
    allPolicies.push({
      id: randomUUID(),
      planId,
      reportId,
      businessId,
      assignmentId: undefined,
      ...p,
    });
  }

  // Assignment-level policies
  for (const assignment of assignments) {
    const asgPolicies = assignmentPolicies(assignment);
    allPolicies.push(...asgPolicies);
  }

  return allPolicies;
}
