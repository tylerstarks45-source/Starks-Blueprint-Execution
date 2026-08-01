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

// ── Build 036: Systems Dynamics Intelligence Engine ───────────────────────
// Append-only history. Only systems_registry is mutable (upsert).

// 1. Systems — top-level system definitions
export const systems = pgTable("sdi_systems", {
  id:               serial("id").primaryKey(),
  systemKey:        text("system_key").notNull().unique(),
  systemName:       text("system_name").notNull(),
  systemType:       text("system_type").notNull(),       // business | technology | execution | intelligence | data | user | infrastructure | integration
  description:      text("description").notNull(),
  boundaryScope:    text("boundary_scope").notNull(),    // platform | business | infrastructure | external
  componentCount:   integer("component_count").notNull().default(0),
  connectionCount:  integer("connection_count").notNull().default(0),
  stabilityScore:   real("stability_score").notNull().default(0),
  complexityScore:  real("complexity_score").notNull().default(0),
  healthScore:      real("health_score").notNull().default(0),
  maturityLevel:    text("maturity_level").notNull(),    // nascent | emerging | established | mature | legacy
  criticalPath:     boolean("critical_path").notNull().default(false),
  systemNotes:      text("system_notes"),
  capturedAt:       timestamp("captured_at").notNull().defaultNow(),
});

// 2. Subsystems — components within a parent system
export const subsystems = pgTable("sdi_subsystems", {
  id:               serial("id").primaryKey(),
  parentSystemKey:  text("parent_system_key").notNull(),
  subsystemKey:     text("subsystem_key").notNull(),
  subsystemName:    text("subsystem_name").notNull(),
  subsystemType:    text("subsystem_type").notNull(),    // engine | service | layer | module | integration | adapter | store
  role:             text("role").notNull(),
  autonomyLevel:    text("autonomy_level").notNull(),    // autonomous | semi-autonomous | dependent | passive
  couplingStrength: text("coupling_strength").notNull(), // tight | moderate | loose | decoupled
  healthScore:      real("health_score").notNull().default(0),
  stabilityScore:   real("stability_score").notNull().default(0),
  isBottleneck:     boolean("is_bottleneck").notNull().default(false),
  isCritical:       boolean("is_critical").notNull().default(false),
  subsystemNotes:   text("subsystem_notes"),
  capturedAt:       timestamp("captured_at").notNull().defaultNow(),
});

// 3. Feedback loops — reinforcing, balancing, delayed, emergent
export const feedbackLoops = pgTable("sdi_feedback_loops", {
  id:               serial("id").primaryKey(),
  systemKey:        text("system_key").notNull(),
  loopKey:          text("loop_key").notNull(),
  loopName:         text("loop_name").notNull(),
  loopType:         text("loop_type").notNull(),         // reinforcing | balancing | delayed | emergent
  direction:        text("direction").notNull(),         // amplifying | dampening | oscillating | stabilizing
  strength:         text("strength").notNull(),          // strong | moderate | weak | negligible
  strengthScore:    real("strength_score").notNull(),
  triggerCondition: text("trigger_condition").notNull(),
  effect:           text("effect").notNull(),
  components:       text("components").array().notNull().default([]),
  timeConstant:     text("time_constant").notNull(),     // immediate | short-term | medium-term | long-term
  desirability:     text("desirability").notNull(),      // beneficial | neutral | harmful | unknown
  loopNotes:        text("loop_notes"),
  capturedAt:       timestamp("captured_at").notNull().defaultNow(),
});

// 4. Propagation paths — how changes cascade through the system
export const propagationPaths = pgTable("sdi_propagation_paths", {
  id:               serial("id").primaryKey(),
  sourceSystemKey:  text("source_system_key").notNull(),
  targetSystemKey:  text("target_system_key").notNull(),
  pathKey:          text("path_key").notNull(),
  propagationType:  text("propagation_type").notNull(),  // failure | recovery | performance | change | load
  propagationSpeed: text("propagation_speed").notNull(), // immediate | fast | moderate | slow | gradual
  impactMagnitude:  text("impact_magnitude").notNull(),  // critical | high | medium | low | negligible
  impactScore:      real("impact_score").notNull(),
  probability:      real("probability").notNull(),
  hopsCount:        integer("hops_count").notNull().default(1),
  intermediaries:   text("intermediaries").array().notNull().default([]),
  mitigationExists: boolean("mitigation_exists").notNull().default(false),
  mitigationNotes:  text("mitigation_notes"),
  capturedAt:       timestamp("captured_at").notNull().defaultNow(),
});

// 5. System constraints — what limits system performance
export const systemConstraints = pgTable("sdi_system_constraints", {
  id:               serial("id").primaryKey(),
  systemKey:        text("system_key").notNull(),
  constraintKey:    text("constraint_key").notNull(),
  constraintName:   text("constraint_name").notNull(),
  constraintType:   text("constraint_type").notNull(),   // execution | technology | business | infrastructure | human | regulatory | financial
  severity:         text("severity").notNull(),          // critical | high | medium | low
  severityScore:    real("severity_score").notNull(),
  description:      text("description").notNull(),
  rootCause:        text("root_cause").notNull(),
  downstreamImpact: text("downstream_impact").notNull(),
  isPrimary:        boolean("is_primary").notNull().default(false),
  isActivelyManaged:boolean("is_actively_managed").notNull().default(false),
  resolutionPath:   text("resolution_path"),
  capturedAt:       timestamp("captured_at").notNull().defaultNow(),
});

