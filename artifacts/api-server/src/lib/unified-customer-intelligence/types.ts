// ─── Customer entity types ─────────────────────────────────────────────────
export type CustomerEntityType =
  | "person" | "business" | "organization" | "household"
  | "partner" | "supplier" | "vendor" | "affiliate"
  | "lead" | "prospect" | "customer" | "client"
  | "member" | "subscriber" | "employee_contact" | "investor"
  | "future_type";

// ─── Lifecycle stages ──────────────────────────────────────────────────────
export type LifecycleStage =
  | "lead" | "prospect" | "opportunity" | "customer"
  | "advocate" | "inactive" | "archived";

// ─── Engagement health ─────────────────────────────────────────────────────
export type EngagementHealth =
  | "healthy" | "at_risk" | "dormant" | "lost" | "new" | "champion" | "unknown";

// ─── Relationship types ────────────────────────────────────────────────────
export type RelationshipType =
  | "household_member" | "employee" | "partner" | "supplier" | "vendor"
  | "affiliate" | "parent_organization" | "subsidiary" | "investor"
  | "team_member" | "contact" | "competitor" | "future_relationship";

// ─── Segment types ─────────────────────────────────────────────────────────
export type SegmentType =
  | "demographic" | "behavioral" | "lifecycle" | "geographic"
  | "value" | "engagement" | "custom";

// ─── Interaction types ─────────────────────────────────────────────────────
export type InteractionType =
  | "email" | "call" | "meeting" | "chat" | "sms" | "social" | "purchase"
  | "support" | "form_submit" | "page_view" | "event" | "note" | "task"
  | "future_interaction";

// ─── Org types ─────────────────────────────────────────────────────────────
export type OrgType =
  | "company" | "nonprofit" | "government" | "institution" | "partnership"
  | "sole_trader" | "holding" | "subsidiary" | "future_org";

// ─── Summary passed to Executive Brain ─────────────────────────────────────
export interface UCIESummary {
  totalCustomers:       number;
  totalOrganizations:   number;
  totalInteractions:    number;
  totalSegments:        number;
  activeCustomers:      number;
  averageEngagement:    number;
  averageLifetimeValue: number;
  stageBreakdown:       Record<string, number>;
  healthBreakdown:      Record<string, number>;
  entityTypeBreakdown:  Record<string, number>;
  duplicateFlagCount:   number;
  computedAt:           string;
}
