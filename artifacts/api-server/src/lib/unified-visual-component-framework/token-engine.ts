// ─────────────────────────────────────────────────────────────────────────────
// Build 051 — Design Token Engine
// Manages colors, typography, spacing, elevation, sizing, icons,
// animation timing, and layout tokens
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import { designTokens } from "@workspace/db/schema";
import { eq, like, or } from "drizzle-orm";
import type { TokenInput, TokenCategory } from "./types";

export async function registerToken(input: TokenInput): Promise<any> {
  const existing = await db
    .select({ id: designTokens.id })
    .from(designTokens)
    .where(eq(designTokens.tokenKey, input.tokenKey))
    .limit(1);
  if (existing.length > 0) return existing[0];

  const rows = await db.insert(designTokens).values({
    tokenKey:     input.tokenKey,
    tokenName:    input.tokenName,
    category:     input.category,
    valueLight:   input.valueLight,
    valueDark:    input.valueDark,
    description:  input.description ?? "",
    isSemantic:   input.isSemantic ?? false,
    semanticRole: input.semanticRole,
  }).returning() as any[];
  return rows[0];
}

export async function listTokens(category?: TokenCategory): Promise<any[]> {
  if (category) {
    return db.select().from(designTokens).where(eq(designTokens.category, category));
  }
  return db.select().from(designTokens).orderBy(designTokens.category, designTokens.tokenKey);
}

export async function getToken(tokenKey: string): Promise<any | null> {
  const rows = await db.select().from(designTokens).where(eq(designTokens.tokenKey, tokenKey)).limit(1);
  return rows[0] ?? null;
}

export async function getSemanticTokens(): Promise<any[]> {
  return db.select().from(designTokens).where(eq(designTokens.isSemantic, true));
}

export async function getTokenCount(): Promise<number> {
  const rows = await db.select({ id: designTokens.id }).from(designTokens);
  return rows.length;
}

