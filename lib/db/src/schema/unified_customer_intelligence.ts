import {
  pgTable, serial, integer, text, boolean, timestamp, jsonb, real, index, uniqueIndex
} from "drizzle-orm/pg-core";

// ─── customer_profiles ────────────────────────────────────────────────────────
export const customerProfiles = pgTable(
  "customer_profiles",
  {
    id:                 serial("id").primaryKey(),
    customerId:         text("customer_id").notNull(),
    userId:             integer("user_id"),            // platform user owning this profile
    businessId:         integer("business_id"),        // associated business
    entityType:         text("entity_type").notNull(), // person | business | organization | household | partner | supplier | vendor | affiliate | lead | prospect | customer | client | member | subscriber | employee_contact | investor | future_type
    // Core identity
    firstName:          text("first_name"),
    lastName:           text("last_name"),
    fullName:           text("full_name"),
    displayName:        text("display_name"),
    email:              text("email"),
    phone:              text("phone"),
    avatarUrl:          text("avatar_url"),
    // Address
    addressLine1:       text("address_line1"),
    addressLine2:       text("address_line2"),
    city:               text("city"),
    state:              text("state"),
    postalCode:         text("postal_code"),
    country:            text("country"),
    // Social / digital
    website:            text("website"),
    linkedinUrl:        text("linkedin_url"),
    twitterHandle:      text("twitter_handle"),
    socialProfiles:     jsonb("social_profiles").default("{}"),
    // Metadata
    timezone:           text("timezone"),
    language:           text("language").default("en"),
    currency:           text("currency").default("USD"),
    tags:               jsonb("tags").default("[]"),
    customFields:       jsonb("custom_fields").default("{}"),
    // Consent
    consentGiven:       boolean("consent_given").default(false),
    consentDate:        timestamp("consent_date"),
    consentDetails:     jsonb("consent_details").default("{}"),
    // Ownership
    assignedUserId:     integer("assigned_user_id"),
    source:             text("source"),                // web, import, api, manual, crm_sync
    sourceId:           text("source_id"),             // external system id
    isActive:           boolean("is_active").default(true),
    createdAt:          timestamp("created_at").defaultNow(),
  },
  (t) => ({
    customerIdIdx:  index("cp_customer_id_idx").on(t.customerId),
    userIdIdx:      index("cp_user_id_idx").on(t.userId),
    businessIdIdx:  index("cp_business_id_idx").on(t.businessId),
    emailIdx:       index("cp_email_idx").on(t.email),
    entityTypeIdx:  index("cp_entity_type_idx").on(t.entityType),
    activeIdx:      index("cp_is_active_idx").on(t.isActive),
  })
);

// ─── organization_profiles ────────────────────────────────────────────────────
export const organizationProfiles = pgTable(
  "organization_profiles",
  {
    id:                 serial("id").primaryKey(),
    orgId:              text("org_id").notNull(),
    userId:             integer("user_id"),
    businessId:         integer("business_id"),
    orgType:            text("org_type").notNull(),     // company | nonprofit | government | institution | partnership | sole_trader | holding | subsidiary | future_org
    name:               text("name").notNull(),
    legalName:          text("legal_name"),
    domain:             text("domain"),
    email:              text("email"),
    phone:              text("phone"),
    website:            text("website"),
    industry:           text("industry"),
    employeeCount:      integer("employee_count"),
    annualRevenue:      real("annual_revenue"),
    currency:           text("currency").default("USD"),
    country:            text("country"),
    city:               text("city"),
    linkedinUrl:        text("linkedin_url"),
    tags:               jsonb("tags").default("[]"),
    customFields:       jsonb("custom_fields").default("{}"),
    parentOrgId:        text("parent_org_id"),          // hierarchy
    hierarchyDepth:     integer("hierarchy_depth").default(0),
    isActive:           boolean("is_active").default(true),
    createdAt:          timestamp("created_at").defaultNow(),
  },
  (t) => ({
    orgIdIdx:       index("op_org_id_idx").on(t.orgId),
    userIdIdx:      index("op_user_id_idx").on(t.userId),
    businessIdIdx:  index("op_business_id_idx").on(t.businessId),
    domainIdx:      index("op_domain_idx").on(t.domain),
    parentOrgIdx:   index("op_parent_org_id_idx").on(t.parentOrgId),
  })
);

