// ─── Build 014: Governance Orchestrator ──────────────────────────────────────
//
// Runs a complete governance cycle:
//   1. Load validated principles from Learning Engine
//   2. Evaluate each principle → policy decision
//   3. Persist approved/rejected policies + decisions
//   4. Conflict scan across all active policies
//   5. Persist conflicts
//   6. Generate Adaptation Plan (if any changes needed)
//   7. Create Behavior Snapshot (rollback point)
//   8. Execute adaptation (update active profile)
//   9. Assemble + persist Governance Report
//
// Governance NEVER changes facts.
// Governance ONLY authorizes behavior through approved policies.

import { getValidatedPrinciples } from "../executive-learning/learning-registry";
import type { ExecutivePrinciple } from "../executive-learning/types";
import { evaluatePrinciples, type PrincipleForEvaluation } from "./policy-evaluation";
import { runConflictScan, summarizeConflicts } from "./policy-conflict";
import { buildProfile, inferProfileType } from "./behavior-profile";
import { generateAdaptationPlan, isAdaptationNeeded } from "./adaptation-engine";
import { buildSnapshot } from "./rollback-engine";
import { assembleGovernanceReport } from "./governance-report";
import {
  savePolicy,
  updatePolicy,
  snapshotPolicyVersion,
  savePolicyDecision,
  saveConflict,
  saveProfile,
  activateProfile,
  updateProfilePolicies,
  saveSnapshot,
  savePlan,
  updatePlanStatus,
  saveGovernanceReport,
  getApprovedPolicies,
  getActiveProfile,
  listGovernanceReports,
} from "./governance-registry";
import type {
  AdaptationPlan,
  BehaviorProfile,
  ExecutivePolicy,
  GovernanceCycleResult,
  PolicyConflict,
} from "./types";
import { logger } from "../logger";

// ── Convert principle to evaluation input ─────────────────────────────────────

function principleToEvalInput(p: ExecutivePrinciple): PrincipleForEvaluation {
  return {
    id: p.id,
    userId: p.userId,
    title: p.title,
    description: p.description,
    category: p.category,
    businessDomain: p.businessDomain,
    strategicCategory: p.strategicCategory,
    confidence: p.confidence,
    reliability: p.reliability,
    timesObserved: p.timesObserved,
    timesConfirmed: p.timesConfirmed,
    timesContradicted: p.timesContradicted,
    successRate: p.successRate,
    failureRate: p.failureRate,
    patternType: p.patternType,
    createdAt: p.createdAt,
    metadata: p.metadata,
  };
}

// ── Main cycle ────────────────────────────────────────────────────────────────

