// ─── Anomaly Engine (Build 011) ───────────────────────────────────────────────
//
// Detects abnormal behavior patterns from observation history.
// Anomaly reports anomalies. It NEVER fixes them.
// Deterministic — no AI.
// Pure computation — DB reads supplied by observation-registry.ts.

import type {
  ExecutiveObservation,
  AnomalyType,
  ObservationSeverity,
} from "./types";

// ── Anomaly candidate ──────────────────────────────────────────────────────────

export interface DetectedAnomaly {
  anomalyType: AnomalyType;
  severity: ObservationSeverity;
  description: string;
  sourceObjectId?: string;
  sourceObjectType?: string;
  evidence: Record<string, unknown>[];
}

// ── Individual anomaly detectors ───────────────────────────────────────────────

/** Unexpected failure: failure event preceded by no running event within window */
export function detectUnexpectedFailures(
  observations: ExecutiveObservation[],
): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = [];
  const failureObs = observations.filter(
    (o) => o.signalType === "failure" && o.relatedExecutionId,
  );

  for (const failure of failureObs) {
    // Check if there was a preceding "started" or "running" event for the same execution
    const hadRunning = observations.some(
      (o) =>
        o.relatedExecutionId === failure.relatedExecutionId &&
        o.observedAt < failure.observedAt &&
        (o.eventType.includes("started") || o.observedState === "running"),
    );
    if (!hadRunning) {
      anomalies.push({
        anomalyType: "unexpected_failure",
        severity: "high",
        description: `Execution ${failure.relatedExecutionId?.slice(0, 8)} failed without a preceding running event`,
        sourceObjectId: failure.relatedExecutionId ?? undefined,
        sourceObjectType: "execution",
        evidence: [{ observationId: failure.id, eventType: failure.eventType, observedAt: failure.observedAt.toISOString() }],
      });
    }
  }

  return anomalies;
}

/** Repeated retries: more than N retry events for same execution */
export function detectRepeatedRetries(
  observations: ExecutiveObservation[],
  threshold = 3,
): DetectedAnomaly[] {
  const retryByExecution = new Map<string, ExecutiveObservation[]>();

  for (const obs of observations) {
    if (!obs.relatedExecutionId) continue;
    if (!obs.eventType.includes("retry") && !obs.eventType.includes("retrying")) continue;
    const arr = retryByExecution.get(obs.relatedExecutionId) ?? [];
    arr.push(obs);
    retryByExecution.set(obs.relatedExecutionId, arr);
  }

  const anomalies: DetectedAnomaly[] = [];
  for (const [executionId, retries] of retryByExecution.entries()) {
    if (retries.length >= threshold) {
      anomalies.push({
        anomalyType: "repeated_retries",
        severity: retries.length >= threshold * 2 ? "critical" : "high",
        description: `Execution ${executionId.slice(0, 8)} has ${retries.length} retry event(s) (threshold: ${threshold})`,
        sourceObjectId: executionId,
        sourceObjectType: "execution",
        evidence: retries.slice(0, 5).map((r) => ({
          observationId: r.id,
          eventType: r.eventType,
          observedAt: r.observedAt.toISOString(),
        })),
      });
    }
  }

  return anomalies;
}

/** Execution loop: execution transitions to running multiple times */
export function detectExecutionLoops(
  observations: ExecutiveObservation[],
  threshold = 4,
): DetectedAnomaly[] {
  const runCountByExecution = new Map<string, number>();

  for (const obs of observations) {
    if (!obs.relatedExecutionId) continue;
    if (obs.observedState === "running" || obs.eventType.includes("started")) {
      const count = (runCountByExecution.get(obs.relatedExecutionId) ?? 0) + 1;
      runCountByExecution.set(obs.relatedExecutionId, count);
    }
  }

  const anomalies: DetectedAnomaly[] = [];
  for (const [executionId, count] of runCountByExecution.entries()) {
    if (count >= threshold) {
      anomalies.push({
        anomalyType: "execution_loop",
        severity: "high",
        description: `Execution ${executionId.slice(0, 8)} entered running state ${count} time(s) — possible loop (threshold: ${threshold})`,
        sourceObjectId: executionId,
        sourceObjectType: "execution",
        evidence: [{ executionId, runningTransitions: count }],
      });
    }
  }

  return anomalies;
}

