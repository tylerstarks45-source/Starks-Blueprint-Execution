// ─────────────────────────────────────────────────────────────────────────────
// Build 025: Authority Resolution Engine — Authority Validation Engine
// Assigns status to each requirement: granted | pending | expired | denied | unavailable
// Deterministic classification based on authority type, scope, and risk level.
// Never connects to live credential stores — that is an extension point hook.
// ─────────────────────────────────────────────────────────────────────────────
import type { AuthorityRequirement, AuthorityStatus, AuthorityType } from "./types";

// ── Status derivation rules ───────────────────────────────────────────────────
// Priority order: unavailable > denied > expired > granted > pending
// Safe default: pending (fail-safe posture — never grant by default)

function deriveValidatedStatus(req: AuthorityRequirement): AuthorityStatus {
  // Unavailable: future_capability deferral or explicitly unreachable scope
  if (req.authorityType === "governance" && req.riskLevel === "critical") {
    return "unavailable";
  }

  // Denied: legal authority at organizational scope is explicitly denied until
  // a real legal review is attached via the extension point hook.
  if (req.authorityType === "legal" && req.scopeType === "organization") {
    return "denied";
  }

  // Granted: safe, well-understood authorities with no approval requirement
  const grantedTypes: Set<AuthorityType> = new Set([
    "user_granted",
    "operational",
    "data_access",
  ]);
  if (grantedTypes.has(req.authorityType) && !req.requiresApproval && req.riskLevel === "low") {
    return "granted";
  }

  if (grantedTypes.has(req.authorityType) && !req.requiresApproval && req.riskLevel === "medium") {
    return "granted";
  }

  // Technical authorities at workspace/project scope with no approval needed are granted
  if (
    req.authorityType === "technical" &&
    (req.scopeType === "workspace" || req.scopeType === "project") &&
    !req.requiresApproval
  ) {
    return "granted";
  }

  // Everything else: pending (requires human review, approval, or external validation)
  return "pending";
}

export function validateAuthorities(
  requirements: AuthorityRequirement[]
): AuthorityRequirement[] {
  return requirements.map((req) => ({
    ...req,
    status: deriveValidatedStatus(req),
  }));
}

export interface AuthorityValidationStats {
  grantedCount: number;
  pendingCount: number;
  expiredCount: number;
  deniedCount: number;
  unavailableCount: number;
  missingCount: number;
}

export function computeValidationStats(
  requirements: AuthorityRequirement[]
): AuthorityValidationStats {
  const stats: AuthorityValidationStats = {
    grantedCount: 0,
    pendingCount: 0,
    expiredCount: 0,
    deniedCount: 0,
    unavailableCount: 0,
    missingCount: 0,
  };
  for (const req of requirements) {
    switch (req.status) {
      case "granted": stats.grantedCount++; break;
      case "pending": stats.pendingCount++; break;
      case "expired": stats.expiredCount++; break;
      case "denied": stats.deniedCount++; break;
      case "unavailable": stats.unavailableCount++; break;
    }
  }
  // Missing = requirements that are not granted and not even pending (denied+unavailable+expired)
  stats.missingCount = stats.deniedCount + stats.unavailableCount + stats.expiredCount;
  return stats;
}
