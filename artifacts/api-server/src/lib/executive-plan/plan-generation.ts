// ─── Plan Generation Engine (Build 009) ──────────────────────────────────────
//
// Deterministic planning engine — transforms Goal + Context + Judgment →
// Structured Execution Plans with milestones, ordered steps, dependency graph,
// effort estimates, and duration estimates.
//
// No AI calls.  No I/O.  Pure computation.
// Input shapes are plain data objects, not DB queries.
//
// Generation is strategy-driven:
//   top_down   — start from goal success criteria, decompose downward
//   bottom_up  — start from atomic capability steps, compose upward
//   iterative  — cyclic milestones with discovery/validate/refine loops
//   agile      — sprint-based milestones with backlog and review phases
//   waterfall  — sequential gated phases with strict ordering

import { randomUUID } from "crypto";
import type {
  PlanMilestone,
  PlanStep,
  PlanningStrategy,
  GeneratePlanInput,
} from "./types";
import { scorePlan } from "./plan-scoring";
import { analyzePlanDependencies } from "./plan-dependency";

// ─── Internal helpers ─────────────────────────────────────────────────────────

function makeStep(
  milestoneId: string,
  planId: string,
  name: string,
  description: string,
  orderIndex: number,
  opts: {
    estimatedEffortHours?: number;
    requiredCapabilities?: string[];
    assignedBrain?: string;
  } = {},
): PlanStep {
  return {
    id: randomUUID(),
    milestoneId,
    planId,
    name,
    description,
    status: "pending",
    orderIndex,
    estimatedEffortHours: opts.estimatedEffortHours ?? 4,
    requiredCapabilities: opts.requiredCapabilities ?? [],
    dependsOnStepIds: [],
    assignedBrain: opts.assignedBrain ?? null,
    metadata: {},
    createdAt: new Date(),
  };
}

function makeMilestone(
  planId: string,
  name: string,
  description: string,
  orderIndex: number,
  estimatedDurationDays: number,
  steps: PlanStep[],
  dependencies: string[] = [],
): PlanMilestone {
  return {
    id: randomUUID(),
    planId,
    parentMilestoneId: null,
    name,
    description,
    status: "pending",
    orderIndex,
    progressPct: 0,
    estimatedDurationDays,
    dependencies,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    steps,
  };
}

// ─── Complexity multiplier ────────────────────────────────────────────────────

function complexityMultiplier(complexity: number): number {
  // 50 = baseline (1.0×), 0 = 0.5×, 100 = 1.5×
  return 0.5 + (complexity / 100);
}

// ─── Strategy-specific milestone blueprints ───────────────────────────────────

type MilestoneBlueprint = {
  name: string;
  description: string;
  durationDays: number;
  steps: Array<{ name: string; description: string; effortHours: number; capabilities: string[] }>;
};

