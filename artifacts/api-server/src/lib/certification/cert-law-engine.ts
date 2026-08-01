// ── Build 045: Law Compliance Engine ─────────────────────────────────────
// Checks every permanent architectural law introduced in Builds 001–045.
// NEVER modifies platform state. Read-only.
import { db } from "@workspace/db";
import { listExtensionPoints } from "../cognitive-foundation/extension-points";
import type { LawComplianceResult } from "./types";
import { ARCHITECTURAL_LAWS, EXPECTED_EP_COUNT } from "./types";

async function tableExists(tableName: string): Promise<boolean> {
  try {
    await db.execute(`SELECT 1 FROM ${tableName} LIMIT 1` as any);
    return true;
  } catch {
    return false;
  }
}

// Check all 29 architectural laws. Returns one result per law.
export async function checkAllLaws(): Promise<LawComplianceResult[]> {
  const results: LawComplianceResult[] = [];

  for (const law of ARCHITECTURAL_LAWS) {
    const tableOk = await tableExists(law.tableProof);
    let epOk = true;

    if (law.epProof) {
      const eps = listExtensionPoints();
      epOk = eps.some((ep: { id: string }) => ep.id === law.epProof);
    }

    const compliant = tableOk && epOk;
    results.push({
      lawName:   law.name,
      domain:    law.domain,
      compliant,
      evidence: {
        build:      law.build,
        tableProof: law.tableProof,
        tableOk,
        epProof:    law.epProof ?? null,
        epOk,
      },
      findings: compliant
        ? `Law satisfied: table '${law.tableProof}' present${law.epProof ? `, EP '${law.epProof}' registered` : ""}.`
        : `Law violated: ${!tableOk ? `table '${law.tableProof}' MISSING` : ""}${!epOk ? ` EP '${law.epProof}' NOT registered` : ""}.`,
    });
  }

  // Bonus: EP count law
  const eps     = listExtensionPoints();
  const epCount = eps.length;
  results.push({
    lawName:   "Extension Point Completeness",
    domain:    "extensibility",
    compliant: epCount >= EXPECTED_EP_COUNT,
    evidence:  { found: epCount, expected: EXPECTED_EP_COUNT },
    findings:  epCount >= EXPECTED_EP_COUNT
      ? `${epCount} EPs registered — meets or exceeds expected ${EXPECTED_EP_COUNT}.`
      : `Only ${epCount} EPs registered — expected ≥${EXPECTED_EP_COUNT}. Missing builds may be incomplete.`,
  });

  return results;
}

export function computeLawComplianceScore(results: LawComplianceResult[]): number {
  if (results.length === 0) return 0;
  const compliant = results.filter((r) => r.compliant).length;
  return compliant / results.length;
}
