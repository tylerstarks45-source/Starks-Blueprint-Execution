// ─────────────────────────────────────────────────────────────────────────────
// Build 025: Authority Resolution Engine — Authority Grant Engine
// Produces AuthorityGrant records for requirements that have been granted.
// Never grants new permissions — only records the grant state that the
// validation engine has already determined.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { AuthorityGrant, AuthorityRequirement, AuthoritySource, GrantStatus } from "./types";

function deriveGrantStatus(status: string): GrantStatus {
  switch (status) {
    case "granted": return "active";
    case "expired": return "expired";
    default: return "pending";
  }
}

function deriveAuthoritySource(req: AuthorityRequirement): AuthoritySource {
  switch (req.authorityType) {
    case "user_granted": return "explicit_user";
    case "governance": return "governance_policy";
    case "external_api": return "integration_oauth";
    case "operational": return "system_default";
    case "technical": return "system_default";
    default: return "implicit";
  }
}

export function buildAuthorityGrants(params: {
  planId: string;
  reportId: string;
  businessId: number;
  requirements: AuthorityRequirement[];
}): AuthorityGrant[] {
  const { planId, reportId, businessId, requirements } = params;
  const grants: AuthorityGrant[] = [];

  for (const req of requirements) {
    // Only emit a grant record for requirements that are granted or have a traceable state
    if (req.status !== "granted" && req.status !== "pending" && req.status !== "expired") {
      // denied / unavailable → no grant record
      continue;
    }

    grants.push({
      id: randomUUID(),
      requirementId: req.id,
      planId,
      reportId,
      businessId,
      grantedBy: req.requiresApproval ? "pending-approver" : "system",
      grantStatus: deriveGrantStatus(req.status),
      expiresAt: undefined, // extension point: set real expiry from token store
      authoritySource: deriveAuthoritySource(req),
      notes:
        req.status === "granted"
          ? `Authority granted via ${deriveAuthoritySource(req)} for scope "${req.scopeType}".`
          : `Authority pending — awaiting ${req.approvalLevel}-level approval for scope "${req.scopeType}".`,
    });
  }

  return grants;
}
