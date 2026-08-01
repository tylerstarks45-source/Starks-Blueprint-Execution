// ── Build 040: Unified Cognitive Orchestration Engine — Types ─────────────
// Self-contained orchestration types. Engine-specific summary types live in
// their respective module types.ts files and are imported by the orchestrator.

// ── Engine descriptor ─────────────────────────────────────────────────────

export interface CognitiveEngineDescriptor {
  engineId:    string;
  engineTitle: string;
  buildNumber: number;
  waveNumber:  number;              // 1-based; engines in same wave run in parallel
  dependencies:string[];           // engineIds that must complete before this wave starts
  description: string;
}

// ── Execution wave ────────────────────────────────────────────────────────

export interface ExecutionWave {
  waveNumber:   number;
  engineIds:    string[];
  durationMs:   number;
  successCount: number;
  failureCount: number;
}

// ── Per-engine diagnostic ─────────────────────────────────────────────────

export interface EngineDiagnostic {
  engineId:             string;
  waveNumber:           number;
  durationMs:           number;
  succeeded:            boolean;
  hasSummary:           boolean;
  dependencySatisfied:  boolean;
  confidenceValue:      number | null;
  errorMessage:         string | null;
}

// ── Confidence flow ───────────────────────────────────────────────────────

export interface ConfidenceFlowRecord {
  sourceEngineId:   string;
  targetEngineId:   string;
  sourceConfidence: number;
  propagatedValue:  number;
  attenuation:      number;
}

// ── Evidence flow ─────────────────────────────────────────────────────────

export interface EvidenceFlowRecord {
  sourceEngineId:    string;
  targetEngineId:    string;
  evidenceType:      string;
  evidenceKey:       string;
  evidenceAvailable: boolean;
}

// ── Orchestration summary (for EB context note) ───────────────────────────

export interface UnifiedOrchestrationSummary {
  totalEngines:     number;
  wavesExecuted:    number;
  successCount:     number;
  failureCount:     number;
  avgDurationMs:    number;
  avgConfidence:    number;
  avgSuccessRate:   number;
  lawComplianceRate:number;
  topEngineId:      string | null;
  recentCycles:     number;
}

// ── EP IDs ────────────────────────────────────────────────────────────────

export const UCOS_EP_IDS = {
  DEPENDENCY_RESOLUTION: "ucos.dependency.resolution",
  EXECUTION_SCHEDULER:   "ucos.execution.scheduler",
  SYNCHRONIZATION:       "ucos.synchronization",
  EVIDENCE_PROPAGATION:  "ucos.evidence.propagation",
  CONFIDENCE_PROPAGATION:"ucos.confidence.propagation",
  EXECUTION_DIAGNOSTICS: "ucos.execution.diagnostics",
  ORCHESTRATION:         "ucos.orchestration",
  ADVISORY:              "ucos.advisory",
} as const;

// ── Wave definitions (static engine registry) ─────────────────────────────
// Engines within the same wave execute in parallel.
// All engines in wave N must complete before wave N+1 begins.

