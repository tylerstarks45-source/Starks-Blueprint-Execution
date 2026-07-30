// ─── Event Ingestion Engine (Build 011) ──────────────────────────────────────
//
// Central entry point: every cognitive subsystem publishes events here.
// For each ingested event the engine:
//   1. Scores attention (deterministic)
//   2. Classifies signal (deterministic)
//   3. Persists the observation (immutable)
//   4. Resolves/creates the chain (by anchor object)
//   5. Adds the observation to the chain
//   6. Inserts the signal record
//   7. Detects correlations with recent observations
//   8. Fires extension point hooks (non-blocking)
//
// Never performs business logic.
// Never changes execution, planning, goals, or memory state.

import { randomUUID } from "crypto";
import { logger } from "../logger";
import { computeAttentionForIngestion, ATTENTION_HIGH_THRESHOLD } from "./observation-attention";
import { classifySignal, describeSignal } from "./observation-signal";
import { resolveChainAnchor, generateChainName, updateChainAggregates, isChainReflectionReady } from "./observation-chain";
import { detectCorrelations } from "./observation-correlation";
import {
  insertObservation,
  insertSignal,
  insertCorrelations,
  getOrCreateChain,
  updateChain,
  addObservationToChain,
  listObservations,
} from "./observation-registry";
import {
  fireObservationHooks,
  OBSERVATION_EXTENSION_POINT_IDS,
} from "./observation-extension-points";
import type {
  IngestObservationInput,
  ExecutiveObservation,
  ObservationSignal,
} from "./types";

export interface IngestionResult {
  observation: ExecutiveObservation;
  signal: ObservationSignal;
  chainId: string | null;
  correlationCount: number;
}

// ── Core ingestion function ────────────────────────────────────────────────────

export async function ingestObservation(input: IngestObservationInput): Promise<IngestionResult> {
  const id = randomUUID();

  // ── 1. Compute attention score ─────────────────────────────────────────────
  const attention = computeAttentionForIngestion(input);

  // ── 2. Classify signal ─────────────────────────────────────────────────────
  const signalClass = classifySignal(
    input.eventType,
    input.eventCategory,
    input.severity ?? "info",
  );

  // ── 3. Resolve chain anchor ────────────────────────────────────────────────
  const anchor = resolveChainAnchor({
    relatedExecutionId: input.relatedExecutionId ?? null,
    relatedPlanId: input.relatedPlanId ?? null,
    relatedGoalId: input.relatedGoalId ?? null,
    relatedUserRequestId: input.relatedUserRequestId ?? null,
    sourceObjectId: input.sourceObjectId ?? null,
    sourceObjectType: input.sourceObjectType ?? null,
  });

  let chainId: string | null = null;
  if (anchor) {
    const chain = await getOrCreateChain({
      userId: input.userId,
      anchorObjectId: anchor.anchorObjectId,
      anchorObjectType: anchor.anchorObjectType,
      name: generateChainName(anchor.anchorObjectType, anchor.anchorObjectId),
    });
    chainId = chain.id;
  }

  // ── 4. Persist observation (immutable) ─────────────────────────────────────
  const observation = await insertObservation({
    id,
    userId: input.userId,
    sourceSystem: input.sourceSystem,
    sourceObjectId: input.sourceObjectId ?? null,
    sourceObjectType: input.sourceObjectType ?? null,
    eventType: input.eventType,
    eventCategory: input.eventCategory,
    severity: input.severity ?? "info",
    attentionScore: attention.score,
    attentionDimensions: attention.dimensions,
    signalType: signalClass.signalType,
    observedState: input.payload?.["status"] as string | undefined ?? null,
    previousState: input.payload?.["previousStatus"] as string | undefined ?? null,
    chainId,
    relatedGoalId: input.relatedGoalId ?? null,
    relatedPlanId: input.relatedPlanId ?? null,
    relatedExecutionId: input.relatedExecutionId ?? null,
    relatedContextId: input.relatedContextId ?? null,
    relatedJudgmentId: input.relatedJudgmentId ?? null,
    relatedMemoryId: input.relatedMemoryId ?? null,
    relatedKnowledgeId: input.relatedKnowledgeId ?? null,
    relatedUserRequestId: input.relatedUserRequestId ?? null,
    payload: input.payload ?? {},
    version: 1,
    metadata: input.metadata ?? {},
  });

  // ── 5. Update chain aggregate ──────────────────────────────────────────────
  if (chainId) {
    try {
      const chain = await import("./observation-registry").then((m) => m.getChain(chainId!));
      if (chain) {
        const updates = updateChainAggregates(chain, observation);
        await updateChain(chainId, updates);
        await addObservationToChain(chainId, id, updates.observationCount);

        // Fire chain updated hook (non-blocking)
        void fireObservationHooks(OBSERVATION_EXTENSION_POINT_IDS.OBSERVATION_CHAIN_UPDATED, {
          chain: { ...chain, ...updates },
          observation,
          positionInChain: updates.observationCount,
        }).catch(() => {});

        // Reflection-ready check
        const updatedChain = { ...chain, ...updates };
        if (isChainReflectionReady(updatedChain)) {
          void fireObservationHooks(OBSERVATION_EXTENSION_POINT_IDS.REFLECTION_READY, {
            userId: input.userId,
            chainId,
            observationCount: updatedChain.observationCount,
            topSignals: updatedChain.signalTypes.slice(0, 5),
          }).catch(() => {});
        }
      }
    } catch (err) {
      logger.warn({ err, chainId }, "Chain update failed (non-fatal)");
    }
  }

  // ── 6. Persist signal record ───────────────────────────────────────────────
  const signal = await insertSignal({
    observationId: id,
    userId: input.userId,
    signalType: signalClass.signalType,
    strength: signalClass.strength,
    description: describeSignal(
      signalClass.signalType,
      input.eventType,
      input.sourceSystem,
      input.sourceObjectId ?? null,
    ),
    relatedGoalId: input.relatedGoalId ?? null,
    relatedPlanId: input.relatedPlanId ?? null,
    relatedExecutionId: input.relatedExecutionId ?? null,
  });

  // ── 7. Detect correlations with recent observations ────────────────────────
  let correlationCount = 0;
  try {
    const recentObs = await listObservations({
      userId: input.userId,
      since: new Date(Date.now() - 600_000),   // last 10 minutes
      limit: 50,
    });
    const candidates = detectCorrelations(observation, recentObs);
    if (candidates.length > 0) {
      const inserted = await insertCorrelations(candidates);
      correlationCount = inserted.length;

      // Fire correlation hook for each new edge (non-blocking)
      for (const corr of inserted) {
        void fireObservationHooks(OBSERVATION_EXTENSION_POINT_IDS.CORRELATION_FOUND, corr).catch(() => {});
      }
    }
  } catch (err) {
    logger.warn({ err }, "Correlation detection failed (non-fatal)");
  }

  // ── 8. Fire extension hooks (non-blocking) ─────────────────────────────────
  void fireObservationHooks(OBSERVATION_EXTENSION_POINT_IDS.OBSERVATION_RECORDED, observation).catch(() => {});

  void fireObservationHooks(OBSERVATION_EXTENSION_POINT_IDS.SIGNAL_EMITTED, signal).catch(() => {});

  if (attention.score >= ATTENTION_HIGH_THRESHOLD) {
    void fireObservationHooks(OBSERVATION_EXTENSION_POINT_IDS.ATTENTION_THRESHOLD_EXCEEDED, {
      observation,
      attentionScore: attention.score,
    }).catch(() => {});
  }

  return { observation, signal, chainId, correlationCount };
}

