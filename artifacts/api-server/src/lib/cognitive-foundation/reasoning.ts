// ─── Executive Reasoning Pipeline (Build 003) ────────────────────────────────
//
// The structured reasoning layer that executes BEFORE the Executive Brain
// makes an orchestration decision. Every incoming objective passes through
// six explicit reasoning stages that produce typed metadata — the reasoning
// is then used to build a Decision Record, a Cognitive Reasoning Graph, a
// four-dimensional confidence breakdown, and a structured explanation.
//
// Design invariants:
//   - All reasoning is deterministic from registry metadata + input data.
//     No AI calls, no external I/O.
//   - Fail-open: every stage is try/catch'd; a stage failure degrades its
//     confidence to "unknown" but never throws out to the caller.
//   - The pipeline augments existing orchestration — it never replaces or
//     re-implements the Build 002 orchestration engine.
//   - Decision Records are stored in an in-process ring buffer (last 100).
//     Future builds can persist this to the database.
//   - Reflection Hooks are declared as extension points; none are implemented.

import crypto from "node:crypto";
import { logger } from "../logger";
import { getBrain, getCachedBrainHealth, getCachedHealthConcerns } from "./brain-registry";
import { listCapabilities } from "./capability-registry";
import { declareExtensionPoint } from "./extension-points";
import { getBrainRuntimeState } from "./runtime-state";
import type {
  CognitiveReasoningGraph,
  DecisionRecord,
  ExecutiveReasoningResult,
  ExtendedConfidence,
  ObjectiveAnalysis,
  OrchestrationConfidence,
  OrchestrationResult,
  ReasoningEdge,
  ReasoningNode,
  ReasoningStageId,
  ReasoningStageResult,
  ReflectionHook,
  ReflectionQuestionId,
  REFLECTION_QUESTION_IDS,
} from "./types";
import { REASONING_STAGE_IDS } from "./types";

// ─── Reflection Hook Registry ─────────────────────────────────────────────────
//
// Four extension points for future self-reflection systems. Declared here;
// none are implemented in this build. Future Brains (e.g. the Self-Improving
// Brain or a dedicated Reflection Engine) register handlers at boot.

export const REFLECTION_QUESTIONS: ReadonlyArray<{
  id: ReflectionQuestionId;
  question: string;
  description: string;
}> = [
  {
    id: "reflection-decision-success",
    question: "Was the decision successful?",
    description:
      "Evaluate whether the Executive Brain's Brain selection and orchestration plan led to a successful outcome for the user.",
  },
  {
    id: "reflection-better-sequence",
    question: "Could another Brain sequence have been better?",
    description:
      "Determine whether a different topological ordering or Brain selection would have produced a more efficient or accurate result.",
  },
  {
    id: "reflection-confidence-accuracy",
    question: "Was the confidence assessment accurate?",
    description:
      "Compare the heuristic confidence level at decision time with the actual outcome quality to calibrate future confidence estimates.",
  },
  {
    id: "reflection-objective-satisfaction",
    question: "Did the result satisfy the objective?",
    description:
      "Assess whether the final response addressed all elements of the objective analysis (primary goal, secondary goals, success criteria).",
  },
];

const reflectionHooks = new Map<ReflectionQuestionId, ReflectionHook[]>();

/** Declare all four reflection extension points. Called once from
 *  initializeCognitiveFoundation(); idempotent. */
export function declareReflectionExtensionPoints(): void {
  for (const q of REFLECTION_QUESTIONS) {
    declareExtensionPoint({ id: q.id, description: q.description, declaredBy: "executive-reasoning-pipeline" });
  }
}

/** Register a reflection hook. Future self-reflection Brains call this at boot. */
export function registerReflectionHook(hook: ReflectionHook): void {
  const existing = reflectionHooks.get(hook.questionId) ?? [];
  const withoutSame = existing.filter((h) => h.providerBrain !== hook.providerBrain);
  withoutSame.push(hook);
  reflectionHooks.set(hook.questionId, withoutSame);
  logger.info(
    { questionId: hook.questionId, providerBrain: hook.providerBrain },
    "Reflection hook registered",
  );
}

/** List all registered reflection hooks. */
export function listReflectionHooks(): Array<Omit<ReflectionHook, "handler"> & { hasHandler: boolean }> {
  return REFLECTION_QUESTIONS.flatMap((q) =>
    (reflectionHooks.get(q.id) ?? []).map(({ handler, ...rest }) => ({
      ...rest,
      hasHandler: typeof handler === "function",
    })),
  );
}

