// ─────────────────────────────────────────────────────────────────────────────
// Build 052 — Selection Engine
// Deterministic selection model: single, multi, box, layer-aware
// ─────────────────────────────────────────────────────────────────────────────

export type SelectionMode = "replace" | "add" | "subtract" | "toggle";

export interface SelectionState {
  selectedIds:     string[];
  anchorId:        string | null;
  mode:            SelectionMode;
  boxSelect?:      { x: number; y: number; width: number; height: number };
}

export const EMPTY_SELECTION: SelectionState = { selectedIds: [], anchorId: null, mode: "replace" };

export function selectNode(state: SelectionState, id: string, mode: SelectionMode = "replace"): SelectionState {
  switch (mode) {
    case "replace":  return { ...state, selectedIds: [id], anchorId: id };
    case "add":      return state.selectedIds.includes(id) ? state : { ...state, selectedIds: [...state.selectedIds, id] };
    case "subtract": return { ...state, selectedIds: state.selectedIds.filter((s) => s !== id) };
    case "toggle":   return state.selectedIds.includes(id)
      ? { ...state, selectedIds: state.selectedIds.filter((s) => s !== id) }
      : { ...state, selectedIds: [...state.selectedIds, id] };
  }
}

export function selectAll(nodeIds: string[]): SelectionState {
  return { selectedIds: [...nodeIds], anchorId: nodeIds[0] ?? null, mode: "replace" };
}

export function deselectAll(): SelectionState {
  return EMPTY_SELECTION;
}

export function selectRange(allIds: string[], fromId: string, toId: string): SelectionState {
  const fromIdx = allIds.indexOf(fromId);
  const toIdx   = allIds.indexOf(toId);
  if (fromIdx === -1 || toIdx === -1) return EMPTY_SELECTION;
  const [lo, hi] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
  return { selectedIds: allIds.slice(lo, hi + 1), anchorId: fromId, mode: "replace" };
}

export function boxSelect(
  nodes: { id: string; x: number; y: number; width: number; height: number }[],
  box:   { x: number; y: number; width: number; height: number },
  addToExisting: boolean = false,
  existing: string[] = [],
): SelectionState {
  const hit = nodes
    .filter((n) =>
      n.x < box.x + box.width &&
      n.x + n.width > box.x &&
      n.y < box.y + box.height &&
      n.y + n.height > box.y
    )
    .map((n) => n.id);
  const selected = addToExisting ? [...new Set([...existing, ...hit])] : hit;
  return { selectedIds: selected, anchorId: selected[0] ?? null, mode: "replace", boxSelect: box };
}

export function getSelectionBounds(nodes: { id: string; x: number; y: number; width: number; height: number }[], selectedIds: string[]): { x: number; y: number; width: number; height: number } | null {
  const sel = nodes.filter((n) => selectedIds.includes(n.id));
  if (!sel.length) return null;
  const minX = Math.min(...sel.map((n) => n.x));
  const minY = Math.min(...sel.map((n) => n.y));
  const maxX = Math.max(...sel.map((n) => n.x + n.width));
  const maxY = Math.max(...sel.map((n) => n.y + n.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function serializeSelection(state: SelectionState): Record<string, unknown> {
  return { selectedIds: state.selectedIds, anchorId: state.anchorId, count: state.selectedIds.length };
}
