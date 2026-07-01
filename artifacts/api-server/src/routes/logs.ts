import { Router, type IRouter } from "express";
import { and, eq, desc, gte, lte, ilike, count } from "drizzle-orm";
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
