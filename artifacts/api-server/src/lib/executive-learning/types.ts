// ─── Build 013: Executive Principle Learning Engine — Types ──────────────────

// ── Enumerations ──────────────────────────────────────────────────────────────

export type PrincipleStatus = "draft" | "candidate" | "validated" | "deprecated" | "archived";

export type PrincipleCategory =
  | "planning"
  | "execution"
  | "judgment"
  | "goal_management"
  | "resource_management"
  | "risk_management"
  | "communication"
  | "strategy"
  | "operations"
  | "general";

export type PrincipleRelationType =
  | "supports"
  | "contradicts"
  | "generalizes"
  | "specializes"
  | "depends_on"
  | "supersedes"
  | "related_to";

export type ContradictionType =
  | "direct"
  | "partial"
  | "domain_drift"
  | "assumption_expired"
  | "declining_confidence";

export type EvidenceType = "supporting" | "contradictory" | "neutral";

export type PatternType =
  | "repeated_success"
  | "repeated_failure"
  | "repeated_bottleneck"
  | "repeated_execution_path"
  | "repeated_planning_strategy"
  | "repeated_judgment_outcome"
  | "repeated_context_shift"
  | "repeated_business_outcome";

export type ValidationResult = "passed" | "failed" | "deferred";

// ── Executive Principle (core cognitive object) ───────────────────────────────

export interface ExecutivePrinciple {
  id: string;
  userId: number | null;
  title: string;
  description: string;
  category: PrincipleCategory;
  businessDomain: string;
  strategicCategory: string;
  originCases: string[];
  supportingEvidence: number;
  contradictoryEvidence: number;
  confidence: number;
  reliability: number;
  novelty: number;
  generality: number;
  applicability: number;
  successRate: number;
  failureRate: number;
  timesObserved: number;
  timesConfirmed: number;
  timesContradicted: number;
  status: PrincipleStatus;
  version: number;
  patternType: string | null;
  patternFrequency: number;
  createdAt: Date;
  updatedAt: Date;
  validatedAt: Date | null;
  deprecatedAt: Date | null;
  archivedAt: Date | null;
  metadata: Record<string, unknown>;
}

// ── Pattern (intermediate between Case data and Principle) ────────────────────

export interface DiscoveredPattern {
  patternType: PatternType;
  title: string;
  description: string;
  frequency: number;                    // number of cases exhibiting this pattern
  domains: string[];                    // affected business domains
  strategicCategories: string[];
  supportingCaseIds: string[];
  averageQualityScore: number;          // mean overall quality from reflection reports
  successRate: number;                  // fraction of cases that completed
  failureRate: number;                  // fraction of cases that failed
  outcome: string;                      // dominant outcome label
  confidence: number;                   // initial confidence estimate
}

// ── Validation Input / Result ─────────────────────────────────────────────────

export interface ValidationInput {
  principle: ExecutivePrinciple;
  timesObserved: number;
  supportRate: number;              // supportingEvidence / (supporting + contradictory)
  contradictionRate: number;        // timesContradicted / timesObserved
  confidence: number;
  businessDomain: string;
  strategicCategory: string;
}

export interface ValidationCheckResult {
  validationResult: ValidationResult;
  minObservationsMet: boolean;
  minSupportMet: boolean;
  maxContradictionMet: boolean;
  minConfidenceMet: boolean;
  businessSignificanceMet: boolean;
  strategicSignificanceMet: boolean;
  failureReasons: string[];
  newStatus: PrincipleStatus;
}

// ── Validation thresholds ─────────────────────────────────────────────────────

export const VALIDATION_THRESHOLDS = {
  MIN_OBSERVATIONS: 3,
  MIN_SUPPORT_RATE: 0.55,           // 55% supporting evidence
  MAX_CONTRADICTION_RATE: 0.30,     // max 30% contradiction
  MIN_CONFIDENCE: 0.50,
  DEPRECATION_CONTRADICTION_RATE: 0.65, // auto-deprecate above this
} as const;

// ── Contradiction Record ──────────────────────────────────────────────────────