// ─── customer_relationships ───────────────────────────────────────────────────
export const customerRelationships = pgTable(
  "customer_relationships",
  {
    id:               serial("id").primaryKey(),
    relationshipId:   text("relationship_id").notNull(),
    sourceId:         text("source_id").notNull(),   // customerId or orgId
    sourceType:       text("source_type").notNull(), // customer | organization
    targetId:         text("target_id").notNull(),   // customerId or orgId
    targetType:       text("target_type").notNull(),
    relationshipType: text("relationship_type").notNull(), // household_member | employee | partner | supplier | vendor | affiliate | parent_organization | subsidiary | investor | team_member | contact | competitor | future_relationship
    strength:         real("strength").default(0.5), // 0-1 confidence
    startDate:        timestamp("start_date"),
    endDate:          timestamp("end_date"),
    isBidirectional:  boolean("is_bidirectional").default(false),
    metadata:         jsonb("metadata").default("{}"),
    createdAt:        timestamp("created_at").defaultNow(),
  },
  (t) => ({
    relationshipIdIdx:  index("cr_relationship_id_idx").on(t.relationshipId),
    sourceIdx:          index("cr_source_id_idx").on(t.sourceId),
    targetIdx:          index("cr_target_id_idx").on(t.targetId),
    typeIdx:            index("cr_relationship_type_idx").on(t.relationshipType),
  })
);

// ─── customer_segments ────────────────────────────────────────────────────────
export const customerSegments = pgTable(
  "customer_segments",
  {
    id:               serial("id").primaryKey(),
    segmentId:        text("segment_id").notNull(),
    userId:           integer("user_id"),
    businessId:       integer("business_id"),
    title:            text("title").notNull(),
    description:      text("description"),
    segmentType:      text("segment_type").notNull(), // demographic | behavioral | lifecycle | geographic | value | engagement | custom
    criteria:         jsonb("criteria").default("{}"),  // rules defining membership
    customerIds:      jsonb("customer_ids").default("[]"),
    memberCount:      integer("member_count").default(0),
    isAutomatic:      boolean("is_automatic").default(true), // auto-maintained vs manual
    isActive:         boolean("is_active").default(true),
    lastRefreshedAt:  timestamp("last_refreshed_at"),
    createdAt:        timestamp("created_at").defaultNow(),
  },
  (t) => ({
    segmentIdIdx:   index("cs_segment_id_idx").on(t.segmentId),
    userIdIdx:      index("cs_user_id_idx").on(t.userId),
    businessIdIdx:  index("cs_business_id_idx").on(t.businessId),
    typeIdx:        index("cs_segment_type_idx").on(t.segmentType),
  })
);

// ─── customer_engagement ──────────────────────────────────────────────────────
export const customerEngagement = pgTable(
  "customer_engagement",
  {
    id:                   serial("id").primaryKey(),
    engagementId:         text("engagement_id").notNull(),
    customerId:           text("customer_id").notNull(),
    userId:               integer("user_id"),
    businessId:           integer("business_id"),
    // Scoring
    engagementScore:      real("engagement_score").default(0),    // 0-100
    recencyScore:         real("recency_score").default(0),        // 0-100
    frequencyScore:       real("frequency_score").default(0),      // 0-100
    monetaryScore:        real("monetary_score").default(0),       // 0-100
    rfmScore:             real("rfm_score").default(0),            // combined
    healthStatus:         text("health_status").default("unknown"), // healthy | at_risk | dormant | lost | new | champion
    // Counters
    totalInteractions:    integer("total_interactions").default(0),
    emailOpens:           integer("email_opens").default(0),
    emailClicks:          integer("email_clicks").default(0),
    formSubmissions:      integer("form_submissions").default(0),
    pageViews:            integer("page_views").default(0),
    purchases:            integer("purchases").default(0),
    supportTickets:       integer("support_tickets").default(0),
    // Value
    totalRevenue:         real("total_revenue").default(0),
    averageOrderValue:    real("average_order_value").default(0),
    lifetimeValue:        real("lifetime_value").default(0),
    predictedLtv:         real("predicted_ltv").default(0),
    // Timing
    firstSeenAt:          timestamp("first_seen_at"),
    lastSeenAt:           timestamp("last_seen_at"),
    lastPurchaseAt:       timestamp("last_purchase_at"),
    nextFollowUpAt:       timestamp("next_follow_up_at"),
    computedAt:           timestamp("computed_at").defaultNow(),
    createdAt:            timestamp("created_at").defaultNow(),
  },
  (t) => ({
    engagementIdIdx:  index("ce_engagement_id_idx").on(t.engagementId),
    customerIdIdx:    index("ce_customer_id_idx").on(t.customerId),
    userIdIdx:        index("ce_user_id_idx").on(t.userId),
    businessIdIdx:    index("ce_business_id_idx").on(t.businessId),
    healthIdx:        index("ce_health_status_idx").on(t.healthStatus),
    ltvIdx:           index("ce_lifetime_value_idx").on(t.lifetimeValue),
  })
);

