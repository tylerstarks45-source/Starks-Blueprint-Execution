import {
  pgTable,
  serial,
  text,
  real,
  boolean,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

// ── Build 037: Executive Trade-off Intelligence Engine ────────────────────
// Append-only history. Only tradeoff_registry is mutable (upsert).

// 1. Trade-off scenarios — a decision evaluation context
export const tradeoffScenarios = pgTable("tradeoff_scenarios", {
  id:              serial("id").primaryKey(),
  scenarioKey:     text("scenario_key").notNull(),
  title:           text("title").notNull(),
  description:     text("description").notNull(),
  decisionType:    text("decision_type").notNull(),  // build-vs-buy | speed-vs-quality | cost-vs-performance | risk-vs-reward | innovation-vs-stability | automation-vs-manual | growth-vs-sustainability | security-vs-usability | capital-vs-operating | simplicity-vs-flexibility | infrastructure-vs-cloud | latency-vs-cost | custom
  contextDomain:   text("context_domain").notNull(), // technology | business | execution | infrastructure | product | operations
  optionCount:     integer("option_count").notNull().default(0),
  objectiveCount:  integer("objective_count").notNull().default(0),
  constraintCount: integer("constraint_count").notNull().default(0),
  status:          text("status").notNull().default("evaluated"), // evaluated | pending | stale
  triggeredBy:     text("triggered_by").notNull().default("platform"), // platform | user | admin
  userId:          integer("user_id"),
  capturedAt:      timestamp("captured_at").notNull().defaultNow(),
});

// 2. Constraint sets — constraints that bound the decision space
export const constraintSets = pgTable("tradeoff_constraint_sets", {
  id:              serial("id").primaryKey(),
  scenarioId:      integer("scenario_id").notNull(),
  constraintKey:   text("constraint_key").notNull(),
  constraintType:  text("constraint_type").notNull(), // budget | timeline | risk | skills | infrastructure | compliance | business | operational
  constraintName:  text("constraint_name").notNull(),
  constraintValue: text("constraint_value").notNull(),
  constraintUnit:  text("constraint_unit"),
  severity:        text("severity").notNull(),         // hard | soft | preference
  isBindingNow:    boolean("is_binding_now").notNull().default(true),
  relatesTo:       text("relates_to").array().notNull().default([]),
  notes:           text("notes"),
  capturedAt:      timestamp("captured_at").notNull().defaultNow(),
});

// 3. Optimization profiles — weighted objectives per scenario
export const optimizationProfiles = pgTable("tradeoff_optimization_profiles", {
  id:               serial("id").primaryKey(),
  scenarioId:       integer("scenario_id").notNull(),
  objective:        text("objective").notNull(),       // cost | performance | speed | quality | risk | reward | simplicity | flexibility | short_term | long_term | innovation | stability | growth | sustainability | security | usability | latency | automation | build | buy
  weight:           real("weight").notNull(),           // 0–1, must sum to 1 across scenario
  targetDirection:  text("target_direction").notNull(), // minimize | maximize | balance
  rationale:        text("rationale").notNull(),
  capturedAt:       timestamp("captured_at").notNull().defaultNow(),
});

// 4. Trade-off matrices — per-option objective scores
export const tradeoffMatrices = pgTable("tradeoff_matrices", {
  id:                   serial("id").primaryKey(),
  scenarioId:           integer("scenario_id").notNull(),
  optionKey:            text("option_key").notNull(),
  optionName:           text("option_name").notNull(),
  optionDescription:    text("option_description").notNull(),
  objectiveScores:      jsonb("objective_scores").notNull(),   // { objective: score (0-1) }
  constraintViolations: jsonb("constraint_violations").notNull().default([]), // violated hard constraints
  weightedCompositeScore: real("weighted_composite_score").notNull(),
  rawCompositeScore:    real("raw_composite_score").notNull(),
  dominanceRank:        integer("dominance_rank").notNull().default(0), // 1=best
  isOnFrontier:         boolean("is_on_frontier").notNull().default(false),
  explanations:         jsonb("explanations").notNull().default([]),   // {objective, score, reason}[]
  capturedAt:           timestamp("captured_at").notNull().defaultNow(),
});

// 5. Decision frontiers — Pareto-optimal option sets
export const decisionFrontiers = pgTable("tradeoff_decision_frontiers", {
  id:                   serial("id").primaryKey(),
  scenarioId:           integer("scenario_id").notNull(),
  frontierOptions:      jsonb("frontier_options").notNull(),    // [{key, name, score}]
  dominatedOptions:     jsonb("dominated_options").notNull(),   // [{key, name, dominatedBy}]
  frontierSize:         integer("frontier_size").notNull().default(0),
  dominatedCount:       integer("dominated_count").notNull().default(0),
  objectivesConsidered: text("objectives_considered").array().notNull().default([]),
  frontierExplanation:  text("frontier_explanation").notNull(),
  recommendedFromFrontier: text("recommended_from_frontier"),
  capturedAt:           timestamp("captured_at").notNull().defaultNow(),
});

// 6. Sensitivity analyses — how recommendations shift under constraint changes
export const sensitivityAnalyses = pgTable("tradeoff_sensitivity_analyses", {
  id:                      serial("id").primaryKey(),
  scenarioId:              integer("scenario_id").notNull(),
  changedConstraint:       text("changed_constraint").notNull(),
  changeType:              text("change_type").notNull(),         // relax | tighten | remove | add
  changeDescription:       text("change_description").notNull(),
  originalRecommendation:  text("original_recommendation").notNull(),
  sensitizedRecommendation:text("sensitized_recommendation").notNull(),
  recommendationChanged:   boolean("recommendation_changed").notNull().default(false),
  sensitivityScore:        real("sensitivity_score").notNull(),   // 0=insensitive, 1=highly sensitive
  affectedObjectives:      text("affected_objectives").array().notNull().default([]),
  analysis:                text("analysis").notNull(),
  capturedAt:              timestamp("captured_at").notNull().defaultNow(),
});

// 7. Trade-off registry — authoritative current state (mutable, one row per scenario key)
export const tradeoffRegistry = pgTable("tradeoff_registry", {
  id:                   serial("id").primaryKey(),
  scenarioKey:          text("scenario_key").notNull().unique(),
  title:                text("title").notNull(),
  decisionType:         text("decision_type").notNull(),
  recommendedOption:    text("recommended_option").notNull(),
  runnerUpOption:       text("runner_up_option"),
  rejectedOptions:      jsonb("rejected_options").notNull().default([]),
  tradeoffExplanation:  text("tradeoff_explanation").notNull(),
  keyAssumptions:       jsonb("key_assumptions").notNull().default([]),
  sensitivityFlag:      boolean("sensitivity_flag").notNull().default(false), // recommendation is sensitive to constraint changes
  confidenceScore:      real("confidence_score").notNull(),
  executiveLawApplied:  boolean("executive_law_applied").notNull().default(true),
  lastEvaluatedAt:      timestamp("last_evaluated_at").notNull().defaultNow(),
});

// 8. Trade-off snapshots — platform-level aggregate history
export const tradeoffSnapshots = pgTable("tradeoff_snapshots", {
  id:                      serial("id").primaryKey(),
  capturedAt:              timestamp("captured_at").notNull().defaultNow(),
  totalEvaluations:        integer("total_evaluations").notNull().default(0),
  frontierDecisions:       integer("frontier_decisions").notNull().default(0),
  highConfidenceDecisions: integer("high_confidence_decisions").notNull().default(0),
  sensitivitiesDetected:   integer("sensitivities_detected").notNull().default(0),
  averageConfidenceScore:  real("average_confidence_score"),
  averageFrontierSize:     real("average_frontier_size"),
  mostCommonDecisionType:  text("most_common_decision_type"),
  topConstraintType:       text("top_constraint_type"),
  snapshotData:            jsonb("snapshot_data"),
});

// 9. Executive preferences — user/org preference profiles
export const executivePreferences = pgTable("tradeoff_executive_preferences", {
  id:                   serial("id").primaryKey(),
  userId:               integer("user_id"),
  preferenceKey:        text("preference_key").notNull(),
  decisionType:         text("decision_type").notNull().default("all"),
  riskTolerance:        text("risk_tolerance").notNull().default("moderate"), // low | moderate | high
  timeHorizon:          text("time_horizon").notNull().default("medium"),     // short | medium | long
  costSensitivity:      real("cost_sensitivity").notNull().default(0.50),     // 0=unconcerned, 1=cost-first
  qualityBias:          real("quality_bias").notNull().default(0.50),
  innovationAppetite:   real("innovation_appetite").notNull().default(0.50),
  sustainabilityWeight: real("sustainability_weight").notNull().default(0.30),
  preferenceNotes:      text("preference_notes"),
  capturedAt:           timestamp("captured_at").notNull().defaultNow(),
});
