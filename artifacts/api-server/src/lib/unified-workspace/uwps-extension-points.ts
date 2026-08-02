// ── Build 047: UWPS extension point declarations ─────────────────────────────
import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import { UWPS_EP_IDS } from "./types";

export function declareUWPSExtensionPoints(): void {
  declareExtensionPoint({ id: UWPS_EP_IDS.BUSINESS_ORG,        description: "Owns every business, workspace, and organizational hierarchy in UWPS",                                                     declaredBy: "unified-workspace" });
  declareExtensionPoint({ id: UWPS_EP_IDS.PROJECT_LIFECYCLE,   description: "Owns project creation, archival, templates, cloning, and migration",                                                       declaredBy: "unified-workspace" });
  declareExtensionPoint({ id: UWPS_EP_IDS.ASSET_REGISTRY,      description: "Registers every platform asset — type, version, owner, project, deployment status",                                         declaredBy: "unified-workspace" });
  declareExtensionPoint({ id: UWPS_EP_IDS.ASSET_RELATIONSHIPS, description: "Maps dependencies and relationships between assets — ASH traverses for impact analysis",                                    declaredBy: "unified-workspace" });
  declareExtensionPoint({ id: UWPS_EP_IDS.WORKSPACE_ACTIVITY,  description: "Records everything that occurs inside a workspace — append-only activity timeline",                                         declaredBy: "unified-workspace" });
  declareExtensionPoint({ id: UWPS_EP_IDS.PROJECT_HEALTH,      description: "Measures completeness, activity, dependency health, deployment readiness, documentation, automation coverage",               declaredBy: "unified-workspace" });
  declareExtensionPoint({ id: UWPS_EP_IDS.SEARCH,              description: "Cross-object search across businesses, projects, and assets",                                                               declaredBy: "unified-workspace" });
  declareExtensionPoint({ id: UWPS_EP_IDS.ADVISORY,            description: "Delivers UWPS workspace & project summary to ASH in EB context note each cycle",                                           declaredBy: "unified-workspace" });
}
