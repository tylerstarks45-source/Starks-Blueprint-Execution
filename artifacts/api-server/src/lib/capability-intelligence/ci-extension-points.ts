import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import {
  EP_CI_HEALTH_EVALUATED,
  EP_CI_RELIABILITY_MEASURED,
  EP_CI_AVAILABILITY_TRACKED,
  EP_CI_DEPENDENCY_ASSESSED,
  EP_CI_FORECAST_GENERATED,
  EP_CI_OPTIMIZATION_PRODUCED,
  EP_CI_ADMIN_RECOMMENDATION_GENERATED,
  EP_CI_SNAPSHOT_TAKEN,
} from "./types";

export function declareCapabilityIntelligenceExtensionPoints(): void {
  declareExtensionPoint({
    id: EP_CI_HEALTH_EVALUATED,
    description:
      "Fired after a capability health check completes; inject real connectivity tests, latency measurements, or external monitoring results.",
    declaredBy: "capability-intelligence",
  });

  declareExtensionPoint({
    id: EP_CI_RELIABILITY_MEASURED,
    description:
      "Fired after capability reliability is calculated; inject additional telemetry sources, external SLO data, or custom p95/p99 calculations.",
    declaredBy: "capability-intelligence",
  });

  declareExtensionPoint({
    id: EP_CI_AVAILABILITY_TRACKED,
    description:
      "Fired after availability is assessed; inject maintenance schedules, service-status-page data, or external uptime monitoring results.",
    declaredBy: "capability-intelligence",
  });

  declareExtensionPoint({
    id: EP_CI_DEPENDENCY_ASSESSED,
    description:
      "Fired after dependency health is assessed; inject upstream service health (cloud provider status, third-party APIs), or richer dependency graphs.",
    declaredBy: "capability-intelligence",
  });

  declareExtensionPoint({
    id: EP_CI_FORECAST_GENERATED,
    description:
      "Fired after a forecast is produced; inject ML-based degradation models, quota depletion projections, or certificate-expiry watchers.",
    declaredBy: "capability-intelligence",
  });

  declareExtensionPoint({
    id: EP_CI_OPTIMIZATION_PRODUCED,
    description:
      "Fired after an optimization recommendation is produced; filter, rank, or enrich recommendations before persistence.",
    declaredBy: "capability-intelligence",
  });

  declareExtensionPoint({
    id: EP_CI_ADMIN_RECOMMENDATION_GENERATED,
    description:
      "Fired when an administrative infrastructure recommendation is produced (admin-restricted only); inject org-specific infrastructure policies or approval workflows.",
    declaredBy: "capability-intelligence",
  });

  declareExtensionPoint({
    id: EP_CI_SNAPSHOT_TAKEN,
    description:
      "Fired after a capability intelligence snapshot is persisted; sync to external monitoring, trigger alerting pipelines, or export to observability platforms.",
    declaredBy: "capability-intelligence",
  });
}
