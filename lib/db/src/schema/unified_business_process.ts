import {
  pgTable, serial, integer, text, boolean, timestamp, jsonb, real, index, uniqueIndex
} from "drizzle-orm/pg-core";

// ─── business_processes ───────────────────────────────────────────────────────
export const businessProcesses = pgTable(
  "business_processes",
  {
    id:                 serial("id").primaryKey(),
    processId:          text("process_id").notNull(),
    userId:             integer("user_id"),
    businessId:         integer("business_id"),
    title:              text("title").notNull(),
    description:        text("description"),
    processDomain:      text("process_domain").notNull(), // sales | marketing | customer_success | support | finance | accounting | human_resources | operations | fulfillment | procurement | compliance | legal | it | ai_operations | administration | future_domain
    processType:        text("process_type").notNull(),   // standard | approval_flow | onboarding | checklist | pipeline | workflow | sop | playbook | future_type
    status:             text("status").notNull().default("draft"), // draft | active | paused | completed | archived
    version:            integer("version").notNull().default(1),
    ownerId:            integer("owner_id"),
    templateId:         text("template_id"),
    stageCount:         integer("stage_count").notNull().default(0),
    completedStages:    integer("completed_stages").notNull().default(0),
    slaHours:           real("sla_hours"),               // total SLA budget in hours
    slaStatus:          text("sla_status").default("on_track"), // on_track | at_risk | breached | completed
    healthScore:        real("health_score").default(0), // 0-100
    optimizationScore:  real("optimization_score").default(0),
    tags:               jsonb("tags").default("[]"),
    metadata:           jsonb("metadata").default("{}"),
    startedAt:          timestamp("started_at"),
    completedAt:        timestamp("completed_at"),
    dueAt:              timestamp("due_at"),
    createdAt:          timestamp("created_at").defaultNow(),
  },
  (t) => ({
    processIdIdx:   index("bp_process_id_idx").on(t.processId),
    userIdIdx:      index("bp_user_id_idx").on(t.userId),
    businessIdIdx:  index("bp_business_id_idx").on(t.businessId),
    domainIdx:      index("bp_process_domain_idx").on(t.processDomain),
    statusIdx:      index("bp_status_idx").on(t.status),
    slaStatusIdx:   index("bp_sla_status_idx").on(t.slaStatus),
  })
);

// ─── process_stages ───────────────────────────────────────────────────────────
export const processStages = pgTable(
  "process_stages",
  {
    id:               serial("id").primaryKey(),
    stageId:          text("stage_id").notNull(),
    processId:        text("process_id").notNull(),
    userId:           integer("user_id"),
    title:            text("title").notNull(),
    description:      text("description"),
    stageOrder:       integer("stage_order").notNull(),
    stageType:        text("stage_type").notNull(), // sequential | parallel | conditional | approval | milestone | terminal
    status:           text("status").notNull().default("pending"), // pending | in_progress | blocked | completed | skipped
    assigneeId:       integer("assignee_id"),
    assigneeType:     text("assignee_type"),         // user | team | role | ai_agent | external
    requiresApproval: boolean("requires_approval").default(false),
    slaHours:         real("sla_hours"),
    startedAt:        timestamp("started_at"),
    completedAt:      timestamp("completed_at"),
    dueAt:            timestamp("due_at"),
    blockedReason:    text("blocked_reason"),
    stepCount:        integer("step_count").notNull().default(0),
    completedSteps:   integer("completed_steps").notNull().default(0),
    metadata:         jsonb("metadata").default("{}"),
    createdAt:        timestamp("created_at").defaultNow(),
  },
  (t) => ({
    stageIdIdx:   index("ps_stage_id_idx").on(t.stageId),
    processIdIdx: index("ps_process_id_idx").on(t.processId),
    userIdIdx:    index("ps_user_id_idx").on(t.userId),
    statusIdx:    index("ps_status_idx").on(t.status),
    orderIdx:     index("ps_stage_order_idx").on(t.stageOrder),
  })
);

// ─── process_steps ────────────────────────────────────────────────────────────
export const processSteps = pgTable(
  "process_steps",
  {
    id:               serial("id").primaryKey(),
    stepId:           text("step_id").notNull(),
    stageId:          text("stage_id").notNull(),
    processId:        text("process_id").notNull(),
    userId:           integer("user_id"),
    title:            text("title").notNull(),
    description:      text("description"),
    stepOrder:        integer("step_order").notNull(),
    stepType:         text("step_type").notNull(), // action | decision | approval | notification | integration | ai_task | human_task | review | future_step
    status:           text("status").notNull().default("pending"), // pending | in_progress | completed | failed | skipped
    isRequired:       boolean("is_required").default(true),
    isBlocking:       boolean("is_blocking").default(false),
    assigneeId:       integer("assignee_id"),
    inputSchema:      jsonb("input_schema").default("{}"),
    outputSchema:     jsonb("output_schema").default("{}"),
    completedAt:      timestamp("completed_at"),
    metadata:         jsonb("metadata").default("{}"),
    createdAt:        timestamp("created_at").defaultNow(),
  },
  (t) => ({
    stepIdIdx:    index("pst_step_id_idx").on(t.stepId),
    stageIdIdx:   index("pst_stage_id_idx").on(t.stageId),
    processIdIdx: index("pst_process_id_idx").on(t.processId),
    statusIdx:    index("pst_status_idx").on(t.status),
  })
);

