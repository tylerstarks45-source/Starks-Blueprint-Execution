// ── Dependency Engine ──────────────────────────────────────────────────────
// Detects remediation dependencies so fixes occur in a safe order.
// Dependencies are determined by:
//   1. The explicit DEPENDENCY_MAP (logical ordering constraints from the audit)
//   2. File overlap analysis (two findings that share affected files)
//   3. Severity ordering (critical findings are always scheduled before high, etc.)
// ────────────────────────────────────────────────────────────────────────────

import { AUDIT_FINDINGS, DEPENDENCY_MAP, type AuditFinding } from "./types";

export interface DependencyNode {
  code:      string;
  severity:  string;
  priority:  string;
  dependsOn: string[];   // codes that must be fixed first
  blockedBy: string[];   // codes that block this one
}

export interface SafeOrderResult {
  order:          string[];  // topological sort — safe remediation sequence
  cycles:         string[][];// any dependency cycles detected (should be empty)
  independentSets: string[][]; // groups that can be worked on in parallel
}

// Build the full dependency graph combining explicit + file-overlap dependencies.
export function buildDependencyGraph(): Map<string, DependencyNode> {
  const graph = new Map<string, DependencyNode>();

  // Initialise nodes
  for (const f of AUDIT_FINDINGS) {
    graph.set(f.code, {
      code:      f.code,
      severity:  f.severity,
      priority:  "unknown",
      dependsOn: [...(DEPENDENCY_MAP[f.code] ?? [])],
      blockedBy: [],
    });
  }

  // Add file-overlap dependencies: if two findings share an affected file,
  // the lower-severity one depends on the higher-severity one being fixed first.
  const bySeverityOrder: AuditFinding["severity"][] = ["critical", "high", "medium", "low"];
  for (let i = 0; i < AUDIT_FINDINGS.length; i++) {
    for (let j = i + 1; j < AUDIT_FINDINGS.length; j++) {
      const a = AUDIT_FINDINGS[i];
      const b = AUDIT_FINDINGS[j];
      const aFiles = new Set(a.affectedFiles);
      const bFiles = new Set(b.affectedFiles);
      const hasOverlap = a.affectedFiles.some(f => bFiles.has(f)) || b.affectedFiles.some(f => aFiles.has(f));

      if (!hasOverlap) continue;

      const aOrder = bySeverityOrder.indexOf(a.severity);
      const bOrder = bySeverityOrder.indexOf(b.severity);

      if (aOrder < bOrder) {
        // a is more severe → b depends on a
        const bNode = graph.get(b.code)!;
        if (!bNode.dependsOn.includes(a.code)) {
          bNode.dependsOn.push(a.code);
        }
      } else if (bOrder < aOrder) {
        // b is more severe → a depends on b
        const aNode = graph.get(a.code)!;
        if (!aNode.dependsOn.includes(b.code)) {
          aNode.dependsOn.push(b.code);
        }
      }
      // Equal severity with file overlap: no forced dependency
    }
  }

  // Populate blockedBy (reverse edges)
  for (const [code, node] of graph) {
    for (const dep of node.dependsOn) {
      const depNode = graph.get(dep);
      if (depNode && !depNode.blockedBy.includes(code)) {
        depNode.blockedBy.push(code);
      }
    }
  }

  return graph;
}

// Topological sort (Kahn's algorithm) — returns safe remediation order.
export function getSafeRemediationOrder(codes?: string[]): SafeOrderResult {
  const graph   = buildDependencyGraph();
  const scope   = codes ? new Set(codes) : new Set(AUDIT_FINDINGS.map(f => f.code));
  const inDeg   = new Map<string, number>();
  const cycles: string[][] = [];

  // Build scoped in-degree map
  for (const code of scope) {
    const node = graph.get(code)!;
    const deps = node.dependsOn.filter(d => scope.has(d));
    inDeg.set(code, deps.length);
  }

  const queue = [...scope].filter(c => (inDeg.get(c) ?? 0) === 0);
  // Sort queue by severity (critical first)
  const severityRank = (c: string) => {
    const sev = AUDIT_FINDINGS.find(f => f.code === c)?.severity ?? "low";
    return { critical: 0, high: 1, medium: 2, low: 3 }[sev] ?? 3;
  };
  queue.sort((a, b) => severityRank(a) - severityRank(b));

  const order: string[] = [];
  const processed = new Set<string>();

  while (queue.length > 0) {
    const code = queue.shift()!;
    order.push(code);
    processed.add(code);

    const node = graph.get(code)!;
    for (const blocked of node.blockedBy) {
      if (!scope.has(blocked)) continue;
      const newDeg = (inDeg.get(blocked) ?? 1) - 1;
      inDeg.set(blocked, newDeg);
      if (newDeg === 0) {
        // Insert maintaining severity order
        const insertIdx = queue.findIndex(c => severityRank(c) > severityRank(blocked));
        if (insertIdx === -1) queue.push(blocked);
        else queue.splice(insertIdx, 0, blocked);
      }
    }
  }

  // Detect cycles (nodes not processed)
  const cycleNodes = [...scope].filter(c => !processed.has(c));
  if (cycleNodes.length > 0) {
    cycles.push(cycleNodes);
  }

  // Build independent parallel sets (findings at the same dependency depth)
  const depth = new Map<string, number>();
  for (const code of order) {
    const node = graph.get(code)!;
    const maxDepDep = Math.max(0, ...node.dependsOn.filter(d => scope.has(d)).map(d => (depth.get(d) ?? 0) + 1));
    depth.set(code, maxDepDep);
  }
  const maxDepth = Math.max(0, ...[...depth.values()]);
  const independentSets: string[][] = [];
  for (let d = 0; d <= maxDepth; d++) {
    const set = order.filter(c => depth.get(c) === d);
    if (set.length > 0) independentSets.push(set);
  }

  return { order, cycles, independentSets };
}

// What must be fixed before the given finding can be addressed?
export function getBlockedByChain(code: string): string[] {
  const graph = buildDependencyGraph();
  const visited = new Set<string>();
  const result: string[] = [];

  function visit(c: string) {
    if (visited.has(c)) return;
    visited.add(c);
    const node = graph.get(c);
    if (!node) return;
    for (const dep of node.dependsOn) {
      visit(dep);
      if (!result.includes(dep)) result.push(dep);
    }
  }

  visit(code);
  return result;
}
