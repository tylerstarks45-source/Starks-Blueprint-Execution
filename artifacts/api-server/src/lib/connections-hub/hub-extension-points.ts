// ── Build 044: Connections Hub Extension Points ───────────────────────────
import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import { HUB_EP_IDS } from "./types";

export function declareConnectionsHubExtensionPoints(): void {
  declareExtensionPoint({
    id: HUB_EP_IDS.PROVIDER_REGISTRY,
    description: "Intercept provider registry — canonical record creation and deduplication for external providers",
    declaredBy: "connections-hub",
  });
  declareExtensionPoint({
    id: HUB_EP_IDS.CAPABILITY_DISCOVERY,
    description: "Intercept capability discovery — determines what each provider can do and validates API version compatibility",
    declaredBy: "connections-hub",
  });
  declareExtensionPoint({
    id: HUB_EP_IDS.CONNECTION_HEALTH,
    description: "Intercept connection health — tracks availability, latency, quota, rate limits, auth state, version compatibility",
    declaredBy: "connections-hub",
  });
  declareExtensionPoint({
    id: HUB_EP_IDS.COMPATIBILITY,
    description: "Intercept compatibility mapping — determines which providers can satisfy the same capability for failover/comparison",
    declaredBy: "connections-hub",
  });
  declareExtensionPoint({
    id: HUB_EP_IDS.LIFECYCLE,
    description: "Intercept connection lifecycle — tracks created/connected/suspended/revoked/expired/migrated/archived transitions",
    declaredBy: "connections-hub",
  });
  declareExtensionPoint({
    id: HUB_EP_IDS.RECOMMENDATION,
    description: "Intercept integration recommendations — migration, failover, redundancy, upgrades, expansion, risk reduction",
    declaredBy: "connections-hub",
  });
  declareExtensionPoint({
    id: HUB_EP_IDS.AUDIT_SYNCHRONIZATION,
    description: "Intercept audit synchronization — ensures every connection lifecycle event propagates to the knowledge graph",
    declaredBy: "connections-hub",
  });
  declareExtensionPoint({
    id: HUB_EP_IDS.ADVISORY,
    description: "Intercept connections hub advisory generation for the Executive Brain context note",
    declaredBy: "connections-hub",
  });
}