// ─── process_rules ────────────────────────────────────────────────────────────
export const processRules = pgTable(
  "process_rules",
  {
    id:           serial("id").primaryKey(),
    ruleId:       text("rule_id").notNull(),
    processId:    text("process_id").notNull(),
    userId:       integer("user_id"),
    title:        text("title").notNull(),
    description:  text("description"),
    ruleType:     text("rule_type").notNull(), // approval_gate | decision_branch | sla_policy | escalation | validation | notification | business_rule | automation
    triggerEvent: text("trigger_event"),       // stage_start | stage_complete | step_fail | sla_breach | approval_request | custom
    conditions:   jsonb("conditions").default("[]"), // [{field, operator, value}]
    actions:      jsonb("actions").default("[]"),    // [{actionType, payload}]
    priority:     integer("priority").notNull().default(50),
    isActive:     boolean("is_active").default(true),
    metadata:     jsonb("metadata").default("{}"),
    createdAt:    timestamp("created_at").defaultNow(),
  },
  (t) => ({
    ruleIdIdx:    index("pr_rule_id_idx").on(t.ruleId),
    processIdIdx: index("pr_process_id_idx").on(t.processId),
    typeIdx:      index("pr_rule_type_idx").on(t.ruleType),
    activeIdx:    index("pr_is_active_idx").on(t.isActive),
  })
);

// ─── process_dependencies ─────────────────────────────────────────────────────
export const processDependencies = pgTable(
  "process_dependencies",
  {
    id:               serial("id").primaryKey(),
    dependencyId:     text("dependency_id").notNull(),
    sourceProcessId:  text("source_process_id").notNull(),
    targetProcessId:  text("target_process_id").notNull(),
    dependencyType:   text("dependency_type").notNull(), // must_complete_before | triggers | feeds_data_to | approval_required_by | blocks | informs | future_dep
    strength:         real("strength").default(1.0),     // 1.0 = hard block, 0.5 = soft
    isCriticalPath:   boolean("is_critical_path").default(false),
    description:      text("description"),
    metadata:         jsonb("metadata").default("{}"),
    createdAt:        timestamp("created_at").defaultNow(),
  },
  (t) => ({
    depIdIdx:     index("pd_dependency_id_idx").on(t.dependencyId),
    sourceIdx:    index("pd_source_process_id_idx").on(t.sourceProcessId),
    targetIdx:    index("pd_target_process_id_idx").on(t.targetProcessId),
    critPathIdx:  index("pd_is_critical_path_idx").on(t.isCriticalPath),
  })
);

// ─── process_templates ────────────────────────────────────────────────────────
export const processTemplates = pgTable(
  "process_templates",
  {
    id:             serial("id").primaryKey(),
    templateId:     text("template_id").notNull(),
    userId:         integer("user_id"),
    title:          text("title").notNull(),
    description:    text("description"),
    processDomain:  text("process_domain").notNull(),
    processType:    text("process_type").notNull(),
    isPlatform:     boolean("is_platform").default(false),
    stageSchema:    jsonb("stage_schema").default("[]"),  // array of stage definitions
    ruleSchema:     jsonb("rule_schema").default("[]"),   // array of rule definitions
    estimatedHours: real("estimated_hours"),
    usageCount:     integer("usage_count").default(0),
    metadata:       jsonb("metadata").default("{}"),
    createdAt:      timestamp("created_at").defaultNow(),
  },
  (t) => ({
    templateIdIdx:  index("pt_template_id_idx").on(t.templateId),
    domainIdx:      index("pt_process_domain_idx").on(t.processDomain),
    platformIdx:    index("pt_is_platform_idx").on(t.isPlatform),
  })
);

