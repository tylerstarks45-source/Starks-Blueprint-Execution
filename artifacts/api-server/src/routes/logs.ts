import { Router, type IRouter } from "express";
import { and, eq, desc, gte, lte, ilike, count, lt, or, inArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { serialize } from "../lib/serialize";
import {
  db,
  systemInstancesTable,
  businessesTable,
  systemLogsTable,
} from "@workspace/db";
import { getActiveCallerPayload } from "../lib/auth";
import { requireAdmin } from "../lib/auth";
import { findOwnedBusiness } from "../lib/governance/ownership";
import {
  GetSystemLogsParams,
  GetSystemLogsQueryParams,
  GetBusinessLogsParams,
  GetBusinessLogsQueryParams,
  GetAdminLogsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

// NOTE: findOwnedSystemInstance below is intentionally separate from the
// governed findOwnedBusiness import above — system instances are a distinct,
// ungoverned resource type (out of Phase A scope). Do not merge these.
async function findOwnedSystemInstance(id: number, ownerId: number) {
  const [instance] = await db
    .select()
    .from(systemInstancesTable)
    .where(and(eq(systemInstancesTable.id, id), eq(systemInstancesTable.userId, ownerId)));
  return instance ?? null;
}

interface LogFilters {
  category?: string;
  severity?: string;
  component?: string;
  action?: string;
  q?: string;
  from?: string;
  to?: string;
}

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildFilterConditions(f: LogFilters): SQL[] {
  const conditions: SQL[] = [];
  if (f.category) conditions.push(eq(systemLogsTable.category, f.category));
  if (f.severity) conditions.push(eq(systemLogsTable.severity, f.severity));
  if (f.component) conditions.push(eq(systemLogsTable.component, f.component));
  if (f.action) conditions.push(eq(systemLogsTable.action, f.action));
  if (f.q) conditions.push(ilike(systemLogsTable.message, `%${f.q}%`));
  const from = parseDate(f.from);
  if (from) conditions.push(gte(systemLogsTable.createdAt, from));
  const to = parseDate(f.to);
  if (to) conditions.push(lte(systemLogsTable.createdAt, to));
  return conditions;
}

function normalizePagination(page?: number, pageSize?: number) {
  const safePage = page && page > 0 ? Math.floor(page) : 1;
  const safeSize = pageSize && pageSize > 0 ? Math.min(Math.floor(pageSize), MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
  return { page: safePage, pageSize: safeSize, offset: (safePage - 1) * safeSize };
}

async function queryLogs(scope: SQL, filters: LogFilters, page?: number, pageSize?: number) {
  const { page: p, pageSize: ps, offset } = normalizePagination(page, pageSize);
  const where = and(scope, ...buildFilterConditions(filters));

  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(systemLogsTable)
      .where(where)
      .orderBy(desc(systemLogsTable.createdAt))
      .limit(ps)
      .offset(offset),
    db.select({ value: count() }).from(systemLogsTable).where(where),
  ]);

  return { logs: rows, total, page: p, pageSize: ps };
}

// ─── GET /api/system-instances/:id/logs ──────────────────────────────────────

router.get("/system-instances/:id/logs", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = GetSystemLogsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const query = GetSystemLogsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const instance = await findOwnedSystemInstance(params.data.id, caller.id);
  if (!instance) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const { page, pageSize, ...filters } = query.data;
  const result = await queryLogs(
    eq(systemLogsTable.systemInstanceId, instance.id),
    filters,
    page,
    pageSize,
  );

  res.json(serialize(result));
});

// ─── GET /api/businesses/:id/logs ────────────────────────────────────────────

router.get("/businesses/:id/logs", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = GetBusinessLogsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const query = GetBusinessLogsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const business = await findOwnedBusiness(params.data.id, caller.id);
  if (!business) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const { page, pageSize, ...filters } = query.data;
  const result = await queryLogs(
    eq(systemLogsTable.businessId, business.id),
    filters,
    page,
    pageSize,
  );

  res.json(serialize(result));
});

