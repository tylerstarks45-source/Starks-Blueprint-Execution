import { db, businessesTable, revenueStreams } from "@workspace/db";
import { randomUUID } from "node:crypto";
import { resolveBusinessType } from "./business-types";
import { ownedBusinessIds } from "./assets";
import { afterBusinessCreated } from "./after-create";

// Empire write actions shared by the HTTP routes and ASH's tools.

export async function createEmpireBusiness(userId: number, input: {
  name: string; typeKey: string; websiteUrl?: string; notes?: string; createDefaultStreams?: boolean;
}) {
  const type = await resolveBusinessType(userId, input.typeKey);
  if (!type) return { error: "Unknown business type" } as const;
  const [row] = await db.insert(businessesTable).values({
    ownerId: userId, name: input.name, businessType: type.baseType, typeKey: type.key, origin: "imported",
    websiteUrl: input.websiteUrl ?? null, notes: input.notes ?? null,
  }).returning();
  afterBusinessCreated(row, userId);
  const streams = input.createDefaultStreams
    ? await Promise.all(type.streamTypes.map((streamType) =>
      createIncomeStream(userId, { businessId: row.id, title: `${input.name} ${streamType.replace(/_/g, " ")}`, streamType, status: "projected" })))
    : [];
  return { business: row, type, streams: streams.filter(Boolean) };
}

export async function createIncomeStream(userId: number, input: {
  businessId: number; title: string; streamType: string; status?: string; estimatedMonthlyRevenue?: number | null; notes?: string;
}) {
  if (!(await ownedBusinessIds(userId, [input.businessId])).has(input.businessId)) return null;
  const [row] = await db.insert(revenueStreams).values({
    streamId: randomUUID(), userId, businessId: input.businessId, title: input.title, streamType: input.streamType,
    status: input.status ?? "projected", estimatedMonthlyRevenue: input.estimatedMonthlyRevenue ?? null,
    metadata: input.notes ? { notes: input.notes } : {},
  }).returning();
  return row;
}
