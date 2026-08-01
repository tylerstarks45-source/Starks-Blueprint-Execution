import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import {
  EP_GTI_TECHNOLOGY_DISCOVERED,
  EP_GTI_BENCHMARK_ASSESSED,
  EP_GTI_COMPATIBILITY_CHECKED,
  EP_GTI_PROVIDER_EVALUATED,
  EP_GTI_OPPORTUNITY_DETECTED,
  EP_GTI_RECOMMENDATION_PRODUCED,
  EP_GTI_CATALOG_REFRESHED,
  EP_GTI_REGISTRY_UPDATED,
} from "./types";

export function declareGlobalTechnologyExtensionPoints(): void {
  declareExtensionPoint({
    id: EP_GTI_TECHNOLOGY_DISCOVERED,
    description:
      "Fired when a new technology is discovered; inject live metadata from package registries, GitHub stats, or cloud provider APIs to enrich the catalog entry beyond the built-in baseline.",
    declaredBy: "global-technology",
  });

  declareExtensionPoint({
    id: EP_GTI_BENCHMARK_ASSESSED,
    description:
      "Fired after benchmark scores are computed for a technology; inject real performance data (latency benchmarks, reliability SLAs, independent test results) to refine the composite score.",
    declaredBy: "global-technology",
  });

  declareExtensionPoint({
    id: EP_GTI_COMPATIBILITY_CHECKED,
    description:
      "Fired after a compatibility assessment completes; inject live environment probe results (actual OS checks, library availability, adapter test results) to override the static compatibility matrix.",
    declaredBy: "global-technology",
  });

  declareExtensionPoint({
    id: EP_GTI_PROVIDER_EVALUATED,
    description:
      "Fired after a technology provider is evaluated; inject current financial health data, recent incident history, or support quality signals to update provider maturity scoring.",
    declaredBy: "global-technology",
  });

  declareExtensionPoint({
    id: EP_GTI_OPPORTUNITY_DETECTED,
    description:
      "Fired when a technology opportunity is identified; route to business-case generation, capability-gap analysis, or strategic planning engines for cross-engine opportunity correlation.",
    declaredBy: "global-technology",
  });

  declareExtensionPoint({
    id: EP_GTI_RECOMMENDATION_PRODUCED,
    description:
      "Fired when an administrator technology recommendation is produced; inject org-specific procurement workflows, RFP generation, vendor evaluation scoring, or cost-model validation.",
    declaredBy: "global-technology",
  });

  declareExtensionPoint({
    id: EP_GTI_CATALOG_REFRESHED,
    description:
      "Fired when the full technology catalog refresh completes; trigger downstream reindexing, search refresh, or administrator notification that a new catalog version is available.",
    declaredBy: "global-technology",
  });

  declareExtensionPoint({
    id: EP_GTI_REGISTRY_UPDATED,
    description:
      "Fired after the technology registry is updated; synchronize with external CMDBs, ITSM tooling, or configuration management databases that track platform capabilities.",
    declaredBy: "global-technology",
  });
}
