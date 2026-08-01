// ── Build 045: Certification — Executive Brain Integration ────────────────
import { logger } from "../logger";
import { fetchCertificationSummary } from "../certification/cert-orchestrator";
import type { CertificationSummary, ReadinessLevel } from "../certification/types";
import { CERT_THROTTLE_CYCLES } from "../certification/types";

export type { CertificationSummary };

// Fetch the latest certification summary for EB context (read-only).
export async function fetchCertificationView(): Promise<CertificationSummary | null> {
  try {
    return await fetchCertificationSummary();
  } catch (err) {
    logger.warn({ err }, "Certification: fetchCertificationView failed (fail-open)");
    return null;
  }
}

// No fire-and-forget trigger for certification — it is an intentional admin action.
// EB receives the latest snapshot passively.
let _certCycleCounter = 0;
export function notifyCertificationCycle(): void {
  _certCycleCounter++;
  // No automatic trigger — certification requires explicit admin action.
}

// Build the EB advisory section for certification.
export function buildCertificationAdvisory(summary: CertificationSummary | null): string {
  if (!summary) return "No certification run on record. Run POST /api/certification/run to certify the platform.";

  const parts: string[] = [];
  const levelEmoji: Record<ReadinessLevel, string> = {
    not_ready:   "🔴 NOT READY",
    conditional: "🟡 CONDITIONAL",
    ready:       "🟢 READY",
    certified:   "✅ CERTIFIED",
  };

  parts.push(
    `Certification: ${levelEmoji[summary.readinessLevel]} — Score: ${(summary.overallScore * 100).toFixed(0)}% | Domains: ${summary.passedDomains}✓ ${summary.failedDomains}✗ ${summary.warnedDomains}⚠ of ${summary.totalDomains} | Laws: ${(summary.lawComplianceScore * 100).toFixed(0)}% compliant | Launch ready: ${summary.launchReady ? "YES" : "NO"}.`,
  );

  if (summary.failedDomains > 0) {
    parts.push(`${summary.failedDomains} domain(s) failed certification — platform is NOT production-ready per the Cognitive Certification Law.`);
  }
  const signoffStatus = summary.signoffStatus as string | null;
  if (signoffStatus === "approved") {
    parts.push("Administrator has signed off on this certification run. Platform is authorized for public operation.");
  } else if (summary.launchReady && signoffStatus !== "approved") {
    parts.push("Platform is launch-ready but awaiting administrator sign-off before public operation is authorized.");
  }

  return parts.join(" ");
}
