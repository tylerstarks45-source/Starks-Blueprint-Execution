// ── Regression Engine ──────────────────────────────────────────────────────
// Determines whether a proposed fix could impact other subsystems and assigns
// a regression risk level. Risk is based on:
//   - Number of subsystems impacted
//   - Finding category (security fixes touch more paths than low-level observability)
//   - Whether the fix touches shared infrastructure (auth, DB, EB core)
// ────────────────────────────────────────────────────────────────────────────

import { db } from "@workspace/db";
import { launchRegression, launchHardeningRegistry } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type { RegressionRisk, FindingCategory } from "./types";
import { REGRESSION_SUBSYSTEMS, AUDIT_FINDINGS } from "./types";
import { logger } from "../logger";

// High-risk subsystems — changes here have platform-wide blast radius.
const HIGH_RISK_SUBSYSTEMS = new Set([
  "auth", "all-api-routes", "all-engines", "executive-brain",
  "database", "cognitive-foundation", "ai-orchestration",
]);

export function computeRegressionRisk(findingCode: string): {
  risk: RegressionRisk;
  impactedSubsystems: string[];
  rationale: string;
} {
  const finding            = AUDIT_FINDINGS.find(f => f.code === findingCode);
  const impactedSubsystems = REGRESSION_SUBSYSTEMS[findingCode] ?? [];
  const highRiskCount      = impactedSubsystems.filter(s => HIGH_RISK_SUBSYSTEMS.has(s)).length;
  const totalImpact        = impactedSubsystems.length;

  let risk: RegressionRisk = "low";
  const reasons: string[] = [];

  // High-risk subsystem involvement
  if (highRiskCount >= 2) {
    risk = "critical";
    reasons.push(`Touches ${highRiskCount} platform-wide subsystems (${impactedSubsystems.filter(s => HIGH_RISK_SUBSYSTEMS.has(s)).join(", ")})`);
  } else if (highRiskCount === 1) {
    risk = "high";
    reasons.push(`Touches high-risk subsystem: ${impactedSubsystems.find(s => HIGH_RISK_SUBSYSTEMS.has(s))}`);
  }

  // Category-based risk escalation
  if (finding) {
    const categoryRisk: Record<FindingCategory, RegressionRisk> = {
      security:      "high",
      correctness:   "medium",
      performance:   "medium",
      observability: "low",
      api:           "medium",
      architecture:  "high",
      scalability:   "medium",
    };
    const catRisk = categoryRisk[finding.category as FindingCategory] ?? "low";
    const riskOrder: RegressionRisk[] = ["low", "medium", "high", "critical"];
    if (riskOrder.indexOf(catRisk) > riskOrder.indexOf(risk)) {
      risk = catRisk;
      reasons.push(`Category '${finding.category}' carries inherent ${catRisk} regression risk`);
    }
  }

  // Broad impact
  if (totalImpact >= 4 && risk === "low") {
    risk = "medium";
    reasons.push(`Impacts ${totalImpact} subsystems`);
  }

  const rationale = reasons.length > 0 ? reasons.join("; ") : "Isolated change with limited blast radius";
  return { risk, impactedSubsystems, rationale };
}

export interface RecordRegressionInput {
  remediationId:   number;
  findingCode:     string;
  reviewedBy?:     string;
  notes?:          string;
  approved?:       boolean;
}

// Records a regression analysis for a remediation.
// Auto-computes risk from the finding code; reviewer can override via notes.
export async function recordRegressionAnalysis(input: RecordRegressionInput): Promise<number> {
  const { risk, impactedSubsystems, rationale } = computeRegressionRisk(input.findingCode);

  const [record] = await db.insert(launchRegression).values({
    remediationId:      input.remediationId,
    findingCode:        input.findingCode,
    impactedSubsystems,
    regressionRisk:     risk,
    regressionNotes:    input.notes ?? rationale,
    reviewedBy:         input.reviewedBy ?? null,
    reviewedAt:         input.reviewedBy ? new Date() : null,
    approved:           input.approved ?? (risk === "low" || risk === "medium"),
  }).returning({ id: launchRegression.id });

  if (risk === "critical" || risk === "high") {
    logger.warn({ findingCode: input.findingCode, risk, impactedSubsystems },
      "Launch Hardening: high regression risk detected — manual review required before deploying fix");
  }

  return record.id;
}

// Returns all findings with high or critical regression risk.
export async function getHighRegressionRisk() {
  const records = await db
    .select()
    .from(launchRegression)
    .orderBy(desc(launchRegression.createdAt));

  return records.filter(r =>
    r.regressionRisk === "high" || r.regressionRisk === "critical"
  );
}

// Returns a regression summary for the EB advisory.
export async function getRegressionSummary() {
  const all = await db.select().from(launchRegression);
  const counts = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const r of all) {
    counts[r.regressionRisk as RegressionRisk]++;
  }
  const unapproved = all.filter(r => !r.approved && (r.regressionRisk === "high" || r.regressionRisk === "critical"));
  return { counts, unapprovedHighRisk: unapproved.length };
}