/** Fire all registered reflection hooks for a Decision Record. Non-blocking —
 *  called fire-and-forget after the request path has already responded. */
export function fireReflectionHooks(record: DecisionRecord): void {
  for (const [, hooks] of reflectionHooks) {
    for (const hook of hooks) {
      if (typeof hook.handler === "function") {
        void hook.handler(record).catch((err) => {
          logger.warn({ err, questionId: hook.questionId }, "Reflection hook failed (ignored)");
        });
      }
    }
  }
}

// ─── Decision Record Ring Buffer ──────────────────────────────────────────────

const MAX_DECISION_RECORDS = 100;
const decisionRecords: DecisionRecord[] = [];

function storeDecisionRecord(record: DecisionRecord): void {
  decisionRecords.push(record);
  if (decisionRecords.length > MAX_DECISION_RECORDS) {
    decisionRecords.shift();
  }
}

/** Return recent Decision Records, newest first. */
export function getRecentDecisionRecords(limit = 20): DecisionRecord[] {
  return [...decisionRecords].reverse().slice(0, limit);
}

/** Return one Decision Record by id. */
export function getDecisionRecord(id: string): DecisionRecord | null {
  return decisionRecords.find((r) => r.id === id) ?? null;
}

// ─── Tokenisation (shared with orchestration.ts — intentionally duplicated
//     here to keep reasoning.ts self-contained with no orchestration import) ──

const STOPWORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with","by",
  "from","up","about","into","through","is","are","was","were","be","been",
  "being","have","has","had","do","does","did","will","would","shall","should",
  "may","might","must","can","could","not","no","its","this","that","what",
  "how","when","where","who","which","there","then",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

// ─── Stage outputs (typed internally) ────────────────────────────────────────

interface GoalUnderstandingOutput {
  primaryIntent: string;
  actionType: "create" | "analyze" | "plan" | "improve" | "research" | "validate" | "launch" | "manage" | "other";
  targetDomain: string;
  goalClarity: "clear" | "ambiguous" | "unclear";
  tokenCount: number;
}

interface ContextAnalysisOutput {
  availableBrainCount: number;
  selectedBrainCount: number;
  healthyCoverage: number; // 0–1 ratio
  orchestrationConfidence: OrchestrationConfidence;
  contextRichness: "rich" | "moderate" | "sparse";
}

interface RequirementExtractionOutput {
  fullyImplemented: string[];
  partiallyImplemented: string[];
  notYetImplemented: string[];
  coverageRatio: number; // 0–1
}

interface ConstraintIdentificationOutput {
  unavailableBrains: string[];
  degradedBrains: string[];
  missingCapabilities: string[];
  constraintCount: number;
}

interface RiskIdentificationOutput {
  risks: Array<{ description: string; severity: "high" | "medium" | "low" }>;
}

interface SuccessCriteriaOutput {
  criteria: string[];
  successSignals: string[];
}

// ─── Action word → actionType mapping ────────────────────────────────────────

const ACTION_MAP: Array<[string[], GoalUnderstandingOutput["actionType"]]> = [
  [["create","build","generate","make","write","design","develop","draft","set","setup","start"], "create"],
  [["analyze","analyse","review","evaluate","assess","audit","examine","inspect","check","measure"], "analyze"],
  [["plan","plan","outline","strategize","roadmap","schedule","prioritize","organize","structure"], "plan"],
  [["improve","optimize","enhance","upgrade","refine","fix","boost","increase","grow","scale"], "improve"],
  [["research","find","discover","search","explore","investigate","learn","understand","study"], "research"],
  [["validate","verify","confirm","test","ensure","check","prove","validate","certify"], "validate"],
  [["launch","deploy","release","publish","ship","go-live","rollout"], "launch"],
  [["manage","monitor","track","maintain","operate","oversee","coordinate","run","handle"], "manage"],
];

const DOMAIN_MAP: Array<[string[], string]> = [
  [["business","company","startup","enterprise","brand"], "business"],
  [["product","feature","app","application","service","platform","tool"], "product"],
  [["campaign","marketing","ad","advertisement","social","content","email","seo"], "marketing"],
  [["website","page","landing","web","site","homepage"], "website"],
  [["finance","revenue","profit","cost","budget","pricing","subscription","payment"], "finance"],
  [["customer","user","client","audience","lead","prospect","conversion"], "customer"],
  [["plan","strategy","roadmap","goal","objective","mission","vision"], "strategy"],
  [["data","analytics","metric","report","dashboard","insight","intelligence"], "analytics"],
];

