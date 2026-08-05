import { declareExtensionPoint } from "../cognitive-foundation/index.js";

export function declareUECIOSExtensionPoints(): void {
  declareExtensionPoint({
    id: "uecios.provider.registered",
    description: "React to a new external provider being registered in the UECIOS catalog — trigger discovery, health check, and manifest fetch.",
    declaredBy: "unified-external-capability",
  });
  declareExtensionPoint({
    id: "uecios.connection.lifecycle",
    description: "Hook into provider connection state transitions (pending → connected, connected → drifted, etc.) for downstream automation.",
    declaredBy: "unified-external-capability",
  });
  declareExtensionPoint({
    id: "uecios.credential.expiry",
    description: "Intercept credential expiry events — trigger rotation workflows, notify owners, or auto-refresh OAuth tokens.",
    declaredBy: "unified-external-capability",
  });
  declareExtensionPoint({
    id: "uecios.health.degraded",
    description: "React when a provider health score drops below threshold — emit diagnostics, alert admins, or pause dependent workflows.",
    declaredBy: "unified-external-capability",
  });
  declareExtensionPoint({
    id: "uecios.drift.detected",
    description: "Intercept drift detection events — unexpected permission changes, scope revocations, or API version incompatibilities.",
    declaredBy: "unified-external-capability",
  });
  declareExtensionPoint({
    id: "uecios.recommendation.generated",
    description: "React when a new infrastructure or capability recommendation is generated — route to FOUNDER_ADMIN notification channel.",
    declaredBy: "unified-external-capability",
  });
  declareExtensionPoint({
    id: "uecios.sync.completed",
    description: "Hook into sync job completion events — update dependent capability registries, refresh cached health scores.",
    declaredBy: "unified-external-capability",
  });
  declareExtensionPoint({
    id: "uecios.governance.policy-applied",
    description: "React when a UECIOS governance policy is applied to a connection — log audit, enforce restrictions, notify affected users.",
    declaredBy: "unified-external-capability",
  });
}
