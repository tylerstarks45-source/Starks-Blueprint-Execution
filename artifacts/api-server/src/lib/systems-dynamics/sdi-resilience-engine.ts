// ── SDI System Resilience Engine ─────────────────────────────────────────
// Evaluates robustness, redundancy, fault tolerance, recovery capacity,
// and operational resilience per system.
// Pure computation — no I/O.

import type { ResilienceProfile } from "./types";

export function getResilienceCatalog(): ResilienceProfile[] {
  return [
    {
      systemKey: "data-system",
      robustnessScore: 0.88,
      redundancyScore: 0.72,
      faultToleranceScore: 0.85,
      recoveryCapacityScore: 0.90,
      operationalResilienceScore: 0.87,
      compositeResilienceScore: 0.84,
      singlePointsOfFailure: 1,
      redundantPaths: 2,
      meanTimeToRecovery: "minutes",
      resilienceLevel: "high",
      vulnerabilities: ["Single PostgreSQL instance — no read replica", "Connection pool ceiling under spike load"],
      strengths: ["Drizzle ORM type safety prevents schema drift", "All mutations are fail-open with try/catch", "Append-only tables preserve full history"],
    },
    {
      systemKey: "intelligence-system",
      robustnessScore: 0.82,
      redundancyScore: 0.65,
      faultToleranceScore: 0.88,
      recoveryCapacityScore: 0.84,
      operationalResilienceScore: 0.83,
      compositeResilienceScore: 0.80,
      singlePointsOfFailure: 2,
      redundantPaths: 4,
      meanTimeToRecovery: "minutes",
      resilienceLevel: "high",
      vulnerabilities: ["OpenRouter API dependency — single external LLM provider", "Context window ceiling under heavy advisory load"],
      strengths: ["Fail-open pattern on every EB step — partial context returned, never hard crash", "Multiple intelligence engines are independent — one failing doesn't affect others", "Model fallback chains via OpenRouter"],
    },
    {
      systemKey: "execution-system",
      robustnessScore: 0.74,
      redundancyScore: 0.55,
      faultToleranceScore: 0.78,
      recoveryCapacityScore: 0.80,
      operationalResilienceScore: 0.76,
      compositeResilienceScore: 0.73,
      singlePointsOfFailure: 2,
      redundantPaths: 2,
      meanTimeToRecovery: "minutes",
      resilienceLevel: "medium",
      vulnerabilities: ["Single runtime worker — no parallel execution", "Hung jobs wait up to 5 min for reclaim", "No execution circuit breaker for cascading job failures"],
      strengths: ["resetOrphanedJobs() on startup", "reclaimHungJobs() watchdog every 5 min", "Idempotent job design allows safe retry"],
    },
    {
      systemKey: "user-system",
      robustnessScore: 0.90,
      redundancyScore: 0.80,
      faultToleranceScore: 0.92,
      recoveryCapacityScore: 0.88,
      operationalResilienceScore: 0.89,
      compositeResilienceScore: 0.88,
      singlePointsOfFailure: 1,
      redundantPaths: 3,
      meanTimeToRecovery: "minutes",
      resilienceLevel: "high",
      vulnerabilities: ["JWT secret rotation requires active session invalidation"],
      strengths: ["Stateless JWT — any server instance can validate", "Role checks are redundant (frontend + backend)", "401 handled gracefully at every endpoint"],
    },
    {
      systemKey: "infrastructure-system",
      robustnessScore: 0.84,
      redundancyScore: 0.60,
      faultToleranceScore: 0.80,
      recoveryCapacityScore: 0.86,
      operationalResilienceScore: 0.83,
      compositeResilienceScore: 0.79,
      singlePointsOfFailure: 2,
      redundantPaths: 1,
      meanTimeToRecovery: "minutes",
      resilienceLevel: "medium",
      vulnerabilities: ["Single-region Replit container", "Scheduler depends on DB for state — DB outage halts scheduler"],
      strengths: ["Workflow restart auto-recovers server", "Scheduler state persisted to DB — survives restarts", "pino structured logging enables rapid diagnosis"],
    },
    {
      systemKey: "business-system",
      robustnessScore: 0.80,
      redundancyScore: 0.70,
      faultToleranceScore: 0.82,
      recoveryCapacityScore: 0.78,
      operationalResilienceScore: 0.79,
      compositeResilienceScore: 0.78,
      singlePointsOfFailure: 1,
      redundantPaths: 2,
      meanTimeToRecovery: "hours",
      resilienceLevel: "medium",
      vulnerabilities: ["Async health scoring delay for new businesses", "Zero-data empty states during onboarding"],
      strengths: ["Append-only audit trail for all business changes", "Business graph maintains historical node/edge snapshots", "Soft-delete pattern preserves data integrity"],
    },
    {
      systemKey: "technology-system",
      robustnessScore: 0.87,
      redundancyScore: 0.75,
      faultToleranceScore: 0.88,
      recoveryCapacityScore: 0.85,
      operationalResilienceScore: 0.86,
      compositeResilienceScore: 0.84,
      singlePointsOfFailure: 1,
      redundantPaths: 3,
      meanTimeToRecovery: "minutes",
      resilienceLevel: "high",
      vulnerabilities: ["Static catalog — no live data validation", "Technology advisory depends on registry freshness"],
      strengths: ["Deterministic catalog is always available — no external dependency", "Throttled EB triggers prevent rebuild storms", "Append-only tables preserve all historical snapshots"],
    },
    {
      systemKey: "integration-system",
      robustnessScore: 0.68,
      redundancyScore: 0.50,
      faultToleranceScore: 0.72,
      recoveryCapacityScore: 0.65,
      operationalResilienceScore: 0.70,
      compositeResilienceScore: 0.65,
      singlePointsOfFailure: 4,
      redundantPaths: 0,
      meanTimeToRecovery: "hours",
      resilienceLevel: "low",
      vulnerabilities: ["External credential expiry with no advance warning", "OAuth token refresh not automated", "No fallback when external APIs are down", "Browser agent depends on system Chromium availability"],
      strengths: ["Graceful degradation pattern — 200 with configured:false instead of 503", "Credential vault encrypted at rest", "Integration catalog read-only — cannot corrupt connector state"],
      resilienceNotes: "Lowest resilience system. Primary improvement area: proactive credential monitoring.",
    },
  ];
}

export function computeCompositeResilienceScore(profile: ResilienceProfile): number {
  return Math.round((
    profile.robustnessScore            * 0.25 +
    profile.redundancyScore            * 0.20 +
    profile.faultToleranceScore        * 0.20 +
    profile.recoveryCapacityScore      * 0.20 +
    profile.operationalResilienceScore * 0.15
  ) * 1000) / 1000;
}

export function getLowResilienceSystems(profiles: ResilienceProfile[]): ResilienceProfile[] {
  return profiles.filter(p => p.resilienceLevel === "low" || p.resilienceLevel === "critical");
}

export function getSystemsWithSinglePointsOfFailure(profiles: ResilienceProfile[]): ResilienceProfile[] {
  return profiles.filter(p => p.singlePointsOfFailure > 1);
}

export function getPlatformResilienceScore(profiles: ResilienceProfile[]): number {
  if (profiles.length === 0) return 0;
  return Math.round(
    profiles.reduce((sum, p) => sum + p.compositeResilienceScore, 0) / profiles.length * 1000
  ) / 1000;
}
