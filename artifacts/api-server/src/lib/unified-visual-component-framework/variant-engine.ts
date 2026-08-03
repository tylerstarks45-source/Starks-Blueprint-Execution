// ─────────────────────────────────────────────────────────────────────────────
// Build 051 — Variant Engine
// Supports reusable component variants with props and token overrides
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import { componentVariants, visualComponents } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

export interface VariantInput {
  componentId:    number;
  componentKey:   string;
  variantKey:     string;
  title:          string;
  description?:   string;
  propsOverrides: Record<string, unknown>;
  tokenOverrides: Record<string, unknown>;
  isDefault?:     boolean;
  metadata?:      Record<string, unknown>;
}

export async function registerVariant(input: VariantInput): Promise<any> {
  const existing = await db
    .select({ id: componentVariants.id })
    .from(componentVariants)
    .where(and(
      eq(componentVariants.componentId, input.componentId),
      eq(componentVariants.variantKey, input.variantKey),
    ))
    .limit(1);
  if (existing.length > 0) return existing[0];

  const rows = await db.insert(componentVariants).values({
    componentId:    input.componentId,
    componentKey:   input.componentKey,
    variantKey:     input.variantKey,
    title:          input.title,
    description:    input.description ?? "",
    propsOverrides: input.propsOverrides,
    tokenOverrides: input.tokenOverrides,
    isDefault:      input.isDefault ?? false,
    metadata:       input.metadata ?? {},
  }).returning() as any[];
  return rows[0];
}

export async function listVariants(componentKey: string): Promise<any[]> {
  return db
    .select()
    .from(componentVariants)
    .where(eq(componentVariants.componentKey, componentKey));
}

export async function listAllVariants(): Promise<any[]> {
  return db.select().from(componentVariants);
}

export async function getVariantCount(): Promise<number> {
  const rows = await db.select({ id: componentVariants.id }).from(componentVariants);
  return rows.length;
}

// Seed standard variants for foundation components
export async function seedButtonVariants(componentId: number): Promise<void> {
  const variants: VariantInput[] = [
    {
      componentId, componentKey: "button", variantKey: "primary",
      title: "Primary", isDefault: true,
      propsOverrides: { variant: "primary" },
      tokenOverrides: { bg: "var(--color-primary)", text: "var(--color-primary-text)" },
    },
    {
      componentId, componentKey: "button", variantKey: "secondary",
      title: "Secondary",
      propsOverrides: { variant: "secondary" },
      tokenOverrides: { bg: "var(--color-bg-muted)", text: "var(--color-text-default)" },
    },
    {
      componentId, componentKey: "button", variantKey: "destructive",
      title: "Destructive",
      propsOverrides: { variant: "destructive" },
      tokenOverrides: { bg: "var(--color-destructive)", text: "#ffffff" },
    },
    {
      componentId, componentKey: "button", variantKey: "ghost",
      title: "Ghost",
      propsOverrides: { variant: "ghost" },
      tokenOverrides: { bg: "transparent", text: "var(--color-text-default)" },
    },
    {
      componentId, componentKey: "button", variantKey: "outline",
      title: "Outline",
      propsOverrides: { variant: "outline" },
      tokenOverrides: { bg: "transparent", border: "var(--color-border-default)" },
    },
  ];
  for (const v of variants) {
    await registerVariant(v).catch(() => {});
  }
}
