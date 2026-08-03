// ─────────────────────────────────────────────────────────────────────────────
// Build 053 — Layout Composition Engine
// Builds pages using UVCF components and the Universal Canvas
// ─────────────────────────────────────────────────────────────────────────────
import type { SectionType, Breakpoint } from "./types";

// Standard section-to-component mapping — maps section types to UVCF components
export const SECTION_COMPONENT_MAP: Record<SectionType, { components: string[]; layout: string }> = {
  hero:         { components: ["panel", "button", "badge"],      layout: "centered-full-bleed" },
  features:     { components: ["card", "badge", "list"],         layout: "grid-3-col" },
  testimonials: { components: ["card", "badge"],                 layout: "carousel" },
  pricing:      { components: ["card", "button", "badge"],       layout: "grid-3-col" },
  cta:          { components: ["panel", "button"],               layout: "centered" },
  faq:          { components: ["accordion"],                     layout: "single-col" },
  gallery:      { components: ["card"],                          layout: "masonry" },
  team:         { components: ["card", "badge"],                 layout: "grid-4-col" },
  blog:         { components: ["card", "badge", "breadcrumbs"],  layout: "grid-3-col" },
  contact:      { components: ["form", "input", "button"],       layout: "two-col" },
  footer:       { components: ["list", "badge"],                 layout: "multi-col" },
  header:       { components: ["top-bar", "sidebar"],            layout: "full-width" },
  content:      { components: ["panel", "list"],                 layout: "single-col" },
  comparison:   { components: ["table"],                         layout: "full-width" },
  timeline:     { components: ["list", "badge"],                 layout: "single-col" },
  stats:        { components: ["card", "badge"],                 layout: "grid-4-col" },
  partners:     { components: ["card"],                          layout: "grid-6-col" },
  future:       { components: ["future-component"],              layout: "blank" },
};

// Responsive breakpoint config
export const BREAKPOINT_CONFIG: Record<Breakpoint, { minWidth: number; maxWidth: number; columns: number; containerWidth: string }> = {
  mobile:     { minWidth: 0,    maxWidth: 767,  columns: 1, containerWidth: "100%" },
  tablet:     { minWidth: 768,  maxWidth: 1023, columns: 2, containerWidth: "768px" },
  laptop:     { minWidth: 1024, maxWidth: 1279, columns: 3, containerWidth: "1024px" },
  desktop:    { minWidth: 1280, maxWidth: 1535, columns: 4, containerWidth: "1280px" },
  widescreen: { minWidth: 1536, maxWidth: 9999, columns: 4, containerWidth: "1536px" },
};

export interface ComponentTreeNode {
  id:        string;
  componentKey: string;
  variantKey?:  string;
  props:     Record<string, unknown>;
  children?: ComponentTreeNode[];
  breakpoints?: Partial<Record<Breakpoint, Record<string, unknown>>>;
  styles?:   Record<string, unknown>;
}

export function buildSectionTree(sectionType: SectionType, sectionId: string): ComponentTreeNode {
  const spec = SECTION_COMPONENT_MAP[sectionType];
  return {
    id:           sectionId,
    componentKey: "panel",
    props:        { sectionType, layout: spec.layout },
    children:     spec.components.map((key, idx) => ({
      id:           `${sectionId}_comp_${idx}`,
      componentKey: key,
      props:        {},
    })),
    breakpoints:  {
      mobile:  { padding: "1rem" },
      desktop: { padding: "4rem" },
    },
  };
}

export function buildPageTree(sections: { sectionId: string; sectionType: SectionType }[]): ComponentTreeNode {
  return {
    id:           "page_root",
    componentKey: "panel",
    props:        { role: "page-root" },
    children:     sections.map((s) => buildSectionTree(s.sectionType, s.sectionId)),
  };
}

export function getRequiredComponents(experienceType: string): string[] {
  const base = ["top-bar", "footer"];
  const extras: Record<string, string[]> = {
    business_website:   ["hero", "features", "cta", "contact"],
    landing_page:       ["hero", "features", "testimonials", "cta"],
    sales_funnel:       ["hero", "features", "pricing", "cta"],
    customer_portal:    ["sidebar", "tabs", "table", "card"],
    knowledge_center:   ["search-box", "tree", "accordion", "breadcrumbs"],
    checkout_flow:      ["form", "table", "button", "progress"],
    blog_system:        ["card", "badge", "breadcrumbs", "search-box"],
    default:            ["hero", "content", "cta"],
  };
  const specific = extras[experienceType] ?? extras["default"]!;
  return [...base, ...specific];
}
