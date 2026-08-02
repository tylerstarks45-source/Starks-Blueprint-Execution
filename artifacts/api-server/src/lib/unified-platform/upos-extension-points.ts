// ── Build 046: Unified Platform Operating System — Extension Points ───────────
import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import { UPOS_EP_IDS } from "./types";

export function declareUPOSExtensionPoints(): void {
  declareExtensionPoint({
    id: UPOS_EP_IDS.RUNTIME_STATE,
    description: "Intercept platform runtime state — tracks authenticated user runtime per session, owns the per-user runtime lifecycle",
    declaredBy: "unified-platform",
  });
  declareExtensionPoint({
    id: UPOS_EP_IDS.WORKSPACE_LIFECYCLE,
    description: "Intercept workspace lifecycle — creation, archival, restoration, and configuration of platform workspaces",
    declaredBy: "unified-platform",
  });
  declareExtensionPoint({
    id: UPOS_EP_IDS.APPLICATION_REGISTRY,
    description: "Intercept application registry — registration, capability declaration, health reporting, and manifest management for all UPOS applications",
    declaredBy: "unified-platform",
  });
  declareExtensionPoint({
    id: UPOS_EP_IDS.COMMAND_ROUTING,
    description: "Intercept global command routing — command registration, authority validation, and ASH-initiated command dispatch",
    declaredBy: "unified-platform",
  });
  declareExtensionPoint({
    id: UPOS_EP_IDS.SEARCH_INDEX,
    description: "Intercept global search index — indexes every registered application for unified discovery across the platform",
    declaredBy: "unified-platform",
  });
  declareExtensionPoint({
    id: UPOS_EP_IDS.CONTEXT_AWARENESS,
    description: "Intercept context awareness — continuously tracks current page/app/project/workspace/permissions for ASH operating context",
    declaredBy: "unified-platform",
  });
  declareExtensionPoint({
    id: UPOS_EP_IDS.ACTIVITY_STREAM,
    description: "Intercept activity stream — appends every meaningful platform event to the unified activity timeline",
    declaredBy: "unified-platform",
  });
  declareExtensionPoint({
    id: UPOS_EP_IDS.ADVISORY,
    description: "Intercept UPOS advisory generation — produces the runtime context summary delivered to the Executive Brain context note",
    declaredBy: "unified-platform",
  });
}
