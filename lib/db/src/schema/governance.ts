import { integer, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { ashProjectsTable } from "./executive_brain";

// ─── Ownership & Governance Metadata (Business Intelligence Phase A) ──────
// Shared column contract applied to every governed Business Intelligence
// table (DNA, Memory, Knowledge, Recommendations, Health, Timeline, Events,
// Conflict Resolution, Review Queue). This is the platform's reference
// governance implementation — Phase B subsystems are expected to reuse this
// SAME shape rather than inventing their own.
//
// Naming is deliberately distinct from each table's own domain columns so
// nothing collides or gets double-meaning:
//   - `recordVersion` is a generic optimistic-concurrency counter owned by
//     the Data Access Layer. It is NOT `business_dna_claims.version`, which
//     tracks how many times a DNA VALUE has changed — a pre-existing domain
//     concept this layer must never touch or reinterpret.
//   - `governanceStatus` is a generic active/archived/deleted lifecycle flag
//     owned by the Data Access Layer. It is NOT the same as a table's own
//     domain `status` column (conflict open/resolved/deferred, review
//     open/dismissed/resolved, recommendation new/dismissed/applied/stale) —
//     those keep their existing meaning untouched. Tables that already have
//     a domain status are not given a second, competing status concept.
//
// `ownerUserId` is denormalized — also derivable via businessId ->
// businesses.ownerId, or (for user-scoped rows like ash_knowledge_entries)
// already equal to the table's own userId — so ownership can be checked
// with one indexed column read, no join, from any governed table.
//
// It is NOT NULL at the DB level (enforced via a hand-written migration, not
// `drizzle-kit push` — see the DB hazard note in project memory). Getting
// there required a 4-step rollout, now complete on every governed table: (1)
// add the column nullable, (2) migrate every write path onto the Data
// Access Layer (`lib/governance/writes/*` in api-server), which always sets
// it, (3) backfill pre-existing rows via businessId -> businesses.ownerId
// (or ash_knowledge_entries' own userId), (4) `ALTER COLUMN ... SET NOT
// NULL`. Any FUTURE governed table added to this contract must repeat the
// same 4 steps — do not declare `.notNull()` on `ownerUserId` for a brand
// new table's first migration unless the insert path is guaranteed to
// always populate it (which the Data Access Layer wrapper functions do).
//
// `teamWorkspaceId` is a reserved extension point for a FUTURE Team
// Workspace concept: internal multi-user collaboration, teams,
// organizations, departments, and RBAC. It is explicitly NOT a reference to
// the existing `client_workspaces` table (agency/white-label client
// portals — a customer-facing, unrelated concept). No FK is declared
// because the Team Workspace table does not exist yet; this column is
// always NULL until that subsystem is designed and built, and no query in
// this phase reads or filters on it.
export function ownershipColumns() {
  return {
    ownerUserId: integer("owner_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    teamWorkspaceId: integer("team_workspace_id"),
    sourceEngine: text("source_engine").notNull().default("business_intelligence"),
    createdByUserId: integer("created_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
    updatedByUserId: integer("updated_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
    governanceStatus: text("governance_status").notNull().default("active"),
    recordVersion: integer("record_version").notNull().default(1),
  };
}

// Separate from ownershipColumns() so tables that already carry their own
// `projectId` (business_timeline_events, business_domain_events) or an
// equivalent field (ash_knowledge_entries.sourceProjectId) are not given a
// second, colliding project column. Only spread this into governed tables
// that have no existing project association.
export function projectScopeColumn() {
  return {
    projectId: integer("project_id").references(() => ashProjectsTable.id, { onDelete: "set null" }),
  };
}

export const GOVERNANCE_STATUSES = ["active", "archived", "deleted"] as const;
export type GovernanceStatus = (typeof GOVERNANCE_STATUSES)[number];
