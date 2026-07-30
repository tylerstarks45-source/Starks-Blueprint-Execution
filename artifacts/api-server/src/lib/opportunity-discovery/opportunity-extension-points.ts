// ─── Build 017: Opportunity Discovery Extension Points ───────────────────────

import { declareExtensionPoint } from "../cognitive-foundation";
import {
  EP_OPPORTUNITY_DETECTED,
  EP_OPPORTUNITY_CLASSIFIED,
  EP_OPPORTUNITY_SCORED,
  EP_OPPORTUNITY_RANKED,
  EP_OPPORTUNITY_EVIDENCE_LINKED,
  EP_OPPORTUNITY_CRITICAL_DISCOVERED,
  EP_OPPORTUNITY_LIFECYCLE_CHANGED,
  EP_OPPORTUNITY_REPORT_GENERATED,
} from "./types";

export function declareOpportunityExtensionPoints(): void {
  declareExtensionPoint({
    id: EP_OPPORTUNITY_DETECTED,
    description: "Seam for handling a newly detected opportunity from analysis data",
    declaredBy: "opportunity-discovery-engine",
  });
  declareExtensionPoint({
    id: EP_OPPORTUNITY_CLASSIFIED,
    description: "Seam for post-classification enrichment or category override",
    declaredBy: "opportunity-discovery-engine",
  });
  declareExtensionPoint({
    id: EP_OPPORTUNITY_SCORED,
    description: "Seam for post-scoring adjustment or scoring model replacement",
    declaredBy: "opportunity-discovery-engine",
  });
  declareExtensionPoint({
    id: EP_OPPORTUNITY_RANKED,
    description: "Seam for custom ranking overrides or tie-breaking strategies",
    declaredBy: "opportunity-discovery-engine",
  });
  declareExtensionPoint({
    id: EP_OPPORTUNITY_EVIDENCE_LINKED,
    description: "Seam for evidence validation or additional evidence sources",
    declaredBy: "opportunity-discovery-engine",
  });
  declareExtensionPoint({
    id: EP_OPPORTUNITY_CRITICAL_DISCOVERED,
    description: "Seam for critical-priority opportunity alerting and escalation",
    declaredBy: "opportunity-discovery-engine",
  });
  declareExtensionPoint({
    id: EP_OPPORTUNITY_LIFECYCLE_CHANGED,
    description: "Seam for opportunity status transitions (active→resolved/dismissed)",
    declaredBy: "opportunity-discovery-engine",
  });
  declareExtensionPoint({
    id: EP_OPPORTUNITY_REPORT_GENERATED,
    description: "Seam for post-report processing, export, or notification",
    declaredBy: "opportunity-discovery-engine",
  });
}
