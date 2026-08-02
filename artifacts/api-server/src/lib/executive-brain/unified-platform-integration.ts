// ── Build 046: Unified Platform OS — Executive Brain Integration ──────────────
import { logger }                          from "../logger";
import { fetchUPOSSummary, initializeUPOS } from "../unified-platform/upos-orchestrator";
import { buildContextSummaryForASH }        from "../unified-platform/context-engine";
import type { UPOSSummary }                from "../unified-platform/types";
import { UPOS_THROTTLE_CYCLES }            from "../unified-platform/types";

export type { UPOSSummary };

// ── Read-only UPOS context for EB ─────────────────────────────────────────────

export async function fetchUPOSView(userId: number): Promise<UPOSSummary | null> {
  try {
    return await fetchUPOSSummary(userId);
  } catch (err) {
    logger.warn({ err }, "UPOS: fetchUPOSView failed (fail-open)");
    return null;
  }
}

// ── Fire-and-forget init — throttled by EB cycle counter ─────────────────────

let _uposCycleCounter = 0;
export function triggerUPOSInit(userId: number): void {
  _uposCycleCounter++;
  if (_uposCycleCounter % UPOS_THROTTLE_CYCLES !== 0) return;
  void Promise.resolve(initializeUPOS(userId)).catch((err) =>
    logger.warn({ err }, "UPOS: background init failed (ignored)"),
  );
}

// ── Build EB advisory section ─────────────────────────────────────────────────

export function buildUPOSAdvisory(summary: UPOSSummary | null): string {
  if (!summary) return "";
  const parts: string[] = [];
  parts.push(
    `Platform OS: ${summary.activeApps}/${summary.totalApps} apps active | ${summary.totalWorkspaces} workspaces | ${summary.totalProjects} projects | ${summary.commandsAvailable} commands | runtime ${summary.runtimeHealth}.`,
  );
  if (summary.notificationsPending > 0) {
    parts.push(`${summary.notificationsPending} unread notification(s) pending user attention.`);
  }
  if (!summary.lawApplied) {
    parts.push("WARNING: Unified Platform Law breach — no applications registered in UPOS.");
  }
  if (summary.contextSnapshot) {
    const ctxLine = buildContextSummaryForASH(summary.contextSnapshot);
    if (ctxLine) parts.push(`Context: ${ctxLine}`);
  }
  return parts.join(" ");
}