// ─── Reasoning Stages ─────────────────────────────────────────────────────────

function runGoalUnderstanding(objective: string): GoalUnderstandingOutput {
  const tokens = tokenize(objective);
  const tokenSet = new Set(tokens);

  let actionType: GoalUnderstandingOutput["actionType"] = "other";
  for (const [words, type] of ACTION_MAP) {
    if (words.some((w) => tokenSet.has(w) || objective.toLowerCase().includes(w))) {
      actionType = type;
      break;
    }
  }

  let targetDomain = "general";
  for (const [words, domain] of DOMAIN_MAP) {
    if (words.some((w) => tokenSet.has(w) || objective.toLowerCase().includes(w))) {
      targetDomain = domain;
      break;
    }
  }

  const goalClarity: GoalUnderstandingOutput["goalClarity"] =
    tokens.length >= 5 && targetDomain !== "general" ? "clear"
    : tokens.length >= 2 ? "ambiguous"
    : "unclear";

  const primaryIntent = actionType !== "other"
    ? `${actionType} in the ${targetDomain} domain`
    : `address objective in the ${targetDomain} domain`;

  return { primaryIntent, actionType, targetDomain, goalClarity, tokenCount: tokens.length };
}

function runContextAnalysis(orchestrationResult: OrchestrationResult | null): ContextAnalysisOutput {
  const healthSnapshots = getCachedBrainHealth();
  const healthyCount = healthSnapshots.filter((s) => s.state === "healthy").length;
  const totalCount = healthSnapshots.length;
  const healthyCoverage = totalCount > 0 ? healthyCount / totalCount : 0;

  const selectedBrainCount = orchestrationResult?.selectedBrains.length ?? 0;
  const orchestrationConfidence: OrchestrationConfidence = orchestrationResult?.confidence ?? "unknown";

  const contextRichness: ContextAnalysisOutput["contextRichness"] =
    selectedBrainCount >= 4 && orchestrationConfidence === "high" ? "rich"
    : selectedBrainCount >= 2 || orchestrationConfidence === "medium" ? "moderate"
    : "sparse";

  return {
    availableBrainCount: totalCount,
    selectedBrainCount,
    healthyCoverage,
    orchestrationConfidence,
    contextRichness,
  };
}

function runRequirementExtraction(
  orchestrationResult: OrchestrationResult | null,
): RequirementExtractionOutput {
  const capIds = Object.keys(orchestrationResult?.capabilityMap ?? {});
  if (capIds.length === 0) {
    return { fullyImplemented: [], partiallyImplemented: [], notYetImplemented: [], coverageRatio: 0 };
  }

  const allCaps = listCapabilities();
  const fullyImplemented: string[] = [];
  const partiallyImplemented: string[] = [];
  const notYetImplemented: string[] = [];

  for (const id of capIds) {
    const cap = allCaps.find((c) => c.id === id);
    if (!cap) continue;
    if (cap.status === "implemented") fullyImplemented.push(cap.name);
    else if (cap.status === "partial") partiallyImplemented.push(cap.name);
    else notYetImplemented.push(cap.name);
  }

  const total = fullyImplemented.length + partiallyImplemented.length + notYetImplemented.length;
  const coverageRatio = total > 0 ? (fullyImplemented.length + partiallyImplemented.length * 0.5) / total : 0;

  return { fullyImplemented, partiallyImplemented, notYetImplemented, coverageRatio };
}

function runConstraintIdentification(
  selectedBrains: string[],
): ConstraintIdentificationOutput {
  const unavailableBrains: string[] = [];
  const degradedBrains: string[] = [];

  for (const name of selectedBrains) {
    const state = getBrainRuntimeState(name);
    if (state.runtimeState === "offline" || state.runtimeState === "blocked") {
      unavailableBrains.push(name);
    } else if (state.runtimeState === "degraded" || state.runtimeState === "warning") {
      degradedBrains.push(name);
    }
  }

  const healthConcerns = getCachedHealthConcerns();
  const missingCapabilities = healthConcerns
    .filter((h) => h.state === "degraded" || h.state === "offline")
    .map((h) => `${h.brainName} capabilities unavailable: ${h.message.slice(0, 80)}`);

  return {
    unavailableBrains,
    degradedBrains,
    missingCapabilities,
    constraintCount: unavailableBrains.length + degradedBrains.length + missingCapabilities.length,
  };
}

