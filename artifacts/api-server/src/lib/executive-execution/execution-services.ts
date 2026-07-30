// ─── Execution Services Barrel (Build 010) ───────────────────────────────────
//
// Shared service barrel. All Brains may import from this file.
// Re-exports the full public API of the Execution Engine.

export {
  createExecution,
  getExecution,
  listExecutions,
  listActiveExecutions,
  transitionExecution,
  createExecutionStep,
  getExecutionStep,
  getExecutionSteps,
  transitionStep,
  addExecutionMetric,
  getExecutionMetrics,
  createRecoveryPoint,
  getRecoveryPoints,
  getLatestRecoveryPoint,
  addExecutionRelationship,
  getExecutionRelationships,
  getExecutionDiagnostics,
} from "./execution-registry";

export {
  getExecutionHistory,
  getRecentExecutionHistory,
  getStepHistory,
  recordExecutionCreated,
  recordExecutionApproved,
  recordExecutionStarted,
  recordExecutionPaused,
  recordExecutionResumed,
  recordExecutionBlocked,
  recordExecutionUnblocked,
  recordExecutionRetrying,
  recordExecutionCompleted,
  recordExecutionFailed,
  recordExecutionCancelled,
  recordManualIntervention,
  recordStepStarted,
  recordStepCompleted,
  recordStepFailed,
  recordStepSkipped,
  recordStepRetried,
  recordAdapterDispatched,
  recordRecoveryPointCreated,
} from "./execution-history";

export {
  canTransitionExecution,
  canTransitionStep,
  isTerminalExecutionStatus,
  isTerminalStepStatus,
  isExecutionActive,
  canResumeExecution,
  canRetryExecution,
  computeProgressPct,
  getValidExecutionTransitions,
  getValidStepTransitions,
} from "./execution-state-machine";

export {
  sortStepsByOrder,
  findNextPendingStep,
  findRunningSteps,
  findBlockedSteps,
  canRetryStep,
  summarizeStepProgress,
  buildStartStepInput,
  buildCompleteStepInput,
  buildFailStepInput,
  buildSkipStepInput,
  buildRetryStepInput,
  buildPauseStepInput,
  buildResumeStepInput,
  buildCancelStepInput,
} from "./execution-step-engine";

export {
  buildExecutionPlan,
  checkMilestoneCompletions,
  aggregateExecutionProgress,
  shouldCreateRecoveryPoint,
  buildRecoveryPointSnapshot,
  buildCoordinatorResult,
  isExecutionFullyComplete,
  isExecutionFullyFailed,
} from "./execution-coordinator";

export { adapterRegistry } from "./execution-adapters";

export {
  fireExecutionHooks,
  registerExecutionHook,
  declareExecutionExtensionPoints,
  EXECUTION_EXTENSION_POINT_IDS,
} from "./execution-extension-points";
