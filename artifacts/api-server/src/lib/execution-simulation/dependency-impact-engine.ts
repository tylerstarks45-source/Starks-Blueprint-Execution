// ─────────────────────────────────────────────────────────────────────────────
// Build 027: Execution Simulation Engine — Dependency Impact Engine
// Predicts downstream dependency changes caused by execution.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { PredictedStateChange, StateDomain, ChangeType } from "./types";

interface DependencyImpactInput {
  reportId:           string;
  simulationId:       string;
  businessId:         number;
  ownerType:          string;
  executionClass:     string;
  complexityLevel:    string;
  businessCriticality: string;
  packageTitle?:      string;
}

// Each owner type implies certain state domains and change types
const OWNER_STATE_DOMAINS: Record<string, StateDomain[]> = {
  ai_agent:           ["data", "process", "system"],
  automation:         ["system", "process", "data"],
  human:              ["process", "data", "compliance"],
  department:         ["process", "compliance", "data"],
  integration:        ["external", "data", "system"],
  external_system:    ["external", "system"],
  future_capability:  ["system", "process"],
  unknown:            ["process"],
};

const CLASS_CHANGE_TYPES: Record<string, ChangeType[]> = {
  automated:  ["update", "trigger", "transform"],
  ai_driven:  ["update", "create", "transform"],
  human:      ["update", "create", "delete"],
  external:   ["trigger", "update"],
  hybrid:     ["update", "trigger", "create"],
};

const CHANGE_DESCRIPTIONS: Record<ChangeType, (entity: string, pkg?: string) => string> = {
  create:    (e, p) => `New '${e}' entity created as part of ${p ?? "assignment"} execution.`,
  update:    (e, p) => `Existing '${e}' state updated during ${p ?? "assignment"} execution.`,
  delete:    (e, p) => `'${e}' record removed as part of ${p ?? "assignment"} cleanup.`,
  transform: (e, p) => `'${e}' data transformed to new schema by ${p ?? "assignment"}.`,
  trigger:   (e, p) => `'${e}' downstream event triggered by ${p ?? "assignment"}.`,
};

const CRITICALITY_CRITICAL_FLAGS: Record<string, boolean> = {
  low: false, medium: false, high: true, critical: true,
};

const REVERSIBILITY_BY_CHANGE: Record<ChangeType, boolean> = {
  create: true, update: true, delete: false, transform: false, trigger: true,
};

export function predictStateChanges(input: DependencyImpactInput): PredictedStateChange[] {
  const domains  = OWNER_STATE_DOMAINS[input.ownerType]  ?? OWNER_STATE_DOMAINS["unknown"]!;
  const changes  = CLASS_CHANGE_TYPES[input.executionClass]  ?? CLASS_CHANGE_TYPES["automated"]!;
  const isCritical = CRITICALITY_CRITICAL_FLAGS[input.businessCriticality] ?? false;

  // Produce one state change per (domain × change_type) intersection, up to 4
  const pairs: Array<{ domain: StateDomain; change: ChangeType }> = [];
  for (let i = 0; i < Math.min(domains.length, 2); i++) {
    for (let j = 0; j < Math.min(changes.length, 2); j++) {
      pairs.push({ domain: domains[i]!, change: changes[j]! });
    }
  }

  return pairs.slice(0, 4).map(({ domain, change }) => {
    const affectedEntity = `${domain}_resource_${input.ownerType}`;
    return {
      id:                randomUUID(),
      simulationId:      input.simulationId,
      reportId:          input.reportId,
      businessId:        input.businessId,
      stateDomain:       domain,
      changeType:        change,
      affectedEntity,
      changeDescription: CHANGE_DESCRIPTIONS[change](affectedEntity, input.packageTitle),
      isReversible:      REVERSIBILITY_BY_CHANGE[change],
      isCritical,
    };
  });
}
