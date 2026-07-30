// ─────────────────────────────────────────────────────────────────────────────
// Build 021: Strategic Planning Engine — Milestone Engine
// Defines measurable milestone checkpoints.
// Milestones are outcome checkpoints — NOT calendar dates.
// Every initiative receives exactly 2 milestones: foundation + achievement.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { PlanningMilestone, MilestoneType, InitiativeType } from "./types";

interface MilestoneTemplate {
  milestoneType: MilestoneType;
  nameTemplate: string;
  descriptionTemplate: string;
  successCriteriaTemplate: string;
  isCriticalPath: boolean;
}

// Milestone pairs per initiative type
const INITIATIVE_MILESTONES: Record<InitiativeType, [MilestoneTemplate, MilestoneTemplate]> = {
  discovery: [
    {
      milestoneType: "foundation",
      nameTemplate: "Discovery Scope Defined",
      descriptionTemplate: "The discovery scope, research approach, and success criteria are clearly defined and agreed.",
      successCriteriaTemplate:
        "Documented discovery scope with defined hypotheses, data sources, and completion criteria approved by key stakeholders.",
      isCriticalPath: false,
    },
    {
      milestoneType: "achievement",
      nameTemplate: "Discovery Insights Validated",
      descriptionTemplate: "Key insights from the discovery have been validated against business context and converted to actionable recommendations.",
      successCriteriaTemplate:
        "Validated insight report with prioritised recommendations, evidence base, and clear next-step ownership.",
      isCriticalPath: true,
    },
  ],
  development: [
    {
      milestoneType: "foundation",
      nameTemplate: "Development Readiness Confirmed",
      descriptionTemplate: "All prerequisite conditions — design, resources, dependencies, and approvals — are confirmed before development begins.",
      successCriteriaTemplate:
        "Confirmed readiness checklist: design complete, resources allocated, dependencies resolved, governance approved.",
      isCriticalPath: true,
    },
    {
      milestoneType: "achievement",
      nameTemplate: "Development Outcomes Delivered",
      descriptionTemplate: "The developed capability or product is delivered, tested, and confirmed fit for deployment.",
      successCriteriaTemplate:
        "Delivered capability meets defined acceptance criteria, passes quality gates, and is cleared for operational deployment.",
      isCriticalPath: true,
    },
  ],
  deployment: [
    {
      milestoneType: "progress",
      nameTemplate: "Deployment Preparation Complete",
      descriptionTemplate: "All deployment preparation activities — configuration, training, communication, and rollback planning — are complete.",
      successCriteriaTemplate:
        "Deployment plan signed off, environment ready, stakeholders informed, rollback procedures documented.",
      isCriticalPath: true,
    },
    {
      milestoneType: "validation",
      nameTemplate: "Deployment Outcomes Validated",
      descriptionTemplate: "The deployment has been validated against intended outcomes in the live operational environment.",
      successCriteriaTemplate:
        "Post-deployment validation confirms outcomes meet targets: adoption metrics, performance indicators, and stakeholder satisfaction within defined bounds.",
      isCriticalPath: true,
    },
  ],
  optimisation: [
    {
      milestoneType: "foundation",
      nameTemplate: "Baseline Performance Established",
      descriptionTemplate: "Current performance baseline is documented, measurement infrastructure is in place, and improvement targets are confirmed.",
      successCriteriaTemplate:
        "Performance baseline documented with defined metrics, measurement cadence established, and improvement targets formally agreed.",
      isCriticalPath: false,
    },
    {
      milestoneType: "achievement",
      nameTemplate: "Optimisation Targets Achieved",
      descriptionTemplate: "Optimisation interventions have been implemented and performance improvements have been validated against targets.",
      successCriteriaTemplate:
        "Measured performance improvement meets or exceeds agreed targets, improvement is sustained over the defined validation period.",
      isCriticalPath: true,
    },
  ],
  governance: [
    {
      milestoneType: "foundation",
      nameTemplate: "Governance Framework Designed",
      descriptionTemplate: "The governance framework — policies, controls, accountabilities, and operating model — is designed and reviewed.",
      successCriteriaTemplate:
        "Governance framework document approved by required stakeholders, including policy statements, accountability matrix, and enforcement mechanisms.",
      isCriticalPath: false,
    },
    {
      milestoneType: "validation",
      nameTemplate: "Governance Framework Operational",
      descriptionTemplate: "The governance framework is operational, embedded in working practices, and verified through initial operation.",
      successCriteriaTemplate:
        "Governance mechanisms are operational, first compliance cycle completed, no critical gaps identified in post-implementation review.",
      isCriticalPath: true,
    },
  ],
};

export function createMilestones(params: {
  initiative: { id: string; programId: string; planId: string; reportId: string; businessId: number; initiativeType: InitiativeType; initiativeName: string; sequencePosition: number };
}): PlanningMilestone[] {
  const { initiative } = params;
  const templates = INITIATIVE_MILESTONES[initiative.initiativeType];

  return templates.map((tmpl, idx) => ({
    id: randomUUID(),
    initiativeId: initiative.id,
    programId: initiative.programId,
    planId: initiative.planId,
    reportId: initiative.reportId,
    businessId: initiative.businessId,
    milestoneType: tmpl.milestoneType,
    milestoneName: `${initiative.initiativeName} — ${tmpl.nameTemplate}`,
    milestoneDescription: tmpl.descriptionTemplate,
    successCriteria: tmpl.successCriteriaTemplate,
    sequencePosition: idx,
    isCriticalPath: tmpl.isCriticalPath,
  }));
}
