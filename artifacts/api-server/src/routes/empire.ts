import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  db, businessesTable, revenueStreams, canonicalAssets, customBusinessTypesTable, assetBusinessSharesTable,
} from "@workspace/db";
import { getActiveCallerPayload } from "../lib/auth";
import { serialize } from "../lib/serialize";
import { getEmpireOverview } from "../lib/empire/overview";
import { listBusinessTypes, resolveBusinessType, slugifyKey, STREAM_TYPES, BUILTIN_BUSINESS_TYPES } from "../lib/empire/business-types";
import { syncUserAssets, registerAsset, ownedBusinessIds, ASSET_CLASS_LABELS, OWNER_EDITED_TAG } from "../lib/empire/assets";
import { createEmpireBusiness, createIncomeStream } from "../lib/empire/actions";

const router: IRouter = Router();

const idParam = (req: Request) => {
  const n = Number(req.params["id"]);
  return Number.isInteger(n) && n > 0 ? n : null;
};
const bad = (res: Response, error: string, status = 400) => { res.status(status).json({ error }); };
const zerr = (e: z.ZodError) => e.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");

// ─── Overview & search ───────────────────────────────────────────────────────

router.get("/empire/overview", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  await syncUserAssets(caller.id);
  res.json(serialize(await getEmpireOverview(caller.id)));
});

router.get("/empire/search", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const q = String(req.query["q"] ?? "").trim().slice(0, 100);
  if (q.length < 2) { res.json({ businesses: [], streams: [], assets: [] }); return; }
  const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const [businesses, streams, assets] = await Promise.all([
    db.select({ id: businessesTable.id, name: businessesTable.name, businessType: businessesTable.businessType, typeKey: businessesTable.typeKey })
      .from(businessesTable).where(and(eq(businessesTable.ownerId, caller.id), or(ilike(businessesTable.name, like), ilike(businessesTable.notes, like)))).limit(10),
    db.select({ id: revenueStreams.id, title: revenueStreams.title, businessId: revenueStreams.businessId, streamType: revenueStreams.streamType })
      .from(revenueStreams).where(and(eq(revenueStreams.userId, caller.id), ilike(revenueStreams.title, like))).limit(10),
    db.select({ id: canonicalAssets.id, name: canonicalAssets.canonicalName, classKey: canonicalAssets.classKey, businessId: canonicalAssets.businessId, externalUrl: canonicalAssets.externalUrl })
      .from(canonicalAssets).where(and(eq(canonicalAssets.userId, caller.id), or(ilike(canonicalAssets.canonicalName, like), ilike(canonicalAssets.externalUrl, like)))).limit(10),
  ]);
  res.json({ businesses, streams, assets });
});

// ─── Business Type Registry ──────────────────────────────────────────────────

router.get("/empire/business-types", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  res.json({ types: await listBusinessTypes(caller.id), streamTypes: STREAM_TYPES, assetClasses: ASSET_CLASS_LABELS });
});

const CustomTypeBody = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  category: z.string().trim().min(1).max(40).optional(),
  streamTypes: z.array(z.enum(STREAM_TYPES)).max(10).optional(),
  assetClasses: z.array(z.string().trim().min(1).max(40)).max(15).optional(),
});

router.post("/empire/business-types", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const body = CustomTypeBody.safeParse(req.body);
  if (!body.success) return bad(res, zerr(body.error));
  const key = slugifyKey(body.data.name);
  if (!key) return bad(res, "name must contain letters or numbers");
  if (BUILTIN_BUSINESS_TYPES.some((b) => b.key === key)) return bad(res, "A built-in type already uses that name", 409);
  const [row] = await db.insert(customBusinessTypesTable).values({
    ownerId: caller.id, key, name: body.data.name, description: body.data.description ?? null, category: body.data.category ?? "custom",
    streamTypes: body.data.streamTypes ?? [], assetClasses: body.data.assetClasses ?? [],
  }).onConflictDoNothing().returning();
  if (!row) return bad(res, "You already have a type with that name", 409);
  res.status(201).json(serialize(row));
});

router.delete("/empire/business-types/:key", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const key = String(req.params["key"]);
  const [inUse] = await db.select({ id: businessesTable.id }).from(businessesTable)
    .where(and(eq(businessesTable.ownerId, caller.id), eq(businessesTable.typeKey, key))).limit(1);
  if (inUse) return bad(res, "A business still uses this type", 409);
  const deleted = await db.delete(customBusinessTypesTable)
    .where(and(eq(customBusinessTypesTable.ownerId, caller.id), eq(customBusinessTypesTable.key, key))).returning({ id: customBusinessTypesTable.id });
  if (!deleted.length) return bad(res, "Not found", 404);
  res.status(204).end();
});

// ─── Businesses ──────────────────────────────────────────────────────────────

