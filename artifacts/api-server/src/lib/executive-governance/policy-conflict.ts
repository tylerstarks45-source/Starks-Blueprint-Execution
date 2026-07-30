// ─── Build 014: Policy Conflict Engine ───────────────────────────────────────
//
// Detects conflicts between Executive Policies.
// Six conflict types: contradicting, overlapping_domain, duplicate_guidance,
//                     priority_conflict, deprecated_dependency, cycle
// Pure: no DB access.

import { randomUUID } from "crypto";
import type {
  ConflictReport,
  ConflictType,
  ExecutivePolicy,
  PolicyConflict,
} from "./types";

function makeConflictId(): string {
  return `pc_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

// ── DETECTOR 1 — contradicting ────────────────────────────────────────────────
// Two policies in the same domain with opposite successRate-derived guidance.
// Policy A says "do X" → high success guidance; Policy B says "avoid X" → failure guidance.

function detectContradicting(
  a: ExecutivePolicy,
  b: ExecutivePolicy,
): PolicyConflict | null {
  if (a.id === b.id) return null;
  const sharedDomain = a.businessDomains.some((d) => b.businessDomains.includes(d));
  if (!sharedDomain) return null;
  if (a.policyType !== b.policyType) return null;

  // Guidance contradicts if one says "high success" and the other says "repeated failure"
  const aPositive = a.guidance.toLowerCase().includes("success") || a.guidance.toLowerCase().includes("high-quality");
  const bNegative = b.guidance.toLowerCase().includes("failure") || b.guidance.toLowerCase().includes("recurring fail");
  const aPositiveB = b.guidance.toLowerCase().includes("success") || b.guidance.toLowerCase().includes("high-quality");
  const bNegativeA = a.guidance.toLowerCase().includes("failure") || a.guidance.toLowerCase().includes("recurring fail");

  if (!((aPositive && bNegative) || (aPositiveB && bNegativeA))) return null;

  const sharedDomains = a.businessDomains.filter((d) => b.businessDomains.includes(d));
  return {
    id: makeConflictId(),
    policyIdA: a.id,
    policyIdB: b.id,
    userId: a.userId,
    conflictType: "contradicting",
    severity: 0.85,
    description: `Policies "${a.title}" and "${b.title}" provide contradictory guidance in domain${sharedDomains.length > 1 ? "s" : ""}: ${sharedDomains.join(", ")}.`,
    resolved: false,
    resolvedAt: null,
    resolvedBy: null,
    detectedAt: new Date(),
    payload: { sharedDomains, policyTypeA: a.policyType, policyTypeB: b.policyType },
  };
}

// ── DETECTOR 2 — overlapping_domain ──────────────────────────────────────────
// Two policies of the same type cover the same domain with similar priority.

function detectOverlappingDomain(
  a: ExecutivePolicy,
  b: ExecutivePolicy,
): PolicyConflict | null {
  if (a.id === b.id) return null;
  if (a.policyType !== b.policyType) return null;
  const sharedDomains = a.businessDomains.filter((d) => b.businessDomains.includes(d));
  if (sharedDomains.length === 0) return null;
  // Only flag if priorities are close (within 2 levels) — same priority is ambiguous
  const priorityDelta = Math.abs(a.priority - b.priority);
  if (priorityDelta > 2) return null;

  return {
    id: makeConflictId(),
    policyIdA: a.id,
    policyIdB: b.id,
    userId: a.userId,
    conflictType: "overlapping_domain",
    severity: 0.45,
    description: `Policies "${a.title}" and "${b.title}" both apply to ${sharedDomains.join(", ")} with similar priority (${a.priority} vs ${b.priority}).`,
    resolved: false,
    resolvedAt: null,
    resolvedBy: null,
    detectedAt: new Date(),
    payload: { sharedDomains, priorityA: a.priority, priorityB: b.priority },
  };
}

// ── DETECTOR 3 — duplicate_guidance ──────────────────────────────────────────
// Both policies share the same source principle ID.

function detectDuplicateGuidance(
  a: ExecutivePolicy,
  b: ExecutivePolicy,
): PolicyConflict | null {
  if (a.id === b.id) return null;
  const sharedSources = a.sourcePrincipleIds.filter((id) =>
    b.sourcePrincipleIds.includes(id),
  );
  if (sharedSources.length === 0) return null;

  return {
    id: makeConflictId(),
    policyIdA: a.id,
    policyIdB: b.id,
    userId: a.userId,
    conflictType: "duplicate_guidance",
    severity: 0.60,
    description: `Policies "${a.title}" and "${b.title}" both derive from the same principle(s): ${sharedSources.join(", ")}.`,
    resolved: false,
    resolvedAt: null,
    resolvedBy: null,
    detectedAt: new Date(),
    payload: { sharedPrincipleIds: sharedSources },
  };
}

// ── DETECTOR 4 — priority_conflict ───────────────────────────────────────────
// Same domain, same policy type, same priority level — creates ambiguity.

function detectPriorityConflict(
  a: ExecutivePolicy,
  b: ExecutivePolicy,
): PolicyConflict | null {
  if (a.id === b.id) return null;
  if (a.priority !== b.priority) return null;
  if (a.policyType !== b.policyType) return null;
  const sharedDomains = a.businessDomains.filter((d) => b.businessDomains.includes(d));
  if (sharedDomains.length === 0) return null;

  return {
    id: makeConflictId(),
    policyIdA: a.id,
    policyIdB: b.id,
    userId: a.userId,
    conflictType: "priority_conflict",
    severity: 0.55,
    description: `Policies "${a.title}" and "${b.title}" have the same priority (${a.priority}) and policy type in ${sharedDomains.join(", ")}. Ambiguous precedence.`,
    resolved: false,
    resolvedAt: null,
    resolvedBy: null,
    detectedAt: new Date(),
    payload: { sharedDomains, priority: a.priority, policyType: a.policyType },
  };
}

// ── DETECTOR 5 — deprecated_dependency ───────────────────────────────────────
// A policy's source principle has been deprecated in the Learning Engine.
// (principleStatus passed in from external data)

export function detectDeprecatedDependency(
  policy: ExecutivePolicy,
  deprecatedPrincipleIds: Set<string>,
): PolicyConflict | null {
  const depSources = policy.sourcePrincipleIds.filter((id) =>
    deprecatedPrincipleIds.has(id),
  );
  if (depSources.length === 0) return null;

  return {
    id: makeConflictId(),
    policyIdA: policy.id,
    policyIdB: policy.id,
    userId: policy.userId,
    conflictType: "deprecated_dependency",
    severity: 0.70,
    description: `Policy "${policy.title}" depends on deprecated principle(s): ${depSources.join(", ")}. Policy may be based on stale evidence.`,
    resolved: false,
    resolvedAt: null,
    resolvedBy: null,
    detectedAt: new Date(),
    payload: { deprecatedSources: depSources },
  };
}

// ── DETECTOR 6 — cycle ────────────────────────────────────────────────────────
// Detect cycles in policy dependency chains.
// Policy A supersedes B, B supersedes C, C supersedes A → cycle.
// Simple BFS cycle detection.

export function detectCycles(
  policies: ExecutivePolicy[],
  supersededMap: Map<string, string>, // policyId → supersededPolicyId
): PolicyConflict[] {
  const conflicts: PolicyConflict[] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(policyId: string, path: string[]): void {
    if (inStack.has(policyId)) {
      // Found a cycle
      const cycleStart = path.indexOf(policyId);
      const cycle = path.slice(cycleStart);
      const conflict: PolicyConflict = {
        id: makeConflictId(),
        policyIdA: cycle[0]!,
        policyIdB: cycle[cycle.length - 1]!,
        userId: policies.find((p) => p.id === cycle[0])?.userId ?? null,
        conflictType: "cycle",
        severity: 0.95,
        description: `Circular supersession cycle detected: ${cycle.join(" → ")} → ${policyId}`,
        resolved: false,
        resolvedAt: null,
        resolvedBy: null,
        detectedAt: new Date(),
        payload: { cycle },
      };
      conflicts.push(conflict);
      return;
    }
    if (visited.has(policyId)) return;

    visited.add(policyId);
    inStack.add(policyId);
    path.push(policyId);

    const next = supersededMap.get(policyId);
    if (next) dfs(next, [...path]);

    inStack.delete(policyId);
  }

  for (const policy of policies) {
    if (!visited.has(policy.id)) {
      dfs(policy.id, []);
    }
  }

  return conflicts;
}

// ── Run full conflict scan ────────────────────────────────────────────────────

export function runConflictScan(
  activePolicies: ExecutivePolicy[],
  deprecatedPrincipleIds: Set<string>,
  supersededMap: Map<string, string>,
): PolicyConflict[] {
  const seen = new Set<string>();
  const conflicts: PolicyConflict[] = [];

  function addConflict(c: PolicyConflict | null): void {
    if (!c) return;
    // Deduplicate by (policyIdA::policyIdB::conflictType), normalized
    const key = [c.policyIdA, c.policyIdB].sort().join("::") + "::" + c.conflictType;
    if (seen.has(key)) return;
    seen.add(key);
    conflicts.push(c);
  }

  for (let i = 0; i < activePolicies.length; i++) {
    for (let j = i + 1; j < activePolicies.length; j++) {
      const a = activePolicies[i]!;
      const b = activePolicies[j]!;
      addConflict(detectContradicting(a, b));
      addConflict(detectOverlappingDomain(a, b));
      addConflict(detectDuplicateGuidance(a, b));
      addConflict(detectPriorityConflict(a, b));
    }
    // Deprecated dependency check (single-policy)
    addConflict(detectDeprecatedDependency(activePolicies[i]!, deprecatedPrincipleIds));
  }

  // Cycle detection
  for (const c of detectCycles(activePolicies, supersededMap)) {
    addConflict(c);
  }

  return conflicts;
}

// ── Conflict report summary ───────────────────────────────────────────────────

export function summarizeConflicts(conflicts: PolicyConflict[]): ConflictReport {
  const byType: Record<ConflictType, number> = {
    contradicting: 0,
    overlapping_domain: 0,
    duplicate_guidance: 0,
    priority_conflict: 0,
    deprecated_dependency: 0,
    cycle: 0,
  };
  const affectedPolicies = new Set<string>();
  let highSeverity = 0;
  let hasCycle = false;

  for (const c of conflicts) {
    byType[c.conflictType] = (byType[c.conflictType] ?? 0) + 1;
    affectedPolicies.add(c.policyIdA);
    affectedPolicies.add(c.policyIdB);
    if (c.severity >= 0.75) highSeverity++;
    if (c.conflictType === "cycle") hasCycle = true;
  }

  return {
    totalConflicts: conflicts.length,
    byType,
    highSeverityCount: highSeverity,
    affectedPolicies: [...affectedPolicies],
    hasCycle,
  };
}