// ── Seed the full platform design token system ────────────────────────────────
export async function seedDesignTokens(): Promise<number> {
  const tokens: TokenInput[] = [
    // ── Colors — primitive
    { tokenKey: "color.brand.50",     tokenName: "Brand 50",     category: "color", valueLight: "#f0f4ff", valueDark: "#f0f4ff" },
    { tokenKey: "color.brand.100",    tokenName: "Brand 100",    category: "color", valueLight: "#dde7ff", valueDark: "#dde7ff" },
    { tokenKey: "color.brand.200",    tokenName: "Brand 200",    category: "color", valueLight: "#b3caff", valueDark: "#b3caff" },
    { tokenKey: "color.brand.300",    tokenName: "Brand 300",    category: "color", valueLight: "#85aaff", valueDark: "#85aaff" },
    { tokenKey: "color.brand.400",    tokenName: "Brand 400",    category: "color", valueLight: "#5585ff", valueDark: "#5585ff" },
    { tokenKey: "color.brand.500",    tokenName: "Brand 500",    category: "color", valueLight: "#3366ff", valueDark: "#3366ff" },
    { tokenKey: "color.brand.600",    tokenName: "Brand 600",    category: "color", valueLight: "#2452db", valueDark: "#2452db" },
    { tokenKey: "color.brand.700",    tokenName: "Brand 700",    category: "color", valueLight: "#1840b8", valueDark: "#1840b8" },
    { tokenKey: "color.neutral.50",   tokenName: "Neutral 50",   category: "color", valueLight: "#f8f9fa", valueDark: "#111318" },
    { tokenKey: "color.neutral.100",  tokenName: "Neutral 100",  category: "color", valueLight: "#f1f3f5", valueDark: "#1e2128" },
    { tokenKey: "color.neutral.200",  tokenName: "Neutral 200",  category: "color", valueLight: "#e9ecef", valueDark: "#2a2f3a" },
    { tokenKey: "color.neutral.300",  tokenName: "Neutral 300",  category: "color", valueLight: "#dee2e6", valueDark: "#3b4151" },
    { tokenKey: "color.neutral.400",  tokenName: "Neutral 400",  category: "color", valueLight: "#ced4da", valueDark: "#555e72" },
    { tokenKey: "color.neutral.500",  tokenName: "Neutral 500",  category: "color", valueLight: "#adb5bd", valueDark: "#878f9e" },
    { tokenKey: "color.neutral.600",  tokenName: "Neutral 600",  category: "color", valueLight: "#6c757d", valueDark: "#b0b8c8" },
    { tokenKey: "color.neutral.700",  tokenName: "Neutral 700",  category: "color", valueLight: "#495057", valueDark: "#d0d5de" },
    { tokenKey: "color.neutral.800",  tokenName: "Neutral 800",  category: "color", valueLight: "#343a40", valueDark: "#e8ebf0" },
    { tokenKey: "color.neutral.900",  tokenName: "Neutral 900",  category: "color", valueLight: "#212529", valueDark: "#f0f2f5" },
    { tokenKey: "color.success.500",  tokenName: "Success",      category: "color", valueLight: "#22c55e", valueDark: "#4ade80" },
    { tokenKey: "color.warning.500",  tokenName: "Warning",      category: "color", valueLight: "#f59e0b", valueDark: "#fbbf24" },
    { tokenKey: "color.error.500",    tokenName: "Error",        category: "color", valueLight: "#ef4444", valueDark: "#f87171" },
    { tokenKey: "color.info.500",     tokenName: "Info",         category: "color", valueLight: "#3b82f6", valueDark: "#60a5fa" },
    // ── Colors — semantic
    { tokenKey: "color.bg.default",        tokenName: "Background Default",    category: "color", valueLight: "#ffffff",  valueDark: "#111318",  isSemantic: true, semanticRole: "background" },
    { tokenKey: "color.bg.subtle",         tokenName: "Background Subtle",     category: "color", valueLight: "#f8f9fa",  valueDark: "#1e2128",  isSemantic: true, semanticRole: "background-subtle" },
    { tokenKey: "color.bg.muted",          tokenName: "Background Muted",      category: "color", valueLight: "#f1f3f5",  valueDark: "#2a2f3a",  isSemantic: true, semanticRole: "background-muted" },
    { tokenKey: "color.surface",           tokenName: "Surface",               category: "color", valueLight: "#ffffff",  valueDark: "#1e2128",  isSemantic: true, semanticRole: "surface" },
    { tokenKey: "color.text.default",      tokenName: "Text Default",          category: "color", valueLight: "#212529",  valueDark: "#f0f2f5",  isSemantic: true, semanticRole: "text" },
    { tokenKey: "color.text.muted",        tokenName: "Text Muted",            category: "color", valueLight: "#6c757d",  valueDark: "#878f9e",  isSemantic: true, semanticRole: "text-muted" },
    { tokenKey: "color.text.inverse",      tokenName: "Text Inverse",          category: "color", valueLight: "#ffffff",  valueDark: "#111318",  isSemantic: true, semanticRole: "text-inverse" },
    { tokenKey: "color.border.default",    tokenName: "Border Default",        category: "color", valueLight: "#dee2e6",  valueDark: "#3b4151",  isSemantic: true, semanticRole: "border" },
    { tokenKey: "color.border.strong",     tokenName: "Border Strong",         category: "color", valueLight: "#adb5bd",  valueDark: "#555e72",  isSemantic: true, semanticRole: "border-strong" },
    { tokenKey: "color.primary",           tokenName: "Primary",               category: "color", valueLight: "#3366ff",  valueDark: "#5585ff",  isSemantic: true, semanticRole: "primary" },
    { tokenKey: "color.primary.hover",     tokenName: "Primary Hover",         category: "color", valueLight: "#2452db",  valueDark: "#3366ff",  isSemantic: true, semanticRole: "primary-hover" },
    { tokenKey: "color.primary.text",      tokenName: "Primary Text",          category: "color", valueLight: "#ffffff",  valueDark: "#ffffff",  isSemantic: true, semanticRole: "primary-text" },
    { tokenKey: "color.destructive",       tokenName: "Destructive",           category: "color", valueLight: "#ef4444",  valueDark: "#f87171",  isSemantic: true, semanticRole: "destructive" },
    { tokenKey: "color.focus.ring",        tokenName: "Focus Ring",            category: "color", valueLight: "#3366ff",  valueDark: "#5585ff",  isSemantic: true, semanticRole: "focus" },
    // ── Typography
    { tokenKey: "font.family.sans",   tokenName: "Font Sans",        category: "typography", valueLight: "Inter, ui-sans-serif, system-ui, sans-serif" },
    { tokenKey: "font.family.mono",   tokenName: "Font Mono",        category: "typography", valueLight: "JetBrains Mono, ui-monospace, Consolas, monospace" },
    { tokenKey: "font.size.xs",       tokenName: "Font Size XS",     category: "typography", valueLight: "0.75rem" },
    { tokenKey: "font.size.sm",       tokenName: "Font Size SM",     category: "typography", valueLight: "0.875rem" },
    { tokenKey: "font.size.base",     tokenName: "Font Size Base",   category: "typography", valueLight: "1rem" },
    { tokenKey: "font.size.lg",       tokenName: "Font Size LG",     category: "typography", valueLight: "1.125rem" },
    { tokenKey: "font.size.xl",       tokenName: "Font Size XL",     category: "typography", valueLight: "1.25rem" },
    { tokenKey: "font.size.2xl",      tokenName: "Font Size 2XL",    category: "typography", valueLight: "1.5rem" },
    { tokenKey: "font.size.3xl",      tokenName: "Font Size 3XL",    category: "typography", valueLight: "1.875rem" },
    { tokenKey: "font.size.4xl",      tokenName: "Font Size 4XL",    category: "typography", valueLight: "2.25rem" },
    { tokenKey: "font.weight.regular",tokenName: "Weight Regular",   category: "typography", valueLight: "400" },
    { tokenKey: "font.weight.medium", tokenName: "Weight Medium",    category: "typography", valueLight: "500" },
    { tokenKey: "font.weight.semibold",tokenName: "Weight Semibold", category: "typography", valueLight: "600" },
    { tokenKey: "font.weight.bold",   tokenName: "Weight Bold",      category: "typography", valueLight: "700" },
    { tokenKey: "font.line.tight",    tokenName: "Line Height Tight",category: "typography", valueLight: "1.25" },
    { tokenKey: "font.line.normal",   tokenName: "Line Height Normal",category:"typography", valueLight: "1.5" },
    { tokenKey: "font.line.relaxed",  tokenName: "Line Height Relaxed",category:"typography",valueLight:"1.625" },
    // ── Spacing
    { tokenKey: "space.0",   tokenName: "Space 0",   category: "spacing", valueLight: "0" },
    { tokenKey: "space.0.5", tokenName: "Space 0.5", category: "spacing", valueLight: "0.125rem" },
    { tokenKey: "space.1",   tokenName: "Space 1",   category: "spacing", valueLight: "0.25rem" },
    { tokenKey: "space.1.5", tokenName: "Space 1.5", category: "spacing", valueLight: "0.375rem" },
    { tokenKey: "space.2",   tokenName: "Space 2",   category: "spacing", valueLight: "0.5rem" },
    { tokenKey: "space.3",   tokenName: "Space 3",   category: "spacing", valueLight: "0.75rem" },
    { tokenKey: "space.4",   tokenName: "Space 4",   category: "spacing", valueLight: "1rem" },
    { tokenKey: "space.5",   tokenName: "Space 5",   category: "spacing", valueLight: "1.25rem" },
    { tokenKey: "space.6",   tokenName: "Space 6",   category: "spacing", valueLight: "1.5rem" },
    { tokenKey: "space.8",   tokenName: "Space 8",   category: "spacing", valueLight: "2rem" },
    { tokenKey: "space.10",  tokenName: "Space 10",  category: "spacing", valueLight: "2.5rem" },
    { tokenKey: "space.12",  tokenName: "Space 12",  category: "spacing", valueLight: "3rem" },
    { tokenKey: "space.16",  tokenName: "Space 16",  category: "spacing", valueLight: "4rem" },
    { tokenKey: "space.20",  tokenName: "Space 20",  category: "spacing", valueLight: "5rem" },
    { tokenKey: "space.24",  tokenName: "Space 24",  category: "spacing", valueLight: "6rem" },
    // ── Elevation / Shadows
    { tokenKey: "shadow.none",  tokenName: "Shadow None",   category: "elevation", valueLight: "none" },
    { tokenKey: "shadow.xs",    tokenName: "Shadow XS",     category: "elevation", valueLight: "0 1px 2px 0 rgb(0 0 0 / 0.05)" },
    { tokenKey: "shadow.sm",    tokenName: "Shadow SM",     category: "elevation", valueLight: "0 1px 3px 0 rgb(0 0 0 / 0.10), 0 1px 2px -1px rgb(0 0 0 / 0.10)" },
    { tokenKey: "shadow.md",    tokenName: "Shadow MD",     category: "elevation", valueLight: "0 4px 6px -1px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.10)" },
    { tokenKey: "shadow.lg",    tokenName: "Shadow LG",     category: "elevation", valueLight: "0 10px 15px -3px rgb(0 0 0 / 0.10), 0 4px 6px -4px rgb(0 0 0 / 0.10)" },
    { tokenKey: "shadow.xl",    tokenName: "Shadow XL",     category: "elevation", valueLight: "0 20px 25px -5px rgb(0 0 0 / 0.10), 0 8px 10px -6px rgb(0 0 0 / 0.10)" },
    // ── Sizing (border radius)
    { tokenKey: "radius.none",  tokenName: "Radius None",   category: "sizing", valueLight: "0" },
    { tokenKey: "radius.sm",    tokenName: "Radius SM",     category: "sizing", valueLight: "0.25rem" },
    { tokenKey: "radius.md",    tokenName: "Radius MD",     category: "sizing", valueLight: "0.375rem" },
    { tokenKey: "radius.lg",    tokenName: "Radius LG",     category: "sizing", valueLight: "0.5rem" },
    { tokenKey: "radius.xl",    tokenName: "Radius XL",     category: "sizing", valueLight: "0.75rem" },
    { tokenKey: "radius.2xl",   tokenName: "Radius 2XL",    category: "sizing", valueLight: "1rem" },
    { tokenKey: "radius.full",  tokenName: "Radius Full",   category: "sizing", valueLight: "9999px" },
    // ── Animation
    { tokenKey: "anim.duration.instant", tokenName: "Duration Instant", category: "animation", valueLight: "0ms" },
    { tokenKey: "anim.duration.fast",    tokenName: "Duration Fast",    category: "animation", valueLight: "100ms" },
    { tokenKey: "anim.duration.normal",  tokenName: "Duration Normal",  category: "animation", valueLight: "200ms" },
    { tokenKey: "anim.duration.slow",    tokenName: "Duration Slow",    category: "animation", valueLight: "400ms" },
    { tokenKey: "anim.easing.ease",      tokenName: "Easing Ease",      category: "animation", valueLight: "cubic-bezier(0.4, 0, 0.2, 1)" },
    { tokenKey: "anim.easing.in",        tokenName: "Easing In",        category: "animation", valueLight: "cubic-bezier(0.4, 0, 1, 1)" },
    { tokenKey: "anim.easing.out",       tokenName: "Easing Out",       category: "animation", valueLight: "cubic-bezier(0, 0, 0.2, 1)" },
    { tokenKey: "anim.easing.spring",    tokenName: "Easing Spring",    category: "animation", valueLight: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
    // ── Layout
    { tokenKey: "layout.sidebar.width",  tokenName: "Sidebar Width",  category: "layout", valueLight: "240px" },
    { tokenKey: "layout.topbar.height",  tokenName: "Topbar Height",  category: "layout", valueLight: "56px" },
    { tokenKey: "layout.panel.width",    tokenName: "Panel Width",    category: "layout", valueLight: "320px" },
    { tokenKey: "layout.content.max",    tokenName: "Content Max",    category: "layout", valueLight: "1280px" },
    { tokenKey: "layout.breakpoint.sm",  tokenName: "Breakpoint SM",  category: "layout", valueLight: "640px" },
    { tokenKey: "layout.breakpoint.md",  tokenName: "Breakpoint MD",  category: "layout", valueLight: "768px" },
    { tokenKey: "layout.breakpoint.lg",  tokenName: "Breakpoint LG",  category: "layout", valueLight: "1024px" },
    { tokenKey: "layout.breakpoint.xl",  tokenName: "Breakpoint XL",  category: "layout", valueLight: "1280px" },
    { tokenKey: "layout.zindex.base",    tokenName: "Z-Index Base",   category: "layout", valueLight: "0" },
    { tokenKey: "layout.zindex.dropdown",tokenName: "Z-Index Dropdown",category:"layout",  valueLight: "100" },
    { tokenKey: "layout.zindex.sticky",  tokenName: "Z-Index Sticky", category: "layout", valueLight: "200" },
    { tokenKey: "layout.zindex.modal",   tokenName: "Z-Index Modal",  category: "layout", valueLight: "300" },
    { tokenKey: "layout.zindex.toast",   tokenName: "Z-Index Toast",  category: "layout", valueLight: "400" },
  ];

  let seeded = 0;
  for (const t of tokens) {
    await registerToken(t).then(() => seeded++).catch(() => {});
  }
  return seeded;
}
