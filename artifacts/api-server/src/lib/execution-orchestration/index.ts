// ─────────────────────────────────────────────────────────────────────────────
// Build 024: Execution Orchestration Engine — Public Barrel
// ─────────────────────────────────────────────────────────────────────────────
export { runExecutionOrchestration, fetchOrchestrationSummaryForEB } from "./execution-orchestration-orchestrator";
export { declareExecutionOrchestrationExtensionPoints } from "./execution-extension-points";
export type { ExecutionOrchestrationSummary, ExecutionOrchestrationReport, ExecutionPlan, ExecutionAssignment, ExecutionOwner, ExecutionQueue, ExecutionPolicy, ExecutionReadinessResult, OrchestrationEvaluation } from "./types";
