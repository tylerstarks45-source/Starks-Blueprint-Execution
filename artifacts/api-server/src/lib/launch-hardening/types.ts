// ── Launch Hardening Framework — Types & Audit Findings Catalog ─────────────
// Build 045A: converts the Principal Architect Audit (Builds 001–045) into a
// structured engineering backlog. The audit is immutable — these records are
// the authoritative source of truth for all remediation work.
// ────────────────────────────────────────────────────────────────────────────

export type FindingSeverity        = "critical" | "high" | "medium" | "low";
export type FindingPriority        = "BLOCKER" | "PRE_LAUNCH" | "POST_LAUNCH" | "OBSERVATION";
export type FindingStatus          = "open" | "in_progress" | "fixed" | "verified" | "deferred" | "accepted_risk";
export type RemediationStatus      = "planned" | "in_progress" | "completed" | "abandoned";
export type VerificationResult     = "pass" | "fail" | "partial";
export type VerificationMethod     = "typecheck" | "test" | "manual" | "review" | "automated";
export type RegressionRisk         = "low" | "medium" | "high" | "critical";
export type LaunchStatus           = "NOT_READY" | "CONDITIONAL" | "READY" | "LAUNCH_AUTHORIZED";
export type ImplementationComplexity = "trivial" | "low" | "medium" | "high";
export type FindingCategory        = "security" | "correctness" | "performance" | "observability" | "api" | "architecture" | "scalability";

export interface AuditFinding {
  code:              string;
  severity:          FindingSeverity;
  title:             string;
  whyItMatters:      string;
  buildIntroduced:   string;
  affectedFiles:     string[];
  recommendedSolution: string;
  complexity:        ImplementationComplexity;
  fixBeforeLaunch:   boolean;
  category:          FindingCategory;
  auditSection:      string;
}

export interface ClassifiedFinding extends AuditFinding {
  priority:   FindingPriority;
  status:     FindingStatus;
  dependsOn:  string[];
}

export interface RemediationRecord {
  id:                  number;
  findingCode:         string;
  planDescription:     string;
  estimatedComplexity: string;
  dependsOn:           string[];
  buildNumber:         string | null;
  author:              string | null;
  status:              RemediationStatus;
  completedAt:         Date | null;
  createdAt:           Date;
}

export interface VerificationRecord {
  id:                 number;
  remediationId:      number;
  findingCode:        string;
  verificationMethod: VerificationMethod;
  verificationResult: VerificationResult;
  verifiedBy:         string;
  verificationNotes:  string | null;
  verifiedAt:         Date;
}

export interface RegressionRecord {
  id:                 number;
  remediationId:      number;
  findingCode:        string;
  impactedSubsystems: string[];
  regressionRisk:     RegressionRisk;
  regressionNotes:    string | null;
  reviewedBy:         string | null;
  approved:           boolean;
}

export interface LaunchReadinessResult {
  totalFindings:       number;
  criticalOpen:        number;
  highOpen:            number;
  mediumOpen:          number;
  lowOpen:             number;
  blockersRemaining:   number;
  prelaunchRemaining:  number;
  verifiedFixed:       number;
  deferredCount:       number;
  acceptedRiskCount:   number;
  launchConfidence:    number;   // 0–100
  launchStatus:        LaunchStatus;
  blockerDetails:      ClassifiedFinding[];
  highRegressionItems: RegressionRecord[];
  unverifiedFixed:     string[];
}

export interface HardeningSummary {
  totalFindings:      number;
  blockersRemaining:  number;
  prelaunchRemaining: number;
  verifiedFixed:      number;
  launchConfidence:   number;
  launchStatus:       LaunchStatus;
  lastSnapshotAt:     Date | null;
  criticalOpen:       number;
  highOpen:           number;
}

// ── Dependency Map ─────────────────────────────────────────────────────────
// Explicit remediation ordering constraints derived from the audit.
// Key = finding that depends on values being fixed first.
export const DEPENDENCY_MAP: Record<string, string[]> = {
  "A-01": ["C-02"],           // parallelize EB LLM calls only after fatal path guards added
  "H-03": ["A-01"],           // EB token budget after EB LLM call optimization
  "H-02": ["H-01"],           // bigserial migration same session as index work (schema touch)
  "M-01": ["C-02", "A-01"],   // EB sequential waterfall optimization after critical path fixes
  "M-13": ["C-02"],           // fire-and-forget error handling alongside fatal path work
  "L-08": ["M-04"],           // EP initialization test after input validation hardening
};