// ─── customer_lifecycle ───────────────────────────────────────────────────────
export const customerLifecycle = pgTable(
  "customer_lifecycle",
  {
    id:               serial("id").primaryKey(),
    lifecycleId:      text("lifecycle_id").notNull(),
    customerId:       text("customer_id").notNull(),
    userId:           integer("user_id"),
    businessId:       integer("business_id"),
    currentStage:     text("current_stage").notNull(), // lead | prospect | opportunity | customer | advocate | inactive | archived
    previousStage:    text("previous_stage"),
    stageHistory:     jsonb("stage_history").default("[]"), // [{stage, enteredAt, exitedAt, durationDays, trigger}]
    enteredStageAt:   timestamp("entered_stage_at").defaultNow(),
    daysInStage:      integer("days_in_stage").default(0),
    conversionScore:  real("conversion_score").default(0), // 0-100 probability of advancing
    lostReason:       text("lost_reason"),
    wonReason:        text("won_reason"),
    notes:            text("notes"),
    triggeredBy:      text("triggered_by"), // manual | automated | event | import
    createdAt:        timestamp("created_at").defaultNow(),
  },
  (t) => ({
    lifecycleIdIdx:   index("cl_lifecycle_id_idx").on(t.lifecycleId),
    customerIdIdx:    index("cl_customer_id_idx").on(t.customerId),
    userIdIdx:        index("cl_user_id_idx").on(t.userId),
    businessIdIdx:    index("cl_business_id_idx").on(t.businessId),
    stageIdx:         index("cl_current_stage_idx").on(t.currentStage),
  })
);

// ─── customer_interactions ────────────────────────────────────────────────────
export const customerInteractions = pgTable(
  "customer_interactions",
  {
    id:               serial("id").primaryKey(),
    interactionId:    text("interaction_id").notNull(),
    customerId:       text("customer_id").notNull(),
    userId:           integer("user_id"),
    businessId:       integer("business_id"),
    interactionType:  text("interaction_type").notNull(), // email | call | meeting | chat | sms | social | purchase | support | form_submit | page_view | event | note | task | future_interaction
    channel:          text("channel"),                    // inbound | outbound | automated
    direction:        text("direction"),
    subject:          text("subject"),
    summary:          text("summary"),
    sentiment:        text("sentiment"),                  // positive | neutral | negative | unknown
    outcome:          text("outcome"),                    // completed | missed | bounced | opened | clicked
    durationSeconds:  integer("duration_seconds"),
    metadata:         jsonb("metadata").default("{}"),
    scheduledAt:      timestamp("scheduled_at"),
    occurredAt:       timestamp("occurred_at").defaultNow(),
    createdAt:        timestamp("created_at").defaultNow(),
  },
  (t) => ({
    interactionIdIdx: index("ci_interaction_id_idx").on(t.interactionId),
    customerIdIdx:    index("ci_customer_id_idx").on(t.customerId),
    userIdIdx:        index("ci_user_id_idx").on(t.userId),
    businessIdIdx:    index("ci_business_id_idx").on(t.businessId),
    typeIdx:          index("ci_interaction_type_idx").on(t.interactionType),
    occurredAtIdx:    index("ci_occurred_at_idx").on(t.occurredAt),
  })
);

