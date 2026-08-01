// ── Build 039: Executive Priority Intelligence Engine — Types ─────────────

export type PriorityItemType =
  | "initiative"
  | "goal"
  | "opportunity"
  | "risk"
  | "technical_debt"
  | "infrastructure"
  | "business_improvement"
  | "execution";

export type EscalationLevel = "normal" | "important" | "high" | "critical" | "executive";

export type PriorityAction = "execute_now" | "prepare" | "monitor" | "delegate" | "delay" | "retire";

export type PriorityActionPriority = "critical" | "high" | "medium" | "low";

export type AgingStatus = "fresh" | "aging" | "neglected" | "stale" | "critical_neglect";

export type DependencyType = "blocks" | "enables" | "informs";

export type PriorityDomain =
  | "initiative"
  | "goal"
  | "opportunity"
  | "risk"
  | "tech_debt"
  | "execution"
  | "mixed";

// ── Input model ───────────────────────────────────────────────────────────

export interface PriorityItemInput {
  key:                   string;
  title:                 string;
  description:           string;
  type:                  PriorityItemType;
  strategicValue:        number; // 0-1: how aligned to long-term strategy
  businessImpact:        number; // 0-1: effect on business outcomes
  urgency:               number; // 0-1: time pressure (NOT the sole driver)
  resourceAvailability:  number; // 0-1: how available resources currently are
  riskReduction:         number; // 0-1: how much risk this removes if completed
  confidence:            number; // 0-1: confidence in estimates
  timeSensitivity:       number; // 0-1: penalty for delay
  ageInDays:             number; // how long this item has been open/pending
  dependencies?:         string[]; // keys of items this depends on
  status?:               "active" | "planned" | "blocked" | "on_hold" | "completed";
}

export interface PriorityEvaluationRequest {
  profileKey:    string;
  title:         string;
  description:   string;
  domain:        PriorityDomain;
  items:         PriorityItemInput[];
  userId?:       number;
}

// ── Dimension weights (Executive Priority Law enforces balance) ────────────

export const PRIORITY_WEIGHTS = {
  strategicValue:        0.20,
  businessImpact:        0.20,
  urgency:               0.10,  // deliberately lower — urgency ≠ importance
  dependencyCriticality: 0.15,
  resourceAvailability:  0.10,
  riskReduction:         0.10,
  confidence:            0.05,
  timeSensitivity:       0.10,
} as const;

// ── Computed types ────────────────────────────────────────────────────────

export interface ScoredItem {
  itemKey:               string;
  itemTitle:             string;
  itemType:              PriorityItemType;
  strategicValue:        number;
  businessImpact:        number;
  urgency:               number;
  dependencyCriticality: number;
  resourceAvailability:  number;
  riskReduction:         number;
  confidence:            number;
  timeSensitivity:       number;
  compositeScore:        number;
  rank:                  number;
  escalationLevel:       EscalationLevel;
  agingStatus:           AgingStatus;
  isBlocked:             boolean;
  blockedBy:             string[];
  priorityLawApplied:    boolean;
}

export interface DependencyAnalysis {
  upstreamKey:    string;
  downstreamKey:  string;
  dependencyType: DependencyType;
  delayRisk:      number;
  isCriticalPath: boolean;
  notes:          string;
}

export interface AttentionResult {
  attentionLoad:              number; // 0-1: total cognitive load
  prioritySaturation:         number; // 0-1: how full the priority queue is
  focusDrift:                 number; // 0-1: spread across too many priorities
  criticalWindowUtilization:  number; // 0-1: how well critical windows are used
  attentionScore:             number; // 0-1 composite (higher = healthier allocation)
  topAttentionItems:          string[];
  attentionWarnings:          string[];
  recommendedFocusArea:       string | null;
}

export interface EscalationRecord {
  itemKey:           string;
  itemTitle:         string;
  escalationLevel:   EscalationLevel;
  reason:            string;
  triggerDimensions: string[];
  compositeScore:    number;
  urgencyScore:      number;
  businessRisk:      number;
}

export interface AgingAnalysis {
  itemKey:     string;
  ageInDays:   number;
  agingStatus: AgingStatus;
  penaltyApplied: number; // 0-1 penalty on composite score
  warningMessage: string;
}

export interface PriorityRecommendationResult {
  itemKey:           string;
  itemTitle:         string;
  action:            PriorityAction;
  priority:          PriorityActionPriority;
  evidence:          { point: string; source: string }[];
  businessImpact:    string;
  opportunityCost:   string;
  riskIfDelayed:     string;
  confidenceScore:   number;
  reasoningTrace:    string;
  priorityLawApplied:boolean;
}

export interface PriorityEvaluationResult {
  profileId:         number;
  profileKey:        string;
  rankedItems:       ScoredItem[];
  dependencies:      DependencyAnalysis[];
  attention:         AttentionResult;
  escalations:       EscalationRecord[];
  recommendations:   PriorityRecommendationResult[];
  totalItems:        number;
  blockedItems:      number;
  staleItems:        number;
  criticalEscalations:number;
  overallHealth:     number;
  topPriorityKey:    string | null;
  topPriorityTitle:  string | null;
}

// ── EB summary ────────────────────────────────────────────────────────────

export interface PriorityIntelligenceSummary {
  totalProfiles:          number;
  totalItems:             number;
  avgOverallHealth:       number;
  totalBlocked:           number;
  totalStale:             number;
  totalCritical:          number;
  topPlatformPriority:    string | null;
  executiveFocusArea:     string | null;
  priorityLawRate:        number; // 0-1
  profileSummaries:       {
    profileKey:          string;
    title:               string;
    overallHealth:       number;
    blockedItems:        number;
    topPriorityKey:      string | null;
    topPriorityTitle:    string | null;
    criticalEscalations: number;
  }[];
}

// ── EP IDs ────────────────────────────────────────────────────────────────

export const EPRI_EP_IDS = {
  PRIORITY_SCORING:       "epri.priority.scoring",
  DEPENDENCY_PRIORITY:    "epri.dependency.priority",
  ATTENTION_ALLOCATION:   "epri.attention.allocation",
  ESCALATION_INTELLIGENCE:"epri.escalation.intelligence",
  PRIORITY_AGING:         "epri.priority.aging",
  RECOMMENDATION:         "epri.priority.recommendation",
  ORCHESTRATION:          "epri.orchestration",
  ADVISORY:               "epri.advisory",
} as const;