function runRiskIdentification(
  context: ContextAnalysisOutput,
  constraints: ConstraintIdentificationOutput,
  requirements: RequirementExtractionOutput,
): RiskIdentificationOutput {
  const risks: RiskIdentificationOutput["risks"] = [];

  if (constraints.unavailableBrains.length > 0) {
    risks.push({
      description: `${constraints.unavailableBrains.join(", ")} unavailable — some orchestration paths blocked`,
      severity: "high",
    });
  }
  if (constraints.degradedBrains.length > 0) {
    risks.push({
      description: `${constraints.degradedBrains.join(", ")} degraded — capabilities may fall back`,
      severity: "medium",
    });
  }
  if (requirements.coverageRatio < 0.4) {
    risks.push({
      description: `Low capability coverage (${Math.round(requirements.coverageRatio * 100)}%) — many required capabilities are not yet implemented`,
      severity: "medium",
    });
  }
  if (context.orchestrationConfidence === "low" || context.orchestrationConfidence === "unknown") {
    risks.push({
      description: `Low Brain selection confidence — objective may be outside the current cognitive vocabulary`,
      severity: "low",
    });
  }
  if (context.contextRichness === "sparse") {
    risks.push({
      description: "Sparse context — few Brains selected; consider adding more detail to the objective",
      severity: "low",
    });
  }

  return { risks };
}

function runSuccessCriteria(
  goalOutput: GoalUnderstandingOutput,
  selectedBrains: string[],
): SuccessCriteriaOutput {
  const criteria: string[] = [];
  const successSignals: string[] = [];

  // Derive criteria from action type
  const actionCriteria: Record<GoalUnderstandingOutput["actionType"], string[]> = {
    create:   ["Deliverable produced", "Requirements addressed", "No blocking errors"],
    analyze:  ["Insights generated", "Key findings identified", "Data interpreted correctly"],
    plan:     ["Actionable plan produced", "Milestones defined", "Dependencies identified"],
    improve:  ["Measurable improvement identified", "Current baseline captured", "Next steps clear"],
    research: ["Relevant knowledge retrieved", "Authoritative sources cited", "Gaps identified"],
    validate: ["Validation criteria met", "Errors or contradictions identified", "Result confirmed"],
    launch:   ["Launch checklist complete", "Risks mitigated", "Success metrics defined"],
    manage:   ["Status visible", "Actions tracked", "Ownership assigned"],
    other:    ["Objective addressed", "Response relevant to intent"],
  };
  criteria.push(...(actionCriteria[goalOutput.actionType] ?? actionCriteria["other"]));

  // Derive success signals from participating Brains' expected outputs
  for (const brainName of selectedBrains.slice(0, 4)) {
    const brain = getBrain(brainName);
    if (brain) {
      for (const output of brain.outputs.slice(0, 2)) {
        const signal = `${brainName} produces: ${output}`;
        if (!successSignals.includes(signal)) successSignals.push(signal);
      }
    }
  }

  return { criteria, successSignals };
}

// ─── Confidence computation ────────────────────────────────────────────────────

function computeExtendedConfidence(
  goalOutput: GoalUnderstandingOutput,
  requirements: RequirementExtractionOutput,
  orchestrationConfidence: OrchestrationConfidence,
): ExtendedConfidence {
  // Reasoning confidence: how clearly we understood the objective
  const reasoning: OrchestrationConfidence =
    goalOutput.goalClarity === "clear" ? "high"
    : goalOutput.goalClarity === "ambiguous" ? "medium"
    : "low";

  // Capability confidence: how well matched capabilities cover the objective
  const capability: OrchestrationConfidence =
    requirements.coverageRatio >= 0.7 ? "high"
    : requirements.coverageRatio >= 0.4 ? "medium"
    : requirements.coverageRatio > 0 ? "low"
    : "unknown";

  // Brain selection confidence: from Build 002 orchestration
  const brainSelection = orchestrationConfidence;

  // Overall: worst-of the three (highest concern wins)
  const SEVERITY: Record<OrchestrationConfidence, number> = {
    high: 0, medium: 1, low: 2, unknown: 3,
  };
  const worst = ([reasoning, capability, brainSelection] as OrchestrationConfidence[])
    .reduce((w, c) => SEVERITY[c] > SEVERITY[w] ? c : w, "high" as OrchestrationConfidence);

  return { reasoning, capability, brainSelection, overall: worst };
}

