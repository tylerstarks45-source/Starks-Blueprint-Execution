// ─────────────────────────────────────────────────────────────────────────────
// Build 052 — Rendering Engine
// Builder-independent rendering contracts — builders render THROUGH this engine
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import { canvasRenderers } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { RendererType, CanvasMode } from "./types";

export interface RendererInput {
  rendererKey:  string;
  title:        string;
  rendererType: RendererType;
  canvasModes:  CanvasMode[];
  capabilities: string[];
  version?:     string;
  priority?:    number;
  metadata?:    Record<string, unknown>;
}

// Builder-independent rendering contract every renderer must fulfill
export interface RenderingContract {
  rendererKey:     string;
  supportedModes:  CanvasMode[];
  canRenderNode:   (nodeType: string) => boolean;
  canRenderEdge:   (edgeType: string) => boolean;
  supportsLayers:  boolean;
  supportsMinimap: boolean;
  supportsExport:  boolean;
}

// Platform-registered renderers (seeded at boot)
export const PLATFORM_RENDERERS: RendererInput[] = [
  {
    rendererKey:  "dom-layout",
    title:        "DOM Layout Renderer",
    rendererType: "dom",
    canvasModes:  ["website_layout", "dashboard_layout", "application_layout"],
    capabilities: ["drag", "resize", "rotate", "group", "layer", "minimap", "accessibility"],
    version:      "1.0.0",
    priority:     10,
  },
  {
    rendererKey:  "graph-svg",
    title:        "SVG Graph Renderer",
    rendererType: "svg",
    canvasModes:  ["workflow_graph", "automation_graph", "ai_agent_flow", "database_diagram"],
    capabilities: ["edge-routing", "bezier", "orthogonal", "dag", "zoom", "pan", "minimap"],
    version:      "1.0.0",
    priority:     10,
  },
  {
    rendererKey:  "knowledge-canvas2d",
    title:        "Canvas2D Knowledge Renderer",
    rendererType: "canvas2d",
    canvasModes:  ["knowledge_map", "business_process_map"],
    capabilities: ["infinite-workspace", "zoom", "pan", "cluster", "force-layout"],
    version:      "1.0.0",
    priority:     10,
  },
  {
    rendererKey:  "future-webgl",
    title:        "WebGL Future Renderer",
    rendererType: "webgl",
    canvasModes:  ["future_mode"],
    capabilities: ["3d", "gpu-acceleration"],
    version:      "1.0.0",
    priority:     1,
  },
];

export async function registerRenderer(input: RendererInput): Promise<any> {
  const existing = await db
    .select({ id: canvasRenderers.id })
    .from(canvasRenderers)
    .where(eq(canvasRenderers.rendererKey, input.rendererKey))
    .limit(1);
  if (existing.length > 0) return existing[0];

  const rows = await db.insert(canvasRenderers).values({
    rendererKey:  input.rendererKey,
    title:        input.title,
    rendererType: input.rendererType,
    canvasModes:  input.canvasModes,
    capabilities: input.capabilities,
    version:      input.version ?? "1.0.0",
    isActive:     true,
    isPlatform:   true,
    priority:     input.priority ?? 0,
    metadata:     input.metadata ?? {},
  }).returning() as any[];
  return rows[0];
}

export async function listRenderers(canvasMode?: CanvasMode): Promise<any[]> {
  const rows = await db.select().from(canvasRenderers).where(eq(canvasRenderers.isActive, true));
  if (!canvasMode) return rows;
  return rows.filter((r: any) => (r.canvasModes as string[]).includes(canvasMode));
}

export async function seedPlatformRenderers(): Promise<void> {
  for (const r of PLATFORM_RENDERERS) {
    await registerRenderer(r).catch(() => {});
  }
}

export async function getRendererCount(): Promise<number> {
  const rows = await db.select({ id: canvasRenderers.id }).from(canvasRenderers);
  return rows.length;
}
