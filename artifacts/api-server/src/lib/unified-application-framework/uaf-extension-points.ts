// ─────────────────────────────────────────────────────────────────────────────
// Build 050 — UAF Extension Points
// 8 EPs → cumulative total: 374
// ─────────────────────────────────────────────────────────────────────────────
import { declareExtensionPoint } from "../cognitive-foundation";
import { UAF_EP_IDS } from "./types";

export function declareUAFExtensionPoints(): void {
  declareExtensionPoint({
    id:          UAF_EP_IDS.APPLICATION_REGISTRY,
    description: "Owns every platform application — registration, state, discovery, and search across all apps.",
    declaredBy:  "unified-application-framework",
  });
  declareExtensionPoint({
    id:          UAF_EP_IDS.MANIFEST,
    description: "Creates and validates immutable application manifests — version, permissions, compatibility, and hash.",
    declaredBy:  "unified-application-framework",
  });
  declareExtensionPoint({
    id:          UAF_EP_IDS.CAPABILITY,
    description: "Declares what every application can do — capabilities, ASH-invocable actions, and permission requirements.",
    declaredBy:  "unified-application-framework",
  });
  declareExtensionPoint({
    id:          UAF_EP_IDS.NAVIGATION,
    description: "Registers pages, panels, views, menus, routes, and contextual navigation for every application.",
    declaredBy:  "unified-application-framework",
  });
  declareExtensionPoint({
    id:          UAF_EP_IDS.LIFECYCLE,
    description: "Tracks application lifecycle — install, enable, disable, upgrade, deprecation, and version compatibility.",
    declaredBy:  "unified-application-framework",
  });
  declareExtensionPoint({
    id:          UAF_EP_IDS.DIAGNOSTICS,
    description: "Measures application health, availability, compatibility, runtime status, and dependency health.",
    declaredBy:  "unified-application-framework",
  });
  declareExtensionPoint({
    id:          UAF_EP_IDS.ASH_ADVISORY,
    description: "Delivers UAF application framework summary into ASH Executive Brain context note.",
    declaredBy:  "unified-application-framework",
  });
  declareExtensionPoint({
    id:          UAF_EP_IDS.FUTURE_APP,
    description: "Reserved seam for future applications not yet built — they inherit UAF from day one.",
    declaredBy:  "unified-application-framework",
  });
}