// ─── Graph builder ─────────────────────────────────────────────────────────────

function buildReasoningGraph(
  objective: string,
  stages: ReasoningStageResult[],
  orchestrationResult: OrchestrationResult | null,
  decision: string,
): CognitiveReasoningGraph {
  const nodes: ReasoningNode[] = [];
  const edges: ReasoningEdge[] = [];

  // Root: objective
  nodes.push({ id: "objective", kind: "objective", label: objective.slice(0, 120) });

  // Reasoning stages
  for (const stage of stages) {
    const nodeId = `stage:${stage.stageId}`;
    nodes.push({
      id: nodeId,
      kind: "reasoning-stage",
      label: stage.stageId.replace(/-/g, " "),
      data: { confidence: stage.confidence, durationMs: stage.durationMs },
    });
    edges.push({ from: "objective", to: nodeId, relationship: "triggers" });
  }

  // Selected Brains
  const selectedBrains = orchestrationResult?.selectedBrains ?? [];
  for (const brainName of selectedBrains) {
    const nodeId = `brain:${brainName}`;
    nodes.push({ id: nodeId, kind: "brain", label: brainName });
    edges.push({ from: `stage:context-analysis`, to: nodeId, relationship: "selects" });
  }

  // Capabilities (top 8 to keep the graph readable)
  const capMap = orchestrationResult?.capabilityMap ?? {};
  const capEntries = Object.entries(capMap).slice(0, 8);
  for (const [capId, brainName] of capEntries) {
    const nodeId = `cap:${capId}`;
    nodes.push({ id: nodeId, kind: "capability", label: capId });
    edges.push({ from: `brain:${brainName}`, to: nodeId, relationship: "resolves" });
  }

  // Decision leaf
  nodes.push({ id: "decision", kind: "decision", label: decision.slice(0, 200) });
  // Connect each Brain to the decision
  for (const brainName of selectedBrains) {
    edges.push({ from: `brain:${brainName}`, to: "decision", relationship: "informs" });
  }
  if (selectedBrains.length === 0) {
    edges.push({ from: "objective", to: "decision", relationship: "informs" });
  }

  return {
    objective,
    nodes,
    edges,
    selectedBrains,
    capabilityResolution: capMap,
    finalDecision: decision,
    builtAt: new Date().toISOString(),
  };
}

// ─── Explainability ────────────────────────────────────────────────────────────

/** Generate a human-readable explanation from structured reasoning data.
 *  All content derives from the stage outputs — no hardcoded strings. */
function buildExplanation(
  goalOutput: GoalUnderstandingOutput,
  contextOutput: ContextAnalysisOutput,
  requirementsOutput: RequirementExtractionOutput,
  risksOutput: RiskIdentificationOutput,
  selectedBrains: string[],
  confidence: ExtendedConfidence,
): string {
  const parts: string[] = [];

  // Goal understanding
  parts.push(
    `Objective understood as a ${goalOutput.actionType} task in the ${goalOutput.targetDomain} domain ` +
    `(goal clarity: ${goalOutput.goalClarity}).`,
  );

  // Brain selection rationale
  if (selectedBrains.length > 0) {
    const brainList = selectedBrains.map((n) => getBrain(n)?.displayName ?? n).join(", ");
    parts.push(`Selected ${selectedBrains.length} Brain(s): ${brainList}.`);
    parts.push(
      `Brain selection confidence is ${confidence.brainSelection} based on keyword relevance scoring ` +
      `against registered Brain metadata (purpose, responsibilities, capabilities).`,
    );
  }

  // Capability coverage
  const totalCaps = requirementsOutput.fullyImplemented.length
    + requirementsOutput.partiallyImplemented.length
    + requirementsOutput.notYetImplemented.length;
  if (totalCaps > 0) {
    parts.push(
      `Capability analysis: ${requirementsOutput.fullyImplemented.length} fully implemented, ` +
      `${requirementsOutput.partiallyImplemented.length} partial, ` +
      `${requirementsOutput.notYetImplemented.length} not yet implemented ` +
      `(capability confidence: ${confidence.capability}).`,
    );
  }

  // Context richness
  parts.push(
    `Context richness: ${contextOutput.contextRichness} ` +
    `(${contextOutput.selectedBrainCount} of ${contextOutput.availableBrainCount} Brains engaged, ` +
    `${Math.round(contextOutput.healthyCoverage * 100)}% healthy coverage).`,
  );

  // Risks
  if (risksOutput.risks.length > 0) {
    const highRisks = risksOutput.risks.filter((r) => r.severity === "high");
    if (highRisks.length > 0) {
      parts.push(`High-severity risks: ${highRisks.map((r) => r.description).join("; ")}.`);
    }
  }

  // Overall confidence
  parts.push(`Overall decision confidence: ${confidence.overall}.`);

  return parts.join(" ");
}

