// ─────────────────────────────────────────────────────────────────────────────
// Build 025: Authority Resolution Engine — Authority Discovery Engine
// Derives authority requirements from every execution assignment.
// One or more requirements are generated per assignment, based on owner type
// and execution class. Purely deterministic; no AI calls.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type {
  AuthorityRequirement,
  AuthorityType,
  AuthorityScopeType,
  AuthorityStatus,
  ApprovalLevel,
  RiskLevel,
} from "./types";

// ── Authority requirement spec per owner-type ─────────────────────────────────
interface RequirementSpec {
  authorityType: AuthorityType;
  scopeType: AuthorityScopeType;
  titleTemplate: string;
  descriptionTemplate: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  approvalLevel: ApprovalLevel;
}

const OWNER_TYPE_REQUIREMENTS: Record<string, RequirementSpec[]> = {
  human: [
    {
      authorityType: "user_granted",
      scopeType: "user",
      titleTemplate: "User Execution Permission",
      descriptionTemplate: "Human executor must have user-level permission to perform the assigned work package.",
      riskLevel: "low",
      requiresApproval: false,
      approvalLevel: "none",
    },
    {
      authorityType: "operational",
      scopeType: "business",
      titleTemplate: "Operational Authority",
      descriptionTemplate: "Executor requires operational authority within the business context to perform tasks.",
      riskLevel: "medium",
      requiresApproval: false,
      approvalLevel: "none",
    },
  ],
  department: [
    {
      authorityType: "operational",
      scopeType: "organization",
      titleTemplate: "Departmental Execution Authority",
      descriptionTemplate: "Department requires organisational-level operational authority for the work package.",
      riskLevel: "medium",
      requiresApproval: false,
      approvalLevel: "none",
    },
    {
      authorityType: "governance",
      scopeType: "workspace",
      titleTemplate: "Workspace Governance Clearance",
      descriptionTemplate: "Department must operate within workspace governance boundaries for this assignment.",
      riskLevel: "medium",
      requiresApproval: false,
      approvalLevel: "none",
    },
  ],
  ai_agent: [
    {
      authorityType: "technical",
      scopeType: "system_access" as unknown as AuthorityScopeType,
      titleTemplate: "AI Agent System Access",
      descriptionTemplate: "AI agent requires technical system access authority to execute automated work.",
      riskLevel: "high",
      requiresApproval: true,
      approvalLevel: "admin",
    },
    {
      authorityType: "governance",
      scopeType: "workspace",
      titleTemplate: "AI Governance Clearance",
      descriptionTemplate: "AI agent operation must be cleared by the workspace governance framework.",
      riskLevel: "high",
      requiresApproval: true,
      approvalLevel: "governance",
    },
    {
      authorityType: "data_access",
      scopeType: "business",
      titleTemplate: "AI Data Access Permission",
      descriptionTemplate: "AI agent requires data access authority scoped to the business context.",
      riskLevel: "high",
      requiresApproval: false,
      approvalLevel: "none",
    },
  ],
  automation: [
    {
      authorityType: "technical",
      scopeType: "system_access" as unknown as AuthorityScopeType,
      titleTemplate: "Automation System Authority",
      descriptionTemplate: "Automation system requires technical authority to execute workflow steps.",
      riskLevel: "medium",
      requiresApproval: false,
      approvalLevel: "none",
    },
    {
      authorityType: "operational",
      scopeType: "workspace",
      titleTemplate: "Automation Operational Permission",
      descriptionTemplate: "Automation requires operational permission within the workspace to perform actions.",
      riskLevel: "low",
      requiresApproval: false,
      approvalLevel: "none",
    },
  ],
  integration: [
    {
      authorityType: "external_api",
      scopeType: "integration",
      titleTemplate: "External API Authority",
      descriptionTemplate: "Integration requires API authority (OAuth token, API key, or service credential).",
      riskLevel: "medium",
      requiresApproval: false,
      approvalLevel: "none",
    },
    {
      authorityType: "technical",
      scopeType: "cloud_resource" as unknown as AuthorityScopeType,
      titleTemplate: "Cloud Resource Access",
      descriptionTemplate: "Integration requires access authority to cloud resources it interacts with.",
      riskLevel: "medium",
      requiresApproval: false,
      approvalLevel: "none",
    },
  ],
  external_system: [
    {
      authorityType: "external_api",
      scopeType: "integration",
      titleTemplate: "External System API Authority",
      descriptionTemplate: "External system requires API authority and credential validation before execution.",
      riskLevel: "high",
      requiresApproval: true,
      approvalLevel: "admin",
    },
    {
      authorityType: "legal",
      scopeType: "organization",
      titleTemplate: "External System Legal Authority",
      descriptionTemplate: "External system interaction may carry legal obligations requiring organisational authority.",
      riskLevel: "high",
      requiresApproval: true,
      approvalLevel: "governance",
    },
    {
      authorityType: "governance",
      scopeType: "business",
      titleTemplate: "External System Governance Clearance",
      descriptionTemplate: "External system operation must be cleared by business governance policy.",
      riskLevel: "high",
      requiresApproval: false,
      approvalLevel: "none",
    },
  ],
  future_capability: [
    {
      authorityType: "governance",
      scopeType: "organization",
      titleTemplate: "Future Capability Deferral Authority",
      descriptionTemplate: "Work package is deferred pending future capability acquisition. No authority can be granted now.",
      riskLevel: "critical",
      requiresApproval: true,
      approvalLevel: "executive",
    },
  ],
};

