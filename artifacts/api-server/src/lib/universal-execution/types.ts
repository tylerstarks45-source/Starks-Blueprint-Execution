// ─────────────────────────────────────────────────────────────────────────────
// Build 029: Universal Execution Engine — Types
// Self-contained. No imports from other engine types files.
// ─────────────────────────────────────────────────────────────────────────────

// ── State machine ──────────────────────────────────────────────────────────
export type ExecutionState =
  | "pending"
  | "ready"
  | "running"
  | "waiting"
  | "paused"
  | "succeeded"
  | "failed"
  | "rolled_back"
  | "cancelled";

// ── Evidence categories ────────────────────────────────────────────────────
export type EvidenceType =
  | "inputs"
  | "outputs"
  | "logs"
  | "errors"
  | "validation_results"
  | "execution_metadata";

// ── Execution health ───────────────────────────────────────────────────────
export type ExecutionHealth = "healthy" | "degraded" | "failed" | "unknown";

// ── Event types (observable) ───────────────────────────────────────────────
export type ExecutionEventType =
  | "session_started"
  | "session_paused"
  | "session_resumed"
  | "session_cancelled"
  | "session_completed"
  | "node_started"
  | "node_completed"
  | "node_failed"
  | "node_rolled_back"
  | "checkpoint_validated"
  | "checkpoint_failed"
  | "evidence_collected"
  | "rollback_initiated"
  | "rollback_completed";

// ── Extension point IDs (Build 029) ───────────────────────────────────────
export const EP_EXECUTION_SESSION_CREATED  = "universal-execution:session-created";
export const EP_NODE_EXECUTION_STARTED     = "universal-execution:node-execution-started";
export const EP_NODE_EXECUTION_COMPLETED   = "universal-execution:node-execution-completed";
export const EP_CHECKPOINT_VALIDATED       = "universal-execution:checkpoint-validated";
export const EP_EVIDENCE_COLLECTED         = "universal-execution:evidence-collected";
export const EP_ROLLBACK_INITIATED         = "universal-execution:rollback-initiated";
export const EP_EXECUTION_REPORT_GENERATED = "universal-execution:report-generated";
export const EP_EXECUTION_REGISTRY_UPDATED = "universal-execution:registry-updated";

// ── In-memory node record ──────────────────────────────────────────────────
export interface ExecutionNodeRecord {
  id: string;
  sessionId: string;
  businessId: number;
  workflowId: string | null;
  workflowNodeId: string | null;
  nodeTitle: string;
  nodeType: string;
  phase: string;
  executionClass: string;
  ownerType: string;
  sequencePosition: number;
  isCritical: boolean;
  status: ExecutionState;
  checkpointPreValidated: boolean;
  checkpointPostValidated: boolean;
  durationMs: number;
}

// ── EB summary type ────────────────────────────────────────────────────────
export interface ExecutionSessionSummary {
  sessionId: string;
  businessId: number;
  workflowId: string | null;
  status: ExecutionState;
  nodeCount: number;
  completedNodeCount: number;
  failedNodeCount: number;
  rolledBackNodeCount: number;
  successRate: number;
  executionHealth: ExecutionHealth;
  durationMs: number;
  executiveSummary: string;
  createdAt: Date;
}
