// ─────────────────────────────────────────────────────────────────────────────
// Build 052 — UCE Types
// ─────────────────────────────────────────────────────────────────────────────

export const CANVAS_MODES = [
  "website_layout",
  "workflow_graph",
  "automation_graph",
  "dashboard_layout",
  "application_layout",
  "database_diagram",
  "knowledge_map",
  "business_process_map",
  "ai_agent_flow",
  "future_mode",
] as const;
export type CanvasMode = typeof CANVAS_MODES[number];

export const OPERATION_TYPES = [
  "add_node", "remove_node", "move_node", "resize_node", "rotate_node",
  "add_group", "ungroup", "reorder_layer", "paste", "cut",
  "align", "distribute", "snap", "set_viewport", "undo", "redo",
] as const;
export type OperationType = typeof OPERATION_TYPES[number];

export const RENDERER_TYPES = [
  "dom", "canvas2d", "webgl", "svg", "hybrid",
] as const;
export type RendererType = typeof RENDERER_TYPES[number];

export const LAYER_TYPES = [
  "background", "content", "overlay", "guide", "annotation",
] as const;
export type LayerType = typeof LAYER_TYPES[number];

export const GUIDE_TYPES = [
  "horizontal", "vertical", "center_h", "center_v", "diagonal",
] as const;
export type GuideType = typeof GUIDE_TYPES[number];

// Summary type surfaced to Executive Brain
export interface UCESummary {
  totalCanvases:         number;
  activeCanvases:        number;
  activeSessions:        number;
  totalLayers:           number;
  totalRenderers:        number;
  totalHistoryEntries:   number;
  totalGuides:           number;
  registeredModes:       string[];
  canvasModeBreakdown:   Record<string, number>;
  rendererBreakdown:     Record<string, number>;
  recentDiagnostics:     number;
}
