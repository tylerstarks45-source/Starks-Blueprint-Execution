import { db } from "@workspace/db";
import { processRegistry, processSnapshots, processTemplates } from "@workspace/db/schema";
import { sql } from "drizzle-orm";
import type { UBPESummary } from "./types.js";

export async function buildUBPESummary(userId?: number): Promise<UBPESummary> {
  try {
    const whereClause = userId ? sql`WHERE user_id = ${userId}` : sql`WHERE 1=1`;

    const totals = await db.execute(sql`
      SELECT COUNT(*) AS total,
             COUNT(CASE WHEN status = 'active'    THEN 1 END) AS active,
             COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed,
             COUNT(CASE WHEN blocked_stages > 0   THEN 1 END) AS blocked,
             COUNT(CASE WHEN sla_status = 'breached' THEN 1 END) AS sla_breached,
             AVG(COALESCE(health_score, 0))       AS avg_health,
             AVG(COALESCE(completion_percent, 0)) AS avg_completion
        FROM process_registry
        ${whereClause}
    `);
    const r = ((totals as any).rows ?? [])[0] ?? {};

    const domainResult = await db.execute(sql`
      SELECT process_domain, COUNT(*) AS cnt
        FROM process_registry
        ${whereClause}
       GROUP BY process_domain
    `);
    const domainBreakdown: Record<string, number> = {};
    for (const row of (domainResult as any).rows ?? []) {
      if (row.process_domain) domainBreakdown[row.process_domain] = Number(row.cnt);
    }

    const statusResult = await db.execute(sql`
      SELECT status, COUNT(*) AS cnt
        FROM process_registry
        ${whereClause}
       GROUP BY status
    `);
    const statusBreakdown: Record<string, number> = {};
    for (const row of (statusResult as any).rows ?? []) {
      if (row.status) statusBreakdown[row.status] = Number(row.cnt);
    }

    const pendingApprovals = await db.execute(sql`
      SELECT COUNT(*) AS cnt FROM process_rules
       WHERE rule_type = 'approval_gate' AND is_active = true
    `);

    const templateCount = await db.execute(sql`SELECT COUNT(*) AS cnt FROM process_templates`);

    return {
      totalProcesses:     Number(r.total ?? 0),
      activeProcesses:    Number(r.active ?? 0),
      completedProcesses: Number(r.completed ?? 0),
      blockedProcesses:   Number(r.blocked ?? 0),
      slaBreachedCount:   Number(r.sla_breached ?? 0),
      pendingApprovals:   Number(((pendingApprovals as any).rows ?? [])[0]?.cnt ?? 0),
      totalTemplates:     Number(((templateCount as any).rows ?? [])[0]?.cnt ?? 0),
      averageHealthScore: Number(r.avg_health ?? 0),
      averageCompletion:  Number(r.avg_completion ?? 0),
      domainBreakdown,
      statusBreakdown,
      computedAt:         new Date().toISOString(),
    };
  } catch {
    return {
      totalProcesses: 0, activeProcesses: 0, completedProcesses: 0, blockedProcesses: 0,
      slaBreachedCount: 0, pendingApprovals: 0, totalTemplates: 0, averageHealthScore: 0,
      averageCompletion: 0, domainBreakdown: {}, statusBreakdown: {}, computedAt: new Date().toISOString(),
    };
  }
}

export async function captureUBPESnapshot(userId?: number) {
  const s = await buildUBPESummary(userId);
  const rows = (await db.insert(processSnapshots).values({
    totalProcesses:      s.totalProcesses,
    activeProcesses:     s.activeProcesses,
    completedProcesses:  s.completedProcesses,
    blockedProcesses:    s.blockedProcesses,
    slaBreachedCount:    s.slaBreachedCount,
    pendingApprovals:    s.pendingApprovals,
    totalTemplates:      s.totalTemplates,
    domainBreakdown:     s.domainBreakdown,
    statusBreakdown:     s.statusBreakdown,
    averageHealthScore:  s.averageHealthScore,
    averageCompletion:   s.averageCompletion,
    lawApplied:          true,
    snapshotData:        { computedAt: s.computedAt },
  }).returning()) as any[];
  return rows[0];
}

export async function runUBPEMaintenance(userId?: number): Promise<void> {
  await captureUBPESnapshot(userId);
}