/** Stalled progress: execution in running state with no step completion for > N minutes */
export function detectStalledProgress(
  observations: ExecutiveObservation[],
  stallMinutes = 30,
): DetectedAnomaly[] {
  const now = Date.now();
  const stallMs = stallMinutes * 60_000;
  const anomalies: DetectedAnomaly[] = [];

  // Find executions with a running event but no subsequent step_completed event
  const runningByExecution = new Map<string, ExecutiveObservation>();
  const completedByExecution = new Set<string>();

  for (const obs of observations) {
    if (!obs.relatedExecutionId) continue;
    if (obs.observedState === "running" || obs.eventType === "started") {
      if (!runningByExecution.has(obs.relatedExecutionId)) {
        runningByExecution.set(obs.relatedExecutionId, obs);
      }
    }
    if (obs.eventType.includes("step_completed") || obs.eventType.includes("completed")) {
      completedByExecution.add(obs.relatedExecutionId);
    }
  }

  for (const [executionId, runningObs] of runningByExecution.entries()) {
    if (completedByExecution.has(executionId)) continue;
    const stallDuration = now - runningObs.observedAt.getTime();
    if (stallDuration > stallMs) {
      anomalies.push({
        anomalyType: "stalled_progress",
        severity: "medium",
        description: `Execution ${executionId.slice(0, 8)} has been in running state for ${Math.round(stallDuration / 60_000)} minute(s) without progress (threshold: ${stallMinutes}min)`,
        sourceObjectId: executionId,
        sourceObjectType: "execution",
        evidence: [{
          executionId,
          runningSince: runningObs.observedAt.toISOString(),
          stallMinutes: Math.round(stallDuration / 60_000),
        }],
      });
    }
  }

  return anomalies;
}

/** Impossible transition: observed_state transition violates known state machine */
export function detectImpossibleTransitions(
  observations: ExecutiveObservation[],
): DetectedAnomaly[] {
  const INVALID_TRANSITIONS: Record<string, string[]> = {
    completed: ["running", "paused", "blocked", "retrying", "waiting"],
    cancelled: ["running", "paused", "blocked", "retrying", "waiting", "approved"],
    pending:   ["completed", "failed"],
  };

  const anomalies: DetectedAnomaly[] = [];

  for (const obs of observations) {
    if (!obs.previousState || !obs.observedState) continue;
    const invalidNextStates = INVALID_TRANSITIONS[obs.previousState] ?? [];
    if (invalidNextStates.includes(obs.observedState)) {
      anomalies.push({
        anomalyType: "impossible_transition",
        severity: "critical",
        description: `Impossible state transition detected: ${obs.previousState} → ${obs.observedState} on ${obs.sourceObjectType} ${obs.sourceObjectId?.slice(0, 8)}`,
        sourceObjectId: obs.sourceObjectId ?? undefined,
        sourceObjectType: obs.sourceObjectType ?? undefined,
        evidence: [{
          observationId: obs.id,
          previousState: obs.previousState,
          observedState: obs.observedState,
          observedAt: obs.observedAt.toISOString(),
        }],
      });
    }
  }

  return anomalies;
}

// ── Master anomaly detector ────────────────────────────────────────────────────

export function detectAllAnomalies(observations: ExecutiveObservation[]): DetectedAnomaly[] {
  return [
    ...detectUnexpectedFailures(observations),
    ...detectRepeatedRetries(observations),
    ...detectExecutionLoops(observations),
    ...detectStalledProgress(observations),
    ...detectImpossibleTransitions(observations),
  ];
}

// ── Anomaly severity summary ───────────────────────────────────────────────────

export function summarizeAnomalies(anomalies: DetectedAnomaly[]): {
  critical: number;
  high: number;
  medium: number;
  total: number;
} {
  return {
    critical: anomalies.filter((a) => a.severity === "critical").length,
    high:     anomalies.filter((a) => a.severity === "high").length,
    medium:   anomalies.filter((a) => a.severity === "medium").length,
    total:    anomalies.length,
  };
}