export async function runGovernanceCycle(opts: {
  userId: number;
  principleLimit?: number;
}): Promise<GovernanceCycleResult | null> {
  const { userId, principleLimit = 30 } = opts;

  try {
    // ── Step 1: Load validated principles ────────────────────────────────────
    const validatedPrinciples = await getValidatedPrinciples(userId, principleLimit);
    if (validatedPrinciples.length === 0) {
      logger.info({ userId }, "Governance: no validated principles found — no cycle to run");
      return null;
    }

    // ── Step 2: Load existing approved policies ───────────────────────────────
    const existingApprovedPolicies = await getApprovedPolicies(userId);

    // ── Step 3: Evaluate principles ───────────────────────────────────────────
    const evaluations = evaluatePrinciples(
      validatedPrinciples.map(principleToEvalInput),
      existingApprovedPolicies,
    );

    const approvedPolicies: ExecutivePolicy[] = [];
    const rejectedPolicies: ExecutivePolicy[] = [];
    const deferredPrincipleIds: string[] = [];
    const evaluatedPrincipleIds = validatedPrinciples.map((p) => p.id);

    for (const { principle, result } of evaluations) {
      // Persist decision record
      await savePolicyDecision({
        policyId: null,
        principleId: principle.id,
        userId,
        result,
        confidenceAtDecision: principle.confidence,
        reliabilityAtDecision: principle.reliability,
        observationsAtDecision: principle.timesObserved,
      });

      switch (result.decision) {
        case "approve": {
          if (result.proposedPolicy) {
            const saved = await savePolicy({ ...result.proposedPolicy });
            await snapshotPolicyVersion(saved, "initial-approval");
            await savePolicyDecision({ policyId: saved.id, principleId: principle.id, userId, result, confidenceAtDecision: principle.confidence, reliabilityAtDecision: principle.reliability, observationsAtDecision: principle.timesObserved });
            approvedPolicies.push(saved);
          }
          break;
        }
        case "supersede": {
          if (result.proposedPolicy && result.supersededPolicyId) {
            // Retire the old policy
            const oldRows = await import("./governance-registry").then((m) => m.getPolicy(result.supersededPolicyId!));
            if (oldRows) {
              const retired = { ...oldRows, status: "retired" as const, retiredAt: new Date(), version: oldRows.version + 1, updatedAt: new Date() };
              await updatePolicy(retired);
              await snapshotPolicyVersion(retired, "superseded");
            }
            // Create the new one
            const saved = await savePolicy({ ...result.proposedPolicy });
            await snapshotPolicyVersion(saved, "supersedes-" + result.supersededPolicyId);
            await savePolicyDecision({ policyId: saved.id, principleId: principle.id, userId, result, confidenceAtDecision: principle.confidence, reliabilityAtDecision: principle.reliability, observationsAtDecision: principle.timesObserved });
            approvedPolicies.push(saved);
          }
          break;
        }
        case "reject": {
          if (result.proposedPolicy) {
            const saved = await savePolicy({ ...result.proposedPolicy, status: "rejected", rejectedAt: new Date() });
            await snapshotPolicyVersion(saved, "rejected");
            await savePolicyDecision({ policyId: saved.id, principleId: principle.id, userId, result, confidenceAtDecision: principle.confidence, reliabilityAtDecision: principle.reliability, observationsAtDecision: principle.timesObserved });
            rejectedPolicies.push(saved);
          }
          break;
        }
        case "defer":
        case "merge":
        default: {
          deferredPrincipleIds.push(principle.id);
          break;
        }
      }
    }

    // ── Step 4: Conflict scan ─────────────────────────────────────────────────
    const allActivePolicies = [...existingApprovedPolicies, ...approvedPolicies];
    // Build deprecated principle IDs from the principles whose status is deprecated
    const deprecatedPrincipleIds = new Set<string>(
      validatedPrinciples.filter((p) => p.status === "deprecated").map((p) => p.id),
    );
    const supersededMap = new Map<string, string>();

    const conflicts = runConflictScan(allActivePolicies, deprecatedPrincipleIds, supersededMap);
    const conflictSummary = summarizeConflicts(conflicts);

    // ── Step 5: Persist conflicts ─────────────────────────────────────────────
    const persistedConflicts: PolicyConflict[] = [];
    for (const c of conflicts) {
      try {
        await saveConflict(c);
        persistedConflicts.push(c);
      } catch {
        // duplicate — skip
      }
    }

    // ── Step 6: Determine profile type ────────────────────────────────────────
    const targetProfileType = inferProfileType(allActivePolicies);
    const currentProfile = await getActiveProfile(userId);

    // ── Step 7: Generate Adaptation Plan ─────────────────────────────────────
    let plan: AdaptationPlan | null = null;
    const policiesToRetire: ExecutivePolicy[] = existingApprovedPolicies.filter((p) =>
      conflicts.some(
        (c) =>
          (c.policyIdA === p.id || c.policyIdB === p.id) &&
          (c.conflictType === "deprecated_dependency" || c.conflictType === "cycle") &&
          c.severity >= 0.7,
      ),
    );

    if (isAdaptationNeeded(approvedPolicies, policiesToRetire)) {
      const planSpec = generateAdaptationPlan({
        userId,
        policiesToActivate: approvedPolicies,
        policiesToRetire,
        currentProfile,
        targetProfileType,
      });
      plan = await savePlan({
        ...planSpec,
        snapshotId: null,
        executedAt: null,
        rolledBackAt: null,
        governanceReportId: null,
      });
    }

    // ── Step 8: Create Behavior Snapshot ─────────────────────────────────────
    const snapshotSpec = buildSnapshot({ userId, currentProfile, adaptationPlan: plan });
    const snapshot = await saveSnapshot(snapshotSpec);

    // ── Step 9: Update plan with snapshot ID ──────────────────────────────────
    if (plan) {
      await updatePlanStatus(plan.id, "executing", { snapshotId: snapshot.id });
    }

    // ── Step 10: Apply adaptation (update active profile) ─────────────────────
    let activeProfile: BehaviorProfile | null = currentProfile;

    if (plan && approvedPolicies.length > 0) {
      // Retire high-severity conflicting policies
      for (const retiredPolicy of policiesToRetire) {
        await updatePolicy({ ...retiredPolicy, status: "retired", retiredAt: new Date(), version: retiredPolicy.version + 1, updatedAt: new Date() });
        await snapshotPolicyVersion({ ...retiredPolicy, status: "retired" }, "retired-by-adaptation");
      }

      if (currentProfile) {
        // Add new approved policies to current profile
        const newPolicyIds = [
          ...currentProfile.activePolicyIds.filter((id) => !policiesToRetire.map((p) => p.id).includes(id)),
          ...approvedPolicies.map((p) => p.id),
        ];
        await updateProfilePolicies(currentProfile.id, newPolicyIds);
        activeProfile = { ...currentProfile, activePolicyIds: newPolicyIds, policyCount: newPolicyIds.length };
      } else {
        // Create first profile
        const profileSpec = buildProfile({
          userId,
          profileType: targetProfileType,
          approvedPolicies: allActivePolicies,
        });
        const newProfile = await saveProfile(profileSpec);
        await activateProfile(newProfile.id, userId);
        activeProfile = { ...newProfile, isActive: true, activatedAt: new Date() };
      }

      // Mark plan as executed
      if (plan) {
        await updatePlanStatus(plan.id, "executed", { executedAt: new Date() });
        plan = { ...plan, status: "executed", executedAt: new Date() };
      }
    }

    // ── Step 11: Governance Report ────────────────────────────────────────────
    const cycleVersion = (await listGovernanceReports(userId, 1).then((r) => r[0]?.cycleVersion ?? 0)) + 1;

    const report = assembleGovernanceReport({
      userId,
      evaluatedPrincipleIds,
      approvedPolicyIds: approvedPolicies.map((p) => p.id),
      rejectedPolicyIds: rejectedPolicies.map((p) => p.id),
      deferredPrincipleIds,
      conflictReport: conflictSummary,
      plan,
      activeProfile,
      snapshotIds: [snapshot.id],
      cycleVersion,
    });
    await saveGovernanceReport(report);

    // Link report to plan
    if (plan) {
      await updatePlanStatus(plan.id, plan.status, { governanceReportId: report.id });
    }

    logger.info(
      {
        userId,
        principlesEvaluated: evaluatedPrincipleIds.length,
        approved: approvedPolicies.length,
        rejected: rejectedPolicies.length,
        deferred: deferredPrincipleIds.length,
        conflicts: conflicts.length,
        activeProfileType: activeProfile?.profileType ?? null,
        reportId: report.id,
      },
      "Governance: cycle completed",
    );

    return {
      report,
      approvedPolicies,
      rejectedPolicies,
      deferredCount: deferredPrincipleIds.length,
      conflictsFound: persistedConflicts,
      adaptationPlan: plan,
      activeProfile,
      snapshotId: snapshot.id,
    };
  } catch (err) {
    logger.error({ err }, "Governance: runGovernanceCycle failed");
    return null;
  }
}
