// ── Build 048: UBAF extension point declarations ──────────────────────────────
import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import { UBAF_EP_IDS } from "./types";

export function declareUBAFExtensionPoints(): void {
  declareExtensionPoint({ id: UBAF_EP_IDS.CLASSIFICATION,  description: "Determines the canonical asset class for any platform object from any builder",              declaredBy: "unified-asset-framework" });
  declareExtensionPoint({ id: UBAF_EP_IDS.METADATA,        description: "Normalizes builder-specific metadata into the unified canonical metadata model",             declaredBy: "unified-asset-framework" });
  declareExtensionPoint({ id: UBAF_EP_IDS.MANIFEST,        description: "Produces immutable point-in-time manifests describing every canonical asset",               declaredBy: "unified-asset-framework" });
  declareExtensionPoint({ id: UBAF_EP_IDS.RELATIONSHIPS,   description: "Maps semantic relationships between canonical assets for ASH graph traversal",              declaredBy: "unified-asset-framework" });
  declareExtensionPoint({ id: UBAF_EP_IDS.CAPABILITIES,    description: "Declares and queries what each canonical asset is capable of doing",                        declaredBy: "unified-asset-framework" });
  declareExtensionPoint({ id: UBAF_EP_IDS.TRANSLATION,     description: "Translates builder-native objects into canonical asset representations automatically",      declaredBy: "unified-asset-framework" });
  declareExtensionPoint({ id: UBAF_EP_IDS.REGISTRY,        description: "Maintains the mutable aggregate registry row per canonical asset for O(1) ASH lookup",     declaredBy: "unified-asset-framework" });
  declareExtensionPoint({ id: UBAF_EP_IDS.ADVISORY,        description: "Delivers UBAF canonical asset summary into ASH Executive Brain context note each cycle",   declaredBy: "unified-asset-framework" });
}
