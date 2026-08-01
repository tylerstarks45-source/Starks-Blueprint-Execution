import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import {
  EP_PII_RESOURCE_DISCOVERED,
  EP_PII_HEALTH_EVALUATED,
  EP_PII_CAPACITY_ASSESSED,
  EP_PII_FORECAST_GENERATED,
  EP_PII_DEPENDENCY_MAPPED,
  EP_PII_PERFORMANCE_MEASURED,
  EP_PII_ALERT_TRIGGERED,
  EP_PII_RECOMMENDATION_PRODUCED,
} from "./types";

export function declarePlatformInfrastructureExtensionPoints(): void {
  declareExtensionPoint({
    id: EP_PII_RESOURCE_DISCOVERED,
    description:
      "Fired after infrastructure resources are discovered; inject real OS/cloud metrics (CPU/RAM from /proc, GPU from NVML, cloud provider APIs) to supplement or override heuristic values.",
    declaredBy: "platform-infrastructure",
  });

  declareExtensionPoint({
    id: EP_PII_HEALTH_EVALUATED,
    description:
      "Fired after a resource health check completes; inject real system health data (disk I/O, network throughput, DB connection pool exhaustion) to refine health classification.",
    declaredBy: "platform-infrastructure",
  });

  declareExtensionPoint({
    id: EP_PII_CAPACITY_ASSESSED,
    description:
      "Fired after resource capacity is assessed; inject actual storage sizes, DB row counts, queue depths, or cloud quota readings for accurate capacity tracking.",
    declaredBy: "platform-infrastructure",
  });

  declareExtensionPoint({
    id: EP_PII_FORECAST_GENERATED,
    description:
      "Fired after an infrastructure forecast is produced; inject time-series trend models, ML growth projections, or cloud billing alerts for improved accuracy.",
    declaredBy: "platform-infrastructure",
  });

  declareExtensionPoint({
    id: EP_PII_DEPENDENCY_MAPPED,
    description:
      "Fired after infrastructure dependency mapping completes; inject real service topology (service mesh, cloud dependency graphs) for accurate cascade risk assessment.",
    declaredBy: "platform-infrastructure",
  });

  declareExtensionPoint({
    id: EP_PII_PERFORMANCE_MEASURED,
    description:
      "Fired after platform performance is measured; inject real APM data (Datadog, Grafana), execution engine metrics, or runtime queue statistics for accurate throughput/latency.",
    declaredBy: "platform-infrastructure",
  });

  declareExtensionPoint({
    id: EP_PII_ALERT_TRIGGERED,
    description:
      "Fired when a resource alert is triggered; route to PagerDuty, Slack, email, or administrator notification systems before persistence.",
    declaredBy: "platform-infrastructure",
  });

  declareExtensionPoint({
    id: EP_PII_RECOMMENDATION_PRODUCED,
    description:
      "Fired when an administrator infrastructure recommendation is produced; inject org-specific cost models, procurement workflows, or infrastructure-as-code generation pipelines.",
    declaredBy: "platform-infrastructure",
  });
}
