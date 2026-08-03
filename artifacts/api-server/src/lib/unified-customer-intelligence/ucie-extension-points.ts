import { declareExtensionPoint } from "../cognitive-foundation/index.js";

export function declareUCIEExtensionPoints(): void {
  const points = [
    { id: "ucie.customer.created",      description: "New customer profile created in the canonical identity layer",      declaredBy: "unified-customer-intelligence" },
    { id: "ucie.organization.created",  description: "New organization profile registered in the UCIE layer",             declaredBy: "unified-customer-intelligence" },
    { id: "ucie.relationship.mapped",   description: "Relationship edge added to the customer relationship graph",        declaredBy: "unified-customer-intelligence" },
    { id: "ucie.lifecycle.changed",     description: "Customer lifecycle stage transition recorded",                      declaredBy: "unified-customer-intelligence" },
    { id: "ucie.segment.created",       description: "New customer segment defined and persisted",                        declaredBy: "unified-customer-intelligence" },
    { id: "ucie.engagement.scored",     description: "Customer engagement profile scored and health status updated",      declaredBy: "unified-customer-intelligence" },
    { id: "ucie.quality.analyzed",      description: "Data quality analysis run — completeness scored, duplicates flagged", declaredBy: "unified-customer-intelligence" },
    { id: "ucie.snapshot.captured",     description: "Platform-wide customer intelligence snapshot recorded",             declaredBy: "unified-customer-intelligence" },
  ];
  for (const p of points) declareExtensionPoint(p);
}
