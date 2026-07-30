// ─── Reflection Services Barrel (Build 012) ──────────────────────────────────
//
// Shared service barrel. All Brains may import from this file.

// ── Case management ────────────────────────────────────────────────────────────
export {
  openCase,
  closeCase,
  linkReflectionToCase,
  getCase,
  getCaseByExecution,
  listCases,
  addCaseMembers,
  getCaseMembers,
  insertTimelineEvents,
  getTimeline,
  getReport,
  getReportByCase,
  listReports,
  getFactors,
  getScores,
  getEvidence,
  getReflectionDiagnostics,
} from "./reflection-registry";

// ── Reflection orchestrator ────────────────────────────────────────────────────
export { reflectOnCase } from "./reflection-orchestrator";

// ── Case assembly (pure) ───────────────────────────────────────────────────────
export {
  isCaseComplete,
  deriveCompletionStatus,
  deriveOutcome,
  buildMemberSpecs,
  inferBusinessDomain,
  inferStrategicCategory,
  computeDuration,
  describeCaseOutcome,
} from "./case-assembly";

// ── Decision reconstruction (pure) ────────────────────────────────────────────
export {
  buildTimeline,
  summarizeTimeline,
  observationToTimelineEvent,
  executionEventToTimelineEvent,
  analyzeContextEvolution,
  reconstructReasoningSequence,
} from "./decision-reconstruction";

// ── Causal analysis (pure) ─────────────────────────────────────────────────────
export {
  detectCausalLinks,
  assembleCausalAnalysis,
  identifyInfluentialEvents,
} from "./causal-analysis";

// ── Factor engine (pure) ───────────────────────────────────────────────────────
export {
  detectAllFactors,
  summarizeTopFactors,
} from "./factor-engine";

// ── Quality assessment (pure) ──────────────────────────────────────────────────
export {
  assessQuality,
  QUALITY_LOW_THRESHOLD,
} from "./quality-assessment";

// ── Report engine (pure) ───────────────────────────────────────────────────────
export {
  assembleReportDraft,
  buildEvidenceItems,
} from "./report-engine";

// ── Extension points ───────────────────────────────────────────────────────────
export {
  declareReflectionEngineExtensionPoints,
  fireReflectionHooks,
  registerReflectionHook,
  REFLECTION_EXTENSION_POINT_IDS,
} from "./reflection-extension-points";
