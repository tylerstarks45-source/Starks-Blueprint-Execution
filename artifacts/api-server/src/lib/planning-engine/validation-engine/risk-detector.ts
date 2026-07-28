// ─── Risk detection (Phase 1.4 upgrade) ────────────────────────────────────
// A small, explicit, extensible table of risk categories rather than one
// flat keyword array. Add a new category here to extend risk detection —
// nothing else in the Validation Engine needs to change.

export type RiskLevel = "low" | "medium" | "high";

export interface RiskCategory {
  id: string;
  riskLevel: RiskLevel;
  description: string;
  patterns: RegExp[];
}

export const RISK_CATEGORIES: RiskCategory[] = [
  {
    id: "financial",
    riskLevel: "high",
    description: "Involves spending money, charging a card, or processing a payment.",
    patterns: [/\b(charge (a|the) card|process (a )?payment|make a payment|spend money|purchase\b|buy ads?\b|pay for)\b/i],
  },
  {
    id: "destructive",
    riskLevel: "high",
    description: "Permanently deletes or removes data/resources.",
    patterns: [/\b(delete|remove permanently|wipe|erase|destroy)\b/i],
  },
  {
    id: "bulk_external_communication",
    riskLevel: "high",
    description: "Sends a message to a large or entire audience at once.",
    patterns: [/\b(send to all|email (the |your )?(entire )?(customer|subscriber|contact) list|mass (email|message)|blast\b)\b/i],
  },
  {
    id: "irreversible_publish",
    riskLevel: "medium",
    description: "Publishes or makes something publicly/permanently live.",
    patterns: [/\b(publish permanently|go live|make (it |this )?public|push to production)\b/i],
  },
  {
    id: "account_security",
    riskLevel: "high",
    description: "Changes account security, credentials, or access.",
    patterns: [/\b(change (the )?password|revoke access|disable (two[- ]factor|2fa)|delete (the )?account|cancel (the )?subscription|close the account)\b/i],
  },
];

export interface DetectedRisk {
  categoryId: string;
  riskLevel: RiskLevel;
  description: string;
}

export function detectRisks(text: string): DetectedRisk[] {
  const lower = text.toLowerCase();
  const found: DetectedRisk[] = [];
  for (const category of RISK_CATEGORIES) {
    if (category.patterns.some((p) => p.test(lower))) {
      found.push({ categoryId: category.id, riskLevel: category.riskLevel, description: category.description });
    }
  }
  return found;
}

export function highestRiskLevel(risks: DetectedRisk[]): RiskLevel | null {
  if (risks.some((r) => r.riskLevel === "high")) return "high";
  if (risks.some((r) => r.riskLevel === "medium")) return "medium";
  if (risks.length > 0) return "low";
  return null;
}
