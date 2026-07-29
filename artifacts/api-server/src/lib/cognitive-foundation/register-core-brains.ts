// ─── Core Brain registrations (Build 001) ───────────────────────────────────
//
// Registers the six Volume 1 (Core Cognitive Architecture) Brains with the
// Cognitive Foundation. Every entry below is grounded in that Brain's
// approved architecture chapter — capability ids, maturity values and
// implemented/partial/target statuses are transcribed from the chapters'
// Capability Contracts, not invented here. Future Brains (Volume 2+) add
// their own registration module; nothing here needs to change.
//
// Health probes are deliberately cheap (single-row DB reachability probes,
// config presence, in-process registry checks) — no external network calls,
// mirroring the heuristic health-monitor.ts philosophy for user systems.

import { sql } from "drizzle-orm";
import {
  db,
  ashProjectsTable,
  ashTasksTable,
  pendingApprovalsTable,
  userMemoryTable,
  ashKnowledgeEntriesTable,
  ashLessonsTable,
} from "@workspace/db";
import { ALL_VALIDATION_RULES } from "../planning-engine/validation-engine/rules";
import { listSearchProviders } from "../search-providers";
import { registerBrain } from "./brain-registry";
import type { BrainCapability, BrainHealthCheckResult, CapabilityStatus } from "./types";

const SPEC_ROOT = "docs/superpowers/specs/ash-brain-master-architecture-specification/volume-1-core-cognitive-architecture";

function cap(
  id: string,
  name: string,
  specSection: string,
  currentMaturity: string,
  targetMaturity: string,
  status: CapabilityStatus,
  description: string,
): BrainCapability {
  return { id, name, specSection, currentMaturity, targetMaturity, status, description };
}

/** Probe: can we read a single row (or empty result) from a table the Brain
 *  persists its state in? Confirms both DB connectivity and schema presence. */
