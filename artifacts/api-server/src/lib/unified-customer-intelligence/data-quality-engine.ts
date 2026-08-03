import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { customerQuality, customerProfiles, customerRegistry } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

export interface QualityAnalysisResult {
  qualityId:           string;
  customerId:          string;
  completenessScore:   number;
  duplicateFlag:       boolean;
  duplicateOf:         string | null;
  duplicateConfidence: number;
  mergeRecommendation: string | null;
  validationIssues:    string[];
  missingFields:       string[];
  recommendations:     string[];
}

export async function analyzeDataQuality(customerId: string, userId: number, businessId?: number): Promise<QualityAnalysisResult> {
  const qualityId = `qlt_${randomUUID().replace(/-/g, "").slice(0, 20)}`;

  const profiles = await db.select().from(customerProfiles)
    .where(eq(customerProfiles.customerId, customerId)).limit(1);
  const profile = profiles[0];
  if (!profile) throw new Error(`Customer ${customerId} not found`);

  // Completeness
  const missingFields: string[] = [];
  if (!profile.firstName && !profile.lastName) missingFields.push("name");
  if (!profile.email)                           missingFields.push("email");
  if (!profile.phone)                           missingFields.push("phone");
  if (!profile.city && !profile.country)        missingFields.push("address");

  let completenessScore = 100 - (missingFields.length * 20);
  completenessScore = Math.max(0, completenessScore);

  // Duplicate detection — same email (excluding self)
  let duplicateFlag = false;
  let duplicateOf: string | null = null;
  let duplicateConfidence = 0;
  let mergeRecommendation: string | null = null;

  if (profile.email) {
    const dups = await db.select().from(customerProfiles)
      .where(and(
        eq(customerProfiles.email, profile.email),
        eq(customerProfiles.userId, userId),
        sql`customer_id != ${customerId}`,
      )).limit(1);
    if (dups.length > 0) {
      duplicateFlag       = true;
      duplicateOf         = dups[0].customerId;
      duplicateConfidence = 0.90;
      mergeRecommendation = `Merge with ${dups[0].customerId} — identical email address.`;
    }
  }

  // Validation issues
  const validationIssues: string[] = [];
  if (profile.email && !/^[^@]+@[^@]+\.[^@]+$/.test(profile.email)) {
    validationIssues.push("Invalid email format");
  }

  // Recommendations
  const recommendations: string[] = [];
  if (missingFields.includes("email"))   recommendations.push("Add email to enable communication");
  if (missingFields.includes("phone"))   recommendations.push("Add phone for call/SMS channels");
  if (missingFields.includes("address")) recommendations.push("Add address for geographic segmentation");
  if (duplicateFlag)                      recommendations.push(mergeRecommendation!);

  await db.insert(customerQuality).values({
    qualityId,
    customerId,
    userId,
    businessId:          businessId ?? null,
    completenessScore,
    hasName:             !missingFields.includes("name"),
    hasEmail:            !missingFields.includes("email"),
    hasPhone:            !missingFields.includes("phone"),
    hasAddress:          !missingFields.includes("address"),
    hasOrganization:     false,
    hasLifecycleStage:   true,
    hasEngagementData:   false,
    duplicateFlag,
    duplicateOf,
    duplicateConfidence,
    mergeRecommendation,
    validationIssues,
    missingFields,
    recommendations,
    analyzedAt:          new Date(),
  });

  // Update registry flags
  await db.execute(sql`
    UPDATE customer_registry
       SET duplicate_flag        = ${duplicateFlag},
           merge_recommendation  = ${mergeRecommendation ?? null},
           profile_complete      = ${completenessScore},
           updated_at            = NOW()
     WHERE customer_id = ${customerId}
  `);

  return {
    qualityId, customerId, completenessScore,
    duplicateFlag, duplicateOf, duplicateConfidence, mergeRecommendation,
    validationIssues, missingFields, recommendations,
  };
}

export async function listDuplicateFlags(userId: number, businessId?: number) {
  return db.select().from(customerQuality)
    .where(and(eq(customerQuality.userId, userId), eq(customerQuality.duplicateFlag, true)));
}
