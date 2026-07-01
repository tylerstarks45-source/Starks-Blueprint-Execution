import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { serialize } from "../lib/serialize";
import { db, systemInstancesTable, businessesTable, businessOperationsSettingsTable, DEFAULT_OPERATIONS_PERMISSIONS } from "@workspace/db";
import { getActiveCallerPayload } from "../lib/auth";
import {
  computeSystemHealth,
  computeBusinessHealth,
  getLatestSystemHealth,
  getSystemHealthHistory,
  getLatestBusinessHealth,
  getBusinessHealthHistory,
} from "../lib/health-monitor";
import { attemptSelfHeal } from "../lib/self-healing";
import { loadCredentials } from "../lib/runtime/worker";
import {
  GetSystemMonitoringParams,
  RecomputeSystemMonitoringParams,
  GetBusinessMonitoringParams,
  RecomputeBusinessMonitoringParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function findOwnedSystemInstance(id: number, ownerId: number) {
  const [instance] = await db
    .select()
    .from(systemInstancesTable)
    .where(and(eq(systemInstancesTable.id, id), eq(systemInstancesTable.userId, ownerId)));
  return instance ?? null;
}

async function findOwnedBusiness(id: number, ownerId: number) {
  const [business] = await db
    .select()
    .from(businessesTable)
    .where(and(eq(businessesTable.id, id), eq(businessesTable.ownerId, ownerId)));
  return business ?? null;
}

async function canAutoFixForSystemInstance(systemInstanceId: number): Promise<boolean> {
  const [business] = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(eq(businessesTable.systemInstanceId, systemInstanceId))
    .limit(1);
  if (!business) return false;

  const [settings] = await db
    .select()
    .from(businessOperationsSettingsTable)
    .where(eq(businessOperationsSettingsTable.businessId, business.id))
    .limit(1);
  if (!settings || !settings.enabled) return DEFAULT_OPERATIONS_PERMISSIONS.autoFixLowRisk === true;
  return (settings.permissions as typeof DEFAULT_OPERATIONS_PERMISSIONS).autoFixLowRisk === true;
}

// ─── GET /api/system-instances/:id/monitoring ────────────────────────────────

router.get("/system-instances/:id/monitoring", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = GetSystemMonitoringParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const instance = await findOwnedSystemInstance(params.data.id, caller.id);
  if (!instance) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [latest, history, canAutoFix] = await Promise.all([
    getLatestSystemHealth(instance.id),
    getSystemHealthHistory(instance.id),
    canAutoFixForSystemInstance(instance.id),
  ]);

  res.json(serialize({ latest, history, canAutoFix }));
});

// ─── POST /api/system-instances/:id/monitoring/recompute ────────────────────

router.post("/system-instances/:id/monitoring/recompute", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = RecomputeSystemMonitoringParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const instance = await findOwnedSystemInstance(params.data.id, caller.id);
  if (!instance) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const score = await computeSystemHealth(instance.id);
  const healResults = await attemptSelfHeal(instance.id, loadCredentials);

  res.json(
    serialize({
      overallScore: score.overallScore,
      status: score.status,
      selfHealActionsTaken: healResults.filter((r) => r.fixed).length,
    }),
  );
});

// ─── GET /api/businesses/:id/monitoring ──────────────────────────────────────

router.get("/businesses/:id/monitoring", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = GetBusinessMonitoringParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const business = await findOwnedBusiness(params.data.id, caller.id);
  if (!business) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [latest, history, canAutoFix] = await Promise.all([
    getLatestBusinessHealth(business.id),
    getBusinessHealthHistory(business.id),
    business.systemInstanceId ? canAutoFixForSystemInstance(business.systemInstanceId) : Promise.resolve(false),
  ]);

  res.json(serialize({ latest, history, canAutoFix }));
});

// ─── POST /api/businesses/:id/monitoring/recompute ───────────────────────────

router.post("/businesses/:id/monitoring/recompute", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = RecomputeBusinessMonitoringParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const business = await findOwnedBusiness(params.data.id, caller.id);
  if (!business) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const metric = await computeBusinessHealth(business.id);
  const healResults = business.systemInstanceId ? await attemptSelfHeal(business.systemInstanceId, loadCredentials) : [];

  res.json(
    serialize({
      overallScore: metric.overallScore,
      status: metric.status,
      selfHealActionsTaken: healResults.filter((r) => r.fixed).length,
    }),
  );
});

export default router;
