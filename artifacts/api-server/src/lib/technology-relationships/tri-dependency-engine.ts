// ── TRI Dependency Engine ───────────────────────────────────────────────────
// Creates dependency graphs from the relationship seed.
// Derives hard/soft/optional/circular dependencies from relationship types.
// Real dependency data arrives via EP_TRI_DEPENDENCY_MAPPED.

import type { DependencyEdge, DependencyType, DependencyRisk } from "./types";
import type { TechnologyRelationship } from "./types";

// ── Relationship type → dependency type mapping ────────────────────────────
const REL_TO_DEP_TYPE: Record<string, DependencyType | null> = {
  depends_on: "hard",
  requires:   "hard",
  extends:    "hard",    // extensions have hard dependency on the base
  hosts:      null,      // hosts is a provider relationship, not a dependency of the hosted
  supports:   "soft",
  consumes:   "soft",
  enables:    "soft",
  complements:"optional",
  works_best_with: "optional",
};

// ── Manually defined additional dependencies ─────────────────────────────
// Beyond what's inferrable from the relationship seed.
const ADDITIONAL_DEPS: DependencyEdge[] = [
  // Platform stack hard dependencies (ASH current)
  { dependentKey: "openrouter:platform",  dependencyKey: "nodejs:runtime",      dependencyType: "hard",     reason: "OpenRouter SDK is a Node.js library.",              isCurrentlyMet: true,  riskIfMissing: "critical" },
  { dependentKey: "stripe:payments",      dependencyKey: "nodejs:runtime",      dependencyType: "hard",     reason: "Stripe Node.js SDK requires Node.js runtime.",      isCurrentlyMet: true,  riskIfMissing: "critical" },
  { dependentKey: "resend:email",         dependencyKey: "nodejs:runtime",      dependencyType: "hard",     reason: "Resend SDK is a Node.js library.",                  isCurrentlyMet: true,  riskIfMissing: "high"     },
  { dependentKey: "posthog:analytics",    dependencyKey: "postgresql:database", dependencyType: "hard",     reason: "PostHog self-hosted requires PostgreSQL.",           isCurrentlyMet: true,  riskIfMissing: "high"     },
  { dependentKey: "n8n:automation",       dependencyKey: "postgresql:database", dependencyType: "hard",     reason: "n8n workflow state persisted in PostgreSQL.",        isCurrentlyMet: false, riskIfMissing: "critical" },
  { dependentKey: "temporal:orchestration",dependencyKey:"postgresql:database", dependencyType: "hard",     reason: "Temporal requires a persistence backend.",           isCurrentlyMet: false, riskIfMissing: "critical" },
  { dependentKey: "pinecone:platform",    dependencyKey: "nodejs:runtime",      dependencyType: "soft",     reason: "Pinecone JS SDK prefers Node.js runtime.",           isCurrentlyMet: true,  riskIfMissing: "medium"   },
  { dependentKey: "qdrant:database",      dependencyKey: "nodejs:runtime",      dependencyType: "soft",     reason: "Qdrant JS client runs in Node.js.",                  isCurrentlyMet: true,  riskIfMissing: "medium"   },
  { dependentKey: "elasticsearch:search", dependencyKey: "linux:ubuntu",        dependencyType: "soft",     reason: "Elasticsearch is primarily deployed on Linux.",      isCurrentlyMet: true,  riskIfMissing: "low"      },
  { dependentKey: "groq:cloud",           dependencyKey: "nodejs:runtime",      dependencyType: "hard",     reason: "Groq Node.js SDK requires the Node.js runtime.",     isCurrentlyMet: true,  riskIfMissing: "high"     },
  { dependentKey: "fireworks:ai",         dependencyKey: "nodejs:runtime",      dependencyType: "hard",     reason: "Fireworks AI SDK requires the Node.js runtime.",     isCurrentlyMet: true,  riskIfMissing: "high"     },
  { dependentKey: "together:inference",   dependencyKey: "nodejs:runtime",      dependencyType: "hard",     reason: "Together AI SDK requires the Node.js runtime.",      isCurrentlyMet: true,  riskIfMissing: "high"     },
  { dependentKey: "tavily:search_api",    dependencyKey: "nodejs:runtime",      dependencyType: "hard",     reason: "Tavily JS SDK requires the Node.js runtime.",        isCurrentlyMet: true,  riskIfMissing: "medium"   },
  { dependentKey: "clerk:auth",           dependencyKey: "postgresql:database", dependencyType: "soft",     reason: "App user records complement Clerk identity tokens.",  isCurrentlyMet: true,  riskIfMissing: "medium"   },
  { dependentKey: "aws:s3",               dependencyKey: "aws:platform",        dependencyType: "hard",     reason: "S3 is an AWS service — requires AWS account.",       isCurrentlyMet: false, riskIfMissing: "critical" },
];

// ── Derive dependencies from relationships ────────────────────────────────
export function deriveDependencies(relationships: TechnologyRelationship[]): DependencyEdge[] {
  const seen = new Set<string>();
  const deps: DependencyEdge[] = [];

  for (const rel of relationships) {
    const depType = REL_TO_DEP_TYPE[rel.relationshipType];
    if (!depType) continue;

    const key = `${rel.sourceTechnologyKey}→${rel.targetTechnologyKey}:${depType}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const risk: DependencyRisk = depType === "hard" ? "critical" : depType === "soft" ? "medium" : "low";

    deps.push({
      dependentKey:    rel.sourceTechnologyKey,
      dependencyKey:   rel.targetTechnologyKey,
      dependencyType:  depType,
      reason:          rel.description ?? `Derived from ${rel.relationshipType} relationship.`,
      isCurrentlyMet:  true,
      riskIfMissing:   risk,
    });
  }

  // Add additional hand-coded deps, avoiding duplicates
  for (const dep of ADDITIONAL_DEPS) {
    const key = `${dep.dependentKey}→${dep.dependencyKey}:${dep.dependencyType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deps.push(dep);
  }

  return deps;
}

// ── Detect circular dependencies ───────────────────────────────────────────
// Simple cycle detection: for each hard dependency, check if the dependency
// also (transitively) depends on the source.
export function detectCircularDependencies(deps: DependencyEdge[]): DependencyEdge[] {
  // Build hard dependency map
  const hardDeps = new Map<string, Set<string>>();
  for (const dep of deps) {
    if (dep.dependencyType !== "hard") continue;
    if (!hardDeps.has(dep.dependentKey)) hardDeps.set(dep.dependentKey, new Set());
    hardDeps.get(dep.dependentKey)!.add(dep.dependencyKey);
  }

  const circulars: DependencyEdge[] = [];
  const visited = new Set<string>();

  function hasPath(from: string, to: string, depth = 0): boolean {
    if (depth > 6) return false; // prevent runaway
    const next = hardDeps.get(from);
    if (!next) return false;
    if (next.has(to)) return true;
    for (const n of next) {
      if (!visited.has(n)) {
        visited.add(n);
        if (hasPath(n, to, depth + 1)) return true;
      }
    }
    return false;
  }

  for (const dep of deps) {
    if (dep.dependencyType !== "hard") continue;
    visited.clear();
    if (hasPath(dep.dependencyKey, dep.dependentKey)) {
      circulars.push({ ...dep, dependencyType: "circular", reason: `Circular dependency: ${dep.dependentKey} ↔ ${dep.dependencyKey}` });
    }
  }

  return circulars;
}
