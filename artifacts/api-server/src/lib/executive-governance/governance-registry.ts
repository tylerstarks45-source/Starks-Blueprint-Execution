// ─── Build 014: Governance Registry ──────────────────────────────────────────
//
// All DB persistence for the Executive Governance & Adaptation Engine.
// Policies are immutable revisions — status advances but records are never deleted.
// Behavior Snapshots are permanent rollback points.

import { db } from "@workspace/db";
import {
  executivePolicies,
  policyVersions,
  policyDecisions,
  policyConflicts,
  behaviorProfiles,
  behaviorSnapshots,
  adaptationPlans,
  governanceReports,
  governanceMetrics,
} from "@workspace/db/schema";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import type {
  AdaptationPlan,
  BehaviorProfile,
  BehaviorSnapshot,
  ExecutivePolicy,
  GovernanceDiagnostics,
  GovernanceReport,
  GovernanceSummary,
  PolicyConflict,
  PolicyDecisionType,
  PolicyStatus,
  ProfileType,
} from "./types";
import type { PolicyEvaluationResult } from "./policy-evaluation";
import type { BehaviorSnapshot as BehaviorSnapshotType } from "./types";
import { logger } from "../logger";

// ── Row mappers ───────────────────────────────────────────────────────────────

function mapPolicy(row: any): ExecutivePolicy {
  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    title: row.title,
    description: row.description,
    sourcePrincipleIds: (row.sourcePrincipleIds ?? row.source_principle_ids ?? []) as string[],
    businessDomains: (row.businessDomains ?? row.business_domains ?? []) as string[],
    strategicCategories: (row.strategicCategories ?? row.strategic_categories ?? []) as string[],
    policyType: row.policyType ?? row.policy_type,
    priority: row.priority,
    status: row.status,
    guidance: row.guidance ?? "",
    effectiveDate: row.effectiveDate ?? row.effective_date ? new Date(row.effectiveDate ?? row.effective_date) : null,
    expirationDate: row.expirationDate ?? row.expiration_date ? new Date(row.expirationDate ?? row.expiration_date) : null,
    version: row.version,
    conflictIds: (row.conflictIds ?? row.conflict_ids ?? []) as string[],
    approvedAt: row.approvedAt ?? row.approved_at ? new Date(row.approvedAt ?? row.approved_at) : null,
    rejectedAt: row.rejectedAt ?? row.rejected_at ? new Date(row.rejectedAt ?? row.rejected_at) : null,
    retiredAt: row.retiredAt ?? row.retired_at ? new Date(row.retiredAt ?? row.retired_at) : null,
    createdAt: new Date(row.createdAt ?? row.created_at),
    updatedAt: new Date(row.updatedAt ?? row.updated_at),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

function mapProfile(row: any): BehaviorProfile {
  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    name: row.name,
    profileType: row.profileType ?? row.profile_type,
    description: row.description,
    activePolicyIds: (row.activePolicyIds ?? row.active_policy_ids ?? []) as string[],
    policyCount: row.policyCount ?? row.policy_count,
    isActive: row.isActive ?? row.is_active,
    version: row.version,
    activatedAt: row.activatedAt ?? row.activated_at ? new Date(row.activatedAt ?? row.activated_at) : null,
    deactivatedAt: row.deactivatedAt ?? row.deactivated_at ? new Date(row.deactivatedAt ?? row.deactivated_at) : null,
    createdAt: new Date(row.createdAt ?? row.created_at),
    updatedAt: new Date(row.updatedAt ?? row.updated_at),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

function mapSnapshot(row: any): BehaviorSnapshot {
  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    profileId: row.profileId ?? row.profile_id,
    profileType: row.profileType ?? row.profile_type,
    activePolicyIds: (row.activePolicyIds ?? row.active_policy_ids ?? []) as string[],
    adaptationPlanId: row.adaptationPlanId ?? row.adaptation_plan_id,
    reason: row.reason,
    isRollbackPoint: row.isRollbackPoint ?? row.is_rollback_point,
    rolledBackAt: row.rolledBackAt ?? row.rolled_back_at ? new Date(row.rolledBackAt ?? row.rolled_back_at) : null,
    createdAt: new Date(row.createdAt ?? row.created_at),
    payload: (row.payload ?? {}) as Record<string, unknown>,
  };
}

function mapPlan(row: any): AdaptationPlan {
  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    title: row.title,
    description: row.description,
    policiesToActivate: (row.policiesToActivate ?? row.policies_to_activate ?? []) as string[],
    policiesToRetire: (row.policiesToRetire ?? row.policies_to_retire ?? []) as string[],
    targetProfileType: (row.targetProfileType ?? row.target_profile_type) as ProfileType,
    expectedImpact: row.expectedImpact ?? row.expected_impact,
    affectedCognitiveSystems: (row.affectedCognitiveSystems ?? row.affected_cognitive_systems ?? []) as string[],
    rollbackStrategy: row.rollbackStrategy ?? row.rollback_strategy,
    status: row.status,
    snapshotId: row.snapshotId ?? row.snapshot_id,
    executedAt: row.executedAt ?? row.executed_at ? new Date(row.executedAt ?? row.executed_at) : null,
    rolledBackAt: row.rolledBackAt ?? row.rolled_back_at ? new Date(row.rolledBackAt ?? row.rolled_back_at) : null,
    governanceReportId: row.governanceReportId ?? row.governance_report_id,
    createdAt: new Date(row.createdAt ?? row.created_at),
    updatedAt: new Date(row.updatedAt ?? row.updated_at),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

function mapReport(row: any): GovernanceReport {
  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    evaluatedPrincipleIds: (row.evaluatedPrincipleIds ?? row.evaluated_principle_ids ?? []) as string[],
    approvedPolicyIds: (row.approvedPolicyIds ?? row.approved_policy_ids ?? []) as string[],
    rejectedPolicyIds: (row.rejectedPolicyIds ?? row.rejected_policy_ids ?? []) as string[],
    deferredPrincipleIds: (row.deferredPrincipleIds ?? row.deferred_principle_ids ?? []) as string[],
    conflictsFound: row.conflictsFound ?? row.conflicts_found,
    behaviorChanges: (row.behaviorChanges ?? row.behavior_changes ?? []) as string[],
    rollbackPoints: (row.rollbackPoints ?? row.rollback_points ?? []) as string[],
    executiveSummary: row.executiveSummary ?? row.executive_summary,
    governanceConfidence: row.governanceConfidence ?? row.governance_confidence,
    adaptationPlanId: row.adaptationPlanId ?? row.adaptation_plan_id,
    activeProfileId: row.activeProfileId ?? row.active_profile_id,
    activeProfileType: row.activeProfileType ?? row.active_profile_type,
    cycleVersion: row.cycleVersion ?? row.cycle_version,
    producedAt: new Date(row.producedAt ?? row.produced_at),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

// ── Policy CRUD ───────────────────────────────────────────────────────────────

export async function savePolicy(p: Omit<ExecutivePolicy, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<ExecutivePolicy> {
  const id = p.id ?? `ep_${randomUUID().replace(/-/g, "").slice(0, 22)}`;
  const now = new Date();
  await db.insert(executivePolicies).values({
    id,
    userId: p.userId,
    title: p.title,
    description: p.description,
    sourcePrincipleIds: p.sourcePrincipleIds as any,
    businessDomains: p.businessDomains as any,
    strategicCategories: p.strategicCategories as any,
    policyType: p.policyType,
    priority: p.priority,
    status: p.status,
    guidance: p.guidance,
    effectiveDate: p.effectiveDate ?? undefined,
    expirationDate: p.expirationDate ?? undefined,
    version: p.version,
    conflictIds: p.conflictIds as any,
    approvedAt: p.approvedAt ?? undefined,
    rejectedAt: p.rejectedAt ?? undefined,
    retiredAt: p.retiredAt ?? undefined,
    createdAt: now,
    updatedAt: now,
    metadata: p.metadata as any,
  });
  return { ...p, id, createdAt: now, updatedAt: now };
}

export async function updatePolicy(p: ExecutivePolicy): Promise<ExecutivePolicy> {
  await db.update(executivePolicies).set({
    status: p.status,
    priority: p.priority,
    guidance: p.guidance,
    version: p.version,
    conflictIds: p.conflictIds as any,
    approvedAt: p.approvedAt ?? undefined,
    rejectedAt: p.rejectedAt ?? undefined,
    retiredAt: p.retiredAt ?? undefined,
    updatedAt: new Date(),
    metadata: p.metadata as any,
  }).where(eq(executivePolicies.id, p.id));
  return p;
}

export async function snapshotPolicyVersion(p: ExecutivePolicy, changeReason: string): Promise<void> {
  await db.insert(policyVersions).values({
    id: `pv_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
    policyId: p.id,
    userId: p.userId,
    version: p.version,
    title: p.title,
    description: p.description,
    guidance: p.guidance,
    status: p.status,
    priority: p.priority,
    changeReason,
    snapshotAt: new Date(),
    payload: {},
  }).onConflictDoNothing();
}

export async function savePolicyDecision(opts: {
  policyId: string | null;
  principleId: string;
  userId: number | null;
  result: PolicyEvaluationResult;
  confidenceAtDecision?: number;
  reliabilityAtDecision?: number;
  observationsAtDecision?: number;
}): Promise<void> {
  await db.insert(policyDecisions).values({
    id: `pd_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
    policyId: opts.policyId ?? undefined,
    principleId: opts.principleId,
    userId: opts.userId,
    decision: opts.result.decision,
    rationale: opts.result.rationale,
    confidenceAtDecision: opts.confidenceAtDecision,
    reliabilityAtDecision: opts.reliabilityAtDecision,
    observationsAtDecision: opts.observationsAtDecision,
    conflictsDetected: opts.result.conflictsDetected,
    supersededPolicyId: opts.result.supersededPolicyId ?? undefined,
    mergedIntoId: opts.result.mergedIntoId ?? undefined,
    decidedAt: new Date(),
    payload: {},
  });
}

export async function saveConflict(c: PolicyConflict): Promise<void> {
  await db.insert(policyConflicts).values({
    id: c.id,
    policyIdA: c.policyIdA,
    policyIdB: c.policyIdB,
    userId: c.userId,
    conflictType: c.conflictType,
    severity: c.severity,
    description: c.description,
    resolved: c.resolved,
    resolvedAt: c.resolvedAt ?? undefined,
    resolvedBy: c.resolvedBy ?? undefined,
    detectedAt: c.detectedAt,
    payload: c.payload as any,
  }).onConflictDoNothing();
}

// ── Profile CRUD ──────────────────────────────────────────────────────────────

export async function saveProfile(prof: Omit<BehaviorProfile, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<BehaviorProfile> {
  const id = prof.id ?? `bp_${randomUUID().replace(/-/g, "").slice(0, 22)}`;
  const now = new Date();
  await db.insert(behaviorProfiles).values({
    id,
    userId: prof.userId,
    name: prof.name,
    profileType: prof.profileType,
    description: prof.description,
    activePolicyIds: prof.activePolicyIds as any,
    policyCount: prof.policyCount,
    isActive: prof.isActive,
    version: prof.version,
    activatedAt: prof.activatedAt ?? undefined,
    deactivatedAt: prof.deactivatedAt ?? undefined,
    createdAt: now,
    updatedAt: now,
    metadata: prof.metadata as any,
  });
  return { ...prof, id, createdAt: now, updatedAt: now };
}

export async function activateProfile(profileId: string, userId: number): Promise<void> {
  const now = new Date();
  // Deactivate any currently active profile for this user
  await db.update(behaviorProfiles)
    .set({ isActive: false, deactivatedAt: now, updatedAt: now })
    .where(and(eq(behaviorProfiles.userId, userId), eq(behaviorProfiles.isActive, true)));
  // Activate the new one
  await db.update(behaviorProfiles)
    .set({ isActive: true, activatedAt: now, updatedAt: now })
    .where(eq(behaviorProfiles.id, profileId));
}

export async function updateProfilePolicies(
  profileId: string,
  activePolicyIds: string[],
): Promise<void> {
  await db.update(behaviorProfiles)
    .set({ activePolicyIds: activePolicyIds as any, policyCount: activePolicyIds.length, updatedAt: new Date() })
    .where(eq(behaviorProfiles.id, profileId));
}

// ── Snapshot CRUD ─────────────────────────────────────────────────────────────

export async function saveSnapshot(s: Omit<BehaviorSnapshot, "id" | "createdAt">): Promise<BehaviorSnapshot> {
  const id = `bs_${randomUUID().replace(/-/g, "").slice(0, 22)}`;
  const now = new Date();
  await db.insert(behaviorSnapshots).values({
    id,
    userId: s.userId,
    profileId: s.profileId ?? undefined,
    profileType: s.profileType,
    activePolicyIds: s.activePolicyIds as any,
    adaptationPlanId: s.adaptationPlanId ?? undefined,
    reason: s.reason,
    isRollbackPoint: s.isRollbackPoint,
    rolledBackAt: s.rolledBackAt ?? undefined,
    createdAt: now,
    payload: s.payload as any,
  });
  return { ...s, id, createdAt: now };
}

// ── Plan CRUD ─────────────────────────────────────────────────────────────────

export async function savePlan(p: Omit<AdaptationPlan, "id" | "createdAt" | "updatedAt">): Promise<AdaptationPlan> {
  const id = `ap_${randomUUID().replace(/-/g, "").slice(0, 22)}`;
  const now = new Date();
  await db.insert(adaptationPlans).values({
    id,
    userId: p.userId,
    title: p.title,
    description: p.description,
    policiesToActivate: p.policiesToActivate as any,
    policiesToRetire: p.policiesToRetire as any,
    targetProfileType: p.targetProfileType,
    expectedImpact: p.expectedImpact,
    affectedCognitiveSystems: p.affectedCognitiveSystems as any,
    rollbackStrategy: p.rollbackStrategy,
    status: p.status,
    snapshotId: p.snapshotId ?? undefined,
    executedAt: p.executedAt ?? undefined,
    rolledBackAt: p.rolledBackAt ?? undefined,
    governanceReportId: p.governanceReportId ?? undefined,
    createdAt: now,
    updatedAt: now,
    metadata: p.metadata as any,
  });
  return { ...p, id, createdAt: now, updatedAt: now };
}

export async function updatePlanStatus(
  planId: string,
  status: string,
  updates: { snapshotId?: string; executedAt?: Date; rolledBackAt?: Date; governanceReportId?: string } = {},
): Promise<void> {
  await db.update(adaptationPlans).set({
    status,
    ...updates,
    updatedAt: new Date(),
  }).where(eq(adaptationPlans.id, planId));
}

// ── Report CRUD ───────────────────────────────────────────────────────────────

export async function saveGovernanceReport(r: GovernanceReport): Promise<GovernanceReport> {
  await db.insert(governanceReports).values({
    id: r.id,
    userId: r.userId,
    evaluatedPrincipleIds: r.evaluatedPrincipleIds as any,
    approvedPolicyIds: r.approvedPolicyIds as any,
    rejectedPolicyIds: r.rejectedPolicyIds as any,
    deferredPrincipleIds: r.deferredPrincipleIds as any,
    conflictsFound: r.conflictsFound,
    behaviorChanges: r.behaviorChanges as any,
    rollbackPoints: r.rollbackPoints as any,
    executiveSummary: r.executiveSummary,
    governanceConfidence: r.governanceConfidence,
    adaptationPlanId: r.adaptationPlanId ?? undefined,
    activeProfileId: r.activeProfileId ?? undefined,
    activeProfileType: r.activeProfileType ?? undefined,
    cycleVersion: r.cycleVersion,
    producedAt: r.producedAt,
    metadata: r.metadata as any,
  });
  return r;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getPolicy(id: string): Promise<ExecutivePolicy | null> {
  const rows = await db.select().from(executivePolicies).where(eq(executivePolicies.id, id)).limit(1);
  return rows[0] ? mapPolicy(rows[0]) : null;
}

export async function listPolicies(opts: { userId: number; status?: PolicyStatus; limit?: number }): Promise<ExecutivePolicy[]> {
  let q = db.select().from(executivePolicies).$dynamic();
  const conds = [eq(executivePolicies.userId, opts.userId)];
  if (opts.status) conds.push(eq(executivePolicies.status, opts.status));
  const rows = await q.where(and(...conds)).orderBy(asc(executivePolicies.priority), desc(executivePolicies.createdAt)).limit(opts.limit ?? 100);
  return rows.map(mapPolicy);
}

export async function getApprovedPolicies(userId: number): Promise<ExecutivePolicy[]> {
  const rows = await db.select().from(executivePolicies)
    .where(and(eq(executivePolicies.userId, userId), eq(executivePolicies.status, "approved")))
    .orderBy(asc(executivePolicies.priority));
  return rows.map(mapPolicy);
}

export async function searchPolicies(opts: { userId: number; query: string; limit?: number }): Promise<ExecutivePolicy[]> {
  const rows = await db.select().from(executivePolicies)
    .where(and(
      eq(executivePolicies.userId, opts.userId),
      sql`(${executivePolicies.title} ILIKE ${`%${opts.query}%`} OR ${executivePolicies.description} ILIKE ${`%${opts.query}%`})`,
    ))
    .orderBy(asc(executivePolicies.priority))
    .limit(opts.limit ?? 20);
  return rows.map(mapPolicy);
}

export async function getActiveProfile(userId: number): Promise<BehaviorProfile | null> {
  const rows = await db.select().from(behaviorProfiles)
    .where(and(eq(behaviorProfiles.userId, userId), eq(behaviorProfiles.isActive, true)))
    .limit(1);
  return rows[0] ? mapProfile(rows[0]) : null;
}

export async function getProfile(id: string): Promise<BehaviorProfile | null> {
  const rows = await db.select().from(behaviorProfiles).where(eq(behaviorProfiles.id, id)).limit(1);
  return rows[0] ? mapProfile(rows[0]) : null;
}

export async function listProfiles(userId: number): Promise<BehaviorProfile[]> {
  const rows = await db.select().from(behaviorProfiles)
    .where(eq(behaviorProfiles.userId, userId))
    .orderBy(desc(behaviorProfiles.createdAt));
  return rows.map(mapProfile);
}

export async function getLatestSnapshot(userId: number): Promise<BehaviorSnapshot | null> {
  const rows = await db.select().from(behaviorSnapshots)
    .where(eq(behaviorSnapshots.userId, userId))
    .orderBy(desc(behaviorSnapshots.createdAt))
    .limit(1);
  return rows[0] ? mapSnapshot(rows[0]) : null;
}

export async function listSnapshots(userId: number, limit = 10): Promise<BehaviorSnapshot[]> {
  const rows = await db.select().from(behaviorSnapshots)
    .where(eq(behaviorSnapshots.userId, userId))
    .orderBy(desc(behaviorSnapshots.createdAt))
    .limit(limit);
  return rows.map(mapSnapshot);
}

export async function getPlan(id: string): Promise<AdaptationPlan | null> {
  const rows = await db.select().from(adaptationPlans).where(eq(adaptationPlans.id, id)).limit(1);
  return rows[0] ? mapPlan(rows[0]) : null;
}

export async function listPlans(userId: number, limit = 10): Promise<AdaptationPlan[]> {
  const rows = await db.select().from(adaptationPlans)
    .where(eq(adaptationPlans.userId, userId))
    .orderBy(desc(adaptationPlans.createdAt))
    .limit(limit);
  return rows.map(mapPlan);
}

export async function getGovernanceReport(id: string): Promise<GovernanceReport | null> {
  const rows = await db.select().from(governanceReports).where(eq(governanceReports.id, id)).limit(1);
  return rows[0] ? mapReport(rows[0]) : null;
}

export async function listGovernanceReports(userId: number, limit = 10): Promise<GovernanceReport[]> {
  const rows = await db.select().from(governanceReports)
    .where(eq(governanceReports.userId, userId))
    .orderBy(desc(governanceReports.producedAt))
    .limit(limit);
  return rows.map(mapReport);
}

export async function getConflicts(userId: number, resolvedOnly = false): Promise<PolicyConflict[]> {
  const rows = await db.select().from(policyConflicts)
    .where(and(
      eq(policyConflicts.userId, userId),
      resolvedOnly ? eq(policyConflicts.resolved, true) : eq(policyConflicts.resolved, false),
    ))
    .orderBy(desc(policyConflicts.detectedAt))
    .limit(50);
  return rows.map((r: any) => ({
    id: r.id,
    policyIdA: r.policyIdA ?? r.policy_id_a,
    policyIdB: r.policyIdB ?? r.policy_id_b,
    userId: r.userId ?? r.user_id,
    conflictType: r.conflictType ?? r.conflict_type,
    severity: r.severity,
    description: r.description,
    resolved: r.resolved,
    resolvedAt: r.resolvedAt ?? r.resolved_at ? new Date(r.resolvedAt ?? r.resolved_at) : null,
    resolvedBy: r.resolvedBy ?? r.resolved_by,
    detectedAt: new Date(r.detectedAt ?? r.detected_at),
    payload: (r.payload ?? {}) as Record<string, unknown>,
  }));
}

export async function getPolicyVersions(policyId: string): Promise<any[]> {
  return db.select().from(policyVersions)
    .where(eq(policyVersions.policyId, policyId))
    .orderBy(asc(policyVersions.version));
}

export async function getPolicyDecisions(policyId: string): Promise<any[]> {
  return db.select().from(policyDecisions)
    .where(eq(policyDecisions.policyId, policyId))
    .orderBy(desc(policyDecisions.decidedAt));
}

// ── Governance Summary ────────────────────────────────────────────────────────

export async function getGovernanceSummary(userId: number): Promise<GovernanceSummary | null> {
  try {
    const [activeProfile, approvedPolicies, latestReport, reportCount] = await Promise.all([
      getActiveProfile(userId),
      getApprovedPolicies(userId),
      listGovernanceReports(userId, 1),
      db.select({ count: sql<number>`count(*)` }).from(governanceReports).where(eq(governanceReports.userId, userId)),
    ]);

    const { PROFILE_TRAITS } = await import("./types");

    return {
      activeProfileType: (activeProfile?.profileType as any) ?? null,
      activeProfileId: activeProfile?.id ?? null,
      activePolicyCount: approvedPolicies.length,
      approvedPolicies: approvedPolicies.slice(0, 5).map((p) => ({
        id: p.id,
        title: p.title,
        policyType: p.policyType,
        guidance: p.guidance,
        priority: p.priority,
      })),
      lastCycleAt: latestReport[0]?.producedAt ?? null,
      cycleCount: Number(reportCount[0]?.count ?? 0),
      profileTraits: activeProfile ? PROFILE_TRAITS[activeProfile.profileType as keyof typeof PROFILE_TRAITS] ?? null : null,
    };
  } catch (err) {
    logger.warn({ err }, "Governance: getGovernanceSummary failed");
    return null;
  }
}

// ── Diagnostics ───────────────────────────────────────────────────────────────

export async function getGovernanceDiagnostics(userId: number): Promise<GovernanceDiagnostics> {
  const [policies, conflicts, profiles, plans, reports, snapshots, activeProfile] = await Promise.all([
    db.select().from(executivePolicies).where(eq(executivePolicies.userId, userId)),
    db.select().from(policyConflicts).where(eq(policyConflicts.userId, userId)),
    db.select({ count: sql<number>`count(*)` }).from(behaviorProfiles).where(eq(behaviorProfiles.userId, userId)),
    db.select({ count: sql<number>`count(*)` }).from(adaptationPlans).where(eq(adaptationPlans.userId, userId)),
    db.select({ count: sql<number>`count(*)` }).from(governanceReports).where(eq(governanceReports.userId, userId)),
    db.select({ count: sql<number>`count(*)` }).from(behaviorSnapshots).where(eq(behaviorSnapshots.userId, userId)),
    getActiveProfile(userId),
  ]);

  const byStatus: Record<string, number> = {};
  for (const p of policies) byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;

  const latestReport = await listGovernanceReports(userId, 1);

  return {
    userId,
    totalPolicies: policies.length,
    byStatus: byStatus as any,
    totalConflicts: conflicts.length,
    unresolvedConflicts: conflicts.filter((c: any) => !(c.resolved)).length,
    totalProfiles: Number(profiles[0]?.count ?? 0),
    activeProfileType: activeProfile?.profileType ?? null,
    totalPlans: Number(plans[0]?.count ?? 0),
    totalReports: Number(reports[0]?.count ?? 0),
    totalSnapshots: Number(snapshots[0]?.count ?? 0),
    lastCycleAt: latestReport[0]?.producedAt ?? null,
  };
}

// ── Rollback ──────────────────────────────────────────────────────────────────

export async function executeRollback(snapshotId: string, userId: number): Promise<{
  snapshot: BehaviorSnapshot;
  restoredProfile: BehaviorProfile | null;
}> {
  const rows = await db.select().from(behaviorSnapshots)
    .where(and(eq(behaviorSnapshots.id, snapshotId), eq(behaviorSnapshots.userId, userId)))
    .limit(1);
  if (!rows[0]) throw new Error(`Snapshot ${snapshotId} not found`);

  const snapshot = mapSnapshot(rows[0]);
  const now = new Date();

  // Deactivate all current profiles
  await db.update(behaviorProfiles)
    .set({ isActive: false, deactivatedAt: now, updatedAt: now })
    .where(and(eq(behaviorProfiles.userId, userId), eq(behaviorProfiles.isActive, true)));

  // Restore the profile from the snapshot (if it exists)
  let restoredProfile: BehaviorProfile | null = null;
  if (snapshot.profileId) {
    const profRows = await db.select().from(behaviorProfiles)
      .where(eq(behaviorProfiles.id, snapshot.profileId)).limit(1);
    if (profRows[0]) {
      await db.update(behaviorProfiles)
        .set({ isActive: true, activatedAt: now, activePolicyIds: snapshot.activePolicyIds as any, policyCount: snapshot.activePolicyIds.length, updatedAt: now })
        .where(eq(behaviorProfiles.id, snapshot.profileId));
      restoredProfile = mapProfile({ ...profRows[0], isActive: true, activatedAt: now });
    }
  }

  // Mark snapshot as rolled back
  await db.update(behaviorSnapshots)
    .set({ rolledBackAt: now })
    .where(eq(behaviorSnapshots.id, snapshotId));

  return { snapshot: { ...snapshot, rolledBackAt: now }, restoredProfile };
}
