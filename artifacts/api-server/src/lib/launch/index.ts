// Launch tools: the fixed set of connector actions ASH may run server-side (also inside background
// missions) to put things live on outside sites with the owner's own connected accounts. Each action
// carries its ASH Control kind, so publishing and customer emails follow the owner's approval rules.
import { and, eq, isNull } from "drizzle-orm";
import { db, userCredentialsTable } from "@workspace/db";
import { decrypt } from "../crypto";
import { getConnector } from "../connectors/registry";
import { CATALOG_CONNECTOR_MAP } from "../connectors/catalog-map";
import { registerAsset } from "../empire/assets";
import { ownedBusinessIds } from "../empire/assets";
import type { ToolActionKind } from "../ash-control/policy";

interface LaunchDef { kind: ToolActionKind; asset: string; label: string; params: string }
export const LAUNCH_ACTIONS: Record<string, LaunchDef> = {
  "wordpress:createPage": { kind: "publish", asset: "page", label: "Website page (WordPress)", params: "title, content (HTML), status: draft|publish" },
  "wordpress:createPost": { kind: "publish", asset: "page", label: "Blog post (WordPress)", params: "title, content (HTML), excerpt, status: draft|publish" },
  "shopify:createProduct": { kind: "publish", asset: "product", label: "Store product (Shopify)", params: "title, description, price, sku, vendor, type" },
  "shopify:createCollection": { kind: "publish", asset: "product", label: "Store collection (Shopify)", params: "title, description, published" },
  "beehiiv:createPost": { kind: "publish", asset: "campaign", label: "Newsletter post (Beehiiv)", params: "title, subtitle, contentJson" },
  "beehiiv:sendPost": { kind: "email_customers", asset: "campaign", label: "Send newsletter (Beehiiv)", params: "postId" },
  "mailchimp:sendCampaign": { kind: "email_customers", asset: "campaign", label: "Email campaign (Mailchimp)", params: "listId, subject, fromName, replyTo, html, sendNow" },
  "twitter:postTweet": { kind: "publish", asset: "campaign", label: "Post on X / Twitter", params: "text" },
  "linkedin:createPost": { kind: "publish", asset: "campaign", label: "Post on LinkedIn", params: "text" },
  "cloudflare:deploySite": { kind: "publish", asset: "website", label: "Deploy a site (Cloudflare Workers)", params: "name, script" },
};
export const LAUNCH_CONNECTORS = [...new Set(Object.keys(LAUNCH_ACTIONS).map((k) => k.split(":")[0]!))];
const MAX_PARAMS_CHARS = 100_000;

export function launchActionKind(args: Record<string, unknown>): ToolActionKind {
  return LAUNCH_ACTIONS[`${String(args["connectorId"])}:${String(args["action"])}`]?.kind ?? "publish";
}

/** The owner's own (account-level) credentials for one connector, renamed to what the connector reads. */
async function connectorCredentials(userId: number, connectorId: string): Promise<Record<string, string>> {
  const prefix = `${connectorId.toUpperCase()}_`;
  const rows = await db.select({ key: userCredentialsTable.credentialKey, v: userCredentialsTable.encryptedValue }).from(userCredentialsTable)
    .where(and(eq(userCredentialsTable.userId, userId), isNull(userCredentialsTable.systemInstanceId), isNull(userCredentialsTable.clientWorkspaceId),
      eq(userCredentialsTable.status, "connected")));
  const creds: Record<string, string> = {};
  for (const r of rows) {
    const m = CATALOG_CONNECTOR_MAP[r.key];
    if (!(m?.connectorId === connectorId || r.key.startsWith(prefix))) continue;
    try { creds[m?.keyMap?.[r.key] ?? r.key] = decrypt(r.v); } catch { /* unreadable row: the connector reports it missing */ }
  }
  return creds;
}

/** Each launch action and whether the owner has connected what it needs. */
export async function launchOptions(userId: number) {
  const ready = new Map<string, boolean>();
  await Promise.all(LAUNCH_CONNECTORS.map(async (id) => {
    ready.set(id, getConnector(id, await connectorCredentials(userId, id))?.validateCredentials() ?? false);
  }));
  return Object.entries(LAUNCH_ACTIONS).map(([key, d]) => {
    const [connectorId, action] = key.split(":") as [string, string];
    const c = getConnector(connectorId, {});
    return { connectorId, action, label: d.label, kind: d.kind, params: d.params, connector: c?.displayName ?? connectorId,
      ready: (ready.get(connectorId) ?? false) && c?.describe().actionMeta[action] === "automated" };
  });
}

const urlIn = (data: unknown): string | null => {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const u = [d["url"], d["link"], d["permalink"], d["web_url"]].find((x) => typeof x === "string" && /^https:\/\//.test(x));
  return (u as string | undefined)?.slice(0, 1000) ?? null;
};

export async function runLaunchAction(userId: number, a: { connectorId: string; action: string; params?: Record<string, unknown>; businessId?: number | null; assetName?: string | null }) {
  const key = `${a.connectorId}:${a.action}`;
  const def = LAUNCH_ACTIONS[key];
  if (!def) return { error: `Not a launch action. Use one of: ${Object.keys(LAUNCH_ACTIONS).join(", ")}` };
  const businessId = a.businessId ?? null;
  if (businessId != null && !(await ownedBusinessIds(userId, [businessId])).has(businessId)) return { error: "Business not found" };
  const params = a.params ?? {};
  if (JSON.stringify(params).length > MAX_PARAMS_CHARS) return { error: "The content is too large to send in one action." };
  const connector = getConnector(a.connectorId, await connectorCredentials(userId, a.connectorId));
  if (!connector || connector.describe().actionMeta[a.action] !== "automated") return { error: `${def.label} isn't available to run automatically.` };
  if (!connector.validateCredentials()) {
    return { error: `Connect ${connector.displayName} in Connections first (needs ${connector.requiredCredentials.join(", ")}).`, needsConnection: a.connectorId };
  }
  const r = await connector.execute(a.action, params);
  if (!r.ok) return { error: `${connector.displayName}: ${r.error ?? "the action failed"}`.slice(0, 500) };
  const url = urlIn(r.data);
  const title = typeof params["title"] === "string" ? params["title"] : typeof params["subject"] === "string" ? params["subject"] : null;
  const assetId = await registerAsset({
    userId, businessId, classKey: def.asset, name: (a.assetName || title || def.label).slice(0, 200),
    description: `${def.label} launched by ASH`, externalUrl: url, builderSource: "ash_launch",
    builderObjectId: `${key}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  });
  return { launched: true, what: def.label, url, assetId, result: JSON.stringify(r.data ?? null).slice(0, 1500) };
}
