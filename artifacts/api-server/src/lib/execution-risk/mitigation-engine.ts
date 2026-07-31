// ─────────────────────────────────────────────────────────────────────────────
// Build 026: Execution Risk Assessment Engine — Mitigation Engine
// Produces deterministic mitigation actions based on risk profiles and
// reversibility assessment. No AI calls.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type {
  RiskMitigation,
  MitigationType,
  MitigationPriority,
  RiskCategory,
  RiskLevel,
} from "./types";

interface MitigationInput {
  reportId: string;
  businessId: number;
  profileId: string;
  ownerType: string;
  executionClass: string;
  complexityLevel: string;
  businessCriticality: string;
  overallRiskScore: number;
  overallRiskLevel: RiskLevel;
  reversibilityLevel: string;
  highestRiskCategory: RiskCategory;
}

// ── Mitigation spec table ─────────────────────────────────────────────────────
interface MitigationSpec {
  type: MitigationType;
  title: string;
  description: string;
  priority: MitigationPriority;
  effort: string;
  categories: RiskCategory[];
  trigger: (input: MitigationInput) => boolean;
}

const MITIGATION_SPECS: MitigationSpec[] = [
  {
    type: "require_approval",
    title: "Require Human Approval Before Execution",
    description: "High-risk or critical assignments must be explicitly approved by an authorised user before any execution engine is permitted to act.",
    priority: "critical",
    effort: "< 1 hour",
    categories: ["operational", "compliance", "security"],
    trigger: (i) => i.overallRiskLevel === "critical" || i.overallRiskLevel === "high" || i.businessCriticality === "critical",
  },
  {
    type: "create_backup",
    title: "Create Backup Before Execution",
    description: "Ensure a current backup of all affected data stores, configurations, and system state before the assignment begins.",
    priority: "high",
    effort: "1–4 hours",
    categories: ["operational", "business_continuity"],
    trigger: (i) => i.ownerType === "automation" || i.ownerType === "integration" || i.complexityLevel === "critical",
  },
  {
    type: "create_snapshot",
    title: "Create System Snapshot",
    description: "Take a point-in-time snapshot of the relevant system, environment, or database before execution. This enables a fast rollback path if execution fails.",
    priority: "high",
    effort: "30 min – 2 hours",
    categories: ["operational", "business_continuity"],
    trigger: (i) => i.reversibilityLevel !== "fully_reversible" && (i.executionClass === "automated" || i.executionClass === "external"),
  },
  {
    type: "dry_run_first",
    title: "Execute Dry-Run First",
    description: "Run the assignment in dry-run / simulation mode before committing any changes. Validate outputs before allowing real execution to proceed.",
    priority: "high",
    effort: "1–3 hours",
    categories: ["operational", "security", "compliance"],
    trigger: (i) => i.ownerType === "ai_agent" || i.ownerType === "automation" || i.complexityLevel === "high" || i.complexityLevel === "critical",
  },
  {
    type: "human_review",
    title: "Human Review of Outputs",
    description: "Assign a qualified reviewer to verify all outputs, decisions, and side effects before downstream consumption or escalation.",
    priority: "medium",
    effort: "2–8 hours",
    categories: ["compliance", "privacy", "security"],
    trigger: (i) => i.highestRiskCategory === "privacy" || i.highestRiskCategory === "compliance" || i.ownerType === "ai_agent",
  },
  {
    type: "incremental_rollout",
    title: "Incremental / Staged Rollout",
    description: "Execute the assignment in small, staged increments rather than as a single batch. Validate each stage before proceeding to the next.",
    priority: "medium",
    effort: "2–5 hours setup",
    categories: ["operational", "business_continuity", "financial"],
    trigger: (i) => i.overallRiskScore > 0.50 && (i.executionClass === "automated" || i.executionClass === "external"),
  },
  {
    type: "monitor_closely",
    title: "Enable Enhanced Monitoring",
    description: "Activate enhanced real-time monitoring, alerting, and logging for the duration of this assignment's execution. Ensure an on-call responder is available.",
    priority: "medium",
    effort: "1–2 hours setup",
    categories: ["operational", "security", "business_continuity"],
    trigger: (i) => i.overallRiskScore > 0.40,
  },
  {
    type: "staged_deployment",
    title: "Use Staged Deployment Pattern",
    description: "Deploy changes to a non-production environment first (staging/canary). Validate all functional and non-functional requirements before promoting to production.",
    priority: "high",
    effort: "4–8 hours",
    categories: ["operational", "security", "compliance"],
    trigger: (i) => i.businessCriticality === "critical" || i.businessCriticality === "high",
  },
];

export function produceMitigations(inputs: MitigationInput[]): RiskMitigation[] {
  const mitigations: RiskMitigation[] = [];
  const seenTypes = new Set<MitigationType>();

  // Produce per-profile mitigations from specs
  for (const input of inputs) {
    for (const spec of MITIGATION_SPECS) {
      if (!spec.trigger(input)) continue;
      // Deduplicate across profiles — emit plan-level mitigation once per type
      if (seenTypes.has(spec.type)) continue;
      seenTypes.add(spec.type);

      mitigations.push({
        id: randomUUID(),
        reportId: input.reportId,
        businessId: input.businessId,
        profileId: input.profileId,
        mitigationType: spec.type,
        title: spec.title,
        description: spec.description,
        priority: spec.priority,
        applicableTo: "all",
        riskCategoriesAddressed: spec.categories,
        estimatedEffort: spec.effort,
      });
    }
  }

  // Sort by priority: critical first
  const priorityOrder: Record<MitigationPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  mitigations.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));

  return mitigations;
}
