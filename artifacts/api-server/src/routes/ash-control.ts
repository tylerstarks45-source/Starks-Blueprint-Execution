import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, businessesTable, ashControlSettingsTable, ASH_CONTROL_LEVELS, ASH_ACTION_KINDS } from "@workspace/db";
import { getActiveCallerPayload } from "../lib/auth";
import { serialize } from "../lib/serialize";
import { DEFAULT_CONTROL, spendSummary, isLevel, isActionKind } from "../lib/ash-control/policy";
import { createMission, listMissions, getMission, ownerMissionAction, MAX_GOAL_CHARS } from "../lib/ash-missions";

const router: IRouter = Router();

const idParam = (req: Request) => {
  const n = Number(req.params["id"]);
  return Number.isInteger(n) && n > 0 ? n : null;
};
const bad = (res: Response, error: string, status = 400) => { res.status(status).json({ error }); };
const zerr = (e: z.ZodError) => e.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");

const MAX_LIMIT_CENTS = 100_000_000;
const SettingsBody = z.object({
  level: z.enum(ASH_CONTROL_LEVELS),
  dailySpendLimitCents: z.number().int().min(0).max(MAX_LIMIT_CENTS).default(0),
  monthlySpendLimitCents: z.number().int().min(0).max(MAX_LIMIT_CENTS).default(0),
  approvalRequired: z.array(z.enum(ASH_ACTION_KINDS)).max(ASH_ACTION_KINDS.length).default([]),
});

const view = (r: typeof ashControlSettingsTable.$inferSelect) => ({
  level: isLevel(r.level) ? r.level : DEFAULT_CONTROL.level,
  dailySpendLimitCents: r.dailySpendLimitCents,
  monthlySpendLimitCents: r.monthlySpendLimitCents,
  approvalRequired: (r.approvalRequired ?? []).filter(isActionKind),
  updatedAt: r.updatedAt,
});

// ─── ASH Control settings ────────────────────────────────────────────────────

router.get("/ash-control", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const [rows, businesses, spend] = await Promise.all([
    db.select().from(ashControlSettingsTable).where(eq(ashControlSettingsTable.userId, caller.id)),
    db.select({ id: businessesTable.id, name: businessesTable.name }).from(businessesTable).where(eq(businessesTable.ownerId, caller.id)),
    spendSummary(caller.id),
  ]);
  const account = rows.find((r) => r.businessId == null);
  res.json(serialize({
    account: account ? view(account) : { ...DEFAULT_CONTROL, updatedAt: null },
    isDefault: !account,
    businesses: businesses.map((b) => {
      const o = rows.find((r) => r.businessId === b.id);
      return { businessId: b.id, name: b.name, override: o ? view(o) : null };
    }),
    levels: ASH_CONTROL_LEVELS,
    actionKinds: ASH_ACTION_KINDS,
    spend,
  }));
});

router.put("/ash-control", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const body = SettingsBody.safeParse(req.body);
  if (!body.success) return bad(res, zerr(body.error));
  const values = { ...body.data, approvalRequired: [...new Set(body.data.approvalRequired)], updatedAt: new Date() };
  const [row] = await db.insert(ashControlSettingsTable).values({ userId: caller.id, businessId: null, ...values })
    .onConflictDoUpdate({ target: [ashControlSettingsTable.userId], targetWhere: isNull(ashControlSettingsTable.businessId), set: values })
    .returning();
  res.json(serialize(view(row!)));
});

router.put("/ash-control/businesses/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const id = idParam(req);
  if (!id) return bad(res, "Invalid business id");
  const [biz] = await db.select({ id: businessesTable.id }).from(businessesTable)
    .where(and(eq(businessesTable.id, id), eq(businessesTable.ownerId, caller.id)));
  if (!biz) return bad(res, "Not found", 404);
  const body = SettingsBody.safeParse(req.body);
  if (!body.success) return bad(res, zerr(body.error));
  const values = { ...body.data, approvalRequired: [...new Set(body.data.approvalRequired)], updatedAt: new Date() };
  const [row] = await db.insert(ashControlSettingsTable).values({ userId: caller.id, businessId: id, ...values })
    .onConflictDoUpdate({
      target: [ashControlSettingsTable.userId, ashControlSettingsTable.businessId],
      targetWhere: sql`${ashControlSettingsTable.businessId} is not null`,
      set: values,
    })
    .returning();
  res.json(serialize(view(row!)));
});

router.delete("/ash-control/businesses/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const id = idParam(req);
  if (!id) return bad(res, "Invalid business id");
  await db.delete(ashControlSettingsTable)
    .where(and(eq(ashControlSettingsTable.userId, caller.id), eq(ashControlSettingsTable.businessId, id)));
  res.status(204).end();
});

// ─── Missions ────────────────────────────────────────────────────────────────

router.get("/missions", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  res.json(serialize(await listMissions(caller.id)));
});

router.post("/missions", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const body = z.object({ goal: z.string().min(3).max(MAX_GOAL_CHARS), businessId: z.number().int().positive().nullish() }).safeParse(req.body);
  if (!body.success) return bad(res, zerr(body.error));
  const r = await createMission(caller.id, body.data);
  if ("error" in r) return bad(res, r.error, r.error === "Business not found" ? 404 : 400);
  res.status(201).json(serialize(r.mission));
});

router.get("/missions/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const id = idParam(req);
  if (!id) return bad(res, "Invalid mission id");
  const m = await getMission(caller.id, id);
  if (!m) return bad(res, "Not found", 404);
  res.json(serialize(m));
});

router.post("/missions/:id/:action", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const id = idParam(req);
  const action = req.params["action"];
  if (!id) return bad(res, "Invalid mission id");
  if (action !== "pause" && action !== "resume" && action !== "cancel") return bad(res, "Unknown action", 404);
  const note = typeof req.body?.note === "string" ? req.body.note : undefined;
  const r = await ownerMissionAction(caller.id, id, action, note);
  if ("error" in r) return bad(res, r.error, r.status);
  res.json(serialize(r.mission));
});

export default router;
