// ── Build 045: Certification Extension Points ─────────────────────────────
import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import { CERT_EP_IDS } from "./types";

export function declareCertificationExtensionPoints(): void {
  declareExtensionPoint({
    id: CERT_EP_IDS.ARCHITECTURE_VALIDATION,
    description: "Intercept architecture validation — verifies every foundational subsystem is present and correctly registered",
    declaredBy: "certification-framework",
  });
  declareExtensionPoint({
    id: CERT_EP_IDS.LAW_COMPLIANCE,
    description: "Intercept law compliance checking — verifies all permanent architectural laws from Builds 001–045",
    declaredBy: "certification-framework",
  });
  declareExtensionPoint({
    id: CERT_EP_IDS.DEPENDENCY_VALIDATION,
    description: "Intercept dependency validation — verifies orchestrator waves, graph relationships, registries, and cross-engine dependencies",
    declaredBy: "certification-framework",
  });
  declareExtensionPoint({
    id: CERT_EP_IDS.HEALTH_CERTIFICATION,
    description: "Intercept health certification — measures health, reliability, availability, performance, coverage, consistency, confidence",
    declaredBy: "certification-framework",
  });
  declareExtensionPoint({
    id: CERT_EP_IDS.LAUNCH_READINESS,
    description: "Intercept launch readiness — produces launch score, critical issues, warnings, recommendations, readiness level, blocked items",
    declaredBy: "certification-framework",
  });
  declareExtensionPoint({
    id: CERT_EP_IDS.ADMINISTRATOR_CERTIFICATION,
    description: "Intercept administrator certification — produces certification packages with executive summary, findings, evidence, pass/fail status",
    declaredBy: "certification-framework",
  });
  declareExtensionPoint({
    id: CERT_EP_IDS.AUDIT_SYNCHRONIZATION,
    description: "Intercept certification audit synchronization — propagates certification results to the knowledge graph",
    declaredBy: "certification-framework",
  });
  declareExtensionPoint({
    id: CERT_EP_IDS.ADVISORY,
    description: "Intercept certification advisory generation for the Executive Brain context note",
    declaredBy: "certification-framework",
  });
}
