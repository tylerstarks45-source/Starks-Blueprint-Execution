// ─────────────────────────────────────────────────────────────────────────────
// Build 053 — Responsive Engine
// Desktop, laptop, tablet, mobile, future displays
// ─────────────────────────────────────────────────────────────────────────────
import type { Breakpoint } from "./types";
import { BREAKPOINT_CONFIG } from "./layout-composition-engine";

export interface ResponsiveOverride {
  breakpoint: Breakpoint;
  props:      Record<string, unknown>;
  styles:     Record<string, unknown>;
  hidden?:    boolean;
}

export interface ResponsivePageConfig {
  pageId:    string;
  overrides: Partial<Record<Breakpoint, { columns?: number; containerWidth?: string; hidden?: string[]; stack?: boolean }>>;
}

export function getBreakpointForWidth(width: number): Breakpoint {
  for (const [bp, cfg] of Object.entries(BREAKPOINT_CONFIG)) {
    if (width >= cfg.minWidth && width <= cfg.maxWidth) return bp as Breakpoint;
  }
  return "desktop";
}

export function resolveResponsiveStyles(
  baseStyles: Record<string, unknown>,
  overrides:  Partial<Record<Breakpoint, Record<string, unknown>>>,
  targetBreakpoint: Breakpoint
): Record<string, unknown> {
  const PRIORITY: Breakpoint[] = ["mobile", "tablet", "laptop", "desktop", "widescreen"];
  const targetIdx = PRIORITY.indexOf(targetBreakpoint);
  let merged = { ...baseStyles };
  for (let i = 0; i <= targetIdx; i++) {
    const bp = PRIORITY[i]!;
    if (overrides[bp]) {
      merged = { ...merged, ...overrides[bp] };
    }
  }
  return merged;
}

export function buildMediaQueryCss(
  componentId: string,
  overrides: Partial<Record<Breakpoint, Record<string, unknown>>>
): string {
  const lines: string[] = [];
  for (const [bp, styles] of Object.entries(overrides)) {
    const cfg = BREAKPOINT_CONFIG[bp as Breakpoint];
    if (!cfg) continue;
    const cssProps = Object.entries(styles)
      .map(([k, v]) => `  ${camelToKebab(k)}: ${v};`)
      .join("\n");
    lines.push(`@media (min-width: ${cfg.minWidth}px) {\n  #${componentId} {\n${cssProps}\n  }\n}`);
  }
  return lines.join("\n\n");
}

function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
}

export function getResponsiveRecommendations(experienceType: string): string[] {
  const base = [
    "Ensure all text is readable at 320px viewport width",
    "Touch targets must be at least 44×44px on mobile",
    "Use relative units (rem/em/%) instead of fixed pixels for font sizes",
    "Test navigation collapse behavior on tablet and mobile",
  ];
  const extras: Record<string, string[]> = {
    checkout_flow:    ["Multi-step checkout should be single column on mobile", "Form inputs must be full-width on mobile"],
    customer_portal:  ["Sidebar navigation must collapse to bottom tab bar on mobile"],
    knowledge_center: ["Tree navigation should become a dropdown on mobile"],
    blog_system:      ["Card grids should be single column on mobile"],
  };
  return [...base, ...(extras[experienceType] ?? [])];
}
