// ─────────────────────────────────────────────────────────────────────────────
// Build 053 — Theme Engine
// Global colors, typography, spacing, brand identity, dark/light themes
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import { experienceThemes } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { ThemeType } from "./types";

export interface ThemeInput {
  title:           string;
  themeType?:      ThemeType;
  colorPrimary?:   string;
  colorSecondary?: string;
  colorBackground?:string;
  colorSurface?:   string;
  colorText?:      string;
  colorAccent?:    string;
  fontHeading?:    string;
  fontBody?:       string;
  fontMono?:       string;
  borderRadius?:   string;
  spacing?:        string;
  darkMode?:       Record<string, unknown>;
  metadata?:       Record<string, unknown>;
}

// Platform-defined themes seeded at boot
export const PLATFORM_THEMES: ThemeInput[] = [
  {
    title: "Platform Default", themeType: "platform_default",
    colorPrimary: "#3366ff", colorSecondary: "#6c757d", colorBackground: "#ffffff",
    colorSurface: "#f8f9fa", colorText: "#212529", colorAccent: "#22c55e",
    fontHeading: "Inter", fontBody: "Inter", fontMono: "JetBrains Mono",
    borderRadius: "0.5rem", spacing: "1rem",
    darkMode: { colorBackground: "#111318", colorSurface: "#1e2128", colorText: "#f0f2f5" },
  },
  {
    title: "Platform Dark", themeType: "platform_dark",
    colorPrimary: "#5585ff", colorSecondary: "#878f9e", colorBackground: "#111318",
    colorSurface: "#1e2128", colorText: "#f0f2f5", colorAccent: "#4ade80",
    fontHeading: "Inter", fontBody: "Inter", fontMono: "JetBrains Mono",
    borderRadius: "0.5rem", spacing: "1rem",
    darkMode: { colorBackground: "#0a0d12", colorSurface: "#161a22", colorText: "#f8fafc" },
  },
  {
    title: "Platform Minimal", themeType: "platform_minimal",
    colorPrimary: "#000000", colorSecondary: "#666666", colorBackground: "#ffffff",
    colorSurface: "#fafafa", colorText: "#111111", colorAccent: "#000000",
    fontHeading: "Inter", fontBody: "Inter", fontMono: "JetBrains Mono",
    borderRadius: "0rem", spacing: "1rem",
    darkMode: { colorBackground: "#000000", colorSurface: "#111111", colorText: "#ffffff" },
  },
  {
    title: "Platform Bold", themeType: "platform_bold",
    colorPrimary: "#7c3aed", colorSecondary: "#db2777", colorBackground: "#ffffff",
    colorSurface: "#f5f3ff", colorText: "#1a1033", colorAccent: "#f59e0b",
    fontHeading: "Inter", fontBody: "Inter", fontMono: "JetBrains Mono",
    borderRadius: "0.75rem", spacing: "1.25rem",
    darkMode: { colorBackground: "#0d0a1a", colorSurface: "#1a1033", colorText: "#f5f3ff" },
  },
];

export async function registerTheme(input: ThemeInput): Promise<any> {
  const themeId = `theme_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const rows = await db.insert(experienceThemes).values({
    themeId,
    title:           input.title,
    themeType:       input.themeType ?? "custom",
    colorPrimary:    input.colorPrimary    ?? "#3366ff",
    colorSecondary:  input.colorSecondary  ?? "#6c757d",
    colorBackground: input.colorBackground ?? "#ffffff",
    colorSurface:    input.colorSurface    ?? "#f8f9fa",
    colorText:       input.colorText       ?? "#212529",
    colorAccent:     input.colorAccent     ?? "#22c55e",
    fontHeading:     input.fontHeading     ?? "Inter",
    fontBody:        input.fontBody        ?? "Inter",
    fontMono:        input.fontMono        ?? "JetBrains Mono",
    borderRadius:    input.borderRadius    ?? "0.5rem",
    spacing:         input.spacing         ?? "1rem",
    darkMode:        input.darkMode        ?? {},
    tokens:          {},
    isPlatform:      ["platform_default","platform_dark","platform_minimal","platform_bold"].includes(input.themeType ?? ""),
    metadata:        input.metadata ?? {},
  }).returning() as any[];
  return rows[0];
}

export async function seedPlatformThemes(): Promise<void> {
  for (const t of PLATFORM_THEMES) {
    await registerTheme(t).catch(() => {});
  }
}

export async function listThemes(): Promise<any[]> {
  return db.select().from(experienceThemes);
}

export async function getThemeCount(): Promise<number> {
  const rows = await db.select({ id: experienceThemes.id }).from(experienceThemes);
  return rows.length;
}

export function generateCssVariables(theme: {
  colorPrimary: string; colorSecondary: string; colorBackground: string;
  colorSurface: string; colorText: string; colorAccent: string;
  fontHeading: string; fontBody: string; borderRadius: string; spacing: string;
}): string {
  return [
    `:root {`,
    `  --color-primary: ${theme.colorPrimary};`,
    `  --color-secondary: ${theme.colorSecondary};`,
    `  --color-bg: ${theme.colorBackground};`,
    `  --color-surface: ${theme.colorSurface};`,
    `  --color-text: ${theme.colorText};`,
    `  --color-accent: ${theme.colorAccent};`,
    `  --font-heading: ${theme.fontHeading}, sans-serif;`,
    `  --font-body: ${theme.fontBody}, sans-serif;`,
    `  --radius: ${theme.borderRadius};`,
    `  --spacing: ${theme.spacing};`,
    `}`,
  ].join("\n");
}
