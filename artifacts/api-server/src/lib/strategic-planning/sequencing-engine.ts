// ─────────────────────────────────────────────────────────────────────────────
// Build 021: Strategic Planning Engine — Sequencing Engine
// Determines logical execution order. No scheduling. No calendar dates.
// Only dependency-aware sequencing using programme/initiative priority.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { PlanningSequence, SequenceEntityType } from "./types";
import type { ProgramType } from "./types";

// ── Layer assignment rules ────────────────────────────────────────────────────
// Layer 0: Foundation programmes — governance, technology (infrastructure required by all)
// Layer 1: Enabling programmes — talent, finance, operations (enablers)
// Layer 2: Growth programmes — revenue, customer, market, innovation (depend on enablers)
const PROGRAM_LAYER: Record<ProgramType, number> = {
  governance_program: 0,
  technology_program: 0,
  talent_program: 1,
  finance_program: 1,
  operations_program: 1,
  revenue_program: 2,
  customer_program: 2,
  market_program: 2,
  innovation_program: 2,
};

const LAYER_RATIONALE: Record<number, string> = {
  0: "Foundation layer — must be established before dependent programmes can start.",
  1: "Enabling layer — builds the capabilities required for growth programmes.",
  2: "Growth layer — can execute once foundation and enabling programmes are sufficiently advanced.",
};

interface ProgramInput {
  id: string;
  programType: ProgramType;
  programName: string;
  priority: number;
}

interface InitiativeInput {
  id: string;
  programId: string;
  initiativeName: string;
  priority: number;
  sequencePosition: number;
}

export function determineSequences(params: {
  planId: string;
  reportId: string;
  businessId: number;
  programs: ProgramInput[];
  initiatives: InitiativeInput[];
}): { sequences: PlanningSequence[]; updatedPrograms: (ProgramInput & { sequenceLayer: number })[] } {
  const { planId, reportId, businessId, programs, initiatives } = params;

  const sequences: PlanningSequence[] = [];

  // ── Programme-level sequencing ─────────────────────────────────────────────
  const layerGroups: Record<number, ProgramInput[]> = {};
  for (const prog of programs) {
    const layer = PROGRAM_LAYER[prog.programType] ?? 1;
    if (!layerGroups[layer]) layerGroups[layer] = [];
    layerGroups[layer].push(prog);
  }

  // Within each layer, sort by priority
  for (const [layerStr, progs] of Object.entries(layerGroups)) {
    const layer = Number(layerStr);
    const sorted = [...progs].sort((a, b) => a.priority - b.priority);

    // Predecessor IDs = all programmes from earlier layers
    const predecessorIds = programs
      .filter((p) => (PROGRAM_LAYER[p.programType] ?? 1) < layer)
      .map((p) => p.id);

    sorted.forEach((prog, pos) => {
      sequences.push({
        id: randomUUID(),
        planId,
        reportId,
        businessId,
        entityType: "program" as SequenceEntityType,
        entityId: prog.id,
        entityName: prog.programName,
        sequenceLayer: layer,
        sequencePosition: pos,
        predecessorIds,
        canParallelise: sorted.length > 1,
        rationale: LAYER_RATIONALE[layer] ?? "Can execute once prerequisites are established.",
      });
    });
  }

  // ── Initiative-level sequencing (within their programme) ──────────────────
  const programMap = new Map(programs.map((p) => [p.id, p]));
  const initiativesByProgram: Record<string, InitiativeInput[]> = {};
  for (const init of initiatives) {
    if (!initiativesByProgram[init.programId]) initiativesByProgram[init.programId] = [];
    initiativesByProgram[init.programId].push(init);
  }

  for (const [programId, inits] of Object.entries(initiativesByProgram)) {
    const prog = programMap.get(programId);
    const programLayer = prog ? (PROGRAM_LAYER[prog.programType] ?? 1) : 1;
    const sorted = [...inits].sort((a, b) => a.sequencePosition - b.sequencePosition);

    sorted.forEach((init, pos) => {
      // First initiative has no predecessors within the programme
      const predecessorIds = pos === 0 ? [] : [sorted[pos - 1].id];
      const canParallelise = false; // initiatives within a programme are sequential by default

      sequences.push({
        id: randomUUID(),
        planId,
        reportId,
        businessId,
        entityType: "initiative" as SequenceEntityType,
        entityId: init.id,
        entityName: init.initiativeName,
        sequenceLayer: programLayer,
        sequencePosition: pos,
        predecessorIds,
        canParallelise,
        rationale: pos === 0
          ? "First initiative in programme — can begin once programme prerequisites are met."
          : "Follows the preceding initiative in this programme.",
      });
    });
  }

  // ── Return updated programs with sequenceLayer set ─────────────────────────
  const updatedPrograms = programs.map((p) => ({
    ...p,
    sequenceLayer: PROGRAM_LAYER[p.programType] ?? 1,
  }));

  return { sequences, updatedPrograms };
}
