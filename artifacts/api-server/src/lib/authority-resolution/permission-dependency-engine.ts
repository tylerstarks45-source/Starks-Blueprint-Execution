// ─────────────────────────────────────────────────────────────────────────────
// Build 025: Authority Resolution Engine — Permission Dependency Engine
// Maps authority dependencies between integrations, systems, credentials,
// approvals, and governance policies.
// Purely deterministic; no AI calls.
// ─────────────────────────────────────────────────────────────────────────────
import type { AuthorityDependency, AuthorityType } from "./types";
import type { AuthorityRequirement } from "./types";

// ── Dependency rules ──────────────────────────────────────────────────────────
// When authority type A is required, authority type B must also be present.
// Each entry: { from, to, reason, isCritical }
const DEPENDENCY_RULES: Array<{
  from: AuthorityType;
  to: AuthorityType;
  reason: string;
  isCritical: boolean;
}> = [
  {
    from: "external_api",
    to: "technical",
    reason: "External API access requires underlying technical system authority.",
    isCritical: true,
  },
  {
    from: "external_api",
    to: "governance",
    reason: "External API interactions must comply with governance policies.",
    isCritical: false,
  },
  {
    from: "legal",
    to: "governance",
    reason: "Legal authority can only be exercised within an approved governance framework.",
    isCritical: true,
  },
  {
    from: "data_access",
    to: "user_granted",
    reason: "Data access authority requires explicit user consent or delegation.",
    isCritical: true,
  },
  {
    from: "system_access",
    to: "technical",
    reason: "System-level access depends on technical authority being present.",
    isCritical: true,
  },
  {
    from: "operational",
    to: "user_granted",
    reason: "Operational authority must be delegated by an authorized user.",
    isCritical: false,
  },
  {
    from: "governance",
    to: "operational",
    reason: "Governance authority presupposes operational authority within the governed domain.",
    isCritical: false,
  },
];

export function mapPermissionDependencies(
  requirements: AuthorityRequirement[]
): AuthorityDependency[] {
  const presentTypes = new Set<AuthorityType>(requirements.map((r) => r.authorityType));
  const dependencies: AuthorityDependency[] = [];

  for (const rule of DEPENDENCY_RULES) {
    // Only emit a dependency if the "from" authority type is actually present
    if (!presentTypes.has(rule.from)) continue;

    dependencies.push({
      fromAuthorityType: rule.from,
      toAuthorityType: rule.to,
      dependencyReason: rule.reason,
      isCritical: rule.isCritical,
    });
  }

  return dependencies;
}