function getStrategyBlueprints(
  goalName: string,
  successCriteria: string[],
  constraints: string[],
  complexity: number,
  strategy: PlanningStrategy,
): MilestoneBlueprint[] {
  const cm = complexityMultiplier(complexity);

  if (strategy === "top_down") {
    // Derive milestones directly from success criteria
    const criteriaMs: MilestoneBlueprint[] = (
      successCriteria.length > 0 ? successCriteria.slice(0, 5) : [`Achieve "${goalName}"`]
    ).map((criterion, i) => ({
      name: `Milestone ${i + 1}: ${criterion.slice(0, 60)}`,
      description: `Structured work to satisfy: ${criterion}`,
      durationDays: Math.round(7 * cm),
      steps: [
        { name: "Define approach", description: `Determine how to satisfy: ${criterion}`, effortHours: 2, capabilities: ["planning"] },
        { name: "Prepare resources", description: "Identify and assemble required resources", effortHours: Math.round(3 * cm), capabilities: ["operations"] },
        { name: "Execute core work", description: `Perform the primary work for: ${criterion}`, effortHours: Math.round(8 * cm), capabilities: ["execution"] },
        { name: "Validate outcome", description: "Verify the criterion has been met", effortHours: 2, capabilities: ["validation"] },
      ],
    }));

    return [
      {
        name: "Discovery & Analysis",
        description: `Understand the full scope required to achieve "${goalName}"`,
        durationDays: Math.round(3 * cm),
        steps: [
          { name: "Gather context", description: "Collect all relevant background information", effortHours: 2, capabilities: ["research"] },
          { name: "Analyse requirements", description: "Map out what success requires", effortHours: Math.round(3 * cm), capabilities: ["planning"] },
          { name: "Identify constraints", description: `Review constraints: ${constraints.slice(0, 2).join("; ") || "none documented"}`, effortHours: 1, capabilities: ["analysis"] },
        ],
      },
      ...criteriaMs,
      {
        name: "Review & Completion",
        description: "Final review, acceptance, and closure",
        durationDays: 2,
        steps: [
          { name: "Acceptance review", description: "Review all success criteria with stakeholders", effortHours: 2, capabilities: ["validation"] },
          { name: "Document outcomes", description: "Record decisions and learnings", effortHours: 1, capabilities: ["documentation"] },
        ],
      },
    ];
  }

  if (strategy === "bottom_up") {
    return [
      {
        name: "Capability Assessment",
        description: "Identify the atomic capabilities required",
        durationDays: Math.round(2 * cm),
        steps: [
          { name: "List required capabilities", description: "Enumerate every atomic skill needed", effortHours: 2, capabilities: ["planning"] },
          { name: "Assess current capability gaps", description: "Compare existing vs. required", effortHours: Math.round(2 * cm), capabilities: ["analysis"] },
        ],
      },
      {
        name: "Foundation Building",
        description: "Build the base capabilities before higher-level work",
        durationDays: Math.round(7 * cm),
        steps: [
          { name: "Build core components", description: "Implement the lowest-level building blocks", effortHours: Math.round(8 * cm), capabilities: ["execution"] },
          { name: "Unit validation", description: "Verify each component in isolation", effortHours: Math.round(3 * cm), capabilities: ["validation"] },
        ],
      },
      {
        name: "Integration",
        description: "Compose foundation components into larger structures",
        durationDays: Math.round(5 * cm),
        steps: [
          { name: "Integrate components", description: "Combine foundation pieces", effortHours: Math.round(6 * cm), capabilities: ["execution", "integration"] },
          { name: "Integration testing", description: "Test combined system behaviour", effortHours: Math.round(3 * cm), capabilities: ["validation"] },
        ],
      },
      {
        name: "Goal Alignment",
        description: `Verify the assembled system achieves "${goalName}"`,
        durationDays: Math.round(3 * cm),
        steps: [
          { name: "End-to-end validation", description: "Run full acceptance scenarios", effortHours: 3, capabilities: ["validation"] },
          { name: "Close-out", description: "Final documentation and handoff", effortHours: 1, capabilities: ["documentation"] },
        ],
      },
    ];
  }

  if (strategy === "iterative") {
    const iterations = Math.max(2, Math.min(4, Math.ceil(successCriteria.length / 2) + 1));
    return Array.from({ length: iterations }, (_, i) => ({
      name: `Iteration ${i + 1}${i === 0 ? " — Discovery" : i === iterations - 1 ? " — Final" : " — Build"}`,
      description: i === 0
        ? "Initial exploration and hypothesis formation"
        : i === iterations - 1
          ? "Final iteration: acceptance and delivery"
          : `Iterative build cycle ${i}`,
      durationDays: Math.round(7 * cm),
      steps: [
        { name: "Plan iteration", description: `Plan the scope for iteration ${i + 1}`, effortHours: 2, capabilities: ["planning"] },
        { name: "Execute work", description: `Perform the iteration ${i + 1} deliverables`, effortHours: Math.round(8 * cm), capabilities: ["execution"] },
        { name: "Review & reflect", description: "Review output and adapt next iteration", effortHours: 2, capabilities: ["validation"] },
      ],
    }));
  }

  if (strategy === "agile") {
    const sprintCount = Math.max(2, Math.min(6, Math.ceil((successCriteria.length + 1) * cm)));
    const milestones: MilestoneBlueprint[] = [
      {
        name: "Sprint 0 — Setup",
        description: "Backlog creation, environment setup, team alignment",
        durationDays: 3,
        steps: [
          { name: "Create backlog", description: "Enumerate all user stories and tasks", effortHours: 3, capabilities: ["planning"] },
          { name: "Prioritise backlog", description: "Order items by value and dependency", effortHours: 1, capabilities: ["planning"] },
        ],
      },
      ...Array.from({ length: sprintCount - 1 }, (_, i) => ({
        name: `Sprint ${i + 1}`,
        description: `Delivery sprint ${i + 1} — implement highest-priority backlog items`,
        durationDays: 14,
        steps: [
          { name: "Sprint planning", description: `Select items for sprint ${i + 1}`, effortHours: 2, capabilities: ["planning"] },
          { name: "Develop", description: "Build sprint deliverables", effortHours: Math.round(10 * cm), capabilities: ["execution"] },
          { name: "Sprint review", description: "Demo and accept completed items", effortHours: 2, capabilities: ["validation"] },
          { name: "Retrospective", description: "Improve process for next sprint", effortHours: 1, capabilities: ["reflection"] },
        ],
      })),
    ];
    return milestones;
  }

  // waterfall (default)
  return [
    {
      name: "Requirements",
      description: "Gather, analyse, and sign off all requirements",
      durationDays: Math.round(5 * cm),
      steps: [
        { name: "Elicit requirements", description: "Interview stakeholders, gather inputs", effortHours: Math.round(4 * cm), capabilities: ["analysis"] },
        { name: "Document requirements", description: "Write formal requirement specifications", effortHours: Math.round(3 * cm), capabilities: ["documentation"] },
        { name: "Requirements sign-off", description: "Obtain stakeholder approval", effortHours: 1, capabilities: ["planning"] },
      ],
    },
    {
      name: "Design",
      description: "Produce the solution architecture and detailed design",
      durationDays: Math.round(7 * cm),
      steps: [
        { name: "Architecture design", description: "Define high-level solution structure", effortHours: Math.round(6 * cm), capabilities: ["planning"] },
        { name: "Detailed design", description: "Produce component-level specifications", effortHours: Math.round(6 * cm), capabilities: ["planning"] },
        { name: "Design review", description: "Peer review and approval", effortHours: 2, capabilities: ["validation"] },
      ],
    },
    {
      name: "Implementation",
      description: "Build according to the signed-off design",
      durationDays: Math.round(14 * cm),
      steps: [
        { name: "Core implementation", description: "Build the primary solution components", effortHours: Math.round(20 * cm), capabilities: ["execution"] },
        { name: "Integration", description: "Connect components and external systems", effortHours: Math.round(8 * cm), capabilities: ["execution", "integration"] },
      ],
    },
    {
      name: "Testing",
      description: "Validate the implementation against requirements",
      durationDays: Math.round(7 * cm),
      steps: [
        { name: "Test planning", description: "Prepare test cases from requirements", effortHours: 3, capabilities: ["validation"] },
        { name: "Test execution", description: "Run all test cases", effortHours: Math.round(8 * cm), capabilities: ["validation"] },
        { name: "Defect resolution", description: "Fix defects found during testing", effortHours: Math.round(4 * cm), capabilities: ["execution"] },
      ],
    },
    {
      name: "Delivery",
      description: "Deploy and hand over the completed solution",
      durationDays: Math.round(3 * cm),
      steps: [
        { name: "Deployment", description: "Release the solution to the target environment", effortHours: 3, capabilities: ["deployment"] },
        { name: "Acceptance", description: "Final stakeholder acceptance sign-off", effortHours: 2, capabilities: ["validation"] },
        { name: "Documentation & handoff", description: "Deliver operational docs", effortHours: 2, capabilities: ["documentation"] },
      ],
    },
  ];
}