function deriveStatus(spec: RequirementSpec, ownerType: string): AuthorityStatus {
  if (ownerType === "future_capability") return "unavailable";
  if (ownerType === "external_system" && spec.authorityType === "legal") return "pending";
  if (spec.requiresApproval && spec.approvalLevel === "governance") return "pending";
  if (spec.authorityType === "external_api") return "pending";
  return "pending"; // safe default: all requirements start as pending (fail-safe posture)
}

export interface AssignmentInput {
  id: string;
  workPackageId?: string;
  packageTitle?: string;
  ownerType: string;
  executionClass: string;
  complexityLevel?: string;
  businessCriticality?: string;
}

export function deriveAuthorityRequirements(params: {
  planId: string;
  reportId: string;
  businessId: number;
  assignments: AssignmentInput[];
}): AuthorityRequirement[] {
  const { planId, reportId, businessId, assignments } = params;
  const requirements: AuthorityRequirement[] = [];

  for (const assignment of assignments) {
    const specs = OWNER_TYPE_REQUIREMENTS[assignment.ownerType] ?? OWNER_TYPE_REQUIREMENTS["human"];

    for (const spec of specs) {
      const riskLevel: RiskLevel =
        assignment.businessCriticality === "critical" ? "critical" :
        assignment.businessCriticality === "high" ? "high" :
        spec.riskLevel;

      const requiresApproval = spec.requiresApproval ||
        assignment.businessCriticality === "critical" ||
        assignment.complexityLevel === "critical";

      const approvalLevel: ApprovalLevel = requiresApproval
        ? (spec.approvalLevel === "none" ? "admin" : spec.approvalLevel)
        : "none";

      const status = deriveStatus(spec, assignment.ownerType);

      requirements.push({
        id: randomUUID(),
        planId,
        reportId,
        businessId,
        assignmentId: assignment.id,
        workPackageId: assignment.workPackageId,
        authorityType: spec.authorityType,
        scopeType: spec.scopeType,
        title: `${spec.titleTemplate}${assignment.packageTitle ? ` — ${assignment.packageTitle}` : ""}`,
        description: spec.descriptionTemplate,
        status,
        rationale: `Owner type "${assignment.ownerType}" (class: ${assignment.executionClass}) requires ${spec.authorityType} authority at ${spec.scopeType} scope.`,
        requiresApproval,
        approvalLevel,
        riskLevel,
      });
    }
  }

  return requirements;
}
