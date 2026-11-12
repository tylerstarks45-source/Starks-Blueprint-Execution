import { db, pool, systemActivityEventsTable, ashMissionsTable, type PendingApproval } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { getTool, checkToolArgs } from "./ash-agent/tools";

// ─── Autonomous action executor ───────────────────────────────────────────────
//
// ASH proposes higher-risk growth actions as pending_approvals rows (see
// lib/approvals.ts). Nothing is applied until the owner explicitly approves.
// When they do, this executor carries out the action described by the row's
// `payload.action`, records `executedAt`, and snapshots the prior state into
// `undoPayload` so the action can be reversed. Every action is also logged to
// the system activity feed so the user has a full audit trail.
//
// Actions are intentionally allow-listed here — an approval whose payload has no
// recognized `action` is treated as a decision-only record (e.g. an "investigate
// this failure" escalation) and simply left approved with no side effects.

export interface ExecutionResult {
  executed: boolean;
  reversible: boolean;
  detail: string;
  undoPayload?: Record<string, unknown> | null;
}

type ActionPayload = Record<string, unknown> & { action?: string };

const REVERSIBLE_ACTIONS = new Set(["promote_ab_variant"]);

export function isExecutableApproval(approval: Pick<PendingApproval, "payload">): boolean {
  const action = (approval.payload as ActionPayload | null)?.action;
  return typeof action === "string" && KNOWN_ACTIONS.has(action);
}

const KNOWN_ACTIONS = new Set(["promote_ab_variant", "ash_tool"]);

// ─── Execute an approved action ───────────────────────────────────────────────

export async function executeApprovedAction(approval: PendingApproval): Promise<ExecutionResult> {
  const payload = (approval.payload ?? {}) as ActionPayload;
  const action = typeof payload.action === "string" ? payload.action : null;

  if (!action || !KNOWN_ACTIONS.has(action)) {
    return { executed: false, reversible: false, detail: "No executable action on this approval." };
  }

  switch (action) {
    case "promote_ab_variant":
      return promoteAbVariant(approval, payload);
    case "ash_tool":
      return runApprovedAshTool(approval, payload);
    default:
      return { executed: false, reversible: false, detail: `Unknown action: ${action}` };
  }
}

// A server-side ASH tool call that the owner's ASH Control settings held back.
// The tool itself re-checks ownership of everything it touches.
async function runApprovedAshTool(approval: PendingApproval, payload: ActionPayload): Promise<ExecutionResult> {
  const tool = typeof payload["tool"] === "string" ? getTool(payload["tool"]) : undefined;
  if (!tool || tool.kind !== "server" || !tool.run) {
    return { executed: false, reversible: false, detail: "This ASH action can't be run automatically." };
  }
  const checked = checkToolArgs(tool.name, (payload["args"] ?? {}) as Record<string, unknown>);
  if (!checked.ok) return { executed: false, reversible: false, detail: checked.error };
  const missionId = Number(payload["missionId"]);
  if (Number.isInteger(missionId)) {
    const [m] = await db.select({ status: ashMissionsTable.status }).from(ashMissionsTable)
      .where(and(eq(ashMissionsTable.id, missionId), eq(ashMissionsTable.userId, approval.userId)));
    if (!m || m.status === "cancelled") return { executed: false, reversible: false, detail: "The mission behind this action was cancelled." };
  }
  const result = await tool.run(approval.userId, checked.args);
  if (result && typeof result === "object" && "error" in result) {
    return { executed: false, reversible: false, detail: String((result as { error: unknown }).error) };
  }
  return { executed: true, reversible: false, detail: JSON.stringify(result ?? null).slice(0, 500) };
}

async function promoteAbVariant(approval: PendingApproval, payload: ActionPayload): Promise<ExecutionResult> {
  const landingPageId = Number(payload["landingPageId"]);
  const winnerHtml = typeof payload["winnerHtml"] === "string" ? (payload["winnerHtml"] as string) : "";
  const systemInstanceId = payload["systemInstanceId"] != null ? Number(payload["systemInstanceId"]) : null;
  const winnerName = typeof payload["winnerName"] === "string" ? (payload["winnerName"] as string) : "the winning variant";

  if (!Number.isInteger(landingPageId) || winnerHtml.length < 1) {
    return { executed: false, reversible: false, detail: "Missing landing page id or winner HTML — nothing to promote." };
  }

  // Authorization: the landing page must belong to the approval's owner. This
  // guards against a stale/tampered payload pointing at another tenant's page
  // (the approve route only checks that the approval row itself belongs to the
  // caller, not that the referenced resource does).
  const current = await pool.query<{ html_content: string | null }>(
    `SELECT html_content FROM landing_pages WHERE id = $1 AND user_id = $2`,
    [landingPageId, approval.userId],
  );
  if (current.rowCount === 0) {
    return { executed: false, reversible: false, detail: "Landing page not found or not owned by this account." };
  }
  const previousHtml = current.rows[0]?.html_content ?? null;

  await pool.query(
    `UPDATE landing_pages SET html_content = $1 WHERE id = $2 AND user_id = $3`,
    [winnerHtml, landingPageId, approval.userId],
  );

  const undoPayload: Record<string, unknown> = { action: "promote_ab_variant", landingPageId, previousHtml };

  if (systemInstanceId != null) {
    await db.insert(systemActivityEventsTable).values({
      systemInstanceId,
      eventType: "action",
      description: `ASH published the A/B winner "${winnerName}" to your landing page (approved by you).`,
      metadata: JSON.stringify({ approvalId: approval.id, action: "promote_ab_variant", landingPageId, reversible: true }),
    });
  }

  return {
    executed: true,
    reversible: true,
    detail: `Promoted "${winnerName}" to landing page #${landingPageId}.`,
    undoPayload,
  };
}

// ─── Reverse a previously-executed action ─────────────────────────────────────

export async function revertApprovedAction(approval: PendingApproval): Promise<ExecutionResult> {
  const undo = (approval.undoPayload ?? null) as ActionPayload | null;
  const action = undo && typeof undo.action === "string" ? undo.action : null;

  if (!undo || !action || !REVERSIBLE_ACTIONS.has(action)) {
    return { executed: false, reversible: false, detail: "This action cannot be reversed." };
  }

  switch (action) {
    case "promote_ab_variant": {
      const landingPageId = Number(undo["landingPageId"]);
      const previousHtml = undo["previousHtml"];
      if (!Number.isInteger(landingPageId)) {
        return { executed: false, reversible: false, detail: "Missing landing page id for revert." };
      }
      // Same ownership guard as the forward action: only touch a page owned by
      // the approval's owner.
      const res = await pool.query(
        `UPDATE landing_pages SET html_content = $1 WHERE id = $2 AND user_id = $3`,
        [previousHtml ?? null, landingPageId, approval.userId],
      );
      if (res.rowCount === 0) {
        return { executed: false, reversible: false, detail: "Landing page not found or not owned by this account." };
      }
      return { executed: true, reversible: false, detail: `Restored landing page #${landingPageId} to its previous version.` };
    }
    default:
      return { executed: false, reversible: false, detail: `Cannot reverse action: ${action}` };
  }
}