// ─── process_registry (MUTABLE) ───────────────────────────────────────────────
export const processRegistry = pgTable(
  "process_registry",
  {
    id:                 serial("id").primaryKey(),
    processId:          text("process_id").notNull(),
    userId:             integer("user_id"),
    businessId:         integer("business_id"),
    title:              text("title"),
    processDomain:      text("process_domain"),
    status:             text("status").default("draft"),
    stageCount:         integer("stage_count").default(0),
    completedStages:    integer("completed_stages").default(0),
    completionPercent:  real("completion_percent").default(0),
    healthScore:        real("health_score").default(0),
    slaStatus:          text("sla_status").default("on_track"),
    bottleneckStageId:  text("bottleneck_stage_id"),
    pendingApprovals:   integer("pending_approvals").default(0),
    blockedStages:      integer("blocked_stages").default(0),
    dependencyCount:    integer("dependency_count").default(0),
    lastProgressAt:     timestamp("last_progress_at"),
    updatedAt:          timestamp("updated_at").defaultNow(),
    createdAt:          timestamp("created_at").defaultNow(),
  },
  (t) => ({
    processIdUq:    uniqueIndex("preg_process_id_uq").on(t.processId),
    userIdIdx:      index("preg_user_id_idx").on(t.userId),
    businessIdIdx:  index("preg_business_id_idx").on(t.businessId),
    statusIdx:      index("preg_status_idx").on(t.status),
    domainIdx:      index("preg_process_domain_idx").on(t.processDomain),
    slaIdx:         index("preg_sla_status_idx").on(t.slaStatus),
    healthIdx:      index("preg_health_score_idx").on(t.healthScore),
  })
);

// ─── process_snapshots ────────────────────────────────────────────────────────
export const processSnapshots = pgTable(
  "process_snapshots",
  {
    id:                   serial("id").primaryKey(),
    totalProcesses:        integer("total_processes").default(0),
    activeProcesses:       integer("active_processes").default(0),
    completedProcesses:    integer("completed_processes").default(0),
    blockedProcesses:      integer("blocked_processes").default(0),
    slaBreachedCount:      integer("sla_breached_count").default(0),
    pendingApprovals:      integer("pending_approvals").default(0),
    totalTemplates:        integer("total_templates").default(0),
    domainBreakdown:       jsonb("domain_breakdown").default("{}"),
    statusBreakdown:       jsonb("status_breakdown").default("{}"),
    averageHealthScore:    real("average_health_score").default(0),
    averageCompletion:     real("average_completion").default(0),
    lawApplied:            boolean("law_applied").default(true),
    snapshotData:          jsonb("snapshot_data").default("{}"),
    createdAt:             timestamp("created_at").defaultNow(),
  },
  (t) => ({
    createdAtIdx: index("psn_created_at_idx").on(t.createdAt),
  })
);

// ─── process_metrics ──────────────────────────────────────────────────────────
export const processMetrics = pgTable(
  "process_metrics",
  {
    id:                   serial("id").primaryKey(),
    metricId:             text("metric_id").notNull(),
    processId:            text("process_id").notNull(),
    userId:               integer("user_id"),
    // Timing
    totalDurationHours:   real("total_duration_hours").default(0),
    avgStageHours:        real("avg_stage_hours").default(0),
    longestStageId:       text("longest_stage_id"),
    longestStageHours:    real("longest_stage_hours").default(0),
    // Efficiency
    completionRate:       real("completion_rate").default(0), // 0-100
    bottleneckCount:      integer("bottleneck_count").default(0),
    reworkCount:          integer("rework_count").default(0),
    escalationCount:      integer("escalation_count").default(0),
    // SLA
    slaAdherence:         real("sla_adherence").default(100), // % on-track
    slaBreachCount:       integer("sla_breach_count").default(0),
    // Optimization
    optimizationScore:    real("optimization_score").default(0), // 0-100
    opportunities:        jsonb("opportunities").default("[]"),  // [{type, description, impact}]
    computedAt:           timestamp("computed_at").defaultNow(),
    createdAt:            timestamp("created_at").defaultNow(),
  },
  (t) => ({
    metricIdIdx:   index("pm_metric_id_idx").on(t.metricId),
    processIdIdx:  index("pm_process_id_idx").on(t.processId),
    userIdIdx:     index("pm_user_id_idx").on(t.userId),
  })
);

// ─── process_diagnostics ──────────────────────────────────────────────────────
export const processDiagnostics = pgTable(
  "process_diagnostics",
  {
    id:               serial("id").primaryKey(),
    diagnosticId:     text("diagnostic_id").notNull(),
    processId:        text("process_id"),
    userId:           integer("user_id"),
    severity:         text("severity").notNull(), // info | warning | critical
    category:         text("category").notNull(), // sla_risk | bottleneck | blocked | approval_overdue | dependency_risk | optimization | health
    title:            text("title").notNull(),
    description:      text("description"),
    recommendation:   text("recommendation"),
    isResolved:       boolean("is_resolved").default(false),
    resolvedAt:       timestamp("resolved_at"),
    metadata:         jsonb("metadata").default("{}"),
    createdAt:        timestamp("created_at").defaultNow(),
  },
  (t) => ({
    diagnosticIdIdx:  index("pdiag_diagnostic_id_idx").on(t.diagnosticId),
    processIdIdx:     index("pdiag_process_id_idx").on(t.processId),
    severityIdx:      index("pdiag_severity_idx").on(t.severity),
    categoryIdx:      index("pdiag_category_idx").on(t.category),
    resolvedIdx:      index("pdiag_is_resolved_idx").on(t.isResolved),
  })
);
