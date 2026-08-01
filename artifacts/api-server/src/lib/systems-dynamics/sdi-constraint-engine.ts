// ── SDI Constraint Intelligence Engine ───────────────────────────────────
// Identifies primary and secondary constraints across execution, technology,
// business, infrastructure, human, regulatory, and financial domains.
// Pure computation — no I/O.

import type { ConstraintProfile } from "./types";

export function getConstraintCatalog(): ConstraintProfile[] {
  return [
    // ── Execution constraints ─────────────────────────────────────────────
    {
      systemKey: "execution-system",
      constraintKey: "runtime-worker-throughput",
      constraintName: "Runtime Worker Single-Threaded Throughput",
      constraintType: "execution",
      severity: "high",
      severityScore: 0.82,
      description: "A single runtime worker polls for jobs sequentially, limiting concurrent execution throughput.",
      rootCause: "Single-process polling architecture without parallel workers.",
      downstreamImpact: "Under high load, job queue backs up; AI response latency increases; user experience degrades.",
      isPrimary: true,
      isActivelyManaged: true,
      resolutionPath: "Implement concurrent workers or priority queuing with worker pools.",
    },
    {
      systemKey: "execution-system",
      constraintKey: "openrouter-rate-limit",
      constraintName: "OpenRouter API Rate Limit",
      constraintType: "technology",
      severity: "medium",
      severityScore: 0.65,
      description: "OpenRouter imposes rate limits that constrain concurrent AI completions.",
      rootCause: "External API dependency with tier-based rate caps.",
      downstreamImpact: "Queued jobs may stall during burst periods; retries add latency.",
      isPrimary: false,
      isActivelyManaged: true,
      resolutionPath: "Implement credit-aware rate throttling and model fallback chains.",
    },
    {
      systemKey: "execution-system",
      constraintKey: "hung-job-recovery-delay",
      constraintName: "Hung Job Recovery Delay",
      constraintType: "execution",
      severity: "medium",
      severityScore: 0.60,
      description: "Jobs hung mid-run (server restart without graceful drain) wait up to 5 minutes before reclaimHungJobs() recovers them.",
      rootCause: "Periodic watchdog interval of 5 minutes by design.",
      downstreamImpact: "Users see 'pending' jobs for up to 5 minutes after a server restart.",
      isPrimary: false,
      isActivelyManaged: true,
      resolutionPath: "Shorten reclaim interval or implement graceful shutdown drain.",
    },

    // ── Technology constraints ─────────────────────────────────────────────
    {
      systemKey: "technology-system",
      constraintKey: "static-technology-catalog",
      constraintName: "Static 54-Technology Catalog",
      constraintType: "technology",
      severity: "low",
      severityScore: 0.38,
      description: "The technology catalog is hardcoded and requires code changes to add new technologies.",
      rootCause: "Deterministic catalog approach chosen for consistency over dynamic discovery.",
      downstreamImpact: "New technology entrants not tracked until catalog is manually updated.",
      isPrimary: false,
      isActivelyManaged: false,
      resolutionPath: "Add dynamic technology registration endpoint for admin-curated additions.",
    },

    // ── Infrastructure constraints ─────────────────────────────────────────
    {
      systemKey: "infrastructure-system",
      constraintKey: "single-region-deployment",
      constraintName: "Single-Region Deployment",
      constraintType: "infrastructure",
      severity: "medium",
      severityScore: 0.68,
      description: "Platform runs in a single Replit container region with no geographic distribution.",
      rootCause: "Replit managed hosting architecture.",
      downstreamImpact: "Regional outages affect all users; no latency optimization for distant users.",
      isPrimary: false,
      isActivelyManaged: false,
    },
    {
      systemKey: "infrastructure-system",
      constraintKey: "db-connection-pool-ceiling",
      constraintName: "Database Connection Pool Ceiling",
      constraintType: "infrastructure",
      severity: "medium",
      severityScore: 0.63,
      description: "PostgreSQL connection pool has a finite ceiling; exhaustion causes request queuing.",
      rootCause: "Default Postgres max_connections constraint.",
      downstreamImpact: "Under load spikes, requests queue; slow queries compound pool pressure.",
      isPrimary: false,
      isActivelyManaged: true,
      resolutionPath: "Monitor pool utilization; increase max_connections or add PgBouncer.",
    },

    // ── Business constraints ───────────────────────────────────────────────
    {
      systemKey: "business-system",
      constraintKey: "async-health-scoring-delay",
      constraintName: "Async Business Health Scoring Delay",
      constraintType: "business",
      severity: "low",
      severityScore: 0.42,
      description: "Business health scores are computed asynchronously; new businesses show no score until first job completes.",
      rootCause: "Job-based architecture for health scoring; designed for scalability.",
      downstreamImpact: "New users see empty health state immediately after business creation.",
      isPrimary: false,
      isActivelyManaged: true,
      resolutionPath: "Show 'analyzing' state with progress indicator; auto-trigger on creation.",
    },
    {
      systemKey: "business-system",
      constraintKey: "zero-data-empty-states",
      constraintName: "Zero-Data Empty State Coverage",
      constraintType: "business",
      severity: "low",
      severityScore: 0.40,
      description: "Some intelligence engines produce empty or misleading outputs when a business has no historical data.",
      rootCause: "Engines designed for data-rich environments; zero-data paths tested separately.",
      downstreamImpact: "Onboarding experience degrades when no historical business data is imported.",
      isPrimary: false,
      isActivelyManaged: true,
    },

    // ── Integration constraints ────────────────────────────────────────────
    {
      systemKey: "integration-system",
      constraintKey: "external-credential-volatility",
      constraintName: "External Credential Volatility",
      constraintType: "technology",
      severity: "medium",
      severityScore: 0.66,
      description: "OAuth tokens and API keys for third-party integrations expire or are revoked without notice.",
      rootCause: "External service policies outside platform control.",
      downstreamImpact: "Connectors silently fail; users do not know until they trigger a dependent feature.",
      isPrimary: false,
      isActivelyManaged: true,
      resolutionPath: "Implement proactive credential health-check endpoints; surface expiry warnings.",
    },

    // ── Human constraints ─────────────────────────────────────────────────
    {
      systemKey: "intelligence-system",
      constraintKey: "context-window-ceiling",
      constraintName: "LLM Context Window Ceiling",
      constraintType: "human",
      severity: "medium",
      severityScore: 0.70,
      description: "The EB context note is assembled from 35+ intelligence summaries; if uncapped, it exceeds LLM context windows.",
      rootCause: "LLM model context limits (varying by model and provider).",
      downstreamImpact: "Context truncation causes the model to lose later advisory sections.",
      isPrimary: true,
      isActivelyManaged: true,
      resolutionPath: "Each advisory clipped to ≤600 chars; total note bounded by model limit.",
    },
  ];
}

export function getPrimaryConstraints(constraints: ConstraintProfile[]): ConstraintProfile[] {
  return constraints.filter(c => c.isPrimary);
}

export function getCriticalConstraints(constraints: ConstraintProfile[]): ConstraintProfile[] {
  return constraints.filter(c => c.severity === "critical" || c.severityScore >= 0.80);
}

export function getConstraintsByType(constraints: ConstraintProfile[], type: string): ConstraintProfile[] {
  return constraints.filter(c => c.constraintType === type);
}

export function getUnmanagedConstraints(constraints: ConstraintProfile[]): ConstraintProfile[] {
  return constraints.filter(c => !c.isActivelyManaged && c.severityScore >= 0.50);
}
