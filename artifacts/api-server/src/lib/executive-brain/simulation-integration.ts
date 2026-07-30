// ─── Build 018: Executive Brain ↔ Future Simulation Integration ───────────────
//
// Provides:
//   fetchSimulationSummary   — compact summary of latest simulation for EB
//   triggerSimulationRun     — fire-and-forget simulation (throttled every 60 cycles)
//   buildSimulationAdvisory  — converts SimulationSummary into EB context text
//
// Future State Simulation explores possible futures.
// Executive Brain reasons over summaries.
// Simulation NEVER performs reasoning.
// Executive Brain NEVER owns simulation state.

import { fetchSimulationSummaryForEB, runFutureSimulation } from "../future-simulation/simulation-orchestrator";
import type { SimulationSummary } from "../future-simulation/types";
import { logger } from "../logger";

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchSimulationSummary(userId: number): Promise<SimulationSummary | null> {
  try {
    return await fetchSimulationSummaryForEB(userId);
  } catch (err) {
    logger.warn({ err }, "Executive Brain: fetchSimulationSummary failed (non-fatal)");
    return null;
  }
}

// ── Throttled trigger ─────────────────────────────────────────────────────────
// Fires every 60 brain cycles — simulation is the most expensive operation.

let simCycleCount = 0;
const SIMULATION_RUN_EVERY = 60;

export function triggerSimulationRun(userId: number, businessId: number): void {
  simCycleCount++;
  if (simCycleCount % SIMULATION_RUN_EVERY !== 0) return;

  void (async () => {
    try {
      await runFutureSimulation(businessId, userId);
    } catch (err) {
      logger.warn({ err }, "Executive Brain: background simulation run failed (non-fatal)");
    }
  })();
}

// ── Advisory ──────────────────────────────────────────────────────────────────

export function buildSimulationAdvisory(summary: SimulationSummary | null): string | null {
  if (!summary) return null;

  const lines: string[] = [`SIMULATIONS: ${summary.scenarioCount} future scenario${summary.scenarioCount !== 1 ? "s" : ""} modelled.`];

  if (summary.highestExpectedValue) {
    const s = summary.highestExpectedValue;
    lines.push(`Highest-value: "${s.scenarioName}" (value ${(s.expectedValueScore * 100).toFixed(0)}%, confidence ${(s.overallConfidence * 100).toFixed(0)}%)`);
  }
  if (summary.lowestRiskScenario && summary.lowestRiskScenario.id !== summary.highestExpectedValue?.id) {
    const s = summary.lowestRiskScenario;
    lines.push(`Lowest risk: "${s.scenarioName}" (risk ${(s.riskScore * 100).toFixed(0)}%)`);
  }
  if (summary.highestGrowthScenario && summary.highestGrowthScenario.id !== summary.highestExpectedValue?.id) {
    const s = summary.highestGrowthScenario;
    lines.push(`Highest growth: "${s.scenarioName}" (growth ${(s.growthPotential * 100).toFixed(0)}%)`);
  }
  if (summary.avgRisk != null) {
    lines.push(`Avg risk across scenarios: ${(summary.avgRisk * 100).toFixed(0)}%.`);
  }

  return lines.join("\n");
}
