import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import {
  EP_TEI_LIFECYCLE_ASSESSED,
  EP_TEI_TREND_TRACKED,
  EP_TEI_VELOCITY_MEASURED,
  EP_TEI_ADOPTION_EVALUATED,
  EP_TEI_OUTLOOK_FORECASTED,
  EP_TEI_RECOMMENDATION_PRODUCED,
  EP_TEI_CHANGE_DETECTED,
  EP_TEI_REBUILD_COMPLETE,
} from "./types";

export function declareTechnologyEvolutionExtensionPoints(): void {
  declareExtensionPoint({
    id: EP_TEI_LIFECYCLE_ASSESSED,
    description:
      "Fired after lifecycle stage is assessed for a technology; inject real release data (actual GitHub release history, npm publish dates, vendor EOL announcements, CNCF landscape maturity) to replace deterministic lifecycle scores with evidence-based classification.",
    declaredBy: "technology-evolution",
  });

  declareExtensionPoint({
    id: EP_TEI_TREND_TRACKED,
    description:
      "Fired after trend direction is computed for a technology; inject live trend data (Stack Overflow Survey, GitHub Octoverse, npm download trends, Google Trends, job posting trends) to replace static trend profiles with real-time market signals.",
    declaredBy: "technology-evolution",
  });

  declareExtensionPoint({
    id: EP_TEI_VELOCITY_MEASURED,
    description:
      "Fired after release velocity is measured; inject real release cadence data (GitHub releases API, changelog analysis, semantic versioning history) to replace static velocity estimates with observed release patterns.",
    declaredBy: "technology-evolution",
  });

  declareExtensionPoint({
    id: EP_TEI_ADOPTION_EVALUATED,
    description:
      "Fired after adoption scoring completes for a technology; inject real adoption data (npm weekly downloads, Docker Hub pulls, cloud provider native integrations, Fortune 500 case studies) to refine adoption scores with market evidence.",
    declaredBy: "technology-evolution",
  });

  declareExtensionPoint({
    id: EP_TEI_OUTLOOK_FORECASTED,
    description:
      "Fired after future outlook is computed; inject analyst reports (Gartner Hype Cycle, Forrester Wave), vendor roadmap disclosures, and historical adoption data to improve longevity and replacement likelihood forecasts.",
    declaredBy: "technology-evolution",
  });

  declareExtensionPoint({
    id: EP_TEI_RECOMMENDATION_PRODUCED,
    description:
      "Fired when an evolution recommendation is produced; inject org-specific technology strategy constraints, existing migration commitments, team expertise profiles, and budget envelopes to filter, modify, or re-rank recommendations.",
    declaredBy: "technology-evolution",
  });

  declareExtensionPoint({
    id: EP_TEI_CHANGE_DETECTED,
    description:
      "Fired when a significant technology change event is detected (lifecycle transition, trend reversal, deprecation announcement); route to administrator alerting, runbook generation, or incident management before persisting.",
    declaredBy: "technology-evolution",
  });

  declareExtensionPoint({
    id: EP_TEI_REBUILD_COMPLETE,
    description:
      "Fired when the full evolution intelligence rebuild completes; trigger downstream analytics, administrator dashboard refreshes, evolution trend dashboards, or knowledge graph synchronization.",
    declaredBy: "technology-evolution",
  });
}