// ── Batch ingestion ────────────────────────────────────────────────────────────

export async function ingestObservationBatch(
  inputs: IngestObservationInput[],
): Promise<IngestionResult[]> {
  const results: IngestionResult[] = [];
  for (const input of inputs) {
    try {
      results.push(await ingestObservation(input));
    } catch (err) {
      logger.warn({ err, sourceSystem: input.sourceSystem, eventType: input.eventType },
        "Batch observation ingestion failed for one item (non-fatal)");
    }
  }
  return results;
}

// ── Convenience wrappers for subsystem publishers ──────────────────────────────

/** Publish an execution state change observation. */
export async function observeExecution(opts: {
  userId: number;
  executionId: string;
  eventType: string;
  fromStatus?: string;
  toStatus?: string;
  severity?: IngestObservationInput["severity"];
  planId?: string;
  goalId?: string;
  payload?: Record<string, unknown>;
}): Promise<IngestionResult> {
  return ingestObservation({
    userId: opts.userId,
    sourceSystem: "execution",
    sourceObjectId: opts.executionId,
    sourceObjectType: "execution",
    eventType: opts.eventType,
    eventCategory: "execution",
    severity: opts.severity ?? deriveSeverityFromExecutionEvent(opts.eventType),
    observedState: opts.toStatus,
    previousState: opts.fromStatus,
    relatedExecutionId: opts.executionId,
    relatedPlanId: opts.planId,
    relatedGoalId: opts.goalId,
    payload: {
      fromStatus: opts.fromStatus,
      toStatus: opts.toStatus,
      status: opts.toStatus,
      ...opts.payload,
    },
  });
}

/** Publish a goal lifecycle observation. */
export async function observeGoal(opts: {
  userId: number;
  goalId: string;
  eventType: string;
  severity?: IngestObservationInput["severity"];
  payload?: Record<string, unknown>;
}): Promise<IngestionResult> {
  return ingestObservation({
    userId: opts.userId,
    sourceSystem: "goal",
    sourceObjectId: opts.goalId,
    sourceObjectType: "goal",
    eventType: opts.eventType,
    eventCategory: "goal",
    severity: opts.severity ?? "info",
    relatedGoalId: opts.goalId,
    payload: opts.payload ?? {},
  });
}

/** Publish a planning observation. */
export async function observePlanning(opts: {
  userId: number;
  planId: string;
  eventType: string;
  goalId?: string;
  severity?: IngestObservationInput["severity"];
  payload?: Record<string, unknown>;
}): Promise<IngestionResult> {
  return ingestObservation({
    userId: opts.userId,
    sourceSystem: "planning",
    sourceObjectId: opts.planId,
    sourceObjectType: "plan",
    eventType: opts.eventType,
    eventCategory: "planning",
    severity: opts.severity ?? "info",
    relatedPlanId: opts.planId,
    relatedGoalId: opts.goalId,
    payload: opts.payload ?? {},
  });
}

// ── Severity inference ─────────────────────────────────────────────────────────

function deriveSeverityFromExecutionEvent(
  eventType: string,
): IngestObservationInput["severity"] {
  if (eventType.includes("failed") || eventType.includes("error")) return "high";
  if (eventType.includes("cancel")) return "medium";
  if (eventType.includes("blocked")) return "medium";
  if (eventType.includes("retry")) return "medium";
  if (eventType.includes("completed")) return "low";
  return "info";
}
