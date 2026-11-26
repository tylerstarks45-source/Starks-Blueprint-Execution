import { businessesTable, db, systemInstancesTable, userCredentialsTable } from "@workspace/db";
import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { createPendingApproval } from "./approvals";
import { decide, toolActionKind, type Decision } from "./ash-control/policy";
import type { ExecResult } from "./connectors/base";
import { getConnector } from "./connectors/registry";
import { decrypt } from "./crypto";

export type ConnectorScope = {
  userId: number;
  systemInstanceId: number | null;
  businessId: number | null;
  workspaceId: number | null;
  businessActive: boolean;
};

type ConnectorActionResult = ExecResult & {
  connectorId: string;
  connectorName: string;
  action: string;
  latencyMs: number;
  status?: "not_allowed" | "awaiting_approval";
  approvalId?: number;
};

export async function connectorScope(userId: number, systemInstanceId: number | null): Promise<ConnectorScope | null> {
  if (systemInstanceId === null) {
    return { userId, systemInstanceId, businessId: null, workspaceId: null, businessActive: true };
  }
  const [system] = await db.select({ workspaceId: systemInstancesTable.clientWorkspaceId })
    .from(systemInstancesTable)
    .where(and(eq(systemInstancesTable.id, systemInstanceId), eq(systemInstancesTable.userId, userId)));
  if (!system) return null;
  const businesses = await db.select({ id: businessesTable.id, status: businessesTable.status })
    .from(businessesTable)
    .where(and(eq(businessesTable.systemInstanceId, systemInstanceId), eq(businessesTable.ownerId, userId)))
    .limit(2);
  // A system linked to multiple businesses has no unambiguous owner policy.
  if (businesses.length > 1) return null;
  const [business] = businesses;
  return {
    userId, systemInstanceId, workspaceId: system.workspaceId, businessId: business?.id ?? null,
    businessActive: !business || business.status === "active",
  };
}

export function decideConnectorAction(scope: ConnectorScope): Promise<Decision> {
  if (!scope.businessActive) return Promise.resolve({ decision: "block", reason: "The linked business is paused or archived." });
  return decide({ userId: scope.userId, businessId: scope.businessId, kind: toolActionKind("connector_action"), interactive: true });
}

export async function loadConnectorCredentials(scope: ConnectorScope, keys?: string[]): Promise<Record<string, string>> {
  const shared = isNull(userCredentialsTable.systemInstanceId);
  const rows = await db.select({
    credentialKey: userCredentialsTable.credentialKey,
    encryptedValue: userCredentialsTable.encryptedValue,
    status: userCredentialsTable.status,
    expiresAt: userCredentialsTable.expiresAt,
  }).from(userCredentialsTable).where(and(
    eq(userCredentialsTable.userId, scope.userId),
    scope.workspaceId === null
      ? isNull(userCredentialsTable.clientWorkspaceId)
      : eq(userCredentialsTable.clientWorkspaceId, scope.workspaceId),
    scope.systemInstanceId === null ? shared : or(shared, eq(userCredentialsTable.systemInstanceId, scope.systemInstanceId)),
    keys === undefined ? undefined : inArray(userCredentialsTable.credentialKey, keys),
  )).orderBy(sql`${userCredentialsTable.systemInstanceId} asc nulls first`, asc(userCredentialsTable.id));

  const creds: Record<string, string> = Object.create(null);
  const now = new Date();
  // A saved system key overrides a shared key even when the system key was disconnected.
  for (const row of rows) {
    delete creds[row.credentialKey];
    if (row.status !== "connected" || (row.expiresAt && row.expiresAt <= now)) continue;
    try { creds[row.credentialKey] = decrypt(row.encryptedValue); } catch { /* treat malformed credentials as missing */ }
  }
  return creds;
}

export async function runConnectorAction(scope: ConnectorScope, connectorId: string, action: string, params: Record<string, unknown>, approved = false): Promise<ConnectorActionResult> {
  const metadata = getConnector(connectorId)?.describe();
  const base = { connectorId, connectorName: metadata?.displayName ?? connectorId, action, latencyMs: 0 };
  if (!metadata?.available || !metadata.actions.includes(action) || metadata.actionMeta[action] !== "automated") {
    return { ...base, ok: false, error: "This service action is unavailable for automated execution." };
  }
  const control = await decideConnectorAction(scope);
  if (control.decision === "block") return { ...base, ok: false, status: "not_allowed", error: control.reason };
  if (control.decision === "approve" && !approved) {
    const approval = await createPendingApproval({
      businessId: scope.businessId,
      userId: scope.userId,
      category: "ashAction",
      riskLevel: "low",
      title: `Run ${action} on ${metadata.displayName}`,
      description: control.reason,
      payload: {
        action: "run_connector_action", connectorId, connectorAction: action, params,
        systemInstanceId: scope.systemInstanceId, workspaceId: scope.workspaceId,
      },
    });
    return { ...base, ok: false, status: "awaiting_approval", approvalId: approval!.id, error: `Waiting for your approval in the Approvals inbox. ${control.reason}` };
  }
  const connector = getConnector(connectorId, await loadConnectorCredentials(scope))!;
  if (!connector.validateCredentials()) {
    return { ...base, ok: false, error: `${connector.displayName} is missing credentials. Check Connections.` };
  }
  const started = Date.now();
  try {
    const result = await connector.execute(action, params);
    return { ...base, ...result, latencyMs: Date.now() - started };
  } catch {
    return { ...base, ok: false, latencyMs: Date.now() - started, error: `${connector.displayName} could not complete the action.` };
  }
}
