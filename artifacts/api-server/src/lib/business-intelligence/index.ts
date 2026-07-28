export * from "./types";
export { initializeBusinessDna, reconcileDnaEvidence, applyUserConfirmedDnaValue, inferMissingDnaFields, computeRecommendedAction } from "./dna";
export {
  publishBusinessEvent,
  publishBusinessEventTx,
  processBusinessEvent,
  registerBusinessEventSubscriber,
  businessEventBus,
  type BusinessEventBus,
  type PublishBusinessEventInput,
  type DbExecutor,
} from "./events";
export {
  assembleBusinessContextPackage,
  assembleCrossBusinessSummary,
  getBusinessCapabilities,
  getBusinessState,
  resolveRelevantKnowledgeScopes,
  detectCrossBusinessIntent,
  buildBusinessIntelligenceUnavailableNote,
  type BusinessScopeFilter,
} from "./context";

// Side-effect-only import: registers the health-recompute event subscriber.
// dna.ts's own subscriber registration already happens via the named export
// above (importing a module runs it once regardless of which export is
// used), but health-subscriber.ts has no exports of its own to piggyback on
// — it must be imported directly so registration always happens.
import "./health-subscriber";
