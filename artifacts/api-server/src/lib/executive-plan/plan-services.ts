// ─── Shared Planning Services (Build 009) ────────────────────────────────────
//
// Re-export barrel: all shared services reachable from any Brain via
// import { ... } from "../executive-plan/plan-services"
// All Brains may consume these services.

export {
  // Plan CRUD
  createPlan,
  getPlan,
  listPlans,
  listActivePlans,
  updatePlan,
  archivePlan,
  // Milestone management
  getPlanMilestones,
  getChildMilestones,
  updateMilestoneStatus,
  // Step retrieval
  getMilestoneSteps,
  getPlanSteps,
  // Dependencies
  addPlanDependency,
  getPlanDependencies,
  removePlanDependency,
  // Metrics
  addPlanMetric,
  getPlanMetrics,
  // Generation
  generateAndPersistPlan,
  generateAlternativePlans,
  // Comparison
  comparePlans,
  // Diagnostics
  buildPlanDiagnostics,
} from "./plan-registry";

export {
  // Pure scoring (no I/O)
  scorePlan,
  rankPlans,
  summarizePlanScore,
} from "./plan-scoring";

export {
  // Pure dependency analysis (no I/O)
  analyzePlanDependencies,
} from "./plan-dependency";

export {
  // Plan generation (no I/O)
  generatePlanForStrategy,
} from "./plan-generation";

export {
  // History
  recordPlanHistory,
  recordPlanRevision,
  recordPlanDecision,
  recordAlternativeProposed,
  recordPlanRejection,
  recordPlanApproval,
  getPlanHistory,
  getRecentPlanHistory,
  getPlanHistoryByType,
} from "./plan-history";

export {
  // Extension points
  declarePlanExtensionPoints,
  firePlanHooks,
  registerPlanHook,
  PLAN_EXTENSION_POINT_IDS,
} from "./plan-extension-points";
