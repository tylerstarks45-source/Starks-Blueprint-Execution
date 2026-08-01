// ── Build 045: Launch Readiness Engine ───────────────────────────────────
// Produces launch score, critical issues, warnings, recommendations,
// readiness level, blocked items.
// NEVER modifies platform state. Read-only.
import type {
  DomainResult, LawComplianceResult, ValidationFinding,
  HealthMetrics, LaunchReadinessResult, ReadinessLevel,
} from "./types";

export function computeLaunchReadiness(params: {
  domainResults:     DomainResult[];
  lawResults:        LawComplianceResult[];
  dependencyResults: ValidationFinding[];
  healthMetrics:     HealthMetrics[];
}): LaunchReadinessResult {
  const { domainResults, lawResults, dependencyResults, healthMetrics } = params;

  const criticalIssues:  string[] = [];
  const warnings:        string[] = [];
  const recommendations: string[] = [];
  const blockedItems:    string[] = [];

  // 1. Gather critical domain failures
  for (const dr of domainResults) {
    if (dr.status === "fail") {
      const criticalFindings = dr.findings.filter((f) => !f.passed && f.severity === "critical");
      for (const f of criticalFindings) {
        criticalIssues.push(`[${dr.domain.toUpperCase()}] ${f.message}`);
        blockedItems.push(`${dr.domain}: ${f.ruleCode}`);
      }
      if (criticalFindings.length === 0 && dr.score < 0.5) {
        warnings.push(`Domain '${dr.domain}' failed validation with score ${(dr.score * 100).toFixed(0)}%.`);
      }
    } else if (dr.status === "warning") {
      warnings.push(`Domain '${dr.domain}' has warnings — score: ${(dr.score * 100).toFixed(0)}%.`);
    }
  }

  // 2. Law compliance failures
  const failedLaws = lawResults.filter((l) => !l.compliant);
  for (const law of failedLaws) {
    if (law.lawName.includes("Unified") || law.lawName.includes("Cognitive")) {
      criticalIssues.push(`[LAW] ${law.lawName}: ${law.findings}`);
      blockedItems.push(`Law: ${law.lawName}`);
    } else {
      warnings.push(`Law '${law.lawName}' compliance failed: ${law.findings}`);
    }
  }

  // 3. Dependency validation failures
  const failedDeps = dependencyResults.filter((d) => !d.passed);
  for (const dep of failedDeps) {
    if (dep.severity === "critical") {
      criticalIssues.push(`[DEPENDENCY] ${dep.message}`);
      blockedItems.push(`Dependency: ${dep.ruleCode}`);
    } else if (dep.severity === "high") {
      warnings.push(`Dependency check failed: ${dep.message}`);
    }
  }

  // 4. Health concerns
  for (const m of healthMetrics) {
    if (!m.available) {
      criticalIssues.push(`[HEALTH] Domain '${m.domain}' is unavailable.`);
      blockedItems.push(`Health: ${m.domain} unavailable`);
    } else if (m.healthScore < 0.5) {
      warnings.push(`Domain '${m.domain}' health is degraded: ${(m.healthScore * 100).toFixed(0)}%.`);
    }
  }

  // 5. Recommendations
  const lowCoverage = healthMetrics.filter((m) => m.coverageScore < 0.8);
  for (const m of lowCoverage) {
    recommendations.push(`Increase data coverage for '${m.domain}' — current: ${(m.coverageScore * 100).toFixed(0)}%.`);
  }
  if (failedLaws.length === 0) {
    recommendations.push("All architectural laws are compliant. Consider scheduling monthly re-certification.");
  }
  recommendations.push("Run POST /certification/run after each major deployment to maintain certification currency.");
  recommendations.push("Obtain administrator sign-off via POST /certification/run before public launch.");

  // 6. Compute launch score (0-100)
  const domainScore = domainResults.length > 0
    ? domainResults.reduce((s, d) => s + d.score, 0) / domainResults.length : 0;
  const lawScore    = lawResults.length > 0
    ? lawResults.filter((l) => l.compliant).length / lawResults.length : 0;
  const depScore    = dependencyResults.length > 0
    ? dependencyResults.filter((d) => d.passed).length / dependencyResults.length : 0;
  const healthScore = healthMetrics.length > 0
    ? healthMetrics.reduce((s, m) => s + m.healthScore, 0) / healthMetrics.length : 0;

  const rawScore    = domainScore * 0.3 + lawScore * 0.3 + depScore * 0.2 + healthScore * 0.2;
  const launchScore = Math.round(rawScore * 100);

  // 7. Readiness level
  let readinessLevel: ReadinessLevel;
  if (criticalIssues.length > 0) {
    readinessLevel = "not_ready";
  } else if (warnings.length > 3 || launchScore < 70) {
    readinessLevel = "conditional";
  } else if (launchScore >= 90) {
    readinessLevel = "certified";
  } else {
    readinessLevel = "ready";
  }

  return { launchScore, readinessLevel, criticalIssues, warnings, recommendations, blockedItems };
}
