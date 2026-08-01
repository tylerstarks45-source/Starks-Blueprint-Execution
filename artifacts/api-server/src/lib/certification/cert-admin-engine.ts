// ── Build 045: Administrator Certification Engine ─────────────────────────
// Produces administrator-only certification packages with executive summary,
// detailed findings, evidence, pass/fail status, recommended actions, deferred items.
// NEVER modifies platform state. Read-only.
import type {
  DomainResult, LawComplianceResult, ValidationFinding,
  HealthMetrics, LaunchReadinessResult,
} from "./types";

export interface AdminCertificationPackage {
  executiveSummary:  string;
  overallStatus:     "PASS" | "CONDITIONAL" | "FAIL";
  launchScore:       number;
  readinessLevel:    string;
  domainPassCount:   number;
  domainFailCount:   number;
  domainWarnCount:   number;
  lawComplianceRate: number;
  criticalFindings:  string[];
  warnings:          string[];
  evidence:          Record<string, unknown>;
  recommendedActions:string[];
  deferredItems:     string[];
  certifiedAt:       Date;
}

export function buildAdminCertificationPackage(params: {
  domainResults:     DomainResult[];
  lawResults:        LawComplianceResult[];
  dependencyResults: ValidationFinding[];
  healthMetrics:     HealthMetrics[];
  launchReadiness:   LaunchReadinessResult;
}): AdminCertificationPackage {
  const { domainResults, lawResults, dependencyResults, healthMetrics, launchReadiness } = params;

  const passCount = domainResults.filter((d) => d.status === "pass").length;
  const failCount = domainResults.filter((d) => d.status === "fail").length;
  const warnCount = domainResults.filter((d) => d.status === "warning").length;
  const skipCount = domainResults.filter((d) => d.status === "skipped").length;

  const lawCompliantCount = lawResults.filter((l) => l.compliant).length;
  const lawRate           = lawResults.length > 0 ? lawCompliantCount / lawResults.length : 0;

  const overallStatus: "PASS" | "CONDITIONAL" | "FAIL" =
    launchReadiness.criticalIssues.length > 0  ? "FAIL"
    : launchReadiness.readinessLevel === "conditional" ? "CONDITIONAL"
    : "PASS";

  const executiveSummary = [
    `ASH Cognitive Operating System — Certification Report`,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `OVERALL STATUS: ${overallStatus}`,
    `Launch Score: ${launchReadiness.launchScore}/100`,
    `Readiness Level: ${launchReadiness.readinessLevel.toUpperCase()}`,
    ``,
    `Domain Results: ${passCount} PASS / ${failCount} FAIL / ${warnCount} WARN / ${skipCount} SKIP of ${domainResults.length} domains`,
    `Law Compliance: ${lawCompliantCount}/${lawResults.length} (${(lawRate * 100).toFixed(0)}%)`,
    `Critical Issues: ${launchReadiness.criticalIssues.length}`,
    `Warnings: ${launchReadiness.warnings.length}`,
    `Blocked Items: ${launchReadiness.blockedItems.length}`,
    ``,
    `ADMINISTRATOR ACTION REQUIRED: ${overallStatus === "PASS" ? "Sign off to authorize public launch." : overallStatus === "CONDITIONAL" ? "Resolve warnings and re-certify before sign-off." : "Resolve all critical issues before re-certification."}`,
  ].join("\n");

  // Evidence package
  const evidence: Record<string, unknown> = {
    domainScores:    Object.fromEntries(domainResults.map((d) => [d.domain, { status: d.status, score: d.score }])),
    lawCompliance:   Object.fromEntries(lawResults.map((l) => [l.lawName, l.compliant])),
    healthMetrics:   Object.fromEntries(healthMetrics.map((m) => [m.domain, { score: m.healthScore, available: m.available }])),
    dependencyPass:  dependencyResults.filter((d) => d.passed).length,
    dependencyFail:  dependencyResults.filter((d) => !d.passed).length,
  };

  // Recommended actions
  const recommendedActions = [...launchReadiness.recommendations];
  if (failCount > 0) {
    recommendedActions.unshift(`URGENT: Resolve ${failCount} failed domain(s) before launch consideration.`);
  }
  if (launchReadiness.criticalIssues.length > 0) {
    recommendedActions.unshift(`CRITICAL: ${launchReadiness.criticalIssues.length} critical issue(s) must be resolved before any launch authorization.`);
  }

  // Deferred items (warnings that don't block launch)
  const deferredItems = [
    ...launchReadiness.warnings.filter((w) => !launchReadiness.blockedItems.some((b) => w.includes(b))),
    ...domainResults.filter((d) => d.status === "skipped").map((d) => `Domain '${d.domain}': skipped — expand validation rules for comprehensive coverage.`),
  ];

  return {
    executiveSummary,
    overallStatus,
    launchScore:       launchReadiness.launchScore,
    readinessLevel:    launchReadiness.readinessLevel,
    domainPassCount:   passCount,
    domainFailCount:   failCount,
    domainWarnCount:   warnCount,
    lawComplianceRate: lawRate,
    criticalFindings:  launchReadiness.criticalIssues,
    warnings:          launchReadiness.warnings,
    evidence,
    recommendedActions,
    deferredItems,
    certifiedAt:       new Date(),
  };
}