// ─── Public entrypoint ────────────────────────────────────────────────────────

export interface GenerationOutput {
  planId: string;
  name: string;
  description: string;
  planningStrategy: PlanningStrategy;
  milestones: PlanMilestone[];
  estimatedDurationDays: number;
  estimatedComplexity: number;
  estimatedRisk: number;
  estimatedConfidence: number;
  priority: number;
  successProbability: number;
  overallScore: number;
  scoreDimensions: Record<string, number>;
  assumptions: string[];
  constraintsData: string[];
  requiredResources: string[];
}

/** Generate one plan for the given strategy.
 *  Returns structured milestones and steps with estimates.
 *  No I/O, no AI calls. */
export function generatePlanForStrategy(
  input: GeneratePlanInput,
  strategy: PlanningStrategy,
): GenerationOutput {
  const planId = randomUUID();
  const complexity  = input.estimatedComplexity ?? 50;
  const risk        = input.estimatedRisk ?? 50;
  const constraints = input.constraintsData ?? [];
  const criteria    = input.successCriteria ?? [];

  const blueprints = getStrategyBlueprints(
    input.goalName,
    criteria,
    constraints,
    complexity,
    strategy,
  );

  // Build milestones + steps — link each step to its parent milestone
  const milestones: PlanMilestone[] = blueprints.map((bp, msIdx) => {
    const msId = randomUUID();
    const steps: PlanStep[] = bp.steps.map((sp, sIdx) =>
      makeStep(msId, planId, sp.name, sp.description, sIdx, {
        estimatedEffortHours: sp.effortHours,
        requiredCapabilities: sp.capabilities,
      }),
    );
    return makeMilestone(
      planId,
      bp.name,
      bp.description,
      msIdx,
      bp.durationDays,
      steps,
    );
  });

  // Sequential milestone dependencies: each milestone depends on the one before it
  for (let i = 1; i < milestones.length; i++) {
    milestones[i].dependencies = [milestones[i - 1].id];
  }

  const totalDurationDays = milestones.reduce((sum, m) => sum + (m.estimatedDurationDays ?? 0), 0);
  const totalStepCount    = milestones.reduce((sum, m) => sum + (m.steps?.length ?? 0), 0);

  const confidence = Math.max(20, 90 - risk * 0.4 - complexity * 0.1);

  const score = scorePlan({
    estimatedComplexity: complexity,
    estimatedRisk: risk,
    estimatedDurationDays: totalDurationDays,
    estimatedConfidence: confidence,
    stepCount: totalStepCount,
    goalPriorityScore: input.goalPriorityScore,
  });

  const successProbability = Math.round(
    (score.dimensions.risk * 0.4 + score.dimensions.confidence * 0.4 + score.dimensions.complexity * 0.2),
  );

  // Run dependency analysis and embed diagnostics in metadata (no-op for generation)
  analyzePlanDependencies({
    planId,
    milestones,
    steps: milestones.flatMap((m) => m.steps ?? []),
    planDependencies: [],
  });

  const strategyLabel: Record<PlanningStrategy, string> = {
    top_down:  "Top-Down",
    bottom_up: "Bottom-Up",
    iterative: "Iterative",
    agile:     "Agile",
    waterfall: "Waterfall",
  };

  return {
    planId,
    name: `${strategyLabel[strategy]} Plan — ${input.goalName}`,
    description: `${strategyLabel[strategy]} execution strategy for goal: ${input.goalName}${input.goalDescription ? ". " + input.goalDescription : ""}`,
    planningStrategy: strategy,
    milestones,
    estimatedDurationDays: totalDurationDays,
    estimatedComplexity: complexity,
    estimatedRisk: risk,
    estimatedConfidence: confidence,
    priority: input.goalPriorityScore ?? 50,
    successProbability,
    overallScore: score.overallScore,
    scoreDimensions: score.dimensions as Record<string, number>,
    assumptions: [
      "Required resources are available as estimated.",
      "External dependencies are delivered on time.",
      strategy === "agile" ? "Stakeholder availability for sprint reviews is confirmed." : "Requirements are stable for the duration of the plan.",
    ],
    constraintsData: constraints,
    requiredResources: ["planning-engine", "execution-engine"],
  };
}
