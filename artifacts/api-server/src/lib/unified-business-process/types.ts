// ─── Process domains ───────────────────────────────────────────────────────
export type ProcessDomain =
  | "sales" | "marketing" | "customer_success" | "support" | "finance"
  | "accounting" | "human_resources" | "operations" | "fulfillment"
  | "procurement" | "compliance" | "legal" | "it" | "ai_operations"
  | "administration" | "future_domain";

// ─── Process types ─────────────────────────────────────────────────────────
export type ProcessType =
  | "standard" | "approval_flow" | "onboarding" | "checklist" | "pipeline"
  | "workflow" | "sop" | "playbook" | "future_type";

// ─── Stage types ───────────────────────────────────────────────────────────
export type StageType =
  | "sequential" | "parallel" | "conditional" | "approval" | "milestone" | "terminal";

// ─── Step types ────────────────────────────────────────────────────────────
export type StepType =
  | "action" | "decision" | "approval" | "notification" | "integration"
  | "ai_task" | "human_task" | "review" | "future_step";

// ─── Rule types ────────────────────────────────────────────────────────────
export type RuleType =
  | "approval_gate" | "decision_branch" | "sla_policy" | "escalation"
  | "validation" | "notification" | "business_rule" | "automation";

// ─── Dependency types ──────────────────────────────────────────────────────
export type DependencyType =
  | "must_complete_before" | "triggers" | "feeds_data_to"
  | "approval_required_by" | "blocks" | "informs" | "future_dep";

// ─── SLA status ────────────────────────────────────────────────────────────
export type SlaStatus = "on_track" | "at_risk" | "breached" | "completed";

// ─── Summary passed to Executive Brain ─────────────────────────────────────
export interface UBPESummary {
  totalProcesses:      number;
  activeProcesses:     number;
  completedProcesses:  number;
  blockedProcesses:    number;
  slaBreachedCount:    number;
  pendingApprovals:    number;
  totalTemplates:      number;
  averageHealthScore:  number;
  averageCompletion:   number;
  domainBreakdown:     Record<string, number>;
  statusBreakdown:     Record<string, number>;
  computedAt:          string;
}
