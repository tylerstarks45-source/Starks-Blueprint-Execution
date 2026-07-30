// ─── Build 014: Behavior Profile Engine ──────────────────────────────────────
//
// Creates and manages Behavior Profiles.
// Profiles contain only references to approved policies — no duplicated logic.
// Pure: no DB access.

import { randomUUID } from "crypto";
import type {
  BehaviorProfile,
  ExecutivePolicy,
  ProfileTraits,
  ProfileType,
} from "./types";
import { PROFILE_TRAITS } from "./types";

// ── Build a new profile from a set of approved policies ───────────────────────

export function buildProfile(opts: {
  userId: number | null;
  profileType: ProfileType;
  approvedPolicies: ExecutivePolicy[];
  name?: string;
  description?: string;
}): Omit<BehaviorProfile, "id" | "createdAt" | "updatedAt"> {
  const { userId, profileType, approvedPolicies } = opts;
  const traits = PROFILE_TRAITS[profileType];

  // Filter policies appropriate for this profile type
  const filteredPolicies = filterPoliciesForProfile(approvedPolicies, profileType, traits);

  const name = opts.name ?? buildProfileName(profileType, filteredPolicies.length);
  const description = opts.description ?? buildProfileDescription(profileType, traits, filteredPolicies);

  return {
    userId,
    name,
    profileType,
    description,
    activePolicyIds: filteredPolicies.map((p) => p.id),
    policyCount: filteredPolicies.length,
    isActive: false,
    version: 1,
    activatedAt: null,
    deactivatedAt: null,
    metadata: {
      traits,
      policyTypes: [...new Set(filteredPolicies.map((p) => p.policyType))],
      domains: [...new Set(filteredPolicies.flatMap((p) => p.businessDomains))],
    },
  };
}

// ── Filter policies by profile type ──────────────────────────────────────────

function filterPoliciesForProfile(
  policies: ExecutivePolicy[],
  profileType: ProfileType,
  traits: ProfileTraits,
): ExecutivePolicy[] {
  const approved = policies.filter((p) => p.status === "approved");

  switch (profileType) {
    case "conservative":
      // Only high-confidence, high-priority (low number) policies
      return approved.filter((p) => (p.metadata?.principleConfidence as number ?? 0) >= 0.70 && p.priority <= 5).sort((a, b) => a.priority - b.priority);

    case "balanced":
      // All approved policies, sorted by priority
      return approved.sort((a, b) => a.priority - b.priority);

    case "aggressive":
      // All policies including lower-confidence ones, prioritize execution
      return approved.sort((a, b) => a.priority - b.priority);

    case "experimental":
      // All policies; prefer exploration-type patterns
      return approved.sort((a, b) => {
        // Prefer lower priority (less certain) policies first for exploration
        return b.priority - a.priority;
      });

    case "custom":
      return approved.sort((a, b) => a.priority - b.priority);
  }
}

// ── Profile name ──────────────────────────────────────────────────────────────

function buildProfileName(profileType: ProfileType, policyCount: number): string {
  const typeLabel = {
    conservative: "Conservative",
    balanced: "Balanced",
    aggressive: "Aggressive",
    experimental: "Experimental",
    custom: "Custom",
  }[profileType];
  return `${typeLabel} Profile (${policyCount} policies)`;
}

// ── Profile description ───────────────────────────────────────────────────────

function buildProfileDescription(
  profileType: ProfileType,
  traits: ProfileTraits,
  policies: ExecutivePolicy[],
): string {
  const domains = [...new Set(policies.flatMap((p) => p.businessDomains))].slice(0, 3).join(", ");
  const baseDescription: Record<ProfileType, string> = {
    conservative: `Conservative stance: high confidence threshold (${(traits.confidenceThreshold * 100).toFixed(0)}%), deliberate decision-making, low risk tolerance. Only the most reliable policies are active.`,
    balanced: `Balanced stance: moderate confidence threshold (${(traits.confidenceThreshold * 100).toFixed(0)}%), balanced risk tolerance. All approved policies are active.`,
    aggressive: `Aggressive stance: lower confidence threshold (${(traits.confidenceThreshold * 100).toFixed(0)}%), fast decision-making, high risk tolerance. Prioritizes speed and coverage.`,
    experimental: `Experimental stance: lowest confidence threshold (${(traits.confidenceThreshold * 100).toFixed(0)}%), maximum exploration rate. Tests boundary conditions and novel approaches.`,
    custom: `Custom profile with ${policies.length} active policies.`,
  };
  const desc = baseDescription[profileType];
  if (domains) return `${desc} Active domains: ${domains}.`;
  return desc;
}

// ── Compute the advisory text for the EB context note ────────────────────────

export function buildProfileAdvisory(
  profile: BehaviorProfile | null,
  policies: ExecutivePolicy[],
): string | null {
  if (!profile) return null;
  const traits = PROFILE_TRAITS[profile.profileType];
  const activePolicies = policies.filter((p) => profile.activePolicyIds.includes(p.id) && p.status === "approved");
  if (activePolicies.length === 0) return null;

  const lines: string[] = [
    `BEHAVIOR PROFILE: ${profile.profileType.toUpperCase()} (${activePolicies.length} active policies)`,
    `Risk tolerance: ${traits.riskTolerance} | Decision speed: ${traits.decisionSpeed} | Confidence threshold: ${(traits.confidenceThreshold * 100).toFixed(0)}%`,
  ];

  // Group by policy type for cleaner advisory
  const byType = new Map<string, ExecutivePolicy[]>();
  for (const p of activePolicies.sort((a, b) => a.priority - b.priority).slice(0, 6)) {
    if (!byType.has(p.policyType)) byType.set(p.policyType, []);
    byType.get(p.policyType)!.push(p);
  }

  for (const [type, typePolicies] of byType) {
    for (const p of typePolicies.slice(0, 2)) {
      lines.push(p.guidance);
    }
  }

  return lines.join("\n");
}

// ── Determine profile type from policy mix ────────────────────────────────────

export function inferProfileType(approvedPolicies: ExecutivePolicy[]): ProfileType {
  if (approvedPolicies.length === 0) return "balanced";
  const avgConfidence =
    approvedPolicies.reduce(
      (sum, p) => sum + ((p.metadata?.principleConfidence as number) ?? 0.6),
      0,
    ) / approvedPolicies.length;
  if (avgConfidence >= 0.78) return "conservative";
  if (avgConfidence >= 0.65) return "balanced";
  if (avgConfidence >= 0.50) return "aggressive";
  return "experimental";
}
