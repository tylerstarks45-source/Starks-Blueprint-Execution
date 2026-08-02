// ── Verification Engine ────────────────────────────────────────────────────
// Tracks whether each remediation has been independently verified.
// A finding is only eligible for status="verified" after a verification
// record with result="pass" has been recorded against its remediation.
// ────────────────────────────────────────────────────────────────────────────

import { db } from "@workspace/db";
import { launchVerification, launchRemediation, launchHardeningRegistry } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type { VerificationMethod, VerificationResult } from "./types";
import { logger } from "../logger";

export interface RecordVerificationInput {
  remediationId:      number;
  findingCode:        string;
  verificationMethod: VerificationMethod;
  verificationResult: VerificationResult;
  verifiedBy:         string;
  verificationNotes?: string;
}

// Records a verification outcome and, if result is "pass", promotes the
// finding's registry status to "verified".
export async function recordVerification(input: RecordVerificationInput): Promise<{ verificationId: number; statusUpdated: boolean }> {
  const [record] = await db.insert(launchVerification).values({
    remediationId:      input.remediationId,
    findingCode:        input.findingCode,
    verificationMethod: input.verificationMethod,
    verificationResult: input.verificationResult,
    verifiedBy:         input.verifiedBy,
    verificationNotes:  input.verificationNotes ?? null,
    verifiedAt:         new Date(),
  }).returning({ id: launchVerification.id });

  let statusUpdated = false;

  // Promote registry status to "verified" if the verification passed.
  if (input.verificationResult === "pass") {
    await db
      .update(launchHardeningRegistry)
      .set({ status: "verified", updatedAt: new Date() })
      .where(eq(launchHardeningRegistry.findingCode, input.findingCode));
    statusUpdated = true;
    logger.info({ findingCode: input.findingCode }, "Launch Hardening: finding verified and closed");
  } else if (input.verificationResult === "fail") {
    // Mark the remediation as requiring rework
    await db
      .update(launchRemediation)
      .set({ status: "in_progress" })
      .where(eq(launchRemediation.id, input.remediationId));
    logger.warn({ findingCode: input.findingCode }, "Launch Hardening: verification failed — remediation requires rework");
  }

  return { verificationId: record.id, statusUpdated };
}

// Returns the latest verification record for a finding.
export async function getVerificationStatus(findingCode: string) {
  const records = await db
    .select()
    .from(launchVerification)
    .where(eq(launchVerification.findingCode, findingCode))
    .orderBy(desc(launchVerification.verifiedAt))
    .limit(1);

  return records[0] ?? null;
}

// Returns all findings that are status="fixed" but have no passing verification record.
// These are the "unverified fixed" — fixed in code but not confirmed.
export async function getUnverifiedFixed(): Promise<string[]> {
  const registry = await db
    .select()
    .from(launchHardeningRegistry)
    .where(eq(launchHardeningRegistry.status, "fixed"));

  const unverified: string[] = [];
  for (const reg of registry) {
    const verification = await getVerificationStatus(reg.findingCode);
    if (!verification || verification.verificationResult !== "pass") {
      unverified.push(reg.findingCode);
    }
  }
  return unverified;
}

// Returns a summary of verification coverage.
export async function getVerificationCoverage() {
  const allReg   = await db.select().from(launchHardeningRegistry);
  const allVerif = await db.select().from(launchVerification);

  const verifiedCodes = new Set(
    allVerif.filter(v => v.verificationResult === "pass").map(v => v.findingCode)
  );

  const total     = allReg.length;
  const verified  = allReg.filter(r => verifiedCodes.has(r.findingCode)).length;
  const unverifiedFixed = await getUnverifiedFixed();

  return {
    total,
    verified,
    unverifiedFixed: unverifiedFixed.length,
    coveragePct: total > 0 ? Math.round((verified / total) * 100) : 0,
  };
}