const CreateBody = z.object({
  name: z.string().trim().min(1).max(120),
  typeKey: z.string().trim().min(1).max(60),
  websiteUrl: z.string().trim().url().max(500).optional(),
  notes: z.string().max(5000).optional(),
  createDefaultStreams: z.boolean().optional(),
});

router.post("/empire/businesses", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const body = CreateBody.safeParse(req.body);
  if (!body.success) return bad(res, zerr(body.error));
  const result = await createEmpireBusiness(caller.id, body.data);
  if ("error" in result) return bad(res, result.error ?? "Invalid request");
  res.status(201).json(serialize(result));
});

router.patch("/empire/businesses/:id/type", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const id = idParam(req);
  const typeKey = typeof req.body?.typeKey === "string" ? req.body.typeKey : "";
  if (!id || !typeKey) return bad(res, "id and typeKey are required");
  const type = await resolveBusinessType(caller.id, typeKey);
  if (!type) return bad(res, "Unknown business type");
  const [row] = await db.update(businessesTable).set({ typeKey: type.key, businessType: type.baseType })
    .where(and(eq(businessesTable.id, id), eq(businessesTable.ownerId, caller.id)))
    .returning({ id: businessesTable.id, typeKey: businessesTable.typeKey, businessType: businessesTable.businessType });
  if (!row) return bad(res, "Not found", 404);
  res.json(row);
});

// ─── Income streams ──────────────────────────────────────────────────────────

const StreamBody = z.object({
  businessId: z.number().int().positive(),
  title: z.string().trim().min(1).max(160),
  streamType: z.enum(STREAM_TYPES),
  status: z.enum(["active", "projected", "inactive", "archived"]).optional(),
  estimatedMonthlyRevenue: z.number().min(0).max(1e9).nullable().optional(),
  notes: z.string().max(2000).optional(),
});

router.get("/empire/streams", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const businessId = req.query["businessId"] ? Number(req.query["businessId"]) : null;
  const rows = await db.select({
    id: revenueStreams.id, businessId: revenueStreams.businessId, title: revenueStreams.title, streamType: revenueStreams.streamType,
    status: revenueStreams.status, estimatedMonthlyRevenue: revenueStreams.estimatedMonthlyRevenue, metadata: revenueStreams.metadata,
    createdAt: revenueStreams.createdAt, businessName: businessesTable.name,
  }).from(revenueStreams)
    .leftJoin(businessesTable, eq(businessesTable.id, revenueStreams.businessId))
    .where(and(eq(revenueStreams.userId, caller.id), businessId ? eq(revenueStreams.businessId, businessId) : undefined))
    .orderBy(desc(revenueStreams.createdAt));
  res.json(serialize(rows));
});

router.post("/empire/streams", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const body = StreamBody.safeParse(req.body);
  if (!body.success) return bad(res, zerr(body.error));
  const row = await createIncomeStream(caller.id, body.data);
  if (!row) return bad(res, "Business not found", 404);
  res.status(201).json(serialize(row));
});

router.patch("/empire/streams/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const id = idParam(req);
  const body = StreamBody.partial().safeParse(req.body);
  if (!id) return bad(res, "Invalid id");
  if (!body.success) return bad(res, zerr(body.error));
  if (body.data.businessId && !(await ownedBusinessIds(caller.id, [body.data.businessId])).has(body.data.businessId)) return bad(res, "Business not found", 404);
  const { notes, ...rest } = body.data;
  const [row] = await db.update(revenueStreams).set({
    ...rest, updatedAt: new Date(),
    ...(notes !== undefined ? { metadata: sql`coalesce(${revenueStreams.metadata}, '{}'::jsonb) || ${JSON.stringify({ notes })}::jsonb` } : {}),
  }).where(and(eq(revenueStreams.id, id), eq(revenueStreams.userId, caller.id))).returning();
  if (!row) return bad(res, "Not found", 404);
  res.json(serialize(row));
});

router.delete("/empire/streams/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const id = idParam(req);
  if (!id) return bad(res, "Invalid id");
  const rows = await db.delete(revenueStreams).where(and(eq(revenueStreams.id, id), eq(revenueStreams.userId, caller.id))).returning({ id: revenueStreams.id });
  if (!rows.length) return bad(res, "Not found", 404);
  res.status(204).end();
});

// ─── Asset vault ─────────────────────────────────────────────────────────────

