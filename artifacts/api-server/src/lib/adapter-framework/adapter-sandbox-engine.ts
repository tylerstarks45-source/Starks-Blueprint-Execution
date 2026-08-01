// ─────────────────────────────────────────────────────────────────────────────
// Build 030: Universal Execution Adapter Framework — Adapter Sandbox Engine
// All adapters execute inside isolated sandboxes.
// Adapters never receive unrestricted Brain access.
// Brain never receives unrestricted adapter access.
// All communication occurs through typed contracts.
// ─────────────────────────────────────────────────────────────────────────────
import type { AdapterType, ContractType } from "./types";

// ── Sandbox context — what the adapter receives ────────────────────────────
export interface SandboxContext {
  adapterId: string;
  adapterType: AdapterType;
  sessionId: string;
  allowedCapabilityKeys: string[];
  allowedActions: string[];
  contractType: ContractType;
  inputPayload: Record<string, unknown>;
  sandboxId: string;
  enteredAt: Date;
}

// ── Sandbox result — what the Brain receives back ─────────────────────────
export interface SandboxResult {
  sandboxId: string;
  adapterId: string;
  contractType: ContractType;
  success: boolean;
  outputPayload: Record<string, unknown>;
  errorPayload: Record<string, unknown> | null;
  durationMs: number;
  exitedAt: Date;
}

let sandboxCounter = 0;

/**
 * Enter the adapter sandbox.
 * Creates an isolated SandboxContext that contains ONLY the typed contract
 * payload the adapter needs. The adapter never sees Brain state, memory,
 * reasoning, or executive intelligence.
 */
export function enterSandbox(
  adapterId: string,
  adapterType: AdapterType,
  allowedCapabilityKeys: string[],
  allowedActions: string[],
  contractType: ContractType,
  inputPayload: Record<string, unknown>
): SandboxContext {
  sandboxCounter++;
  return {
    adapterId,
    adapterType,
    allowedCapabilityKeys,
    allowedActions,
    contractType,
    inputPayload,
    sessionId: `sbx-session-${sandboxCounter}`,
    sandboxId: `sbx-${Date.now()}-${sandboxCounter}`,
    enteredAt: new Date(),
  };
}

/**
 * Execute within the sandbox. In the generic engine, execution is a
 * deterministic pass-through. Future Execution Adapters extend via
 * EP_ADAPTER_SANDBOX_ENTERED to provide real platform-specific execution.
 * Returns a typed SandboxResult. Never throws.
 */
export async function executeSandboxed(ctx: SandboxContext): Promise<SandboxResult> {
  const start = Date.now();
  try {
    // Generic execution: acknowledge the input, return a typed success output.
    // Real adapters replace this with actual platform calls.
    const outputPayload: Record<string, unknown> = {
      acknowledged: true,
      adapterId: ctx.adapterId,
      adapterType: ctx.adapterType,
      contractType: ctx.contractType,
      inputSummary: `Received ${Object.keys(ctx.inputPayload).length} input field(s).`,
      executedAt: new Date().toISOString(),
    };

    return {
      sandboxId:     ctx.sandboxId,
      adapterId:     ctx.adapterId,
      contractType:  ctx.contractType,
      success:       true,
      outputPayload,
      errorPayload:  null,
      durationMs:    Date.now() - start,
      exitedAt:      new Date(),
    };
  } catch (err) {
    return {
      sandboxId:    ctx.sandboxId,
      adapterId:    ctx.adapterId,
      contractType: ctx.contractType,
      success:      false,
      outputPayload: {},
      errorPayload: { code: "SANDBOX_ERROR", message: String(err) },
      durationMs:   Date.now() - start,
      exitedAt:     new Date(),
    };
  }
}

/**
 * Assert that a sandbox context contains only allowed operations.
 * Returns the list of violations (empty = safe to proceed).
 */
export function auditSandboxContext(ctx: SandboxContext): string[] {
  const violations: string[] = [];

  // The input payload must not contain Brain-internal keys
  const FORBIDDEN_KEYS = ["reasoningResult", "contextSnapshot", "memoryStore", "brainState", "executiveState"];
  for (const key of FORBIDDEN_KEYS) {
    if (key in ctx.inputPayload) {
      violations.push(`Forbidden key "${key}" found in sandbox input payload.`);
    }
  }

  return violations;
}
