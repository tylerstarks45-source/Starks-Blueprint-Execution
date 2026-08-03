// ─────────────────────────────────────────────────────────────────────────────
// Build 052 — Viewport Engine
// Owns zoom, pan, camera position, and saved views
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import { canvasViews, canvasSessions } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";

export interface ViewportState {
  x:         number; // canvas-space X offset
  y:         number; // canvas-space Y offset
  zoom:      number; // percent (10–1000)
  width?:    number; // viewport width px
  height?:   number; // viewport height px
}

export const DEFAULT_VIEWPORT: ViewportState = { x: 0, y: 0, zoom: 100 };
export const MIN_ZOOM = 10;
export const MAX_ZOOM = 1000;

export function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

export function applyZoomStep(current: number, steps: number): number {
  const STEPS = [10, 25, 33, 50, 67, 75, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500, 750, 1000];
  const idx = STEPS.findIndex((s) => s >= current);
  const next = idx + steps;
  return STEPS[Math.max(0, Math.min(STEPS.length - 1, next))] ?? current;
}

export function panViewport(state: ViewportState, dx: number, dy: number): ViewportState {
  return { ...state, x: state.x + dx, y: state.y + dy };
}

export function zoomToFit(nodes: { x: number; y: number; width: number; height: number }[], viewportW: number, viewportH: number, padding = 40): ViewportState {
  if (!nodes.length) return DEFAULT_VIEWPORT;
  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxX = Math.max(...nodes.map((n) => n.x + n.width));
  const maxY = Math.max(...nodes.map((n) => n.y + n.height));
  const contentW = maxX - minX + padding * 2;
  const contentH = maxY - minY + padding * 2;
  const zoom = clampZoom(Math.floor(Math.min(viewportW / contentW, viewportH / contentH) * 100));
  return {
    x: -(minX - padding) * (zoom / 100),
    y: -(minY - padding) * (zoom / 100),
    zoom,
  };
}

export async function saveView(canvasId: string, viewKey: string, title: string, state: ViewportState, isDefault = false): Promise<any> {
  const rows = await db.insert(canvasViews).values({
    canvasId, viewKey, title,
    viewportX: state.x, viewportY: state.y, zoomLevel: state.zoom,
    isDefault, metadata: {},
  }).returning() as any[];
  return rows[0];
}

export async function listViews(canvasId: string): Promise<any[]> {
  return db.select().from(canvasViews).where(eq(canvasViews.canvasId, canvasId)).orderBy(desc(canvasViews.createdAt));
}

export async function startSession(canvasId: string, userId?: number, viewport?: Partial<ViewportState>): Promise<any> {
  const rows = await db.insert(canvasSessions).values({
    canvasId,
    userId: userId ?? null,
    sessionType: "edit",
    viewportX: viewport?.x ?? 0,
    viewportY: viewport?.y ?? 0,
    zoomLevel: viewport?.zoom ?? 100,
    selectedNodeIds: [],
    clipboardData: {},
    sessionData: {},
  }).returning() as any[];
  return rows[0];
}