// ─── customer_registry ────────────────────────────────────────────────────────
export const customerRegistry = pgTable(
  "customer_registry",
  {
    id:                   serial("id").primaryKey(),
    customerId:           text("customer_id").notNull(),
    userId:               integer("user_id"),
    businessId:           integer("business_id"),
    fullName:             text("full_name"),
    email:                text("email"),
    entityType:           text("entity_type"),
    currentStage:         text("current_stage"),
    healthStatus:         text("health_status").default("unknown"),
    engagementScore:      real("engagement_score").default(0),
    lifetimeValue:        real("lifetime_value").default(0),
    interactionCount:     integer("interaction_count").default(0),
    relationshipCount:    integer("relationship_count").default(0),
    segmentIds:           jsonb("segment_ids").default("[]"),
    orgId:                text("org_id"),
    duplicateFlag:        boolean("duplicate_flag").default(false),
    mergeRecommendation:  text("merge_recommendation"),
    profileComplete:      real("profile_complete").default(0), // 0-100
    lastActivityAt:       timestamp("last_activity_at"),
    updatedAt:            timestamp("updated_at").defaultNow(),
    createdAt:            timestamp("created_at").defaultNow(),
  },
  (t) => ({
    customerIdUq:   uniqueIndex("cr2_customer_id_uq").on(t.customerId),
    userIdIdx:      index("cr2_user_id_idx").on(t.userId),
    businessIdIdx:  index("cr2_business_id_idx").on(t.businessId),
    emailIdx:       index("cr2_email_idx").on(t.email),
    stageIdx:       index("cr2_current_stage_idx").on(t.currentStage),
    healthIdx:      index("cr2_health_status_idx").on(t.healthStatus),
    ltvIdx:         index("cr2_lifetime_value_idx").on(t.lifetimeValue),
  })
);

// ─── customer_snapshots ───────────────────────────────────────────────────────
export const customerSnapshots = pgTable(
  "customer_snapshots",
  {
    id:                   serial("id").primaryKey(),
    totalCustomers:        integer("total_customers").default(0),
    totalOrganizations:    integer("total_organizations").default(0),
    totalInteractions:     integer("total_interactions").default(0),
    totalSegments:         integer("total_segments").default(0),
    activeCustomers:       integer("active_customers").default(0),
    stageBreakdown:        jsonb("stage_breakdown").default("{}"),
    healthBreakdown:       jsonb("health_breakdown").default("{}"),
    entityTypeBreakdown:   jsonb("entity_type_breakdown").default("{}"),
    averageEngagement:     real("average_engagement").default(0),
    averageLifetimeValue:  real("average_lifetime_value").default(0),
    duplicateFlagCount:    integer("duplicate_flag_count").default(0),
    lawApplied:            boolean("law_applied").default(true),
    snapshotData:          jsonb("snapshot_data").default("{}"),
    createdAt:             timestamp("created_at").defaultNow(),
  },
  (t) => ({
    createdAtIdx: index("csn_created_at_idx").on(t.createdAt),
  })
);

// ─── customer_quality ─────────────────────────────────────────────────────────
export const customerQuality = pgTable(
  "customer_quality",
  {
    id:                   serial("id").primaryKey(),
    qualityId:            text("quality_id").notNull(),
    customerId:           text("customer_id").notNull(),
    userId:               integer("user_id"),
    businessId:           integer("business_id"),
    completenessScore:    real("completeness_score").default(0), // 0-100
    // Field completeness flags
    hasName:              boolean("has_name").default(false),
    hasEmail:             boolean("has_email").default(false),
    hasPhone:             boolean("has_phone").default(false),
    hasAddress:           boolean("has_address").default(false),
    hasOrganization:      boolean("has_organization").default(false),
    hasLifecycleStage:    boolean("has_lifecycle_stage").default(false),
    hasEngagementData:    boolean("has_engagement_data").default(false),
    // Duplicate intelligence
    duplicateFlag:        boolean("duplicate_flag").default(false),
    duplicateOf:          text("duplicate_of"),                     // other customerId
    duplicateConfidence:  real("duplicate_confidence").default(0),  // 0-1
    mergeRecommendation:  text("merge_recommendation"),
    // Validation
    validationIssues:     jsonb("validation_issues").default("[]"),
    missingFields:        jsonb("missing_fields").default("[]"),
    recommendations:      jsonb("recommendations").default("[]"),
    analyzedAt:           timestamp("analyzed_at").defaultNow(),
    createdAt:            timestamp("created_at").defaultNow(),
  },
  (t) => ({
    qualityIdIdx:   index("cq_quality_id_idx").on(t.qualityId),
    customerIdIdx:  index("cq_customer_id_idx").on(t.customerId),
    userIdIdx:      index("cq_user_id_idx").on(t.userId),
    dupFlagIdx:     index("cq_duplicate_flag_idx").on(t.duplicateFlag),
    scoreIdx:       index("cq_completeness_score_idx").on(t.completenessScore),
  })
);