// ── Subsystem impact map ───────────────────────────────────────────────────
// Which platform subsystems are affected if a given finding is fixed incorrectly.
export const REGRESSION_SUBSYSTEMS: Record<string, string[]> = {
  "C-01": ["knowledge-graph", "cognitive-foundation"],
  "C-02": ["executive-brain"],
  "C-03": ["all-api-routes"],
  "C-04": ["auth", "all-api-routes"],
  "H-01": ["database", "all-engines"],
  "H-02": ["database", "all-engines"],
  "H-03": ["executive-brain", "ai-orchestration"],
  "H-04": ["all-api-routes"],
  "H-05": ["system-instances"],
  "H-06": ["ai-orchestration"],
  "H-07": ["certification"],
  "H-08": ["certification"],
  "H-09": ["executive-brain"],
  "A-01": ["executive-brain", "ai-orchestration"],
  "M-01": ["executive-brain"],
  "M-02": ["all-api-routes"],
  "M-03": ["all-api-routes", "ai-orchestration"],
  "M-04": ["connections-hub", "certification", "digital-operating-layer"],
  "M-05": ["scheduler"],
  "M-06": ["scheduler", "runtime-worker", "executive-brain"],
  "M-07": ["business-intelligence"],
  "M-08": ["runtime-worker"],
  "M-09": ["knowledge-graph"],
  "M-10": ["system-instances"],
  "M-11": ["api-routes"],
  "M-12": ["connections-hub", "certification"],
  "M-13": ["executive-brain"],
  "M-14": ["connections-hub"],
  "A-02": ["cognitive-foundation"],
  "A-03": ["digital-operating-layer"],
  "A-04": ["planning-engine", "executive-brain"],
  "L-01": ["businesses", "system-instances"],
  "L-02": ["cognitive-foundation"],
  "L-03": ["cognitive-foundation"],
  "L-04": ["database", "all-api-routes"],
  "L-05": ["scheduler"],
  "L-06": ["audit-trail"],
  "L-07": ["health-monitoring"],
  "L-08": ["cognitive-foundation", "certification"],
};

