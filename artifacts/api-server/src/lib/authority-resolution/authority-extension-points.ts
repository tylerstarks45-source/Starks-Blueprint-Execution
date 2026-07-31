// ─────────────────────────────────────────────────────────────────────────────
// Build 025: Authority Resolution Engine — Extension Points
// 8 seams declared at boot via the Cognitive Foundation.
// ─────────────────────────────────────────────────────────────────────────────
import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import {
  EP_AUTHORITY_REQUIREMENTS_DERIVED,
  EP_SCOPE_RESOLVED,
  EP_AUTHORITY_VALIDATED,
  EP_DEPENDENCY_MAPPED,
  EP_APPROVAL_RESOLVED,
  EP_AUTHORITY_EVALUATED,
  EP_AUTHORITY_REPORT_GENERATED,
  EP_AUTHORITY_SNAPSHOT_TAKEN,
} from "./types";

export function declareAuthorityResolutionExtensionPoints(): void {
  declareExtensionPoint({
    id: EP_AUTHORITY_REQUIREMENTS_DERIVED,
    description:
      "Fired after the Authority Discovery Engine derives authority requirements from each execution assignment. " +
      "Hook: enrich with live permission data from IAM or RBAC systems.",
    declaredBy: "authority-resolution",
  });

  declareExtensionPoint({
    id: EP_SCOPE_RESOLVED,
    description:
      "Fired after the Scope Resolution Engine determines the authority scope (user/business/project/etc.) " +
      "for each requirement. Hook: validate scope against organisational boundaries.",
    declaredBy: "authority-resolution",
  });

  declareExtensionPoint({
    id: EP_AUTHORITY_VALIDATED,
    description:
      "Fired after the Authority Validation Engine assigns granted/pending/expired/denied/unavailable " +
      "status to each requirement. Hook: connect to live credential or token store for real-time status.",
    declaredBy: "authority-resolution",
  });

  declareExtensionPoint({
    id: EP_DEPENDENCY_MAPPED,
    description:
      "Fired after the Permission Dependency Engine maps authority dependencies across integrations, " +
      "systems, credentials, approvals, and governance policies. Hook: inject live dependency graph.",
    declaredBy: "authority-resolution",
  });

  declareExtensionPoint({
    id: EP_APPROVAL_RESOLVED,
    description:
      "Fired after the Approval Resolution Engine determines which authorities require explicit human " +
      "approval before execution can proceed. Hook: integrate with approval workflow or e-signature platform.",
    declaredBy: "authority-resolution",
  });

  declareExtensionPoint({
    id: EP_AUTHORITY_EVALUATED,
    description:
      "Fired after the Authority Evaluation Engine scores coverage, completeness, risk, trust, readiness, " +
      "and confidence. Hook: adjust scoring weights from governance configuration.",
    declaredBy: "authority-resolution",
  });

  declareExtensionPoint({
    id: EP_AUTHORITY_REPORT_GENERATED,
    description:
      "Fired after the Authority Report Engine produces the immutable authority resolution report. " +
      "Hook: distribute to GRC platform, audit log, or compliance dashboard.",
    declaredBy: "authority-resolution",
  });

  declareExtensionPoint({
    id: EP_AUTHORITY_SNAPSHOT_TAKEN,
    description:
      "Fired after the point-in-time authority snapshot is persisted. " +
      "Hook: replicate snapshot to external audit or compliance store.",
    declaredBy: "authority-resolution",
  });
}