router.get("/empire/assets", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  await syncUserAssets(caller.id);
  const businessId = req.query["businessId"] ? Number(req.query["businessId"]) : null;
  const classKey = typeof req.query["classKey"] === "string" && req.query["classKey"] ? req.query["classKey"] : null;
  const rows = await db.select({
    id: canonicalAssets.id, businessId: canonicalAssets.businessId, classKey: canonicalAssets.classKey, name: canonicalAssets.canonicalName,
    description: canonicalAssets.description, status: canonicalAssets.status, externalUrl: canonicalAssets.externalUrl,
    builderSource: canonicalAssets.builderSource, builderObjectId: canonicalAssets.builderObjectId,
    createdAt: canonicalAssets.createdAt, updatedAt: canonicalAssets.updatedAt, businessName: businessesTable.name,
    sharedWith: sql<number[]>`coalesce((select array_agg(s.business_id) from asset_business_shares s where s.asset_id = ${canonicalAssets.id}), '{}')`,
  }).from(canonicalAssets)
    .leftJoin(businessesTable, eq(businessesTable.id, canonicalAssets.businessId))
    .where(and(
      eq(canonicalAssets.userId, caller.id),
      sql`${canonicalAssets.status} <> 'deleted'`,
      businessId ? or(eq(canonicalAssets.businessId, businessId), sql`exists (select 1 from asset_business_shares s where s.asset_id = ${canonicalAssets.id} and s.business_id = ${businessId})`) : undefined,
      classKey ? eq(canonicalAssets.classKey, classKey) : undefined,
    ))
    .orderBy(desc(canonicalAssets.updatedAt))
    .limit(500);
  res.json(serialize(rows));
});

const AssetBody = z.object({
  name: z.string().trim().min(1).max(200),
  classKey: z.string().trim().min(1).max(40),
  businessId: z.number().int().positive().nullable().optional(),
  externalUrl: z.string().trim().url().max(1000).optional(),
  description: z.string().max(2000).optional(),
});

router.post("/empire/assets", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const body = AssetBody.safeParse(req.body);
  if (!body.success) return bad(res, zerr(body.error));
  if (body.data.businessId && !(await ownedBusinessIds(caller.id, [body.data.businessId])).has(body.data.businessId)) return bad(res, "Business not found", 404);
  const objectId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const assetId = await registerAsset({ userId: caller.id, ...body.data, builderSource: "manual", builderObjectId: objectId });
  const [row] = await db.select().from(canonicalAssets).where(eq(canonicalAssets.id, assetId));
  res.status(201).json(serialize(row));
});

router.patch("/empire/assets/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const id = idParam(req);
  const body = z.object({
    businessId: z.number().int().positive().nullable().optional(),
    name: z.string().trim().min(1).max(200).optional(),
    status: z.enum(["active", "draft", "archived"]).optional(),
  }).safeParse(req.body);
  if (!id) return bad(res, "Invalid id");
  if (!body.success) return bad(res, zerr(body.error));
  if (body.data.businessId && !(await ownedBusinessIds(caller.id, [body.data.businessId])).has(body.data.businessId)) return bad(res, "Business not found", 404);
  const { name, ...rest } = body.data;
  const [row] = await db.update(canonicalAssets).set({
    ...rest, ...(name ? { canonicalName: name } : {}), updatedAt: new Date(),
    tags: sql`case when ${canonicalAssets.tags} @> ${JSON.stringify([OWNER_EDITED_TAG])}::jsonb then ${canonicalAssets.tags} else ${canonicalAssets.tags} || ${JSON.stringify([OWNER_EDITED_TAG])}::jsonb end`,
  })
    .where(and(eq(canonicalAssets.id, id), eq(canonicalAssets.userId, caller.id))).returning();
  if (!row) return bad(res, "Not found", 404);
  res.json(serialize(row));
});

router.post("/empire/assets/:id/shares", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const id = idParam(req);
  const businessId = Number(req.body?.businessId);
  if (!id || !Number.isInteger(businessId)) return bad(res, "id and businessId are required");
  const [asset] = await db.select({ id: canonicalAssets.id, businessId: canonicalAssets.businessId }).from(canonicalAssets)
    .where(and(eq(canonicalAssets.id, id), eq(canonicalAssets.userId, caller.id)));
  if (!asset || !(await ownedBusinessIds(caller.id, [businessId])).has(businessId)) return bad(res, "Not found", 404);
  if (asset.businessId === businessId) return bad(res, "The asset already belongs to that business");
  await db.insert(assetBusinessSharesTable).values({ ownerId: caller.id, assetId: id, businessId }).onConflictDoNothing();
  res.status(201).json({ assetId: id, businessId });
});

router.delete("/empire/assets/:id/shares/:businessId", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const id = idParam(req);
  const businessId = Number(req.params["businessId"]);
  if (!id || !Number.isInteger(businessId)) return bad(res, "Invalid id");
  await db.delete(assetBusinessSharesTable).where(and(
    eq(assetBusinessSharesTable.ownerId, caller.id), eq(assetBusinessSharesTable.assetId, id), eq(assetBusinessSharesTable.businessId, businessId)));
  res.status(204).end();
});

export default router;
