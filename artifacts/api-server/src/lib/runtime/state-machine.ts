// Valid system lifecycle states and allowed transitions.
// build_status column on system_instances holds the current state.

export type SystemState =
  | "pending"
  | "building"
  | "built"
  | "deploying"
  | "running"
  | "degraded"
  | "paused"
  | "failed"
  | "archived";

const TRANSITIONS: Record<SystemState, SystemState[]> = {
  pending:   ["building", "archived"],
  building:  ["built", "failed", "archived"],
  built:     ["deploying", "archived"],
  deploying: ["running", "failed", "archived"],
  running:   ["degraded", "paused", "failed", "archived"],
  degraded:  ["running", "paused", "failed", "archived"],
  paused:    ["deploying", "archived"],
  failed:    ["deploying", "archived"],
  archived:  [],
};

export function canTransition(from: string, to: SystemState): boolean {
  const allowed = TRANSITIONS[from as SystemState];
  return allowed ? allowed.includes(to) : false;
}

export function isTerminal(state: string): boolean {
  return state === "archived";
}

export function isRunnable(state: string): boolean {
  return state === "built" || state === "paused" || state === "failed";
}

export function isActive(state: string): boolean {
  return state === "running" || state === "degraded";
}
