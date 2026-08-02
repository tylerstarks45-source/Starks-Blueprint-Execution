import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import { LH_EP_IDS } from "./types";

export function declareLaunchHardeningExtensionPoints(): void {
  declareExtensionPoint({ id: LH_EP_IDS.FINDING_CLASSIFICATION, description: "Intercept finding import — classify new audit findings, add custom severity overrides or additional metadata before persistence", declaredBy: "launch-hardening" });
  declareExtensionPoint({ id: LH_EP_IDS.PRIORITY_ASSESSMENT,    description: "Override automated priority decisions — change BLOCKER/PRE_LAUNCH/POST_LAUNCH/OBSERVATION for any finding based on project context", declaredBy: "launch-hardening" });
  declareExtensionPoint({ id: LH_EP_IDS.DEPENDENCY_RESOLUTION,  description: "Resolve fix ordering conflicts — add or override remediation dependencies detected by the dependency engine", declaredBy: "launch-hardening" });
  declareExtensionPoint({ id: LH_EP_IDS.VERIFICATION_EXECUTION,  description: "Run custom verification checks — augment the standard verification methods with automated test execution or external tooling", declaredBy: "launch-hardening" });
  declareExtensionPoint({ id: LH_EP_IDS.REGRESSION_ANALYSIS,    description: "Analyse regression risk — augment subsystem impact analysis with live dependency graph data from the Knowledge Graph", declaredBy: "launch-hardening" });
  declareExtensionPoint({ id: LH_EP_IDS.LAUNCH_READINESS,       description: "Compute launch confidence score — add custom launch readiness signals beyond the standard blocked/verified/deferred counts", declaredBy: "launch-hardening" });
  declareExtensionPoint({ id: LH_EP_IDS.ADVISORY_GENERATION,    description: "Generate hardening advisory for Executive Brain — extend the standard advisory with project-specific blockers or context", declaredBy: "launch-hardening" });
  declareExtensionPoint({ id: LH_EP_IDS.SNAPSHOT_CREATION,      description: "Post-snapshot hook — trigger downstream notifications, Slack alerts, or Certification Framework re-runs after each hardening snapshot", declaredBy: "launch-hardening" });
}
