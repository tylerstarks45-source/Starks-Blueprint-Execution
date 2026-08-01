// ── Build 036: Systems Dynamics Intelligence Engine — Types ───────────────

export type SystemType =
  | "business"
  | "technology"
  | "execution"
  | "intelligence"
  | "data"
  | "user"
  | "infrastructure"
  | "integration";

export type BoundaryScope = "platform" | "business" | "infrastructure" | "external";

export type MaturityLevel = "nascent" | "emerging" | "established" | "mature" | "legacy";

export type SubsystemType = "engine" | "service" | "layer" | "module" | "integration" | "adapter" | "store";

export type AutonomyLevel = "autonomous" | "semi-autonomous" | "dependent" | "passive";

export type CouplingStrength = "tight" | "moderate" | "loose" | "decoupled";

export type LoopType = "reinforcing" | "balancing" | "delayed" | "emergent";

export type LoopDirection = "amplifying" | "dampening" | "oscillating" | "stabilizing";

export type LoopStrength = "strong" | "moderate" | "weak" | "negligible";

export type TimeConstant = "immediate" | "short-term" | "medium-term" | "long-term";

export type LoopDesirability = "beneficial" | "neutral" | "harmful" | "unknown";

export type PropagationType = "failure" | "recovery" | "performance" | "change" | "load";

export type PropagationSpeed = "immediate" | "fast" | "moderate" | "slow" | "gradual";

export type ImpactMagnitude = "critical" | "high" | "medium" | "low" | "negligible";

export type ConstraintType =
  | "execution"
  | "technology"
  | "business"
  | "infrastructure"
  | "human"
  | "regulatory"
  | "financial";

export type ConstraintSeverity = "critical" | "high" | "medium" | "low";

export type LeverageType =
  | "structural"
  | "process"
  | "behavioral"
  | "technical"
  | "governance"
  | "information";

export type ImplementationComplexity = "low" | "medium" | "high" | "very-high";

export type ResilienceLevel = "high" | "medium" | "low" | "critical";

export type MeanTimeToRecovery = "minutes" | "hours" | "days";

// ── Composite domain objects ───────────────────────────────────────────────

export interface SystemProfile {
  systemKey:       string;
  systemName:      string;
  systemType:      SystemType;
  description:     string;
  boundaryScope:   BoundaryScope;
  componentCount:  number;
  connectionCount: number;
  stabilityScore:  number;     // 0–1
  complexityScore: number;     // 0–1
  healthScore:     number;     // 0–1
  maturityLevel:   MaturityLevel;
  criticalPath:    boolean;
  systemNotes?:    string;
}

export interface SubsystemProfile {
  parentSystemKey:  string;
  subsystemKey:     string;
  subsystemName:    string;
  subsystemType:    SubsystemType;
  role:             string;
  autonomyLevel:    AutonomyLevel;
  couplingStrength: CouplingStrength;
  healthScore:      number;
  stabilityScore:   number;
  isBottleneck:     boolean;
  isCritical:       boolean;
  subsystemNotes?:  string;
}

export interface FeedbackLoopProfile {
  systemKey:        string;
  loopKey:          string;
  loopName:         string;
  loopType:         LoopType;
  direction:        LoopDirection;
  strength:         LoopStrength;
  strengthScore:    number;
  triggerCondition: string;
  effect:           string;
  components:       string[];
  timeConstant:     TimeConstant;
  desirability:     LoopDesirability;
  loopNotes?:       string;
}

export interface PropagationPathProfile {
  sourceSystemKey:  string;
  targetSystemKey:  string;
  pathKey:          string;
  propagationType:  PropagationType;
  propagationSpeed: PropagationSpeed;
  impactMagnitude:  ImpactMagnitude;
  impactScore:      number;
  probability:      number;
  hopsCount:        number;
  intermediaries:   string[];
  mitigationExists: boolean;
  mitigationNotes?: string;
}

export interface ConstraintProfile {
  systemKey:         string;
  constraintKey:     string;
  constraintName:    string;
  constraintType:    ConstraintType;
  severity:          ConstraintSeverity;
  severityScore:     number;
  description:       string;
  rootCause:         string;
  downstreamImpact:  string;
  isPrimary:         boolean;
  isActivelyManaged: boolean;
  resolutionPath?:   string;
}

export interface LeveragePointProfile {
  systemKey:                string;
  leverageKey:              string;
  leverageName:             string;
  leverageType:             LeverageType;
  leverageScore:            number;
  expectedImpact:           number;
  riskScore:                number;
  confidenceScore:          number;
  description:              string;
  mechanism:                string;
  targetComponent:          string;
  affectedSystems:          string[];
  implementationComplexity: ImplementationComplexity;
  timeToImpact:             TimeConstant;
  leverageNotes?:           string;
}

export interface ResilienceProfile {
  systemKey:                    string;
  robustnessScore:              number;
  redundancyScore:              number;
  faultToleranceScore:          number;
  recoveryCapacityScore:        number;
  operationalResilienceScore:   number;
  compositeResilienceScore:     number;
  singlePointsOfFailure:        number;
  redundantPaths:               number;
  meanTimeToRecovery:           MeanTimeToRecovery;
  resilienceLevel:              ResilienceLevel;
  vulnerabilities:              string[];
  strengths:                    string[];
  resilienceNotes?:             string;
}

// ── EB summary ─────────────────────────────────────────────────────────────

export interface SystemsDynamicsSummary {
  totalSystems:             number;
  totalSubsystems:          number;
  totalFeedbackLoops:       number;
  totalPropagationPaths:    number;
  totalConstraints:         number;
  criticalConstraints:      number;
  totalLeveragePoints:      number;
  averageSystemHealth:      number;
  averageResilience:        number;
  averageStability:         number;
  platformSystemsScore:     number;
  highestRiskSystem:        string | null;
  highestLeverageSystem:    string | null;
  criticalConstraintNames:  string[];
  topLeverageOpportunities: { key: string; score: number; system: string }[];
  criticalPropagationPaths: { source: string; target: string; impact: string }[];
  lowResilienceSystems:     string[];
}

// ── EP IDs ─────────────────────────────────────────────────────────────────

export const SDI_EP_IDS = {
  SYSTEM_MAPPING:       "sdi.system.mapping",
  FEEDBACK_LOOP:        "sdi.feedback.loop.analysis",
  PROPAGATION:          "sdi.propagation.analysis",
  CONSTRAINT:           "sdi.constraint.analysis",
  LEVERAGE:             "sdi.leverage.analysis",
  RESILIENCE:           "sdi.resilience.analysis",
  ORCHESTRATION:        "sdi.evolution.orchestration",
  ADVISORY:             "sdi.evolution.advisory",
} as const;