// ─── GET /api/logs/me (caller's own logs across all systems & businesses) ─────
// Returns a cursor-paginated list of system_logs rows scoped to the
// authenticated caller's systems and businesses. Supports optional filters:
// category, severity, and q (message search). Cursor = last seen row id.

router.get("/logs/me", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const LIMIT = 50;

  const rawCursor = req.query.cursor !== undefined ? Number(req.query.cursor) : null;
  const cursor = rawCursor != null && Number.isFinite(rawCursor) && rawCursor > 0 ? rawCursor : null;
  const category = typeof req.query.category === "string" && req.query.category ? req.query.category : null;
  const severity  = typeof req.query.severity  === "string" && req.query.severity  ? req.query.severity  : null;
  const q         = typeof req.query.q         === "string" && req.query.q         ? req.query.q         : null;

  // Collect system instance ids owned by this caller
  const ownedInstances = await db
    .select({ id: systemInstancesTable.id })
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.userId, caller.id));
  const instanceIds = ownedInstances.map((r) => r.id);

  // Collect business ids owned by this caller
  const ownedBusinesses = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, caller.id));
  const businessIds = ownedBusinesses.map((r) => r.id);

  // Scope: any log that belongs to the user directly, or to one of their systems/businesses
  const scopeConditions: SQL[] = [eq(systemLogsTable.userId, caller.id)];
  if (instanceIds.length > 0) scopeConditions.push(inArray(systemLogsTable.systemInstanceId, instanceIds));
  if (businessIds.length > 0) scopeConditions.push(inArray(systemLogsTable.businessId, businessIds));
  const scope = or(...scopeConditions)!;

  const filterConditions: SQL[] = [];
  if (category) filterConditions.push(eq(systemLogsTable.category, category));
  if (severity)  filterConditions.push(eq(systemLogsTable.severity, severity));
  if (q)         filterConditions.push(ilike(systemLogsTable.message, `%${q}%`));
  if (cursor)    filterConditions.push(lt(systemLogsTable.id, cursor));

  const where = filterConditions.length ? and(scope, ...filterConditions) : scope;

  const rows = await db
    .select({
      id: systemLogsTable.id,
      systemInstanceId: systemLogsTable.systemInstanceId,
      businessId: systemLogsTable.businessId,
      userId: systemLogsTable.userId,
      category: systemLogsTable.category,
      severity: systemLogsTable.severity,
      component: systemLogsTable.component,
      action: systemLogsTable.action,
      message: systemLogsTable.message,
      metadata: systemLogsTable.metadata,
      createdAt: systemLogsTable.createdAt,
      systemName: systemInstancesTable.name,
      businessName: businessesTable.name,
    })
    .from(systemLogsTable)
    .leftJoin(systemInstancesTable, eq(systemLogsTable.systemInstanceId, systemInstancesTable.id))
    .leftJoin(businessesTable, eq(systemLogsTable.businessId, businessesTable.id))
    .where(where)
    .orderBy(desc(systemLogsTable.createdAt), desc(systemLogsTable.id))
    .limit(LIMIT + 1);

  const hasMore = rows.length > LIMIT;
  const items = hasMore ? rows.slice(0, LIMIT) : rows;
  const nextCursor = hasMore ? items[items.length - 1]!.id : null;

  res.json(serialize({ items, nextCursor, hasMore }));
});

// ─── GET /api/admin/logs (platform-wide, admin only) ─────────────────────────

router.get("/admin/logs", async (req, res): Promise<void> => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const query = GetAdminLogsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { page, pageSize, userId, ...filters } = query.data;
  const { page: p, pageSize: ps, offset } = normalizePagination(page, pageSize);

  const conditions = buildFilterConditions(filters);
  if (userId != null) conditions.push(eq(systemLogsTable.userId, userId));
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(systemLogsTable)
      .where(where)
      .orderBy(desc(systemLogsTable.createdAt))
      .limit(ps)
      .offset(offset),
    db.select({ value: count() }).from(systemLogsTable).where(where),
  ]);

  res.json(serialize({ logs: rows, total, page: p, pageSize: ps }));
});

export default router;
