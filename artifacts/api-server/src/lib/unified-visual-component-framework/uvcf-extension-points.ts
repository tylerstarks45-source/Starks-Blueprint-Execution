// ─────────────────────────────────────────────────────────────────────────────
// Build 051 — UVCF Extension Points
// 8 EPs → cumulative total: 382
// ─────────────────────────────────────────────────────────────────────────────
import { declareExtensionPoint } from "../cognitive-foundation";
import { UVCF_EP_IDS } from "./types";

export function declareUVCFExtensionPoints(): void {
  declareExtensionPoint({
    id:          UVCF_EP_IDS.COMPONENT_REGISTRY,
    description: "Owns every platform visual component — registration, versioning, discovery, and health tracking.",
    declaredBy:  "unified-visual-component-framework",
  });
  declareExtensionPoint({
    id:          UVCF_EP_IDS.DESIGN_TOKENS,
    description: "Manages all design tokens: colors, typography, spacing, elevation, sizing, icons, animation, and layout.",
    declaredBy:  "unified-visual-component-framework",
  });
  declareExtensionPoint({
    id:          UVCF_EP_IDS.VARIANT_ENGINE,
    description: "Supports reusable component variants with props and token overrides, and inheritance chains.",
    declaredBy:  "unified-visual-component-framework",
  });
  declareExtensionPoint({
    id:          UVCF_EP_IDS.ACCESSIBILITY,
    description: "Associates every component with ARIA roles, keyboard interaction contracts, and accessibility metadata.",
    declaredBy:  "unified-visual-component-framework",
  });
  declareExtensionPoint({
    id:          UVCF_EP_IDS.SEMANTIC_ENGINE,
    description: "Maps every component to semantic meaning so ASH understands UI intent, not visual appearance.",
    declaredBy:  "unified-visual-component-framework",
  });
  declareExtensionPoint({
    id:          UVCF_EP_IDS.DIAGNOSTICS,
    description: "Tracks component usage, compatibility, health, and version consistency across the platform.",
    declaredBy:  "unified-visual-component-framework",
  });
  declareExtensionPoint({
    id:          UVCF_EP_IDS.ASH_ADVISORY,
    description: "Delivers UVCF visual component summary into ASH Executive Brain context note.",
    declaredBy:  "unified-visual-component-framework",
  });
  declareExtensionPoint({
    id:          UVCF_EP_IDS.FUTURE_COMPONENT,
    description: "Reserved seam for future visual components not yet designed — inherit UVCF from day one.",
    declaredBy:  "unified-visual-component-framework",
  });
}
