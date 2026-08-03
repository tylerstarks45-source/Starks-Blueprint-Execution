import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { customerEngagement, customerInteractions, customerRegistry } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { InteractionType, EngagementHealth } from "./types.js";

// ─── Interactions ──────────────────────────────────────────────────────────
export interface CreateInteractionInput {
  customerId:       string;
  userId:           number;
  businessId?:      number;
  interactionType:  InteractionType;
  channel?:         string;
  direction?:       "inbound" | "outbound" | "automated";
  subject?:         string;
  summary?:         string;
  sentiment?:       "positive" | "neutral" | "negative" | "unknown";
  outcome?:         string;
  durationSeconds?: number;
  metadata?:        Record<string, unknown>;
}

export async function createInteraction(input: CreateInteractionInput) {
  const interactionId = `int_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const rows = (await db.insert(customerInteractions).values({
    interactionId,
    customerId:       input.customerId,
    userId:           input.userId,
    businessId:       input.businessId ?? null,
    interactionType:  input.interactionType,
    channel:          input.channel ?? null,
    direction:        input.direction ?? null,
    subject:          input.subject ?? null,
    summary:          input.summary ?? null,
    sentiment:        input.sentiment ?? "unknown",
    outcome:          input.outcome ?? null,
    durationSeconds:  input.durationSeconds ?? null,
    metadata:         input.metadata ?? {},
    occurredAt:       new Date(),
  }).returning()) as any[];

  // Bump interaction counter in registry
  await db.execute(sql`
    UPDATE customer_registry
       SET interaction_count = interaction_count + 1,
           last_activity_at  = NOW(),
           updated_at        = NOW()
     WHERE customer_id = ${input.customerId}
  `);

  return rows[0];
}

export async function listInteractions(customerId: string, limit = 50) {
  return db.select().from(customerInteractions)
    .where(eq(customerInteractions.customerId, customerId))
    .orderBy(sql`occurred_at DESC`)
    .limit(limit);
}

// ─── Engagement scoring ────────────────────────────────────────────────────
export async function computeEngagementScore(customerId: string, userId: number, businessId?: number) {
  const engagementId = `eng_${randomUUID().replace(/-/g, "").slice(0, 20)}`;

  // Fetch recent interactions (last 90 days)
  const result = await db.execute(sql`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN interaction_type = 'purchase' THEN 1 ELSE 0 END) AS purchases,
           SUM(CASE WHEN interaction_type = 'email'    THEN 1 ELSE 0 END) AS emails,
           MAX(occurred_at) AS last_seen
      FROM customer_interactions
     WHERE customer_id = ${customerId}
       AND occurred_at >= NOW() - INTERVAL '90 days'
  `);
  const row = ((result as any).rows ?? [])[0] ?? {};

  const total       = Number(row.total ?? 0);
  const purchases   = Number(row.purchases ?? 0);
  const lastSeenAt  = row.last_seen ? new Date(row.last_seen) : null;

  // Recency score (0-100): full if < 7 days, 0 if > 90 days
  const daysSinceLast = lastSeenAt
    ? (Date.now() - lastSeenAt.getTime()) / 86_400_000
    : 91;
  const recencyScore  = Math.max(0, Math.min(100, 100 - (daysSinceLast / 90) * 100));

  // Frequency score
  const frequencyScore = Math.min(100, total * 5);

  // Monetary score (simplified — uses purchase count as proxy until Commerce is live)
  const monetaryScore = Math.min(100, purchases * 20);

  // RFM composite (equal weight)
  const rfmScore = (recencyScore + frequencyScore + monetaryScore) / 3;

  const engagementScore = rfmScore;
  const healthStatus    = deriveHealthStatus(engagementScore, daysSinceLast);

  const rows = (await db.insert(customerEngagement).values({
    engagementId,
    customerId,
    userId,
    businessId: businessId ?? null,
    engagementScore,
    recencyScore,
    frequencyScore,
    monetaryScore,
    rfmScore,
    healthStatus,
    totalInteractions: total,
    firstSeenAt:  null,
    lastSeenAt:   lastSeenAt,
    computedAt:   new Date(),
  }).returning()) as any[];

  // Update registry
  await db.execute(sql`
    UPDATE customer_registry
       SET engagement_score = ${engagementScore},
           health_status    = ${healthStatus},
           updated_at       = NOW()
     WHERE customer_id = ${customerId}
  `);

  return rows[0];
}

export async function getEngagement(customerId: string) {
  return db.select().from(customerEngagement)
    .where(eq(customerEngagement.customerId, customerId))
    .orderBy(sql`computed_at DESC`).limit(1);
}

function deriveHealthStatus(score: number, daysSinceLast: number): EngagementHealth {
  if (daysSinceLast > 180)   return "lost";
  if (daysSinceLast > 60)    return "dormant";
  if (score >= 75)           return "champion";
  if (score >= 50)           return "healthy";
  if (score >= 20)           return "at_risk";
  return "new";
}
