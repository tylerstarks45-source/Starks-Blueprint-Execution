// ── Build 036: Systems Dynamics Intelligence Engine — Public Barrel ────────
export { declareSystemsDynamicsExtensionPoints } from "./sdi-extension-points";
export { getSystemCatalog, getSubsystemCatalog, computeSystemComplexityScore, identifyBottleneckSystems } from "./sdi-mapping-engine";
export { getFeedbackLoopCatalog, identifyHarmfulLoops, getStrongestLoops, getLoopsByType } from "./sdi-feedback-engine";
export { getPropagationCatalog, getCriticalPropagationPaths, getUnmitigatedRisks, computePropagationRiskScore } from "./sdi-propagation-engine";
export { getConstraintCatalog, getPrimaryConstraints, getCriticalConstraints, getConstraintsByType, getUnmanagedConstraints } from "./sdi-constraint-engine";
export { getLeveragePointCatalog, computeNetLeverageScore, getTopLeveragePoints, getLowRiskHighImpactPoints, getLeveragePointsBySystem } from "./sdi-leverage-engine";
export { getResilienceCatalog, computeCompositeResilienceScore, getLowResilienceSystems, getSystemsWithSinglePointsOfFailure, getPlatformResilienceScore } from "./sdi-resilience-engine";
export { runSystemsDynamicsRebuild, buildSystemsDynamicsSummary } from "./sdi-orchestrator";
export type {
  SystemType,
  BoundaryScope,
  MaturityLevel,
  SubsystemType,
  AutonomyLevel,
  CouplingStrength,
  LoopType,
  LoopDirection,
  LoopStrength,
  TimeConstant,
  PropagationType,
  PropagationSpeed,
  ImpactMagnitude,
  ConstraintType,
  ConstraintSeverity,
  LeverageType,
  ResilienceLevel,
  SystemProfile,
  SubsystemProfile,
  FeedbackLoopProfile,
  PropagationPathProfile,
  ConstraintProfile,
  LeveragePointProfile,
  ResilienceProfile,
  SystemsDynamicsSummary,
} from "./types";
