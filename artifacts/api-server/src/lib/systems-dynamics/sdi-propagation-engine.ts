// ── SDI Propagation Engine ────────────────────────────────────────────────
// Models cause, effect, cascade, recovery, and dependency propagation paths.
// Pure computation — no I/O.

import type { PropagationPathProfile } from "./types";

export function getPropagationCatalog(): PropagationPathProfile[] {
  return [
    // ── Failure propagation ───────────────────────────────────────────────
    {
      sourceSystemKey: "data-system",
      targetSystemKey: "intelligence-system",
      pathKey: "db-failure-to-eb",
      propagationType: "failure",
      propagationSpeed: "immediate",
      impactMagnitude: "critical",
      impactScore: 0.97,
      probability: 0.95,
      hopsCount: 1,
      intermediaries: [],
      mitigationExists: true,
      mitigationNotes: "Fail-open pattern in all EB steps; returns partial context on DB error.",
    },
    {
      sourceSystemKey: "data-system",
      targetSystemKey: "execution-system",
      pathKey: "db-failure-to-execution",
      propagationType: "failure",
      propagationSpeed: "immediate",
      impactMagnitude: "critical",
      impactScore: 0.95,
      probability: 0.93,
      hopsCount: 1,
      intermediaries: [],
      mitigationExists: true,
      mitigationNotes: "Runtime worker halts gracefully; jobs remain in queue for recovery.",
    },
    {
      sourceSystemKey: "infrastructure-system",
      targetSystemKey: "data-system",
      pathKey: "infra-failure-to-db",
      propagationType: "failure",
      propagationSpeed: "immediate",
      impactMagnitude: "critical",
      impactScore: 0.98,
      probability: 0.30,
      hopsCount: 1,
      intermediaries: [],
      mitigationExists: false,
    },
    {
      sourceSystemKey: "user-system",
      targetSystemKey: "intelligence-system",
      pathKey: "auth-failure-to-intelligence",
      propagationType: "failure",
      propagationSpeed: "immediate",
      impactMagnitude: "critical",
      impactScore: 0.92,
      probability: 0.20,
      hopsCount: 1,
      intermediaries: [],
      mitigationExists: true,
      mitigationNotes: "401 returned; no intelligence computation attempted.",
    },
    {
      sourceSystemKey: "integration-system",
      targetSystemKey: "execution-system",
      pathKey: "integration-failure-to-execution",
      propagationType: "failure",
      propagationSpeed: "moderate",
      impactMagnitude: "medium",
      impactScore: 0.55,
      probability: 0.40,
      hopsCount: 2,
      intermediaries: ["adapter-framework"],
      mitigationExists: true,
      mitigationNotes: "Adapter framework isolates external failures; execution continues without external action.",
    },
    {
      sourceSystemKey: "execution-system",
      targetSystemKey: "business-system",
      pathKey: "execution-failure-to-business",
      propagationType: "failure",
      propagationSpeed: "slow",
      impactMagnitude: "medium",
      impactScore: 0.52,
      probability: 0.35,
      hopsCount: 2,
      intermediaries: ["runtime-worker"],
      mitigationExists: true,
      mitigationNotes: "Business data writes are idempotent; failed jobs are retried.",
    },

    // ── Load propagation ──────────────────────────────────────────────────
    {
      sourceSystemKey: "intelligence-system",
      targetSystemKey: "data-system",
      pathKey: "eb-load-to-db",
      propagationType: "load",
      propagationSpeed: "fast",
      impactMagnitude: "high",
      impactScore: 0.74,
      probability: 0.70,
      hopsCount: 1,
      intermediaries: [],
      mitigationExists: true,
      mitigationNotes: "Throttled per-engine triggers reduce parallel DB writes.",
    },
    {
      sourceSystemKey: "execution-system",
      targetSystemKey: "infrastructure-system",
      pathKey: "job-load-to-infra",
      propagationType: "load",
      propagationSpeed: "fast",
      impactMagnitude: "high",
      impactScore: 0.71,
      probability: 0.60,
      hopsCount: 1,
      intermediaries: ["runtime-worker"],
      mitigationExists: true,
      mitigationNotes: "Job queue acts as buffer; worker polls at fixed interval.",
    },

    // ── Performance propagation ────────────────────────────────────────────
    {
      sourceSystemKey: "data-system",
      targetSystemKey: "business-system",
      pathKey: "db-perf-to-business",
      propagationType: "performance",
      propagationSpeed: "fast",
      impactMagnitude: "medium",
      impactScore: 0.60,
      probability: 0.55,
      hopsCount: 1,
      intermediaries: [],
      mitigationExists: true,
      mitigationNotes: "Connection pool backpressure limits cascade.",
    },
    {
      sourceSystemKey: "intelligence-system",
      targetSystemKey: "user-system",
      pathKey: "eb-perf-to-user",
      propagationType: "performance",
      propagationSpeed: "moderate",
      impactMagnitude: "medium",
      impactScore: 0.58,
      probability: 0.45,
      hopsCount: 2,
      intermediaries: ["api-server"],
      mitigationExists: true,
      mitigationNotes: "Streaming response reduces perceived latency.",
    },

    // ── Recovery propagation ───────────────────────────────────────────────
    {
      sourceSystemKey: "data-system",
      targetSystemKey: "execution-system",
      pathKey: "db-recovery-to-execution",
      propagationType: "recovery",
      propagationSpeed: "moderate",
      impactMagnitude: "high",
      impactScore: 0.78,
      probability: 0.85,
      hopsCount: 1,
      intermediaries: [],
      mitigationExists: false,
      mitigationNotes: "resetOrphanedJobs() + reclaimHungJobs() handle automatic recovery.",
    },
    {
      sourceSystemKey: "infrastructure-system",
      targetSystemKey: "intelligence-system",
      pathKey: "infra-recovery-to-intelligence",
      propagationType: "recovery",
      propagationSpeed: "fast",
      impactMagnitude: "high",
      impactScore: 0.80,
      probability: 0.88,
      hopsCount: 2,
      intermediaries: ["data-system"],
      mitigationExists: false,
    },

    // ── Change propagation ─────────────────────────────────────────────────
    {
      sourceSystemKey: "technology-system",
      targetSystemKey: "intelligence-system",
      pathKey: "tech-change-to-intelligence",
      propagationType: "change",
      propagationSpeed: "slow",
      impactMagnitude: "medium",
      impactScore: 0.55,
      probability: 0.70,
      hopsCount: 1,
      intermediaries: [],
      mitigationExists: true,
      mitigationNotes: "Technology advisory feeds into EB context note; no immediate execution change.",
    },
    {
      sourceSystemKey: "business-system",
      targetSystemKey: "intelligence-system",
      pathKey: "business-change-to-intelligence",
      propagationType: "change",
      propagationSpeed: "moderate",
      impactMagnitude: "medium",
      impactScore: 0.62,
      probability: 0.80,
      hopsCount: 1,
      intermediaries: [],
      mitigationExists: false,
    },
  ];
}

export function getCriticalPropagationPaths(paths: PropagationPathProfile[]): PropagationPathProfile[] {
  return paths.filter(p => p.impactMagnitude === "critical" || p.impactScore >= 0.90);
}

export function getUnmitigatedRisks(paths: PropagationPathProfile[]): PropagationPathProfile[] {
  return paths.filter(p => !p.mitigationExists && p.impactScore >= 0.60);
}

export function computePropagationRiskScore(systemKey: string, paths: PropagationPathProfile[]): number {
  const inbound = paths.filter(p => p.targetSystemKey === systemKey);
  if (inbound.length === 0) return 0;
  const weightedRisk = inbound.reduce((sum, p) => sum + p.impactScore * p.probability, 0);
  return Math.min(weightedRisk / inbound.length, 1.0);
}
