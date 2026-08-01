// ─────────────────────────────────────────────────────────────────────────────
// Build 030: Universal Execution Adapter Framework — Extension Points (8 EPs)
// ─────────────────────────────────────────────────────────────────────────────
import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import {
  EP_ADAPTER_REGISTERED,
  EP_ADAPTER_RESOLVED,
  EP_ADAPTER_CAPABILITY_DECLARED,
  EP_ADAPTER_VALIDATED,
  EP_ADAPTER_SANDBOX_ENTERED,
  EP_ADAPTER_LIFECYCLE_CHANGED,
  EP_ADAPTER_TELEMETRY_RECORDED,
  EP_ADAPTER_HEALTH_CHECKED,
} from "./types";

export function declareAdapterFrameworkExtensionPoints(): void {
  declareExtensionPoint({
    id: EP_ADAPTER_REGISTERED,
    description: "Invoked when an adapter is registered in the framework. Allows audit logging, compliance checks, or external registry sync.",
    declaredBy: "adapter-framework",
  });

  declareExtensionPoint({
    id: EP_ADAPTER_RESOLVED,
    description: "Invoked after the resolution engine selects adapter(s) for an execution request. Allows override, fallback injection, or external routing.",
    declaredBy: "adapter-framework",
  });

  declareExtensionPoint({
    id: EP_ADAPTER_CAPABILITY_DECLARED,
    description: "Invoked when a capability is declared by an adapter. Allows external capability registries to be kept in sync.",
    declaredBy: "adapter-framework",
  });

  declareExtensionPoint({
    id: EP_ADAPTER_VALIDATED,
    description: "Invoked after adapter validation completes. Allows external security scanners, compliance systems, or authority gates to intercept.",
    declaredBy: "adapter-framework",
  });

  declareExtensionPoint({
    id: EP_ADAPTER_SANDBOX_ENTERED,
    description: "Invoked when an adapter enters its execution sandbox. Allows injection of runtime secrets, environment variables, or sandbox constraints.",
    declaredBy: "adapter-framework",
  });

  declareExtensionPoint({
    id: EP_ADAPTER_LIFECYCLE_CHANGED,
    description: "Invoked on any adapter lifecycle transition (install/enable/disable/upgrade/rollback/deprecate/retire). Allows downstream notification or state propagation.",
    declaredBy: "adapter-framework",
  });

  declareExtensionPoint({
    id: EP_ADAPTER_TELEMETRY_RECORDED,
    description: "Invoked after each telemetry record is persisted. Allows external APM systems, dashboards, or alerting pipelines to receive live metrics.",
    declaredBy: "adapter-framework",
  });

  declareExtensionPoint({
    id: EP_ADAPTER_HEALTH_CHECKED,
    description: "Invoked after each adapter health check. Allows external health monitors, SLO tracking systems, or on-call routing to receive health updates.",
    declaredBy: "adapter-framework",
  });
}