export const COGNITIVE_ENGINE_REGISTRY: CognitiveEngineDescriptor[] = [
  // Wave 1 — Foundation (no upstream engine deps; only need userId)
  { engineId: "business-graph",         engineTitle: "Business Graph Engine",            buildNumber: 15, waveNumber: 1, dependencies: [],                                  description: "Business topology, nodes, KPIs, health" },
  { engineId: "capability-intelligence",engineTitle: "Adaptive Capability Intelligence", buildNumber: 31, waveNumber: 1, dependencies: [],                                  description: "Adapter capability health and reliability" },
  { engineId: "platform-infrastructure",engineTitle: "Platform Infrastructure Intelligence",buildNumber:32,waveNumber: 1, dependencies: [],                                  description: "Computing environment observation" },
  { engineId: "global-technology",      engineTitle: "Global Technology Intelligence",   buildNumber: 33, waveNumber: 1, dependencies: [],                                  description: "External technology catalog" },
  { engineId: "trade-off-intelligence", engineTitle: "Executive Trade-off Intelligence", buildNumber: 37, waveNumber: 1, dependencies: [],                                  description: "Multi-objective decision evaluation" },
  { engineId: "portfolio-intelligence", engineTitle: "Executive Portfolio Intelligence", buildNumber: 38, waveNumber: 1, dependencies: [],                                  description: "Portfolio balance, allocation, exposure" },
  { engineId: "priority-intelligence",  engineTitle: "Executive Priority Intelligence",  buildNumber: 39, waveNumber: 1, dependencies: [],                                  description: "Deterministic priority ranking" },

  // Wave 2 — Business Intelligence (depends on business-graph for businessId)
  { engineId: "business-analysis",      engineTitle: "Business Analysis Engine",         buildNumber: 16, waveNumber: 2, dependencies: ["business-graph"],                  description: "Descriptive business analysis" },
  { engineId: "technology-relationships",engineTitle:"Technology Relationship Intelligence",buildNumber:34,waveNumber: 2, dependencies: ["global-technology"],               description: "Technology dependency and ecosystem mapping" },
  { engineId: "technology-evolution",   engineTitle: "Technology Evolution Intelligence",buildNumber: 35, waveNumber: 2, dependencies: ["global-technology","technology-relationships"], description: "Technology lifecycle and trends" },
  { engineId: "systems-dynamics",       engineTitle: "Systems Dynamics Intelligence",    buildNumber: 36, waveNumber: 2, dependencies: ["business-graph"],                  description: "Feedback loops, constraints, resilience" },

  // Wave 3 — Discovery & Simulation (depends on Wave 2)
  { engineId: "opportunity-discovery",  engineTitle: "Opportunity Discovery Engine",     buildNumber: 17, waveNumber: 3, dependencies: ["business-analysis","business-graph"],description: "Opportunity identification from 6 sources" },
  { engineId: "future-simulation",      engineTitle: "Future State Simulation Engine",   buildNumber: 18, waveNumber: 3, dependencies: ["opportunity-discovery","business-analysis"], description: "Deterministic scenario generation" },
  { engineId: "decision-intelligence",  engineTitle: "Decision Intelligence Engine",     buildNumber: 19, waveNumber: 3, dependencies: ["business-graph","systems-dynamics"], description: "Executive decision selection" },

  // Wave 4 — Strategic Direction (depends on Wave 3)
  { engineId: "executive-strategy",     engineTitle: "Executive Strategy Engine",        buildNumber: 20, waveNumber: 4, dependencies: ["decision-intelligence","opportunity-discovery"], description: "Strategic direction and pillars" },

  // Wave 5 — Strategic Planning (depends on Wave 4)
  { engineId: "strategic-planning",     engineTitle: "Strategic Planning Engine",        buildNumber: 21, waveNumber: 5, dependencies: ["executive-strategy"],              description: "Programmes, initiatives, milestones" },
  { engineId: "capability-planning",    engineTitle: "Capability Planning Engine",       buildNumber: 22, waveNumber: 5, dependencies: ["executive-strategy"],              description: "Capability requirements and gaps" },

  // Wave 6 — Operational Planning (depends on Wave 5)
  { engineId: "operational-planning",   engineTitle: "Operational Planning Engine",      buildNumber: 23, waveNumber: 6, dependencies: ["strategic-planning","capability-planning"], description: "Phases, work packages, dependencies" },

  // Wave 7 — Execution (depends on Wave 6)
  { engineId: "execution-orchestration",engineTitle: "Execution Orchestration Engine",   buildNumber: 24, waveNumber: 7, dependencies: ["operational-planning"],            description: "Assignments, owners, automation" },
  { engineId: "authority-resolution",   engineTitle: "Authority Resolution Engine",      buildNumber: 25, waveNumber: 7, dependencies: ["execution-orchestration"],         description: "Authorization requirements and grants" },

  // Wave 8 — Risk & Simulation (depends on Wave 7)
  { engineId: "execution-risk",         engineTitle: "Execution Risk Assessment Engine", buildNumber: 26, waveNumber: 8, dependencies: ["execution-orchestration","authority-resolution"], description: "Risk profiles and safety scores" },
  { engineId: "execution-simulation",   engineTitle: "Execution Simulation Engine",      buildNumber: 27, waveNumber: 8, dependencies: ["execution-risk"],                  description: "Scenario-based execution prediction" },

  // Wave 9 — Workflow & Execution (depends on Wave 8)
  { engineId: "workflow-execution",     engineTitle: "Intelligent Workflow Execution",   buildNumber: 28, waveNumber: 9, dependencies: ["execution-simulation"],            description: "DAG workflow construction and checkpointing" },
  { engineId: "universal-execution",    engineTitle: "Universal Execution Engine",       buildNumber: 29, waveNumber: 9, dependencies: ["workflow-execution"],              description: "Generic cross-domain execution" },
  { engineId: "adapter-framework",      engineTitle: "Universal Execution Adapter Framework",buildNumber:30,waveNumber: 9, dependencies: ["universal-execution"],           description: "Adapter inventory and health" },
];