// ── Canonical Audit Findings (43 total) ───────────────────────────────────
// Source: Principal Architect Audit, Builds 001–045, August 2, 2026.
// This array is IMMUTABLE. Never modify existing entries.
// To add new findings from future audits, append new entries.
export const AUDIT_FINDINGS: AuditFinding[] = [
  // ── CRITICAL (4) ────────────────────────────────────────────────────────
  {
    code: "C-01",
    severity: "critical",
    title: "SQL Injection via sql.raw String Concatenation",
    whyItMatters: "A single exploitable path to raw SQL execution is a critical vulnerability. The Knowledge Graph is reachable from authenticated user sessions.",
    buildIntroduced: "Build 005",
    affectedFiles: ["artifacts/api-server/src/lib/cognitive-foundation/artifact-graph.ts"],
    recommendedSolution: "Replace sql.raw concatenation with parameterized sql.join(ids.map(id => sql`${id}`)) pattern already used two lines below.",
    complexity: "trivial",
    fixBeforeLaunch: true,
    category: "security",
    auditSection: "Part 1 — Critical",
  },
  {
    code: "C-02",
    severity: "critical",
    title: "Executive Brain Fatal Path: 4 Unguarded Awaits",
    whyItMatters: "A transient DB timeout causes full EB cycle failure and degrades every active user's AI experience simultaneously.",
    buildIntroduced: "Builds 001–003",
    affectedFiles: ["artifacts/api-server/src/lib/executive-brain/index.ts"],
    recommendedSolution: "Wrap resolveActiveProject, resolveGoalForRequest, planTasks, and updateProjectRollup in individual try/catch with fail-open behavior.",
    complexity: "low",
    fixBeforeLaunch: true,
    category: "correctness",
    auditSection: "Part 1 — Critical",
  },
  {
    code: "C-03",
    severity: "critical",
    title: "Permissive CORS: All Origins Accepted",
    whyItMatters: "Every API endpoint is reachable from a malicious cross-origin page if the user has an active session in the same browser.",
    buildIntroduced: "Platform-level (app.ts)",
    affectedFiles: ["artifacts/api-server/src/app.ts"],
    recommendedSolution: "Restrict cors() to known origins: production domain, *.replit.dev for dev preview. Add credentials: true.",
    complexity: "low",
    fixBeforeLaunch: true,
    category: "security",
    auditSection: "Part 1 — Critical",
  },
  {
    code: "C-04",
    severity: "critical",
    title: "No JWT Revocation: Suspended Users Retain Valid Tokens for 7 Days",
    whyItMatters: "Deleted accounts remain cryptographically valid for up to 7 days. Any route that only validates JWT signature (not requireAuthActive DB check) will accept these tokens.",
    buildIntroduced: "Auth layer (pre-Build 001)",
    affectedFiles: ["artifacts/api-server/src/routes/auth.ts", "artifacts/api-server/src/lib/auth.ts"],
    recommendedSolution: "Add deletion check to requireAuthActive (WHERE active = true AND deleted_at IS NULL). Long-term: short-lived tokens + refresh token rotation.",
    complexity: "medium",
    fixBeforeLaunch: true,
    category: "security",
    auditSection: "Part 1 — Critical",
  },

  // ── HIGH (10 = H-01..H-09 + A-01) ───────────────────────────────────────
  {
    code: "H-01",
    severity: "high",
    title: "36+ Late-Build Tables Have Zero Secondary Indexes",
    whyItMatters: "Sequential scans on append-only tables become unacceptable at 100k+ rows. Certification, connections_hub, digital_operating, authority_resolution tables have no indexes.",
    buildIntroduced: "Builds 025–045",
    affectedFiles: [
      "lib/db/src/schema/certification.ts",
      "lib/db/src/schema/connections_hub.ts",
      "lib/db/src/schema/digital_operating.ts",
      "lib/db/src/schema/authority_resolution.ts",
    ],
    recommendedSolution: "Add composite indexes on all FK columns that appear in WHERE clauses. Use CREATE INDEX CONCURRENTLY in production for zero-downtime.",
    complexity: "low",
    fixBeforeLaunch: true,
    category: "performance",
    auditSection: "Part 2 — High",
  },
  {
    code: "H-02",
    severity: "high",
    title: "All 212 Serial Primary Keys Are INT32 (Will Overflow at ~2.1B Rows)",
    whyItMatters: "Migrating a live production table from int4 to int8 requires a full table rewrite. The cost grows exponentially post-launch.",
    buildIntroduced: "Platform-level — all builds",
    affectedFiles: ["lib/db/src/schema/*.ts (all 100+ schema files)"],
    recommendedSolution: "Change serial to bigserial in all schema files. Wire-compatible with existing clients.",
    complexity: "medium",
    fixBeforeLaunch: false,
    category: "scalability",
    auditSection: "Part 2 — High",
  },
  {
    code: "H-03",
    severity: "high",
    title: "EB Context Note Has No Aggregate Token Budget Guard",
    whyItMatters: "48 advisory blocks × avg 500 chars = ~24,000 chars (~6,000–8,000 tokens) per cycle. No aggregate check exists. Grows unboundedly with each new build.",
    buildIntroduced: "Build 001 + all subsequent advisory integrations",
    affectedFiles: ["artifacts/api-server/src/lib/executive-brain/index.ts"],
    recommendedSolution: "Add post-assembly length check in buildContextNote. If total exceeds 12,000 chars, drop least-relevant advisories by priority ranking.",
    complexity: "medium",
    fixBeforeLaunch: true,
    category: "performance",
    auditSection: "Part 2 — High",
  },
  {
    code: "H-04",
    severity: "high",
    title: "Error Messages Leaked to Clients in 500 Responses",
    whyItMatters: "Internal error details aid attackers in mapping the DB schema, identifying library versions with known CVEs, and crafting targeted attacks.",
    buildIntroduced: "Builds 016–045",
    affectedFiles: [
      "artifacts/api-server/src/routes/business-analysis.ts",
      "artifacts/api-server/src/routes/connections-hub.ts",
      "artifacts/api-server/src/routes/certification.ts",
    ],
    recommendedSolution: "Return generic { error: 'An internal error occurred. Request ID: <req.id>' } and log the full error server-side.",
    complexity: "low",
    fixBeforeLaunch: true,
    category: "security",
    auditSection: "Part 2 — High",
  },
  {
    code: "H-05",
    severity: "high",
    title: "GET /system-health/recent Returns Platform-Wide Health to Any Authenticated User",
    whyItMatters: "Any user with a valid session can read health status, error rates, and operational metadata for other users' system instances.",
    buildIntroduced: "Business monitoring (pre-B016)",
    affectedFiles: ["artifacts/api-server/src/routes/system-instances.ts"],
    recommendedSolution: "Add WHERE user_id = req.user.id filter to the query backing GET /system-health/recent.",
    complexity: "trivial",
    fixBeforeLaunch: true,
    category: "security",
    auditSection: "Part 2 — High",
  },
  {
    code: "H-06",
    severity: "high",
    title: "No File Upload MIME Type Validation on Audio Uploads",
    whyItMatters: "Accepting arbitrary binary blobs into memory before validation wastes memory and can be used for DoS. Downstream processing of non-audio files may have exploitable behavior.",
    buildIntroduced: "ASH Browser/Media (post-B001)",
    affectedFiles: ["artifacts/api-server/src/routes/ai-orchestrator.ts"],
    recommendedSolution: "Add fileFilter to multer config to only accept audio/* MIME types before buffering.",
    complexity: "trivial",
    fixBeforeLaunch: true,
    category: "security",
    auditSection: "Part 2 — High",
  },
  {
    code: "H-07",
    severity: "high",
    title: "EXPECTED_EP_COUNT = 326 Is a Hardcoded Constant That Will Drift",
    whyItMatters: "As the platform evolves, this constant must be manually updated or the certification will permanently report the wrong completeness status.",
    buildIntroduced: "Build 045",
    affectedFiles: ["artifacts/api-server/src/lib/certification/types.ts"],
    recommendedSolution: "Rename to MINIMUM_EP_COUNT, document that it is a floor not an exact target, and add a version manifest per build.",
    complexity: "low",
    fixBeforeLaunch: true,
    category: "architecture",
    auditSection: "Part 2 — High",
  },
  {
    code: "H-08",
    severity: "high",
    title: "Table Name String Interpolation in Certification Engines (Pattern Risk)",
    whyItMatters: "The sql.raw pattern for dynamic identifiers sets a dangerous precedent. A future developer accepting table names from API input will trivially produce SQL injection.",
    buildIntroduced: "Build 045",
    affectedFiles: [
      "artifacts/api-server/src/lib/certification/cert-law-engine.ts",
      "artifacts/api-server/src/lib/certification/cert-validation-engine.ts",
      "artifacts/api-server/src/lib/certification/cert-health-engine.ts",
    ],
    recommendedSolution: "Replace string-interpolated table names with sql.identifier(tableName) in all db.execute() calls.",
    complexity: "trivial",
    fixBeforeLaunch: true,
    category: "security",
    auditSection: "Part 2 — High",
  },
  {
    code: "H-09",
    severity: "high",
    title: "Inline import() for Two EB Summary Types",
    whyItMatters: "Inline type imports are inconsistent with all 42 other summary variables and create risk if a code generator promotes them to runtime dynamic imports.",
    buildIntroduced: "Builds 038–039 EB integration",
    affectedFiles: ["artifacts/api-server/src/lib/executive-brain/index.ts"],
    recommendedSolution: "Add import type for PortfolioIntelligenceSummary and PriorityIntelligenceSummary at the top-level import section.",
    complexity: "trivial",
    fixBeforeLaunch: true,
    category: "correctness",
    auditSection: "Part 2 — High",
  },
  {
    code: "A-01",
    severity: "high",
    title: "Blocking LLM Calls on the Main EB Request Path",
    whyItMatters: "3 sequential blocking LLM round-trips (300ms–3s each) before any engine summaries are fetched. A slow LLM response delays every user on the platform simultaneously.",
    buildIntroduced: "Build 001",
    affectedFiles: [
      "artifacts/api-server/src/lib/executive-brain/project-manager.ts",
      "artifacts/api-server/src/lib/executive-brain/goal-manager.ts",
      "artifacts/api-server/src/lib/executive-brain/task-planner.ts",
    ],
    recommendedSolution: "Move these LLM calls to an async pre-warm pattern — trigger concurrently with the first wave of engine summary fetches, await only before context note assembly.",
    complexity: "medium",
    fixBeforeLaunch: true,
    category: "performance",
    auditSection: "Addendum",
  },

  // ── MEDIUM (16 = M-01..M-14 + A-02..A-03) ───────────────────────────────
  {
    code: "M-01",
    severity: "medium",
    title: "EB Cycle: 44-Fetch Sequential Waterfall",
    whyItMatters: "The 8 core fetches before the parallel engine wave run as strict sequential awaits. Total EB latency = sum of all sequential blocks, potentially 500ms–2s under DB load.",
    buildIntroduced: "Builds 001–045 (accumulated)",
    affectedFiles: ["artifacts/api-server/src/lib/executive-brain/index.ts"],
    recommendedSolution: "Group independent early fetches (Goals, Plans, Executions) into Promise.all batches. Only resolveActiveProject blocks resolveGoalForRequest.",
    complexity: "medium",
    fixBeforeLaunch: false,
    category: "performance",
    auditSection: "Part 3 — Medium",
  },
  {
    code: "M-02",
    severity: "medium",
    title: "No Pagination on Several High-Volume List Endpoints",
    whyItMatters: "Unbounded endpoints silently truncate results with no indication to the caller. Hardcoded LIMIT 100 means callers cannot page through results.",
    buildIntroduced: "Builds 016–045",
    affectedFiles: [
      "artifacts/api-server/src/routes/business-analysis.ts",
      "artifacts/api-server/src/routes/connections-hub.ts",
      "artifacts/api-server/src/routes/certification.ts",
      "artifacts/api-server/src/routes/businesses.ts",
    ],
    recommendedSolution: "Add ?limit=50&cursor=<last_id> cursor-based pagination to all list endpoints. Return { data, nextCursor, total } shape.",
    complexity: "low",
    fixBeforeLaunch: false,
    category: "api",
    auditSection: "Part 3 — Medium",
  },
  {
    code: "M-03",
    severity: "medium",
    title: "No Rate Limiting Beyond Auth Endpoints",
    whyItMatters: "AI orchestration and certification run endpoints are expensive operations. Rapid fire without rate limiting creates a cost-amplification attack surface.",
    buildIntroduced: "Platform-level",
    affectedFiles: ["artifacts/api-server/src/routes/ai-orchestrator.ts", "artifacts/api-server/src/routes/certification.ts"],
    recommendedSolution: "Add per-user rate limiter (200 req/min) after requireAuthActive. Stricter limit (20 req/min) on AI orchestration and certification run endpoints.",
    complexity: "low",
    fixBeforeLaunch: true,
    category: "security",
    auditSection: "Part 3 — Medium",
  },
  {
    code: "M-04",
    severity: "medium",
    title: "Missing Input Validation (Raw req.body) in Build 044–045 Routes",
    whyItMatters: "Without Zod validation, malformed inputs reach engine functions. Unexpected field types can cause silent data corruption in JSONB columns.",
    buildIntroduced: "Builds 044–045",
    affectedFiles: [
      "artifacts/api-server/src/routes/connections-hub.ts",
      "artifacts/api-server/src/routes/certification.ts",
      "artifacts/api-server/src/routes/digital-operating-layer.ts",
    ],
    recommendedSolution: "Define z.object schema for every POST body. Use .safeParse(req.body) and return 400 with structured errors on failure.",
    complexity: "low",
    fixBeforeLaunch: true,
    category: "correctness",
    auditSection: "Part 3 — Medium",
  },
  {
    code: "M-05",
    severity: "medium",
    title: "Scheduler Does Not Log Cycle Count or Elapsed Time",
    whyItMatters: "Without cycle timing data, scheduler degradation is invisible until users notice problems. EB throttle decisions become meaningless if the scheduler is degrading.",
    buildIntroduced: "Runtime (pre-B001)",
    affectedFiles: ["artifacts/api-server/src/lib/runtime/scheduler.ts"],
    recommendedSolution: "Add cycle counter and Date.now() diff around scheduler loop. Log at info every 10 cycles, warn if cycle exceeds 5s threshold.",
    complexity: "low",
    fixBeforeLaunch: false,
    category: "observability",
    auditSection: "Part 3 — Medium",
  },
  {
    code: "M-06",
    severity: "medium",
    title: "No Correlation ID Propagation to Background Workers",
    whyItMatters: "Debugging a failed AI build requires correlating the HTTP request, job created, worker execution, and EB cycles — impossible without a shared correlation ID.",
    buildIntroduced: "Platform-level",
    affectedFiles: [
      "artifacts/api-server/src/lib/runtime/worker.ts",
      "artifacts/api-server/src/lib/runtime/scheduler.ts",
      "artifacts/api-server/src/lib/executive-brain/index.ts",
    ],
    recommendedSolution: "Pass correlationId (HTTP request ID or UUID) through runJob → executeJob → sub-engine chain. Include in every log line within execution context.",
    complexity: "medium",
    fixBeforeLaunch: false,
    category: "observability",
    auditSection: "Part 3 — Medium",
  },
  {
    code: "M-07",
    severity: "medium",
    title: "Silent Startup Failure: backfillBuiltBusinesses",
    whyItMatters: "Server starts successfully but with missing data — no log entry indicates the problem. Silent startup failures are the hardest category of production issues to debug.",
    buildIntroduced: "Business Intelligence (post-B016)",
    affectedFiles: ["artifacts/api-server/src/index.ts"],
    recommendedSolution: "Replace .catch(() => {}) with .catch((err) => logger.error({ err }, 'backfillBuiltBusinesses failed')).",
    complexity: "trivial",
    fixBeforeLaunch: true,
    category: "correctness",
    auditSection: "Part 3 — Medium",
  },
  {
    code: "M-08",
    severity: "medium",
    title: "Silent Decryption Errors in Runtime Job Worker",
    whyItMatters: "A job runs with missing credentials, failing with a cryptic downstream error. Users cannot know their credentials need to be re-entered.",
    buildIntroduced: "Runtime (pre-B001)",
    affectedFiles: ["artifacts/api-server/src/lib/runtime/worker.ts"],
    recommendedSolution: "Log at warn level with credential key name (not value) when decryption fails. Surface as job failure with failReason: 'credential_decryption_failed'.",
    complexity: "low",
    fixBeforeLaunch: true,
    category: "correctness",
    auditSection: "Part 3 — Medium",
  },
  {
    code: "M-09",
    severity: "medium",
    title: "Knowledge Graph BFS Depth Hardcoded at 4",
    whyItMatters: "In a 24-domain graph, depth 4 may cut off valid reasoning paths between distant but related concepts.",
    buildIntroduced: "Build 005",
    affectedFiles: ["artifacts/api-server/src/lib/knowledge-graph/kg-traversal-engine.ts"],
    recommendedSolution: "Expose MAX_DEFAULT_DEPTH as a documented configuration constant. Increase to 6 for unified-graph traversals. Add query-level override parameter.",
    complexity: "low",
    fixBeforeLaunch: false,
    category: "architecture",
    auditSection: "Part 3 — Medium",
  },
  {
    code: "M-10",
    severity: "medium",
    title: "POST /system-instances/revenue-batch Uses POST Semantics for a Read Operation",
    whyItMatters: "POST responses are not cached. Monitoring tools flag this as a write operation. API gateways and load balancers treat POST differently from GET.",
    buildIntroduced: "System Instances (pre-B016)",
    affectedFiles: ["artifacts/api-server/src/routes/system-instances.ts"],
    recommendedSolution: "Accept comma-delimited ids query parameter on a GET endpoint, or implement a proper batching layer.",
    complexity: "medium",
    fixBeforeLaunch: false,
    category: "api",
    auditSection: "Part 3 — Medium",
  },
  {
    code: "M-11",
    severity: "medium",
    title: "Route Registration Order Dependency (businessIntelligenceRouter before businessesRouter)",
    whyItMatters: "Any developer reorganizing route registration without knowing this constraint will break GET /businesses/cross-business-summary silently.",
    buildIntroduced: "Build 016",
    affectedFiles: ["artifacts/api-server/src/routes/index.ts"],
    recommendedSolution: "Rename /businesses/cross-business-summary to /businesses/summary/cross-business to eliminate the path conflict.",
    complexity: "low",
    fixBeforeLaunch: true,
    category: "correctness",
    auditSection: "Part 3 — Medium",
  },
  {
    code: "M-12",
    severity: "medium",
    title: "OpenAPI Contract Not Enforced for Build 044–045 Endpoints",
    whyItMatters: "Frontend must manually construct fetch calls without type safety. Zod may silently drop fields from hub and certification responses.",
    buildIntroduced: "Builds 044–045",
    affectedFiles: [
      "artifacts/api-server/src/routes/connections-hub.ts",
      "artifacts/api-server/src/routes/certification.ts",
      "openapi.yaml",
    ],
    recommendedSolution: "Add OpenAPI paths for all Build 044–045 endpoints. Regenerate Zod schemas. Verify responses match defined shapes.",
    complexity: "medium",
    fixBeforeLaunch: true,
    category: "api",
    auditSection: "Part 3 — Medium",
  },
  {
    code: "M-13",
    severity: "medium",
    title: "Fire-and-Forget Triggers Have No Error Visibility",
    whyItMatters: "Nine fire-and-forget operations have no error handling. An unhandled rejection reaching the process-level handler can crash Node.js in some configurations.",
    buildIntroduced: "Builds 004–044",
    affectedFiles: ["artifacts/api-server/src/lib/executive-brain/index.ts"],
    recommendedSolution: "Wrap each fire-and-forget in .catch(err => logger.warn({ err }, 'trigger failed (non-critical)')).",
    complexity: "low",
    fixBeforeLaunch: true,
    category: "correctness",
    auditSection: "Part 3 — Medium",
  },
  {
    code: "M-14",
    severity: "medium",
    title: "Connections Hub Credential Security: Ambiguous Architecture",
    whyItMatters: "The Hub's 'references only' credential model must be verified — if any JSONB column ever stores a credential value, it bypasses AES-256-GCM encryption.",
    buildIntroduced: "Build 044",
    affectedFiles: ["artifacts/api-server/src/lib/connections-hub/"],
    recommendedSolution: "Audit every INSERT/UPDATE to connections_hub schema tables. Add explicit comment in each engine file stating no credential values are written.",
    complexity: "low",
    fixBeforeLaunch: true,
    category: "security",
    auditSection: "Part 3 — Medium",
  },
  {
    code: "A-02",
    severity: "medium",
    title: "264 of 326 Extension Points (81%) Have No Registered Extensions",
    whyItMatters: "The EP count is currently more aspirational than operational. The certification completeness check verifies declaration, not usage.",
    buildIntroduced: "Builds 001–045 (accumulated)",
    affectedFiles: ["artifacts/api-server/src/lib/cognitive-foundation/extension-points.ts"],
    recommendedSolution: "Distinguish 'declared' from 'active' EPs in certification. Add coverage metric: active_eps/total_eps. Document that most EPs are future seams.",
    complexity: "low",
    fixBeforeLaunch: false,
    category: "architecture",
    auditSection: "Addendum",
  },
  {
    code: "A-03",
    severity: "medium",
    title: "DOL expireStaleSessionsLocal() Is Dead Code — Never Called",
    whyItMatters: "Active DOL sessions accumulate indefinitely. The DOL health checks may read stale 'active' sessions as current operational state.",
    buildIntroduced: "Build 043",
    affectedFiles: ["artifacts/api-server/src/lib/digital-operating-layer/dol-session-engine.ts"],
    recommendedSolution: "Wire expireStaleSessionsLocal() into the scheduler as a periodic maintenance task (every 5 minutes).",
    complexity: "low",
    fixBeforeLaunch: true,
    category: "correctness",
    auditSection: "Addendum",
  },

  // ── LOW (9 = L-01..L-08 + A-04) ─────────────────────────────────────────
  {
    code: "L-01",
    severity: "low",
    title: "No Soft-Delete Pattern on High-Value Mutable Tables",
    whyItMatters: "Once a business, system instance, or user is deleted, it is unrecoverable at the application layer.",
    buildIntroduced: "Platform-level",
    affectedFiles: ["lib/db/src/schema/businesses.ts", "lib/db/src/schema/users.ts"],
    recommendedSolution: "Add deleted_at column to businesses, system_instances, and users. Replace DELETE with UPDATE SET deleted_at = NOW().",
    complexity: "medium",
    fixBeforeLaunch: false,
    category: "architecture",
    auditSection: "Part 4 — Low",
  },
  {
    code: "L-02",
    severity: "low",
    title: "Extension Points Have No Consumption Tracking",
    whyItMatters: "No mechanism tracks which EPs have ever had extensions registered, or which are being consumed in an active orchestration cycle.",
    buildIntroduced: "Build 001 + all subsequent builds",
    affectedFiles: ["artifacts/api-server/src/lib/cognitive-foundation/extension-points.ts"],
    recommendedSolution: "Add lastConsumedAt timestamp to EP registry, updated whenever getExtension() is called. Surface 'never consumed' EPs as certification warning.",
    complexity: "low",
    fixBeforeLaunch: false,
    category: "architecture",
    auditSection: "Part 4 — Low",
  },
  {
    code: "L-03",
    severity: "low",
    title: "declaredBy Field in Late-Build EPs Is Always 'cognitive-foundation'",
    whyItMatters: "The declaredBy field was intended to identify the owning subsystem but is uniformly set to the umbrella label, making it meaningless as documentation.",
    buildIntroduced: "All builds using declare*ExtensionPoints() pattern",
    affectedFiles: ["artifacts/api-server/src/lib/ (all *-extension-points.ts files)"],
    recommendedSolution: "Set declaredBy to the actual owning subsystem in each extension point declaration.",
    complexity: "low",
    fixBeforeLaunch: false,
    category: "architecture",
    auditSection: "Part 4 — Low",
  },
  {
    code: "L-04",
    severity: "low",
    title: "No Multi-Tenant DB-Level Row Isolation (RLS)",
    whyItMatters: "Data isolation is enforced entirely at the application layer. A single missed WHERE clause leaks cross-user data — already found in H-05.",
    buildIntroduced: "Platform-level",
    affectedFiles: ["lib/db/src/schema/ (all tables with user_id column)"],
    recommendedSolution: "Implement PostgreSQL RLS policies for highest-sensitivity tables: businesses, system_instances, user_credentials, build_sessions.",
    complexity: "high",
    fixBeforeLaunch: false,
    category: "security",
    auditSection: "Part 4 — Low",
  },
  {
    code: "L-05",
    severity: "low",
    title: "Scheduler Max Retry Attempts Not Configurable Per Task Type",
    whyItMatters: "MAX_TASK_ATTEMPTS = 5 is platform-wide. Webhook delivery benefits from 10+ retries; one-time migrations should fail hard after 1.",
    buildIntroduced: "Runtime",
    affectedFiles: ["artifacts/api-server/src/lib/runtime/scheduler.ts"],
    recommendedSolution: "Add optional maxAttempts field to scheduled task schema, falling back to platform default.",
    complexity: "low",
    fixBeforeLaunch: false,
    category: "architecture",
    auditSection: "Part 4 — Low",
  },
  {
    code: "L-06",
    severity: "low",
    title: "Audit Trail Coverage Is Inconsistent",
    whyItMatters: "The audit_trail table exists but credential updates and admin role changes may not produce entries.",
    buildIntroduced: "Pre-B001",
    affectedFiles: ["lib/db/src/schema/audit_trail.ts"],
    recommendedSolution: "Define 'always-audited' operations and add middleware/service call to lib/audit.ts for credential updates and admin role changes.",
    complexity: "medium",
    fixBeforeLaunch: false,
    category: "correctness",
    auditSection: "Part 4 — Low",
  },
  {
    code: "L-07",
    severity: "low",
    title: "No Structured /healthz Beyond { status: 'ok' }",
    whyItMatters: "A meaningful healthz is a deployment prerequisite for load balancers and uptime monitors. Current endpoint cannot surface DB connectivity failures.",
    buildIntroduced: "Pre-B001",
    affectedFiles: ["artifacts/api-server/src/routes/health.ts"],
    recommendedSolution: "Expand /healthz to include DB ping latency, scheduler last cycle time, queue depth. Return HTTP 503 if any critical dependency is down.",
    complexity: "low",
    fixBeforeLaunch: true,
    category: "observability",
    auditSection: "Part 4 — Low",
  },
  {
    code: "L-08",
    severity: "low",
    title: "No Integration Test for EP Initialization Count",
    whyItMatters: "The EP declaration order in cognitive-foundation/index.ts is brittle. A regression could produce a different EP count without any compile-time error.",
    buildIntroduced: "Builds 001–045 (cumulative)",
    affectedFiles: ["artifacts/api-server/src/lib/cognitive-foundation/index.ts"],
    recommendedSolution: "Add an integration test that calls initializeCognitiveFoundation() and asserts listExtensionPoints().length >= MINIMUM_EP_COUNT.",
    complexity: "low",
    fixBeforeLaunch: false,
    category: "correctness",
    auditSection: "Part 4 — Low",
  },
  {
    code: "A-04",
    severity: "low",
    title: "Validation Engine Cross-Engine Write to ash_tasks",
    whyItMatters: "The planning validation engine directly writes ash_tasks.status = 'blocked', bypassing the owning engine's update logic and potentially conflicting with concurrent EB task planner updates.",
    buildIntroduced: "Planning Engine",
    affectedFiles: ["artifacts/api-server/src/lib/planning-engine/validation-engine/rules/"],
    recommendedSolution: "Emit a validation result event that the Planning Engine's task manager consumes, rather than writing directly to ash_tasks.",
    complexity: "medium",
    fixBeforeLaunch: false,
    category: "architecture",
    auditSection: "Addendum",
  },
];