// ─── Full Pipeline ─────────────────────────────────────────────────────────────

/** Run the full six-stage Executive Reasoning Pipeline against an objective and
 *  the Build 002 orchestration result. Returns a complete ExecutiveReasoningResult
 *  including the Decision Record, Reasoning Graph, and Explainability output.
 *
 *  Never throws — a pipeline failure returns a degraded result with
 *  unknown confidence and an empty stages array. */
export function runReasoningPipeline(
  objective: string,
  orchestrationResult: OrchestrationResult | null,
): ExecutiveReasoningResult {
  const pipelineStages: ReasoningStageResult[] = [];

  function runStage<T>(
    stageId: ReasoningStageId,
    fn: () => T,
  ): T | null {
    const t0 = Date.now();
    try {
      const output = fn();
      pipelineStages.push({
        stageId,
        output,
        durationMs: Date.now() - t0,
        confidence: "high", // degraded below if the output signals low clarity
      });
      return output;
    } catch (err) {
      logger.warn({ err, stageId }, "Reasoning pipeline stage failed (degraded)");
      pipelineStages.push({
        stageId,
        output: null,
        durationMs: Date.now() - t0,
        confidence: "unknown",
      });
      return null;
    }
  }

  const goalOutput   = runStage("goal-understanding",       () => runGoalUnderstanding(objective));
  const contextOutput = runStage("context-analysis",        () => runContextAnalysis(orchestrationResult));
  const reqOutput    = runStage("requirement-extraction",   () => runRequirementExtraction(orchestrationResult));
  const constOutput  = runStage("constraint-identification",() => runConstraintIdentification(orchestrationResult?.selectedBrains ?? []));
  const riskOutput   = runStage("risk-identification",      () => runRiskIdentification(
    contextOutput ?? { availableBrainCount: 0, selectedBrainCount: 0, healthyCoverage: 0, orchestrationConfidence: "unknown", contextRichness: "sparse" },
    constOutput   ?? { unavailableBrains: [], degradedBrains: [], missingCapabilities: [], constraintCount: 0 },
    reqOutput     ?? { fullyImplemented: [], partiallyImplemented: [], notYetImplemented: [], coverageRatio: 0 },
  ));
  const successOutput = runStage("success-criteria", () => runSuccessCriteria(
    goalOutput ?? { primaryIntent: "unknown", actionType: "other", targetDomain: "general", goalClarity: "unclear", tokenCount: 0 },
    orchestrationResult?.selectedBrains ?? [],
  ));

  // Update per-stage confidence based on outputs
  const goalStage = pipelineStages.find((s) => s.stageId === "goal-understanding");
  if (goalStage && goalOutput) {
    goalStage.confidence =
      goalOutput.goalClarity === "clear" ? "high"
      : goalOutput.goalClarity === "ambiguous" ? "medium"
      : "low";
  }

  // Extended confidence
  const extConf = computeExtendedConfidence(
    goalOutput ?? { primaryIntent: "unknown", actionType: "other", targetDomain: "general", goalClarity: "unclear", tokenCount: 0 },
    reqOutput  ?? { fullyImplemented: [], partiallyImplemented: [], notYetImplemented: [], coverageRatio: 0 },
    orchestrationResult?.confidence ?? "unknown",
  );

  // Objective Analysis
  const knownConstraints = [
    ...(constOutput?.unavailableBrains.map((b) => `Brain "${b}" is unavailable`) ?? []),
    ...(constOutput?.degradedBrains.map((b) => `Brain "${b}" is degraded`) ?? []),
  ];
  const risks = riskOutput?.risks ?? [];
  const objectiveAnalysis: ObjectiveAnalysis = {
    primaryGoal: goalOutput?.primaryIntent ?? objective.slice(0, 100),
    secondaryGoals: successOutput?.criteria.slice(1) ?? [],
    knownConstraints,
    unknownInformation: reqOutput?.notYetImplemented.map((c) => `Capability "${c}" not yet implemented`) ?? [],
    requiredKnowledge: reqOutput?.fullyImplemented.slice(0, 5) ?? [],
    expectedOutcome: successOutput?.criteria[0] ?? "Objective addressed",
    priority: contextOutput?.orchestrationConfidence === "high" ? "high"
              : contextOutput?.orchestrationConfidence === "medium" ? "medium"
              : "low",
    complexity: (reqOutput?.notYetImplemented.length ?? 0) > 3 ? "high"
                : (orchestrationResult?.selectedBrains.length ?? 0) >= 4 ? "medium"
                : "low",
    confidence: extConf,
  };

  // Decision
  const selectedBrains = orchestrationResult?.selectedBrains ?? [];
  const decision = selectedBrains.length > 0
    ? `Engage [${selectedBrains.join(", ")}] in order [${orchestrationResult?.collaborationPlan.executionOrder.join(" → ") ?? ""}] to address: ${objective.slice(0, 80)}`
    : `Address objective without Brain orchestration: ${objective.slice(0, 80)}`;

  const reason = goalOutput
    ? `Objective classified as "${goalOutput.actionType}" in "${goalOutput.targetDomain}" domain ` +
      `(clarity: ${goalOutput.goalClarity}); ` +
      `${selectedBrains.length} Brain(s) scored relevant by registry-metadata matching; ` +
      `overall confidence: ${extConf.overall}`
    : "Reasoning pipeline produced partial output";

  const supportingContext: string[] = [];
  if (goalOutput) supportingContext.push(`Goal clarity: ${goalOutput.goalClarity} (${goalOutput.tokenCount} tokens)`);
  if (contextOutput) supportingContext.push(`Context richness: ${contextOutput.contextRichness}`);
  if (reqOutput && (reqOutput.fullyImplemented.length + reqOutput.partiallyImplemented.length) > 0) {
    supportingContext.push(
      `${reqOutput.fullyImplemented.length + reqOutput.partiallyImplemented.length} relevant capabilities matched`,
    );
  }
  if (risks.filter((r) => r.severity === "high").length > 0) {
    supportingContext.push(`${risks.filter((r) => r.severity === "high").length} high-severity risk(s) identified`);
  }

  const decisionRecord: DecisionRecord = {
    id: crypto.randomUUID(),
    decision,
    reason,
    supportingContext,
    brainsSelected: selectedBrains,
    capabilitiesUsed: Object.keys(orchestrationResult?.capabilityMap ?? {}),
    confidence: extConf,
    timestamp: new Date().toISOString(),
    objectiveAnalysis,
  };

  // Reasoning Graph
  const reasoningGraph = buildReasoningGraph(objective, pipelineStages, orchestrationResult, decision);

  // Explanation
  const explanation = buildExplanation(
    goalOutput ?? { primaryIntent: "unknown", actionType: "other", targetDomain: "general", goalClarity: "unclear", tokenCount: 0 },
    contextOutput ?? { availableBrainCount: 0, selectedBrainCount: 0, healthyCoverage: 0, orchestrationConfidence: "unknown", contextRichness: "sparse" },
    reqOutput ?? { fullyImplemented: [], partiallyImplemented: [], notYetImplemented: [], coverageRatio: 0 },
    riskOutput ?? { risks: [] },
    selectedBrains,
    extConf,
  );

  // Store and fire reflection hooks (non-blocking)
  storeDecisionRecord(decisionRecord);
  void Promise.resolve().then(() => fireReflectionHooks(decisionRecord));

  const result: ExecutiveReasoningResult = {
    objectiveAnalysis,
    decisionRecord,
    reasoningGraph,
    explanation,
    pipelineStages,
    reasonedAt: new Date().toISOString(),
  };

  logger.debug(
    {
      objective: objective.slice(0, 80),
      stages: pipelineStages.length,
      confidence: extConf.overall,
      brains: selectedBrains.length,
    },
    "Executive reasoning pipeline complete",
  );

  return result;
}
