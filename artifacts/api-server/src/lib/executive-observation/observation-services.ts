// ─── Observation Services Barrel (Build 011) ─────────────────────────────────
//
// Shared service barrel. All Brains may import from this file.

// ── Ingestion (all subsystems use these to publish events) ────────────────────
export {
  ingestObservation,
  ingestObservationBatch,
  observeExecution,
  observeGoal,
  observePlanning,
} from "./observation-ingestion";

// ── Registry reads ─────────────────────────────────────────────────────────────
export {
  getObservation,
  listObservations,
  getRecentObservations,
  getAttentionQueue,
  getChain,
  listChains,
  getChainObservations,
  getSignalFeed,
  getTrendFeed,
  getAnomalyFeed,
  getCorrelationsForObservation,
  getObservationDiagnostics,
  insertTrend,
  insertAnomaly,
} from "./observation-registry";

// ── Attention Engine (pure) ───────────────────────────────────────────────────
export {
  computeAttentionScore,
  computeAttentionForIngestion,
  ATTENTION_HIGH_THRESHOLD,
  ATTENTION_REFLECTION_THRESHOLD,
} from "./observation-attention";

// ── Signal Engine (pure) ──────────────────────────────────────────────────────
export {
  classifySignal,
  classifySignals,
  describeSignal,
  aggregateSignalTypes,
} from "./observation-signal";

// ── Chain Engine (pure) ───────────────────────────────────────────────────────
export {
  resolveChainAnchor,
  generateChainName,
  updateChainAggregates,
  buildChainSummary,
  isChainReflectionReady,
  REFLECTION_MIN_OBSERVATIONS,
  REFLECTION_MIN_ATTENTION,
} from "./observation-chain";

// ── Correlation Engine (pure) ─────────────────────────────────────────────────
export {
  detectCorrelations,
  buildCorrelationClusters,
} from "./observation-correlation";

// ── Trend Engine (pure) ───────────────────────────────────────────────────────
export {
  detectAllTrends,
  detectRepeatedFailures,
  detectRetryEscalation,
  detectIncreasingSuccess,
  detectImprovingCompletion,
  computeExecutionVelocity,
  detectGoalCompletionVelocity,
  detectPlanningFrequency,
} from "./observation-trend";

// ── Anomaly Engine (pure) ─────────────────────────────────────────────────────
export {
  detectAllAnomalies,
  detectUnexpectedFailures,
  detectRepeatedRetries,
  detectExecutionLoops,
  detectStalledProgress,
  detectImpossibleTransitions,
  summarizeAnomalies,
} from "./observation-anomaly";

// ── Extension points ──────────────────────────────────────────────────────────
export {
  fireObservationHooks,
  registerObservationHook,
  declareObservationExtensionPoints,
  OBSERVATION_EXTENSION_POINT_IDS,
} from "./observation-extension-points";
