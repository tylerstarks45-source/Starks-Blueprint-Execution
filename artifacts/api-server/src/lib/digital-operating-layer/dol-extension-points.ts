// ── Build 043: Digital Operating Layer Extension Points ───────────────────
import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import { DOL_EP_IDS } from "./types";

export function declareDigitalOperatingLayerExtensionPoints(): void {
  declareExtensionPoint({
    id: DOL_EP_IDS.ENVIRONMENT_DISCOVERY,
    description: "Intercept environment discovery — detects approved operating environments without privilege escalation",
    declaredBy: "digital-operating-layer",
  });
  declareExtensionPoint({
    id: DOL_EP_IDS.SESSION_MANAGEMENT,
    description: "Intercept session management — creates and tracks managed execution sessions with full lifecycle",
    declaredBy: "digital-operating-layer",
  });
  declareExtensionPoint({
    id: DOL_EP_IDS.CAPABILITY_BINDING,
    description: "Intercept capability binding — maps approved capabilities to authorized execution channels",
    declaredBy: "digital-operating-layer",
  });
  declareExtensionPoint({
    id: DOL_EP_IDS.CHANNEL_EXECUTION,
    description: "Intercept execution channel — standardized runtime channel for desktop/browser/filesystem/terminal/cloud/api/database",
    declaredBy: "digital-operating-layer",
  });
  declareExtensionPoint({
    id: DOL_EP_IDS.RECEIPT_GENERATION,
    description: "Intercept receipt generation — immutable audit record for every external operation performed by ASH",
    declaredBy: "digital-operating-layer",
  });
  declareExtensionPoint({
    id: DOL_EP_IDS.DIAGNOSTICS,
    description: "Intercept runtime diagnostics — measures availability, latency, reliability, session health, connector health",
    declaredBy: "digital-operating-layer",
  });
  declareExtensionPoint({
    id: DOL_EP_IDS.AUDIT_SYNCHRONIZATION,
    description: "Intercept audit synchronization — ensures every receipt is propagated to the knowledge graph and governance layer",
    declaredBy: "digital-operating-layer",
  });
  declareExtensionPoint({
    id: DOL_EP_IDS.ADVISORY,
    description: "Intercept operating layer advisory generation for the Executive Brain context note",
    declaredBy: "digital-operating-layer",
  });
}
