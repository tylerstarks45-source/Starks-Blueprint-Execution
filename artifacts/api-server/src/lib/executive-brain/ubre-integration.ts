// ── Build 049: UBRE → Executive Brain integration ─────────────────────────────
import { computeUBRESummary, triggerUBREMaintenance } from "../unified-builder-runtime/ubre-orchestrator";
import type { UBRESummary } from "../unified-builder-runtime/types";

export type { UBRESummary };

export async function fetchUBREView(userId: number): Promise<UBRESummary | undefined> {
  try {
    return await computeUBRESummary(userId);
  } catch {
    return undefined;
  }
}

export { triggerUBREMaintenance };

export function buildUBREAdvisory(summary: UBRESummary | null): string | null {
  if (!summary) return null;

  const parts: string[] = [];
  parts.push(`UBRE — ${summary.activeSessions} active session(s)`);

  if (summary.sessionsWithUnsaved > 0) {
    parts.push(`⚠ ${summary.sessionsWithUnsaved} session(s) with unsaved work`);
  }
  if (summary.pendingRecoveries > 0) {
    parts.push(`🔴 ${summary.pendingRecoveries} pending recovery/recoveries`);
  }
  if (summary.totalDrafts > 0) {
    parts.push(`${summary.totalDrafts} draft(s)`);
  }
  if (summary.publishReadySessions > 0) {
    parts.push(`${summary.publishReadySessions} ready to publish`);
  }
  if (summary.validationPassRate < 100) {
    parts.push(`validation pass rate: ${summary.validationPassRate}%`);
  }
  if (Object.keys(summary.builderBreakdown).length > 0) {
    const active = Object.entries(summary.builderBreakdown)
      .map(([k, v]) => `${k.replace("_builder", "")}×${v}`)
      .join(", ");
    parts.push(`active builders: ${active}`);
  }

  return parts.join(" | ");
}
