// ─────────────────────────────────────────────────────────────────────────────
// Build 052 — Layout Engine
// Alignment, distribution, snap, grid, guides, margins, padding
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import { canvasGuides } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { GuideType } from "./types";

export interface LayoutNode { id: string; x: number; y: number; width: number; height: number }

// ── Alignment ────────────────────────────────────────────────────────────────
export type AlignTarget = "left" | "center_h" | "right" | "top" | "center_v" | "bottom";

export function alignNodes(nodes: LayoutNode[], target: AlignTarget, containerWidth?: number, containerHeight?: number): LayoutNode[] {
  if (!nodes.length) return nodes;
  const bounds = getBounds(nodes);
  return nodes.map((n) => {
    switch (target) {
      case "left":      return { ...n, x: bounds.x };
      case "right":     return { ...n, x: bounds.x + bounds.width - n.width };
      case "center_h":  return { ...n, x: bounds.x + (bounds.width - n.width) / 2 };
      case "top":       return { ...n, y: bounds.y };
      case "bottom":    return { ...n, y: bounds.y + bounds.height - n.height };
      case "center_v":  return { ...n, y: bounds.y + (bounds.height - n.height) / 2 };
    }
  });
}

// ── Distribution ─────────────────────────────────────────────────────────────
export type DistributeTarget = "horizontal" | "vertical";

export function distributeNodes(nodes: LayoutNode[], target: DistributeTarget): LayoutNode[] {
  if (nodes.length < 3) return nodes;
  const sorted = [...nodes].sort((a, b) => target === "horizontal" ? a.x - b.x : a.y - b.y);
  const first = sorted[0]!;
  const last  = sorted[sorted.length - 1]!;
  const totalSpan  = target === "horizontal"
    ? (last.x + last.width) - first.x
    : (last.y + last.height) - first.y;
  const totalNodes = sorted.reduce((s, n) => s + (target === "horizontal" ? n.width : n.height), 0);
  const gap = (totalSpan - totalNodes) / (sorted.length - 1);
  let cursor = target === "horizontal" ? first.x : first.y;
  return nodes.map((n) => {
    const idx = sorted.findIndex((s) => s.id === n.id);
    const sortedNode = sorted[idx]!;
    let pos = cursor;
    if (idx < sorted.length - 1) {
      cursor += (target === "horizontal" ? sortedNode.width : sortedNode.height) + gap;
    }
    return target === "horizontal" ? { ...n, x: pos } : { ...n, y: pos };
  });
}

// ── Snap ─────────────────────────────────────────────────────────────────────
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function snapNode(node: LayoutNode, gridSize: number): LayoutNode {
  return { ...node, x: snapToGrid(node.x, gridSize), y: snapToGrid(node.y, gridSize) };
}

export function snapToGuide(value: number, guidePositions: number[], threshold = 8): number {
  for (const g of guidePositions) {
    if (Math.abs(value - g) <= threshold) return g;
  }
  return value;
}

// ── Guides ───────────────────────────────────────────────────────────────────
export async function addGuide(canvasId: string, guideType: GuideType, position: number, color = "#3366ff"): Promise<any> {
  const rows = await db.insert(canvasGuides).values({
    canvasId, guideType, position, color, isVisible: true, isSticky: false, metadata: {},
  }).returning() as any[];
  return rows[0];
}

export async function listGuides(canvasId: string): Promise<any[]> {
  return db.select().from(canvasGuides).where(eq(canvasGuides.canvasId, canvasId));
}

// ── Bounds helper ────────────────────────────────────────────────────────────
export function getBounds(nodes: LayoutNode[]): { x: number; y: number; width: number; height: number } {
  if (!nodes.length) return { x: 0, y: 0, width: 0, height: 0 };
  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxX = Math.max(...nodes.map((n) => n.x + n.width));
  const maxY = Math.max(...nodes.map((n) => n.y + n.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// ── Overlap detection ────────────────────────────────────────────────────────
export function findOverlapping(nodes: LayoutNode[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]!;
      const b = nodes[j]!;
      if (a.x < b.x + b.width && a.x + a.width > b.x &&
          a.y < b.y + b.height && a.y + a.height > b.y) {
        pairs.push([a.id, b.id]);
      }
    }
  }
  return pairs;
}
