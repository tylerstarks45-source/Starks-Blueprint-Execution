// ─── Execution Adapter Interfaces (Build 010) ────────────────────────────────
//
// Interface declarations ONLY.  No adapter is implemented here.
// Future builds will implement concrete adapters.
//
// Supported future adapter types:
//   - CognitiveTaskAdapter   — Internal cognitive work dispatched to a Brain
//   - AiAgentAdapter         — Autonomous AI agent execution
//   - BrowserAutomationAdapter — Playwright / CDP browser control
//   - ApiAdapter             — External HTTP API calls
//   - FileSystemAdapter      — File read/write operations
//   - CodeExecutionAdapter   — Sandboxed code execution
//   - HumanApprovalAdapter   — Human-in-the-loop review gates
//   - ExternalWorkflowAdapter — External workflow / automation system

import type { ExecutionAdapterType } from "./types";

// ── Base adapter interface ─────────────────────────────────────────────────────

export interface ExecutionAdapterContext {
  executionId: string;
  stepId: string;
  userId: number | null;
  adapterType: ExecutionAdapterType;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface ExecutionAdapterResult {
  success: boolean;
  output: Record<string, unknown>;
  error?: string;
  durationMs?: number;
  requiresRetry?: boolean;
  retryAfterMs?: number;
}

/**
 * Base interface every adapter must implement.
 * Adapters NEVER modify the Execution Engine's state directly —
 * they return a result and the Execution Engine applies the state transition.
 */
export interface ExecutionAdapter {
  /** Unique identifier for this adapter type. */
  readonly adapterType: ExecutionAdapterType;

  /** Human-readable name for logging and diagnostics. */
  readonly displayName: string;

  /** Check whether this adapter can handle a given step context. */
  canHandle(ctx: ExecutionAdapterContext): boolean;

  /** Execute the work described by the context.
   *  MUST be idempotent — callers may invoke this more than once on retry. */
  execute(ctx: ExecutionAdapterContext): Promise<ExecutionAdapterResult>;

  /** Optional: validate the payload before execution starts. */
  validate?(payload: Record<string, unknown>): { valid: boolean; errors: string[] };
}

// ── Individual adapter type interfaces (future implementation targets) ─────────

/** Internal Cognitive Task Adapter — dispatches work to a registered Brain. */
export interface CognitiveTaskAdapterConfig {
  targetBrainId: string;
  objective: string;
  contextIds?: string[];
  timeout?: number;
}

/** AI Agent Adapter — invokes an autonomous AI agent with a goal and tools. */
export interface AiAgentAdapterConfig {
  agentModel: string;
  systemPrompt?: string;
  objective: string;
  availableTools?: string[];
  maxIterations?: number;
  timeout?: number;
}

/** Browser Automation Adapter — executes browser tasks via CDP/Playwright. */
export interface BrowserAutomationAdapterConfig {
  startUrl: string;
  task: string;
  credentialKeys?: string[];
  headless?: boolean;
  timeout?: number;
}

/** API Adapter — calls an external HTTP endpoint. */
export interface ApiAdapterConfig {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  credentialKey?: string;
  timeout?: number;
}

/** File System Adapter — reads or writes files within the workspace. */
export interface FileSystemAdapterConfig {
  operation: "read" | "write" | "delete" | "list";
  path: string;
  content?: string;
}

/** Code Execution Adapter — runs sandboxed code. */
export interface CodeExecutionAdapterConfig {
  language: string;
  code: string;
  timeout?: number;
  environment?: Record<string, string>;
}

/** Human Approval Adapter — gates execution on a human decision. */
export interface HumanApprovalAdapterConfig {
  approvers: number[];   // userId list
  question: string;
  context?: Record<string, unknown>;
  timeout?: number;
}

/** External Workflow Adapter — triggers an external automation system. */
export interface ExternalWorkflowAdapterConfig {
  workflowId: string;
  provider: string;
  triggerPayload?: Record<string, unknown>;
  webhookCallbackUrl?: string;
}

// ── Adapter registry interface (for future Build that implements adapters) ─────

export interface AdapterRegistry {
  register(adapter: ExecutionAdapter): void;
  get(adapterType: ExecutionAdapterType): ExecutionAdapter | undefined;
  list(): ExecutionAdapter[];
  canHandle(adapterType: ExecutionAdapterType, ctx: ExecutionAdapterContext): boolean;
}

// ── Stub registry — returns null for all queries until adapters are registered ─

class StubAdapterRegistry implements AdapterRegistry {
  private adapters = new Map<ExecutionAdapterType, ExecutionAdapter>();

  register(adapter: ExecutionAdapter): void {
    this.adapters.set(adapter.adapterType, adapter);
  }

  get(adapterType: ExecutionAdapterType): ExecutionAdapter | undefined {
    return this.adapters.get(adapterType);
  }

  list(): ExecutionAdapter[] {
    return Array.from(this.adapters.values());
  }

  canHandle(adapterType: ExecutionAdapterType, ctx: ExecutionAdapterContext): boolean {
    const adapter = this.adapters.get(adapterType);
    return adapter ? adapter.canHandle(ctx) : false;
  }
}

/** Singleton adapter registry — importable by future adapter implementations. */
export const adapterRegistry: AdapterRegistry = new StubAdapterRegistry();
