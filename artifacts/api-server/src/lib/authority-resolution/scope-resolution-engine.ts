// ─────────────────────────────────────────────────────────────────────────────
// Build 025: Authority Resolution Engine — Scope Resolution Engine
// Determines the authority scope for each requirement.
// 8 scope types: user | business | project | workspace | organization |
//                device | cloud_resource | integration
// Purely deterministic; no AI calls.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { AuthorityScope, AuthorityScopeType } from "./types";
import type { AuthorityRequirement } from "./types";

// ── Scope elevation rules ─────────────────────────────────────────────────────
// Higher-risk authority types require elevation beyond the base scope.
const ELEVATION_REQUIRED: Set<string> = new Set([
  "legal",
  "governance",
  "external_api",
]);

// ── Scope target templates ─────────────────────────────────────────────────────
const SCOPE_TARGETS: Record<AuthorityScopeType, string> = {
  user: "authenticated-user",
  business: "owner-business",
  project: "active-project",
  workspace: "ash-workspace",
  organization: "owner-organization",
  device: "execution-device",
  cloud_resource: "cloud-execution-environment",
  integration: "external-integration-endpoint",
};

// ── Resolution note templates ──────────────────────────────────────────────────
function buildResolutionNote(
  scopeType: AuthorityScopeType,
  requiresElevation: boolean,
  authorityType: string
): string {
  const base =
    `Scope resolved to "${scopeType}". ` +
    `Authority type "${authorityType}" operates within this boundary.`;
  if (requiresElevation) {
    return base + " Scope elevation is required before authority can be granted.";
  }
  return base + " No elevation required; standard scope applies.";
}

export function resolveAuthorityScopes(params: {
  planId: string;
  reportId: string;
  businessId: number;
  requirements: AuthorityRequirement[];
}): AuthorityScope[] {
  const { planId, reportId, businessId, requirements } = params;

  // Collect unique scope types from requirements
  const seenScopes = new Map<AuthorityScopeType, AuthorityScope>();

  for (const req of requirements) {
    const scopeType = req.scopeType;
    if (seenScopes.has(scopeType)) continue; // one scope record per unique type per plan

    const requiresElevation = ELEVATION_REQUIRED.has(req.authorityType);
    const scopeTarget = SCOPE_TARGETS[scopeType] ?? scopeType;

    seenScopes.set(scopeType, {
      id: randomUUID(),
      planId,
      reportId,
      businessId,
      scopeType,
      scopeTarget,
      // Scope is considered resolved unless it requires elevation (pending human confirmation)
      isResolved: !requiresElevation,
      requiresElevation,
      resolutionNote: buildResolutionNote(scopeType, requiresElevation, req.authorityType),
    });
  }

  return Array.from(seenScopes.values());
}