// 6. Leverage points — smallest changes → greatest impact
export const leveragePoints = pgTable("sdi_leverage_points", {
  id:               serial("id").primaryKey(),
  systemKey:        text("system_key").notNull(),
  leverageKey:      text("leverage_key").notNull(),
  leverageName:     text("leverage_name").notNull(),
  leverageType:     text("leverage_type").notNull(),     // structural | process | behavioral | technical | governance | information
  leverageScore:    real("leverage_score").notNull(),    // 0–1, higher = more leverage
  expectedImpact:   real("expected_impact").notNull(),   // 0–1
  riskScore:        real("risk_score").notNull(),        // 0–1
  confidenceScore:  real("confidence_score").notNull(),  // 0–1
  description:      text("description").notNull(),
  mechanism:        text("mechanism").notNull(),
  targetComponent:  text("target_component").notNull(),
  affectedSystems:  text("affected_systems").array().notNull().default([]),
  implementationComplexity: text("implementation_complexity").notNull(), // low | medium | high | very-high
  timeToImpact:     text("time_to_impact").notNull(),    // immediate | short-term | medium-term | long-term
  leverageNotes:    text("leverage_notes"),
  capturedAt:       timestamp("captured_at").notNull().defaultNow(),
});

// 7. System resilience — robustness, redundancy, fault tolerance
export const systemResilience = pgTable("sdi_system_resilience", {
  id:               serial("id").primaryKey(),
  systemKey:        text("system_key").notNull(),
  robustnessScore:  real("robustness_score").notNull(),
  redundancyScore:  real("redundancy_score").notNull(),
  faultToleranceScore: real("fault_tolerance_score").notNull(),
  recoveryCapacityScore: real("recovery_capacity_score").notNull(),
  operationalResilienceScore: real("operational_resilience_score").notNull(),
  compositeResilienceScore: real("composite_resilience_score").notNull(),
  singlePointsOfFailure: integer("single_points_of_failure").notNull().default(0),
  redundantPaths:   integer("redundant_paths").notNull().default(0),
  meanTimeToRecovery: text("mean_time_to_recovery").notNull(), // minutes | hours | days
  resilienceLevel:  text("resilience_level").notNull(),        // high | medium | low | critical
  vulnerabilities:  text("vulnerabilities").array().notNull().default([]),
  strengths:        text("strengths").array().notNull().default([]),
  resilienceNotes:  text("resilience_notes"),
  capturedAt:       timestamp("captured_at").notNull().defaultNow(),
});

// 8. Systems registry — authoritative current state (mutable, one row per system)
export const systemsRegistry = pgTable("sdi_systems_registry", {
  id:               serial("id").primaryKey(),
  systemKey:        text("system_key").notNull().unique(),
  systemName:       text("system_name").notNull(),
  systemType:       text("system_type").notNull(),
  healthScore:      real("health_score").notNull().default(0),
  stabilityScore:   real("stability_score").notNull().default(0),
  resilienceScore:  real("resilience_score").notNull().default(0),
  complexityScore:  real("complexity_score").notNull().default(0),
  constraintCount:  integer("constraint_count").notNull().default(0),
  leverageCount:    integer("leverage_count").notNull().default(0),
  feedbackLoopCount:integer("feedback_loop_count").notNull().default(0),
  propagationRiskScore: real("propagation_risk_score").notNull().default(0),
  overallSystemScore: real("overall_system_score").notNull().default(0),
  topConstraint:    text("top_constraint"),
  topLeveragePoint: text("top_leverage_point"),
  criticalPath:     boolean("critical_path").notNull().default(false),
  lastRebuiltAt:    timestamp("last_rebuilt_at").notNull().defaultNow(),
});

// 9. Systems snapshots — platform-level aggregate history
export const systemsSnapshots = pgTable("sdi_systems_snapshots", {
  id:               serial("id").primaryKey(),
  capturedAt:       timestamp("captured_at").notNull().defaultNow(),
  totalSystems:     integer("total_systems").notNull().default(0),
  totalSubsystems:  integer("total_subsystems").notNull().default(0),
  totalFeedbackLoops: integer("total_feedback_loops").notNull().default(0),
  totalPropagationPaths: integer("total_propagation_paths").notNull().default(0),
  totalConstraints: integer("total_constraints").notNull().default(0),
  criticalConstraints: integer("critical_constraints").notNull().default(0),
  totalLeveragePoints: integer("total_leverage_points").notNull().default(0),
  averageSystemHealth: real("average_system_health"),
  averageResilience:  real("average_resilience"),
  averageStability:   real("average_stability"),
  platformSystemsScore: real("platform_systems_score"),
  highestRiskSystem:   text("highest_risk_system"),
  highestLeverageSystem: text("highest_leverage_system"),
  snapshotData:        jsonb("snapshot_data"),
});