async function probeTable(query: () => Promise<unknown>, label: string): Promise<BrainHealthCheckResult | null> {
  try {
    await query();
    return null; // reachable — no concern
  } catch (err) {
    return {
      state: "offline",
      message: `${label} unreachable: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function hasOpenRouterKey(): boolean {
  return Boolean(process.env["OPENROUTER_API_KEY"]);
}

// ─── Executive Brain (Chapter 1.1) ──────────────────────────────────────────

function executiveBrainDefinition() {
  return {
    name: "executive-brain",
    displayName: "Executive Brain",
    purpose:
      "Cognitive pre-pass in front of the AI Orchestrator: resolves which project/goal/tasks a request belongs to, persists that state, and forwards a plan context note downstream. Fail-open by contract — a failure here never blocks a user request.",
    responsibilities: [
      "Resolve new-project vs continuation for every request",
      "Derive and persist the active goal",
      "Decompose goals into engine-assigned tasks",
      "Maintain project phase and current-task rollup",
      "Assemble the EXECUTIVE BRAIN PLAN context note",
      "Coordinate Planning, Research, Memory and Business Intelligence enrichment",
      "Observe the health of every registered Brain (Build 001)",
    ],
    status: "active" as const,
    version: "1.1.0",
    owner: "platform",
    priority: "critical" as const,
    confidence: "high" as const,
    inputs: [
      "ExecutiveBrainRequest (userId, message, history, optional systemInstanceId/businessType/revenueGoal)",
      "ash_projects / ash_goals / ash_tasks state",
      "Memory Engine retrieval, Business Intelligence context",
    ],
    outputs: [
      "brainContextNote (EXECUTIVE BRAIN PLAN block)",
      "Persisted ash_projects/ash_goals/ash_tasks rows",
      "Forwarded orchestrator request + piped SSE stream",
    ],
    dependencies: ["planning-engine", "memory-engine", "research-knowledge-engine", "self-improving-brain", "postgres", "openrouter", "ai-orchestrator"],
    capabilities: [
      cap("decision-making", "Decision Making", "§3.4.1", "L2", "L4", "implemented", "Classifies each request as new project vs continuation via keyword + recency heuristics."),
      cap("goal-management", "Goal Management", "§3.4.2", "L3", "L4", "implemented", "Derives, persists and reprioritizes the active goal (AI-assisted derivation with deterministic fallback)."),
      cap("task-coordination", "Task Coordination", "§3.4.3", "L2/L3", "L4", "implemented", "Decomposes goals into prioritized, engine-assigned tasks (threshold-gated AI decomposition)."),
      cap("project-coordination", "Project Coordination", "§3.4.4", "L2/L3", "L4", "implemented", "Resolves or creates the active project and maintains phase/current-task rollup."),
      cap("context-assembly", "Context Assembly", "§3.4.5", "L2", "L3/L4", "implemented", "Builds the EXECUTIVE BRAIN PLAN context note appended to the forwarded message."),
      cap("delegation", "Delegation", "§3.4.6", "L2", "L4", "implemented", "Routes each planned task to an execution engine via the ENGINE_KEYWORDS table."),
      cap("planning-coordination", "Planning Coordination", "§3.4.7", "L3", "L4", "implemented", "Invokes the Planning Engine (milestones, prioritization, validation) fail-open."),
      cap("research-coordination", "Research Coordination", "§3.4.8", "L3", "L3/L4", "implemented", "Detects research intent and invokes the Research & Knowledge Engine fail-open."),
      cap("memory-coordination", "Memory Coordination", "§3.4.9", "L3", "L4", "implemented", "Retrieves relevant memory pre-call and captures auto-memory on stream completion."),
      cap("business-coordination", "Business Coordination", "§3.4.10", "L3", "L4", "implemented", "Assembles ownership-checked Business Intelligence context for the resolved business."),
      cap("risk-coordination", "Risk Coordination", "§3.4.11", "L0", "L3", "target", "Surface Validation Engine risk signals during planning — designed, not yet built."),
      cap("approval-coordination", "Approval Coordination", "§3.4.12", "L0", "L3", "target", "Surface pending-approval state for planned tasks — designed, not yet built."),
      cap("execution-coordination", "Execution Coordination", "§3.4.13", "L1", "L4", "target", "Close the loop between planned tasks and real execution outcomes (seam exists, unwired)."),
      cap("recovery-coordination", "Recovery Coordination", "§3.4.14", "L0", "L3/L4", "target", "React to failed or stalled tasks with recovery planning — depends on Execution Coordination."),
      cap("learning-coordination", "Learning Coordination", "§3.4.15", "L2", "L4", "partial", "Lesson capture exists (write side); consultation during planning is not yet built."),
      cap("model-coordination", "Model Coordination", "§3.4.16", "L3", "L3", "implemented", "Delegates model selection wholesale to the centralized model policy (lib/models)."),
      cap("tool-coordination", "Tool Coordination", "§3.4.17", "L0", "L0", "deferred", "Deliberately unaware of tool specifics — owned by the Orchestrator downstream, pending an explicit scope decision."),
      cap("communication-coordination", "Communication Coordination", "§3.4.18", "L2", "L3", "implemented", "Pipes the orchestrator SSE stream through and detects completion for memory capture."),
      cap("opportunity-coordination", "Opportunity Coordination", "§3.4.19", "L0", "L3", "target", "Surface high-impact business recommendations as candidate goals — designed, not yet built."),
      cap("self-review-coordination", "Self Review Coordination", "§3.4.20", "L0", "L3", "target", "Retrospectively assess own resolution quality — capstone; depends on execution outcomes existing."),
    ],
    extensionPoints: ["decision-intelligence", "execution-intelligence", "strategic-intelligence", "self-improvement"],
    specReference: `${SPEC_ROOT}/01-executive-brain.md`,
    checkHealth: async (): Promise<BrainHealthCheckResult> => {
      const dbConcern = await probeTable(
        () => db.select({ id: ashProjectsTable.id }).from(ashProjectsTable).limit(1),
        "ash_projects store",
      );
      if (dbConcern) return dbConcern;
      if (!hasOpenRouterKey()) {
        return {
          state: "warning",
          message: "OPENROUTER_API_KEY missing — AI-assisted derivations degrade to deterministic fallbacks",
        };
      }
      return { state: "healthy", message: "Project store reachable; AI derivation configured" };
    },
  };
}

// ─── Planning Engine (Chapter 1.2) ──────────────────────────────────────────

function planningEngineDefinition() {
  return {
    name: "planning-engine",
    displayName: "Planning Engine",
    purpose:
      "Turns the Executive Brain's resolved project/goal/tasks into an executable, validated, prioritized plan: milestones, sequencing, dependency readiness, execution decisions and task-outcome adaptation.",
    responsibilities: [
      "Generate milestones for new projects",
      "Prioritize and sequence tasks",
      "Manage dependencies and readiness unlocking",
      "Coordinate validation of planned tasks",
      "Evaluate execution decisions (proceed/hold/escalate)",
      "Adapt plans to task outcomes (retry, block, fail)",
      "Audit plan decisions",
    ],
    status: "active" as const,
    version: "1.0.0",
    owner: "platform",
    priority: "critical" as const,
    confidence: "high" as const,
    inputs: ["Resolved project/goal/tasks from the Executive Brain", "ash_tasks / ash_milestones / pending_approvals state"],
    outputs: ["Milestones, reprioritized task order", "Validation-driven blocked states", "Plan decision audit rows", "planningContextNote"],
    dependencies: ["validation-engine", "self-improving-brain", "postgres", "openrouter"],
    capabilities: [
      cap("milestone-planning", "Milestone Planning", "§3.4.1", "L3", "L3", "implemented", "AI-assisted milestone/phase generation for new projects."),
      cap("task-prioritization-sequencing", "Task Prioritization & Sequencing", "§3.4.2", "L2", "L3/L4", "implemented", "Deterministic scoring and ordering of pending tasks."),
      cap("dependency-readiness-management", "Dependency & Readiness Management", "§3.4.3", "L2", "L2/L3", "implemented", "Tracks task dependencies and unlocks dependents when prerequisites complete."),
      cap("validation-coordination", "Validation Coordination", "§3.4.4", "L2", "L2", "implemented", "Runs the Validation Engine over planned tasks and applies its verdicts."),
      cap("execution-decision-evaluation", "Execution Decision Evaluation", "§3.4.5", "L3", "L3/L4", "implemented", "Evaluates proceed/hold/escalate for ready tasks."),
      cap("task-outcome-adaptation", "Task Outcome Adaptation", "§3.4.6", "L2", "L3", "implemented", "handleTaskCompletion/handleTaskFailure: retry transient failures, block on missing resources, fail hard on logic errors."),
      cap("plan-decision-audit-logging", "Plan Decision Audit Logging", "§3.4.7", "L2", "L2", "implemented", "Persists every plan decision to ash_plan_decisions for audit."),
      cap("plan-state-exposure", "Plan State Exposure (Reporting)", "§3.4.8", "L2", "L2/L3", "implemented", "Read-only plan state surfaces for UI/API consumers."),
      cap("event-publishing-coordination", "Event Publishing Coordination", "§3.4.9", "L2", "L2/L3", "implemented", "Publishes plan-related domain events through the business event bus."),
      cap("risk-aggregation-coordination", "Risk Aggregation Coordination", "§3.4.10", "L0", "L3", "target", "Reconcile independent risk signals into one aggregate — designed, not yet built."),
      cap("plan-learning-coordination", "Plan Learning Coordination", "§3.4.11", "L1", "L4", "partial", "Write side records lessons; read-side consultation during planning not yet built."),
      cap("escalation-to-approval-coordination", "Escalation-to-Approval Coordination", "§3.4.12", "L1", "L3", "target", "Escalation signal exists but is advisory-only, not structural."),
      cap("cross-project-plan-coordination", "Cross-Project / Cross-Business Plan Coordination", "§3.4.13", "L0", "L3", "target", "Strictly single-project scoped today."),
    ],
    extensionPoints: ["planning-intelligence"],
    specReference: `${SPEC_ROOT}/02-planning-engine.md`,
    checkHealth: async (): Promise<BrainHealthCheckResult> => {
      const dbConcern = await probeTable(
        () => db.select({ id: ashTasksTable.id }).from(ashTasksTable).limit(1),
        "ash_tasks store",
      );
      if (dbConcern) return dbConcern;
      return { state: "healthy", message: "Task store reachable" };
    },
  };
}

// ─── Validation Engine (Chapter 1.3) ────────────────────────────────────────

function validationEngineDefinition() {
  return {
    name: "validation-engine",
    displayName: "Validation Engine",
    purpose:
      "Rule-based pre-execution gatekeeper: checks credentials, platform support, system/engine requirements, file/resource requirements and risk before a task is allowed to proceed; enforces approval gates for high-risk work.",
    responsibilities: [
      "Run the modular rule registry over planned tasks",
      "Detect missing credentials/resources and unsupported platforms",
      "Detect high-risk tasks and create pending approvals",
      "Persist blocking states and re-validate continuously",
    ],
    status: "active" as const,
    version: "1.0.0",
    owner: "platform",
    priority: "high" as const,
    confidence: "high" as const,
    inputs: ["Planned tasks (description, engine, project context)", "Connector/platform registry", "User credential presence signals"],
    outputs: ["Validation issues (missing_credential, missing_approval, …)", "pending_approvals rows", "Blocked-task reasons"],
    dependencies: ["postgres", "connector-registry"],
    capabilities: [
      cap("rule-orchestration-execution", "Rule Orchestration & Execution", "§3.4.1", "L2", "L2", "implemented", "Iterates the ALL_VALIDATION_RULES registry over each task, collecting issues."),
      cap("credential-requirement-validation", "Credential Requirement Validation", "§3.4.2", "L2", "L2", "implemented", "Detects required-but-missing credentials for a task's platforms."),
      cap("platform-integration-support-validation", "Platform & Integration Support Validation", "§3.4.3", "L2", "L2", "implemented", "Flags tasks referencing unsupported platforms via the platform registry."),
      cap("system-engine-requirement-validation", "System & Engine Requirement Validation", "§3.4.4", "L2", "L2", "implemented", "Checks a task's assigned engine and system requirements are satisfiable."),
      cap("file-resource-requirement-validation", "File & Resource Requirement Validation", "§3.4.5", "L2", "L2", "implemented", "Detects tasks that need files/resources not yet provided."),
      cap("risk-detection", "Risk Detection", "§3.4.6", "L2", "L3", "implemented", "Keyword-based detection of high-risk task categories."),
      cap("approval-gate-enforcement", "Approval Gate Enforcement", "§3.4.7", "L2", "L2/L3", "implemented", "Creates pending_approvals entries and blocks high-risk tasks until approved."),
      cap("blocking-state-persistence-revalidation", "Blocking-State Persistence & Continuous Re-validation", "§3.4.8", "L2", "L2/L3", "implemented", "Persists blocked reasons and re-validates blocked tasks as conditions change."),
      cap("rule-registry-extensibility", "Rule Registry Extensibility", "§3.4.9", "L2", "L2", "implemented", "New checks are added as rules in rules/index.ts without touching the runner."),
      cap("cross-signal-risk-aggregation", "Cross-Signal Risk Aggregation", "§3.4.10", "L0", "L2/L3", "target", "Reconcile this engine's risk signal with the Planning Engine's — designed, not yet built."),
      cap("ai-assisted-ambiguous-requirement-resolution", "AI-Assisted Ambiguous Requirement Resolution", "§3.4.11", "L0", "L3", "target", "AI-assisted requirement checking for ambiguous tasks — designed, not yet built."),
    ],
    extensionPoints: [],
    specReference: `${SPEC_ROOT}/03-validation-engine.md`,
    checkHealth: async (): Promise<BrainHealthCheckResult> => {
      if (ALL_VALIDATION_RULES.length === 0) {
        return { state: "degraded", message: "Validation rule registry is empty — no pre-execution checks will run" };
      }
      const dbConcern = await probeTable(
        () => db.select({ id: pendingApprovalsTable.id }).from(pendingApprovalsTable).limit(1),
        "pending_approvals store",
      );
      if (dbConcern) return dbConcern;
      return { state: "healthy", message: `${ALL_VALIDATION_RULES.length} validation rules registered; approval store reachable` };
    },
  };
}

// ─── Memory Engine (Chapter 1.4) ────────────────────────────────────────────

function memoryEngineDefinition() {
  return {
    name: "memory-engine",
    displayName: "Memory Engine",
    purpose:
      "Layered memory system (working, long-term, project, business, knowledge) with relevance-ranked retrieval composition, automated capture on completed interactions, and governed writes.",
    responsibilities: [
      "Construct working memory for each request",
      "Retrieve and store long-term / project / business / knowledge memory",
      "Rank and compose relevant memory into prompts",
      "Capture memory automatically on stream completion",
      "Maintain and decay stale memory",
    ],
    status: "active" as const,
    version: "1.0.0",
    owner: "platform",
    priority: "high" as const,
    confidence: "high" as const,
    inputs: ["User/request context (userId, message, project/business scope)", "Completed conversation turns (auto-capture)"],
    outputs: ["memoryContextNote for the orchestrator", "user_memory / ash_project_memory / business_memory / ash_knowledge_entries rows"],
    dependencies: ["postgres", "openrouter"],
    capabilities: [
      cap("working-memory-construction", "Working Memory Construction", "§3.4.1", "L2", "L2", "implemented", "Cheapest, ephemeral per-request memory layer."),
      cap("long-term-memory-retrieval-storage", "Long-Term Memory Retrieval & Storage", "§3.4.2", "L2", "L2", "implemented", "Durable per-user memory (user_memory)."),
      cap("project-memory-retrieval-storage", "Project Memory Retrieval & Storage", "§3.4.3", "L2", "L2", "implemented", "Project-scoped memory (ash_project_memory)."),
      cap("business-memory-retrieval-storage", "Business Memory Retrieval & Storage", "§3.4.4", "L2", "L2", "implemented", "Business-scoped memory with isolation (business_memory)."),
      cap("knowledge-memory-retrieval-storage", "Knowledge Memory Retrieval & Storage", "§3.4.5", "L2", "L2/L3", "implemented", "Reusable knowledge entries (ash_knowledge_entries), shared with the Research Engine."),
      cap("relevance-ranking-retrieval-composition", "Relevance Ranking & Retrieval Composition", "§3.4.6", "L2", "L3/L4", "implemented", "Deterministic relevance scoring composing layers into one retrieval."),
      cap("automated-memory-capture", "Automated Memory Capture", "§3.4.7", "L3", "L3/L4", "implemented", "AI-assisted capture of durable facts when a stream completes."),
      cap("project-completion-lesson-capture", "Project Completion Lesson Capture", "§3.4.8", "L3", "L3", "implemented", "Records lessons when a project completes."),
      cap("memory-maintenance-decay", "Memory Maintenance & Decay", "§3.4.9", "L2", "L2/L3", "implemented", "Prunes/decays stale memory on a maintenance cadence."),
      cap("governance-compliant-memory-writes", "Governance-Compliant Memory Writes", "§3.4.10", "L2", "L2", "partial", "Governed write path covers two of four persisted layers today."),
      cap("cross-business-memory-isolation", "Cross-Business Memory Isolation", "§3.4.11", "L2", "L2/L3", "implemented", "Business memory is isolated per business for standard retrieval."),
    ],
    extensionPoints: ["memory-intelligence"],
    specReference: `${SPEC_ROOT}/04-memory-engine.md`,
    checkHealth: async (): Promise<BrainHealthCheckResult> => {
      const dbConcern = await probeTable(
        () => db.select({ id: userMemoryTable.id }).from(userMemoryTable).limit(1),
        "user_memory store",
      );
      if (dbConcern) return dbConcern;
      return { state: "healthy", message: "Memory stores reachable" };
    },
  };
}

// ─── Research & Knowledge Engine (Chapter 1.5) ──────────────────────────────

function researchEngineDefinition() {
  return {
    name: "research-knowledge-engine",
    displayName: "Research & Knowledge Engine",
    purpose:
      "Knowledge-first research: reuses fresh, confident stored knowledge before gathering; otherwise plans queries, gathers via the search-provider abstraction, deduplicates, scores reliability, summarizes and persists knowledge for reuse.",
    responsibilities: [
      "Detect research intent in requests",
      "Reuse fresh stored knowledge before searching",
      "Plan and execute provider-abstracted searches",
      "Deduplicate, reliability-score and summarize findings",
      "Persist knowledge (insert or update-in-place) and audit sessions",
    ],
    status: "active" as const,
    version: "1.0.0",
    owner: "platform",
    priority: "high" as const,
    confidence: "medium" as const,
    inputs: ["User request text (intent detection)", "ash_knowledge_entries (reuse lookup)", "Search provider responses"],
    outputs: ["researchContextNote", "ash_knowledge_entries rows (insert/update)", "ash_research_sessions audit rows"],
    dependencies: ["memory-engine", "search-providers", "postgres", "openrouter"],
    capabilities: [
      cap("research-intent-detection", "Research Intent Detection", "§3.4.1", "L2", "L2/L3", "implemented", "Deterministic detection of research-worthy requests."),
      cap("knowledge-reuse-lookup", "Knowledge Reuse Lookup", "§3.4.2", "L2", "L2/L3", "implemented", "Fresh+confident stored knowledge short-circuits new gathering."),
      cap("research-planning", "Research Planning", "§3.4.3", "L3", "L3", "implemented", "AI-assisted query planning for the gather step."),
      cap("search-provider-abstraction", "Search Provider Abstraction & Information Gathering", "§3.4.4", "L2", "L2/L3", "implemented", "Swappable provider chain (Tavily/Serper/Perplexity fallback)."),
      cap("finding-deduplication", "Finding Deduplication", "§3.4.5", "L2", "L2", "implemented", "Deduplicates gathered findings before summarization."),
      cap("source-reliability-scoring", "Source Reliability Scoring", "§3.4.6", "L2", "L2/L3", "implemented", "Deterministic reliability scoring of sources."),
      cap("structured-summarization", "Structured Summarization", "§3.4.7", "L3", "L3", "implemented", "AI-assisted structured summaries of deduplicated findings."),
      cap("knowledge-persistence", "Knowledge Persistence (Insert/Update Coordination)", "§3.4.8", "L2", "L2", "implemented", "Updates matching stale entries in place instead of duplicating topics."),
      cap("research-session-profile-auditing", "Research Session & Profile Auditing", "§3.4.9", "L2", "L2", "implemented", "Audits every research session and its profile."),
      cap("executive-brain-integration-fail-open", "Executive Brain Integration & Fail-Open Coordination", "§3.4.10", "L2", "L2", "implemented", "Invoked conditionally by the Executive Brain; degrades gracefully on failure."),
      cap("adaptive-provider-selection", "Adaptive Provider Selection", "§3.4.11", "L0", "L3", "target", "Provider order is a fixed priority list today — adaptive selection not yet built."),
      cap("knowledge-lifecycle-decay", "Knowledge Lifecycle & Decay Coordination", "§3.4.12", "L1", "L3", "target", "Staleness check exists at reuse time; active decay/expiry not yet built."),
    ],
    extensionPoints: ["research-intelligence"],
    specReference: `${SPEC_ROOT}/05-research-knowledge-engine.md`,
    checkHealth: async (): Promise<BrainHealthCheckResult> => {
      const dbConcern = await probeTable(
        () => db.select({ id: ashKnowledgeEntriesTable.id }).from(ashKnowledgeEntriesTable).limit(1),
        "ash_knowledge_entries store",
      );
      if (dbConcern) return dbConcern;
      const available = listSearchProviders().filter((p) => p.isAvailable());
      if (available.length === 0) {
        return hasOpenRouterKey()
          ? { state: "warning", message: "No dedicated search providers configured; relying on Perplexity-via-OpenRouter fallback only" }
          : { state: "degraded", message: "No search providers configured and no OpenRouter fallback available — gathering will fail" };
      }
      return {
        state: "healthy",
        message: `Knowledge store reachable; ${available.length} search provider(s) available`,
        details: { providers: available.map((p) => p.id) },
      };
    },
  };
}

// ─── ASH Self-Improving Brain (Chapter 1.6) ─────────────────────────────────

function selfImprovingBrainDefinition() {
  return {
    name: "self-improving-brain",
    displayName: "ASH Self-Improving Brain",
    purpose:
      "Deterministic, model-free SQL distillation of platform outcomes into honest per-scope lessons (proven/promising/struggling/emerging), retrieved as prompt-ready grounding by consumers under an anti-fabrication guardrail.",
    responsibilities: [
      "Distill outcomes into per-scope lessons on a schedule",
      "Classify outcomes and score confidence deterministically",
      "Serve ranked, prompt-ready lessons to consumers",
      "Prune stale lesson scopes under a concurrency-safe advisory lock",
    ],
    status: "active" as const,
    version: "1.0.0",
    owner: "platform",
    priority: "medium" as const,
    confidence: "high" as const,
    inputs: ["Aggregate platform outcome data (SQL scans)", "Scheduler distillation ticks / manual admin trigger"],
    outputs: ["ash_lessons rows", "Prompt-ready lesson blocks (formatLessonsForPrompt)", "Brain overview aggregates for admin UI"],
    dependencies: ["postgres"],
    capabilities: [
      cap("deterministic-lesson-distillation", "Deterministic Lesson Distillation", "§3.4.1", "L2", "L2", "implemented", "Model-free SQL distillation into per-scope lessons (permanently deterministic by design)."),
      cap("outcome-classification-confidence-scoring", "Outcome Classification & Confidence Scoring", "§3.4.2", "L2", "L2", "implemented", "Sample-size-aware confidence and proven/promising/struggling/emerging classification."),
      cap("lesson-retrieval-consumption-ranking", "Lesson Retrieval & Consumption Ranking", "§3.4.3", "L2", "L2/L3", "implemented", "Ranked retrieval of relevant lessons for a scope."),
      cap("prompt-ready-lesson-formatting", "Prompt-Ready Lesson Formatting (Anti-Fabrication Guardrail)", "§3.4.4", "L2", "L2", "implemented", "Formats lessons with honesty guardrails against fabricated confidence."),
      cap("brain-overview-aggregation", "Brain Overview Aggregation (Admin/UI Reporting)", "§3.4.5", "L2", "L2", "implemented", "Aggregated overview of lesson state for admin surfaces."),
      cap("scheduled-distillation-cadence", "Scheduled Distillation Cadence", "§3.4.6", "L2", "L2", "implemented", "Periodic distillation via the runtime scheduler."),
      cap("manual-distillation-trigger", "Manual Distillation Trigger (Admin Override)", "§3.4.7", "L2", "L2", "implemented", "Admin-triggered immediate distillation."),
      cap("concurrency-safe-distillation", "Concurrency-Safe Distillation (Advisory Lock)", "§3.4.8", "L2", "L2", "implemented", "pg advisory-lock mutex prevents overlapping distillation runs."),
      cap("stale-lesson-pruning", "Stale Lesson Pruning", "§3.4.9", "L2", "L2", "implemented", "Prunes lessons whose underlying scopes no longer exist."),
      cap("privacy-preserving-aggregation-boundary", "Privacy-Preserving Aggregation Boundary", "§3.4.10", "L2", "L2", "implemented", "Aggregates only — never leaks per-user raw data into lessons."),
      cap("consumption-integration", "Consumption Integration (Recommendations & Planning Grounding)", "§3.4.11", "L2", "L2/L3", "implemented", "Existing consumers ground recommendations in distilled lessons."),
      cap("ai-assisted-lesson-narration", "AI-Assisted Lesson Narration", "§3.4.12", "L0", "L3", "target", "Lesson summaries are fixed templates today — AI narration not yet built."),
    ],
    extensionPoints: ["learning-intelligence", "self-improvement"],
    specReference: `${SPEC_ROOT}/06-self-improving-brain.md`,
    checkHealth: async (): Promise<BrainHealthCheckResult> => {
      const dbConcern = await probeTable(
        () => db.select({ id: ashLessonsTable.id }).from(ashLessonsTable).limit(1),
        "ash_lessons store",
      );
      if (dbConcern) return dbConcern;
      const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(ashLessonsTable);
      const lessonCount = row?.count ?? 0;
      return {
        state: "healthy",
        message: lessonCount > 0 ? `Lesson store reachable (${lessonCount} lessons distilled)` : "Lesson store reachable (no lessons distilled yet)",
        details: { lessonCount },
      };
    },
  };
}

/** Register all six Volume 1 core cognitive Brains. Idempotent. */
export function registerCoreBrains(): void {
  registerBrain(executiveBrainDefinition());
  registerBrain(planningEngineDefinition());
  registerBrain(validationEngineDefinition());
  registerBrain(memoryEngineDefinition());
  registerBrain(researchEngineDefinition());
  registerBrain(selfImprovingBrainDefinition());
}