// Computed stats for convenience
export const FINDING_STATS = {
  total:    AUDIT_FINDINGS.length,
  critical: AUDIT_FINDINGS.filter(f => f.severity === "critical").length,
  high:     AUDIT_FINDINGS.filter(f => f.severity === "high").length,
  medium:   AUDIT_FINDINGS.filter(f => f.severity === "medium").length,
  low:      AUDIT_FINDINGS.filter(f => f.severity === "low").length,
  prelaunch:   AUDIT_FINDINGS.filter(f => f.fixBeforeLaunch).length,
  postlaunch:  AUDIT_FINDINGS.filter(f => !f.fixBeforeLaunch).length,
};

export const LH_EP_IDS = {
  FINDING_CLASSIFICATION: "hardening.finding.classification",
  PRIORITY_ASSESSMENT:    "hardening.priority.assessment",
  DEPENDENCY_RESOLUTION:  "hardening.dependency.resolution",
  VERIFICATION_EXECUTION: "hardening.verification.execution",
  REGRESSION_ANALYSIS:    "hardening.regression.analysis",
  LAUNCH_READINESS:       "hardening.launch.readiness",
  ADVISORY_GENERATION:    "hardening.advisory.generation",
  SNAPSHOT_CREATION:      "hardening.snapshot.creation",
} as const;

export const LH_THROTTLE_CYCLES = 330; // Build 045A EB throttle cycle
