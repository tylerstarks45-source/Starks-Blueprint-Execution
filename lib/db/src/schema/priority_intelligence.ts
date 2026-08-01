// ── Build 039: Executive Priority Intelligence Engine — Schema ────────────
import { pgTable, serial, integer, text, real, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

// ── priority_profiles ─────────────────────────────────────────────────────
// Each evaluation run: what was ranked, composite result, scores, law flag.
export const priorityProfiles = pgTable("priority_profiles", {
  id:                    serial("id").primaryKey(),
  profileKey:            text("profile_key").notNull(),
  title:                 text("title").notNull(),
  description:           text("description").notNull(),
  domain:                text("domain").notNull(), // initiative|goal|opportunity|risk|tech_debt|mixed
  totalItems:            integer("total_items").notNull().default(0),
  topPriorityKey:        text("top_priority_key"),
  topPriorityTitle:      text("top_priority_title"),
  priorityLawApplied:    boolean("priority_law_applied").notNull().default(true),
  blockedItems:          integer("blocked_items").notNull().default(0),
  staleItems:            integer("stale_items").notNull().default(0),
  criticalEscalations:   integer("critical_escalations").notNull().default(0),
  overallHealth:         real("overall_health").notNull().default(0), // 0-1
  userId:                integer("user_id"),
  createdAt:             timestamp("created_at").notNull().defaultNow(),
});

// ── priority_scores ───────────────────────────────────────────────────────
// Individual item scores produced by the Priority Scoring Engine.
export const priorityScores = pgTable("priority_scores", {
  id:                    serial("id").primaryKey(),
  profileId:             integer("profile_id").notNull().references(() => priorityProfiles.id),
  itemKey:               text("item_key").notNull(),
  itemTitle:             text("item_title").notNull(),
  itemType:              text("item_type").notNull(), // PriorityItemType
  strategicValue:        real("strategic_value").notNull().default(0),   // 0-1
  businessImpact:        real("business_impact").notNull().default(0),
  urgency:               real("urgency").notNull().default(0),
  dependencyCriticality: real("dependency_criticality").notNull().default(0),
  resourceAvailability:  real("resource_availability").notNull().default(0),
  riskReduction:         real("risk_reduction").notNull().default(0),
  confidence:            real("confidence").notNull().default(0),
  timeSensitivity:       real("time_sensitivity").notNull().default(0),
  compositeScore:        real("composite_score").notNull().default(0),   // weighted composite
  rank:                  integer("rank").notNull().default(0),           // 1-based
  escalationLevel:       text("escalation_level").notNull().default("normal"),
  agingStatus:           text("aging_status").notNull().default("fresh"),
  isBlocked:             boolean("is_blocked").notNull().default(false),
  blockedBy:             jsonb("blocked_by").notNull().default([]),      // string[]
  priorityLawApplied:    boolean("priority_law_applied").notNull().default(true),
  createdAt:             timestamp("created_at").notNull().defaultNow(),
});

// ── priority_dependencies ─────────────────────────────────────────────────
// Upstream/downstream dependency relationships between priority items.
export const priorityDependencies = pgTable("priority_dependencies", {
  id:                serial("id").primaryKey(),
  profileId:         integer("profile_id").notNull().references(() => priorityProfiles.id),
  upstreamKey:       text("upstream_key").notNull(),
  downstreamKey:     text("downstream_key").notNull(),
  dependencyType:    text("dependency_type").notNull().default("blocks"), // blocks|enables|informs
  delayRisk:         real("delay_risk").notNull().default(0),             // 0-1
  isCriticalPath:    boolean("is_critical_path").notNull().default(false),
  notes:             text("notes"),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
});

// ── priority_attention ────────────────────────────────────────────────────
// Attention allocation analysis produced by the Attention Allocation Engine.
export const priorityAttention = pgTable("priority_attention", {
  id:                          serial("id").primaryKey(),
  profileId:                   integer("profile_id").notNull().references(() => priorityProfiles.id),
  attentionLoad:               real("attention_load").notNull().default(0),          // 0-1
  prioritySaturation:          real("priority_saturation").notNull().default(0),
  focusDrift:                  real("focus_drift").notNull().default(0),
  criticalWindowUtilization:   real("critical_window_utilization").notNull().default(0),
  attentionScore:              real("attention_score").notNull().default(0),
  topAttentionItems:           jsonb("top_attention_items").notNull().default([]),    // string[] item keys
  attentionWarnings:           jsonb("attention_warnings").notNull().default([]),    // string[]
  recommendedFocusArea:        text("recommended_focus_area"),
  createdAt:                   timestamp("created_at").notNull().defaultNow(),
});

// ── priority_escalations ──────────────────────────────────────────────────
// Escalation classification records. Engine classifies; never executes.
export const priorityEscalations = pgTable("priority_escalations", {
  id:                serial("id").primaryKey(),
  profileId:         integer("profile_id").notNull().references(() => priorityProfiles.id),
  itemKey:           text("item_key").notNull(),
  itemTitle:         text("item_title").notNull(),
  escalationLevel:   text("escalation_level").notNull(), // normal|important|high|critical|executive
  reason:            text("reason").notNull(),
  triggerDimensions: jsonb("trigger_dimensions").notNull().default([]),  // string[] which dimensions triggered
  compositeScore:    real("composite_score").notNull().default(0),
  urgencyScore:      real("urgency_score").notNull().default(0),
  businessRisk:      real("business_risk").notNull().default(0),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
});

// ── priority_history ──────────────────────────────────────────────────────
// Immutable record of every ranked evaluation — append-only, never updated.
export const priorityHistory = pgTable("priority_history", {
  id:               serial("id").primaryKey(),
  profileKey:       text("profile_key").notNull(),
  profileId:        integer("profile_id").notNull().references(() => priorityProfiles.id),
  topPriorityKey:   text("top_priority_key"),
  totalItems:       integer("total_items").notNull().default(0),
  blockedItems:     integer("blocked_items").notNull().default(0),
  criticalCount:    integer("critical_count").notNull().default(0),
  overallHealth:    real("overall_health").notNull().default(0),
  snapshotJson:     jsonb("snapshot_json").notNull().default({}), // light summary
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

// ── priority_registry ─────────────────────────────────────────────────────
// Authoritative current state — one row per profileKey (upserted on evaluation).
export const priorityRegistry = pgTable("priority_registry", {
  id:                  serial("id").primaryKey(),
  profileKey:          text("profile_key").notNull().unique(),
  title:               text("title").notNull(),
  domain:              text("domain").notNull(),
  topPriorityKey:      text("top_priority_key"),
  topPriorityTitle:    text("top_priority_title"),
  totalItems:          integer("total_items").notNull().default(0),
  blockedItems:        integer("blocked_items").notNull().default(0),
  staleItems:          integer("stale_items").notNull().default(0),
  criticalEscalations: integer("critical_escalations").notNull().default(0),
  overallHealth:       real("overall_health").notNull().default(0),
  priorityLawApplied:  boolean("priority_law_applied").notNull().default(true),
  lastEvaluatedAt:     timestamp("last_evaluated_at").notNull().defaultNow(),
  updatedAt:           timestamp("updated_at").notNull().defaultNow(),
});

// ── priority_snapshots ────────────────────────────────────────────────────
// Platform-wide aggregate snapshot per rebuild cycle — append-only.
export const prioritySnapshots = pgTable("priority_snapshots", {
  id:                   serial("id").primaryKey(),
  totalProfiles:        integer("total_profiles").notNull().default(0),
  totalItems:           integer("total_items").notNull().default(0),
  avgOverallHealth:     real("avg_overall_health").notNull().default(0),
  totalBlocked:         integer("total_blocked").notNull().default(0),
  totalStale:           integer("total_stale").notNull().default(0),
  totalCritical:        integer("total_critical").notNull().default(0),
  topPlatformPriority:  text("top_platform_priority"),
  executiveFocusArea:   text("executive_focus_area"),
  priorityLawRate:      real("priority_law_rate").notNull().default(1),
  createdAt:            timestamp("created_at").notNull().defaultNow(),
});

// ── priority_recommendations ──────────────────────────────────────────────
// Actionable recommendations produced by the Executive Priority Recommendation Engine.
export const priorityRecommendations = pgTable("priority_recommendations", {
  id:                serial("id").primaryKey(),
  profileId:         integer("profile_id").notNull().references(() => priorityProfiles.id),
  itemKey:           text("item_key").notNull(),
  itemTitle:         text("item_title").notNull(),
  action:            text("action").notNull(), // execute_now|prepare|monitor|delegate|delay|retire
  priority:          text("priority").notNull(), // critical|high|medium|low
  evidence:          jsonb("evidence").notNull().default([]),
  businessImpact:    text("business_impact").notNull(),
  opportunityCost:   text("opportunity_cost").notNull(),
  riskIfDelayed:     text("risk_if_delayed").notNull(),
  confidenceScore:   real("confidence_score").notNull().default(0),
  reasoningTrace:    text("reasoning_trace").notNull(),
  priorityLawApplied:boolean("priority_law_applied").notNull().default(true),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
});