export interface PrincipleContradiction {
  id: string;
  principleId: string;
  userId: number | null;
  contradictingCaseId: string | null;
  contradictingReportId: string | null;
  contradictionType: ContradictionType;
  severity: number;
  description: string;
  confidenceImpact: number;
  resolved: boolean;
  resolvedAt: Date | null;
  recordedAt: Date;
  payload: Record<string, unknown>;
}

// ── Evidence Record ───────────────────────────────────────────────────────────

export interface PrincipleEvidenceRecord {
  id: string;
  principleId: string;
  userId: number | null;
  caseId: string | null;
  reportId: string | null;
  evidenceType: EvidenceType;
  summary: string;
  strength: number;
  businessDomain: string | null;
  qualityScore: number | null;
  outcomeStatus: string | null;
  recordedAt: Date;
  payload: Record<string, unknown>;
}

// ── Principle Graph Node / Edge ───────────────────────────────────────────────

export interface PrincipleRelationship {
  id: string;
  fromPrincipleId: string;
  toPrincipleId: string;
  relationType: PrincipleRelationType;
  strength: number;
  userId: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrincipleGraphNode {
  principle: ExecutivePrinciple;
  edges: PrincipleRelationship[];
  depth: number;
}

// ── Learning Report ───────────────────────────────────────────────────────────

export interface LearningReport {
  id: string;
  userId: number | null;
  newPrincipleIds: string[];
  strengthenedPrincipleIds: string[];
  weakeningPrincipleIds: string[];
  deprecatedPrincipleIds: string[];
  evidenceSummary: string;
  confidenceChanges: Record<string, number>;
  businessImpact: string | null;
  learningConfidence: number;
  casesAnalyzed: number;
  reportsAnalyzed: number;
  patternsDiscovered: number;
  principlesExtracted: number;
  principlesValidated: number;
  cycleVersion: number;
  producedAt: Date;
  metadata: Record<string, unknown>;
}

// ── Learning Cycle Result ─────────────────────────────────────────────────────

export interface LearningCycleResult {
  report: LearningReport;
  newPrinciples: ExecutivePrinciple[];
  strengthenedPrinciples: ExecutivePrinciple[];
  weakeningPrinciples: ExecutivePrinciple[];
  deprecatedPrinciples: ExecutivePrinciple[];
  patternsDiscovered: DiscoveredPattern[];
  graphEdgesAdded: number;
}

// ── Learning Summary (for Executive Brain) ────────────────────────────────────

export interface LearningSummary {
  validatedPrincipleCount: number;
  candidatePrincipleCount: number;
  totalPrincipleCount: number;
  topValidatedPrinciples: Pick<ExecutivePrinciple, "id" | "title" | "confidence" | "category" | "businessDomain">[];
  lastLearningReportId: string | null;
  lastCycleAt: Date | null;
  learningCycleCount: number;
}

// ── Diagnostics ───────────────────────────────────────────────────────────────

export interface LearningDiagnostics {
  userId: number;
  totalPrinciples: number;
  byStatus: Record<PrincipleStatus, number>;
  averageConfidence: number;
  totalEvidence: number;
  totalContradictions: number;
  unresolvedContradictions: number;
  totalLearningReports: number;
  graphEdgeCount: number;
  lastCycleAt: Date | null;
}

// ── Extension Point IDs ───────────────────────────────────────────────────────

export const LEARNING_EXTENSION_POINT_IDS = {
  PRINCIPLE_DISCOVERED:        "principle-discovered",
  PRINCIPLE_VALIDATED:         "principle-validated",
  PRINCIPLE_DEPRECATED:        "principle-deprecated",
  PRINCIPLE_CONTRADICTION:     "principle-contradiction-found",
  PRINCIPLE_CONFIDENCE_UPDATED:"principle-confidence-updated",
  LEARNING_CYCLE_COMPLETED:    "learning-cycle-completed",
  PRINCIPLE_GRAPH_UPDATED:     "principle-graph-updated",
  LEARNING_REPORT_PRODUCED:    "learning-report-produced",
} as const;
