// ─────────────────────────────────────────────────────────────────────────────
// Build 050 — Navigation Engine
// Registers pages, panels, views, menus, routes, and contextual navigation
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import { platformPages, platformViews, platformPanels, platformWidgets } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import type { MenuPlacement, ViewType, PanelType, WidgetType } from "./types";

// ── Pages ─────────────────────────────────────────────────────────────────────
export interface PageInput {
  appId:              string;
  pageKey:            string;
  title:              string;
  route:              string;
  isDefault?:         boolean;
  requiresPermissions?:string[];
  menuPlacement?:     MenuPlacement;
  menuGroup?:         string;
  sortOrder?:         number;
  icon?:              string;
  description?:       string;
  metadata?:          Record<string, unknown>;
}

export async function registerPage(input: PageInput): Promise<any> {
  const existing = await db
    .select({ id: platformPages.id })
    .from(platformPages)
    .where(and(eq(platformPages.appId, input.appId), eq(platformPages.pageKey, input.pageKey)))
    .limit(1);
  if (existing.length > 0) return existing[0];

  const rows = await db
    .insert(platformPages)
    .values({
      appId:              input.appId,
      pageKey:            input.pageKey,
      title:              input.title,
      description:        input.description ?? "",
      route:              input.route,
      icon:               input.icon,
      isDefault:          input.isDefault ?? false,
      requiresPermissions:input.requiresPermissions ?? [],
      menuPlacement:      input.menuPlacement ?? "sidebar",
      menuGroup:          input.menuGroup ?? "main",
      sortOrder:          input.sortOrder ?? 0,
      metadata:           input.metadata ?? {},
    })
    .returning() as any[];
  return rows[0];
}

export async function listPages(appId?: string): Promise<any[]> {
  if (appId) {
    return db.select().from(platformPages).where(eq(platformPages.appId, appId));
  }
  return db.select().from(platformPages);
}

// ── Views ─────────────────────────────────────────────────────────────────────
export interface ViewInput {
  appId:       string;
  pageId:      number;
  viewKey:     string;
  title:       string;
  viewType:    ViewType;
  isDefault?:  boolean;
  description?:string;
  metadata?:   Record<string, unknown>;
}

export async function registerView(input: ViewInput): Promise<any> {
  const rows = await db
    .insert(platformViews)
    .values({
      appId:       input.appId,
      pageId:      input.pageId,
      viewKey:     input.viewKey,
      title:       input.title,
      description: input.description ?? "",
      viewType:    input.viewType,
      isDefault:   input.isDefault ?? false,
      metadata:    input.metadata ?? {},
    })
    .returning() as any[];
  return rows[0];
}

export async function listViews(appId?: string): Promise<any[]> {
  if (appId) {
    return db.select().from(platformViews).where(eq(platformViews.appId, appId));
  }
  return db.select().from(platformViews);
}

// ── Panels ────────────────────────────────────────────────────────────────────
export interface PanelInput {
  appId:          string;
  pageId?:        number;
  panelKey:       string;
  title:          string;
  panelType:      PanelType;
  position?:      string;
  isDefaultOpen?: boolean;
  widthPx?:       number;
  metadata?:      Record<string, unknown>;
}

export async function registerPanel(input: PanelInput): Promise<any> {
  const rows = await db
    .insert(platformPanels)
    .values({
      appId:         input.appId,
      pageId:        input.pageId,
      panelKey:      input.panelKey,
      title:         input.title,
      panelType:     input.panelType,
      position:      input.position ?? "right",
      isDefaultOpen: input.isDefaultOpen ?? false,
      widthPx:       input.widthPx ?? 320,
      metadata:      input.metadata ?? {},
    })
    .returning() as any[];
  return rows[0];
}

// ── Widgets ───────────────────────────────────────────────────────────────────
export interface WidgetInput {
  appId:            string;
  widgetKey:        string;
  title:            string;
  description?:     string;
  widgetType:       WidgetType;
  isPlatformWidget?:boolean;
  isPublic?:        boolean;
  supportedPages?:  string[];
  propsSchema?:     Record<string, unknown>;
  defaultProps?:    Record<string, unknown>;
  metadata?:        Record<string, unknown>;
}

export async function registerWidget(input: WidgetInput): Promise<any> {
  const rows = await db
    .insert(platformWidgets)
    .values({
      appId:            input.appId,
      widgetKey:        input.widgetKey,
      title:            input.title,
      description:      input.description ?? "",
      widgetType:       input.widgetType,
      isPlatformWidget: input.isPlatformWidget ?? false,
      isPublic:         input.isPublic ?? true,
      supportedPages:   input.supportedPages ?? [],
      propsSchema:      input.propsSchema ?? {},
      defaultProps:     input.defaultProps ?? {},
      metadata:         input.metadata ?? {},
    })
    .returning() as any[];
  return rows[0];
}

export async function listWidgets(appId?: string): Promise<any[]> {
  if (appId) {
    return db.select().from(platformWidgets).where(eq(platformWidgets.appId, appId));
  }
  return db.select().from(platformWidgets);
}

export async function getNavigationMenu(): Promise<{ appId: string; pages: any[] }[]> {
  const pages = await db.select().from(platformPages).orderBy(platformPages.sortOrder);
  const byApp: Record<string, any[]> = {};
  for (const p of pages) {
    if (!byApp[p.appId]) byApp[p.appId] = [];
    byApp[p.appId].push(p);
  }
  return Object.entries(byApp).map(([appId, pgs]) => ({ appId, pages: pgs }));
}
