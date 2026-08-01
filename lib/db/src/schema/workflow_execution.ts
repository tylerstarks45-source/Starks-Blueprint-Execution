// ─────────────────────────────────────────────────────────────────────────────
// Build 028: Intelligent Workflow Execution Engine — Database Schema (8 tables)
// Append-only except workflow_registry (upserted).
// ─────────────────────────────────────────────────────────────────────────────
import {
  pgTable, text, integer, boolean, timestamp, numeric, jsonb,
} from "drizzle-orm/pg-core";

export const executionWorkflows = pgTable("execution_workflows", {
  id:                    text("id").primaryKey(),
  businessId:            integer("business_id").notNull(),
  userId:                integer("user_id"),
  simulationReportId:    text("simulation_report_id"),
  riskReportId:          text("risk_report_id"),
  authorityReportId:     text("authority_report_id"),
  orchestrationReportId: text("orchestration_report_id"),
  nodeCount:             integer("node_count").notNull().default(0),
  edgeCount:             integer("edge_count").notNull().default(0),
  checkpointCount:       integer("checkpoint_count").notNull().default(0),
  branchCount:           integer("branch_count").notNull().default(0),
  rollbackCount:         integer("rollback_count").notNull().default(0),
  phaseCount:            integer("phase_count").notNull().default(0),
  workflowComplexity:    text("workflow_complexity").notNull().default("moderate"), // simple|moderate|complex|very_complex
  rollbackCoverage:      numeric("rollback_coverage", { precision: 5, scale: 4 }).notNull().default("0"),
  workflowConfidence:    numeric("workflow_confidence", { precision: 5, scale: 4 }).notNull().default("0"),
  isWorkflowReady:       boolean("is_workflow_ready").notNull().default(false),
  executiveSummary:      text("executive_summary").notNull().default(""),
  buildDurationMs:       integer("build_duration_ms").notNull().default(0),
  createdAt:             timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workflowNodes = pgTable("workflow_nodes", {
  id:                    text("id").primaryKey(),
  workflowId:            text("workflow_id").notNull().references(() => executionWorkflows.id),
  businessId:            integer("business_id").notNull(),
  assignmentId:          text("assignment_id"),
  workPackageId:         text("work_package_id"),
  packageTitle:          text("package_title"),
  phase:                 text("phase").notNull().default("preparation"), // preparation|configuration|validation|deployment|verification|completion
  nodeType:              text("node_type").notNull().default("task"),    // task|gate|checkpoint|merge|fork|start|end
  nodeTitle:             text("node_title").notNull().default(""),
  nodeDescription:       text("node_description").notNull().default(""),
  sequencePosition:      integer("sequence_position").notNull().default(0),
  ownerType:             text("owner_type").notNull().default("automation"),
  executionClass:        text("execution_class").notNull().default("automated"),
  estimatedDurationHours: numeric("estimated_duration_hours", { precision: 8, scale: 2 }).notNull().default("0"),
  isCritical:            boolean("is_critical").notNull().default(false),
  status:                text("status").notNull().default("pending"),
  createdAt:             timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workflowEdges = pgTable("workflow_edges", {
  id:         text("id").primaryKey(),
  workflowId: text("workflow_id").notNull().references(() => executionWorkflows.id),
  businessId: integer("business_id").notNull(),
  fromNodeId: text("from_node_id").notNull().references(() => workflowNodes.id),
  toNodeId:   text("to_node_id").notNull().references(() => workflowNodes.id),
  edgeType:   text("edge_type").notNull().default("sequential"), // sequential|parallel|conditional|rollback|retry
  edgeLabel:  text("edge_label").notNull().default(""),
  condition:  text("condition").notNull().default(""),
  isCritical: boolean("is_critical").notNull().default(false),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workflowCheckpoints = pgTable("workflow_checkpoints", {
  id:                 text("id").primaryKey(),
  workflowId:         text("workflow_id").notNull().references(() => executionWorkflows.id),
  nodeId:             text("node_id").notNull().references(() => workflowNodes.id),
  businessId:         integer("business_id").notNull(),
  checkpointType:     text("checkpoint_type").notNull().default("pre_execution"), // pre_execution|post_execution|validation_gate|rollback_marker
  expectedState:      text("expected_state").notNull().default(""),
  requiredValidation: text("required_validation").notNull().default(""),
  rollbackMarker:     text("rollback_marker").notNull().default(""),
  successCriteria:    text("success_criteria").notNull().default(""),
  isBlocking:         boolean("is_blocking").notNull().default(true),
  createdAt:          timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workflowBranches = pgTable("workflow_branches", {
  id:                text("id").primaryKey(),
  workflowId:        text("workflow_id").notNull().references(() => executionWorkflows.id),
  nodeId:            text("node_id").notNull().references(() => workflowNodes.id),
  businessId:        integer("business_id").notNull(),
  branchCondition:   text("branch_condition").notNull(), // success|failure|retry|escalation|skip|manual_approval
  targetNodeId:      text("target_node_id"),
  branchDescription: text("branch_description").notNull().default(""),
  priority:          integer("priority").notNull().default(0),
  isDefaultPath:     boolean("is_default_path").notNull().default(false),
  createdAt:         timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workflowRollbacks = pgTable("workflow_rollbacks", {
  id:                          text("id").primaryKey(),
  workflowId:                  text("workflow_id").notNull().references(() => executionWorkflows.id),
  nodeId:                      text("node_id").notNull().references(() => workflowNodes.id),
  businessId:                  integer("business_id").notNull(),
  rollbackTargetNodeId:        text("rollback_target_node_id"),
  rollbackStrategy:            text("rollback_strategy").notNull().default("checkpoint"), // immediate|checkpoint|full
  rollbackSteps:               jsonb("rollback_steps").notNull().default("[]"),
  estimatedRollbackDurationHours: numeric("estimated_rollback_duration_hours", { precision: 8, scale: 2 }).notNull().default("0"),
  rollbackConfidence:          numeric("rollback_confidence", { precision: 5, scale: 4 }).notNull().default("0"),
  createdAt:                   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workflowRegistry = pgTable("workflow_registry", {
  id:                 text("id").primaryKey(),
  businessId:         integer("business_id").notNull().unique(),
  latestWorkflowId:   text("latest_workflow_id"),
  nodeCount:          integer("node_count").notNull().default(0),
  edgeCount:          integer("edge_count").notNull().default(0),
  checkpointCount:    integer("checkpoint_count").notNull().default(0),
  rollbackCoverage:   numeric("rollback_coverage", { precision: 5, scale: 4 }).notNull().default("0"),
  workflowConfidence: numeric("workflow_confidence", { precision: 5, scale: 4 }).notNull().default("0"),
  isWorkflowReady:    boolean("is_workflow_ready").notNull().default(false),
  lastBuildAt:        timestamp("last_build_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt:          timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:          timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workflowSnapshots = pgTable("workflow_snapshots", {
  id:           text("id").primaryKey(),
  workflowId:   text("workflow_id").notNull().references(() => executionWorkflows.id),
  businessId:   integer("business_id").notNull(),
  userId:       integer("user_id"),
  snapshotData: jsonb("snapshot_data").notNull().default("{}"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
