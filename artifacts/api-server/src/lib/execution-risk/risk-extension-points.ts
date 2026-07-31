// ─────────────────────────────────────────────────────────────────────────────
// Build 026: Execution Risk Assessment Engine — Extension Points (8)
// ─────────────────────────────────────────────────────────────────────────────
import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import {
  EP_OPERATIONAL_RISK_ASSESSED,
  EP_FINANCIAL_RISK_ASSESSED,
  EP_SECURITY_RISK_ASSESSED,
  EP_PRIVACY_RISK_ASSESSED,
  EP_COMPLIANCE_RISK_ASSESSED,
  EP_REVERSIBILITY_DETERMINED,
  EP_MITIGATION_PRODUCED,
  EP_RISK_REPORT_GENERATED,
} from "./types";

export function declareExecutionRiskExtensionPoints(): void {
  declareExtensionPoint({
    id: EP_OPERATIONAL_RISK_ASSESSED,
    description:
      "Fired after the Operational Risk Engine evaluates disruption risk for a profile. " +
      "Hook: enrich with live operational metrics, uptime data, or SLA breach history.",
    declaredBy: "execution-risk",
  });

  declareExtensionPoint({
    id: EP_FINANCIAL_RISK_ASSESSED,
    description:
      "Fired after the Financial Risk Engine evaluates financial exposure, billing impact, and cost uncertainty. " +
      "Hook: inject live cost estimates, billing alerts, or financial runway data.",
    declaredBy: "execution-risk",
  });

  declareExtensionPoint({
    id: EP_SECURITY_RISK_ASSESSED,
    description:
      "Fired after the Security Risk Engine evaluates privilege, credential exposure, and infrastructure impact. " +
      "Hook: connect to SIEM, vulnerability scanner, or live threat intelligence.",
    declaredBy: "execution-risk",
  });

  declareExtensionPoint({
    id: EP_PRIVACY_RISK_ASSESSED,
    description:
      "Fired after the Privacy Risk Engine evaluates exposure to personal, customer, business, and confidential data. " +
      "Hook: integrate with DLP platform or data classification service.",
    declaredBy: "execution-risk",
  });

  declareExtensionPoint({
    id: EP_COMPLIANCE_RISK_ASSESSED,
    description:
      "Fired after the Compliance Risk Engine evaluates policy violations, regulatory exposure, and audit implications. " +
      "Hook: connect to GRC platform or regulatory control framework.",
    declaredBy: "execution-risk",
  });

  declareExtensionPoint({
    id: EP_REVERSIBILITY_DETERMINED,
    description:
      "Fired after the Reversibility Engine classifies each profile as fully_reversible/partially_reversible/irreversible/rollback_available. " +
      "Hook: query live backup or snapshot state to confirm rollback is truly available.",
    declaredBy: "execution-risk",
  });

  declareExtensionPoint({
    id: EP_MITIGATION_PRODUCED,
    description:
      "Fired after the Mitigation Engine produces deterministic mitigation actions. " +
      "Hook: enrich with organisation-specific playbooks, escalation procedures, or automated remediation scripts.",
    declaredBy: "execution-risk",
  });

  declareExtensionPoint({
    id: EP_RISK_REPORT_GENERATED,
    description:
      "Fired after the immutable execution risk report is assembled and persisted. " +
      "Hook: distribute to risk management platform, board-level dashboard, or audit log.",
    declaredBy: "execution-risk",
  });
}
