// Declarative custom API integrations. A definition names a host, an auth scheme that points at one of
// the owner's saved credentials, and a fixed list of actions (method + path template). Nothing else
// can be called: no arbitrary URLs, hosts or code. Lifecycle: draft -> tested (a read-only GET against
// the real API succeeded) -> approved (owner) -> usable by ASH. Any edit returns it to draft.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { z } from "zod";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db, customIntegrationsTable, userCredentialsTable, type CustomIntegration, type CustomIntegrationAction } from "@workspace/db";
import { decrypt } from "../crypto";
import { isBlockedUrl } from "../connectors/ssrf-guard";
import { slugifyKey } from "../empire/business-types";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const KINDS = ["connect_service", "publish", "email_customers", "spend", "delete", "build"] as const;
const name = (max: number) => z.string().trim().min(1).max(max);

export const IntegrationInput = z.object({
  name: name(80),
  description: z.string().max(1000).default(""),
  docsUrl: z.string().url().max(500).optional().nullable(),
  baseUrl: z.string().url().max(300).refine((u) => u.startsWith("https://") && !isBlockedUrl(u), "baseUrl must be a public https URL")
    .refine((u) => { const p = new URL(u); return !p.username && !p.password && !p.search && !p.hash; }, "baseUrl can't contain credentials, a query or a fragment"),
  auth: z.object({
    type: z.enum(["none", "bearer", "header", "query"]),
    name: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).optional(),
    credentialKey: z.string().regex(/^[A-Za-z0-9_]{2,80}$/).optional(),
  }).refine((a) => a.type === "none" || !!a.credentialKey, "credentialKey is required for this auth type")
    .refine((a) => !["header", "query"].includes(a.type) || !!a.name, "name is required for header/query auth"),
  actions: z.array(z.object({
    name: z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,47}$/),
    method: z.enum(METHODS),
    path: z.string().max(300).regex(/^\/[A-Za-z0-9._~\-/{}:@]*$/, "path must be a plain path starting with /").refine((p) => !p.includes("..") && !p.includes("//"), "path can't contain .. or //"),
    description: z.string().max(500).default(""),
    query: z.array(z.string().regex(/^[A-Za-z0-9_.-]{1,64}$/)).max(20).optional(),
    kind: z.enum(KINDS).optional(),
  })).min(1).max(25).refine((a) => new Set(a.map((x) => x.name)).size === a.length, "action names must be unique"),
  capabilities: z.array(z.string().max(60)).max(10).default([]),
});
export type IntegrationInputT = z.infer<typeof IntegrationInput>;

export const actionKind = (a: Pick<CustomIntegrationAction, "method" | "kind">) => a.kind ?? (a.method === "GET" ? "connect_service" : "publish");

export async function listIntegrations(userId: number) {
  return db.select().from(customIntegrationsTable).where(eq(customIntegrationsTable.userId, userId)).orderBy(asc(customIntegrationsTable.name));
}

export async function getIntegration(userId: number, idOrKey: number | string) {
  const [row] = await db.select().from(customIntegrationsTable).where(and(eq(customIntegrationsTable.userId, userId),
    typeof idOrKey === "number" ? eq(customIntegrationsTable.id, idOrKey) : eq(customIntegrationsTable.key, idOrKey)));
  return row ?? null;
}

/** Creates or replaces (by key) a definition. Any change sends it back to draft. */
export async function defineIntegration(userId: number, raw: unknown): Promise<{ integration: CustomIntegration } | { error: string }> {
  const parsed = IntegrationInput.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues.map((i) => `${i.path.join(".") || "definition"}: ${i.message}`).join("; ").slice(0, 600) };
  const d = parsed.data;
  const key = slugifyKey(d.name);
  if (!key) return { error: "name: needs letters or numbers" };
  const values = {
    name: d.name, description: d.description, docsUrl: d.docsUrl ?? null, baseUrl: d.baseUrl.replace(/\/+$/, ""),
    auth: d.auth, actions: d.actions, capabilities: [...new Set(d.capabilities.map(slugifyKey).filter(Boolean))],
    status: "draft", lastTest: null, approvedAt: null, updatedAt: new Date(),
  };
  const [row] = await db.insert(customIntegrationsTable).values({ userId, key, ...values })
    .onConflictDoUpdate({ target: [customIntegrationsTable.userId, customIntegrationsTable.key], set: values }).returning();
  return { integration: row! };
}

const PRIVATE_V4 = (ip: string) => {
  const [a, b] = ip.split(".").map(Number) as [number, number];
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
};
const PRIVATE_V6 = (ip: string) => {
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return PRIVATE_V4(v.slice(7));
  return v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith("ff");
};

/** Rejects hosts that resolve to private, loopback or link-local addresses (DNS rebinding included). */
async function assertPublicHost(host: string) {
  const addrs = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => (a.family === 4 ? PRIVATE_V4(a.address) : PRIVATE_V6(a.address)))) {
    throw new Error("Host resolves to a private address");
  }
}

async function credentialValue(userId: number, key: string): Promise<string | null> {
  const [row] = await db.select({ v: userCredentialsTable.encryptedValue }).from(userCredentialsTable).where(and(
    eq(userCredentialsTable.userId, userId), eq(userCredentialsTable.credentialKey, key),
    isNull(userCredentialsTable.systemInstanceId), isNull(userCredentialsTable.clientWorkspaceId)));
  return row ? decrypt(row.v) : null;
}

export interface CallResult { ok: boolean; status: number | null; data?: unknown; error?: string }

/** Performs one declared action. Params fill {placeholders}, declared query params, and `body` for writes. */
export async function callAction(userId: number, integ: CustomIntegration, actionName: string, params: Record<string, unknown> = {}): Promise<CallResult> {
  const action = integ.actions.find((a) => a.name === actionName);
  if (!action) return { ok: false, status: null, error: `Unknown action "${actionName}". Declared: ${integ.actions.map((a) => a.name).join(", ")}` };
  let missing: string | null = null;
  const path = action.path.replace(/\{([A-Za-z0-9_]+)\}/g, (_, k: string) => {
    const v = params[k];
    if (v == null || v === "") { missing = k; return ""; }
    return encodeURIComponent(String(v));
  });
  if (missing) return { ok: false, status: null, error: `Missing param "${missing}"` };
  const url = new URL(integ.baseUrl + path);
  const base = new URL(integ.baseUrl);
  if (url.origin !== base.origin) return { ok: false, status: null, error: "Action path leaves the integration's host" };
  for (const q of action.query ?? []) if (params[q] != null) url.searchParams.set(q, String(params[q]));
  const headers: Record<string, string> = { accept: "application/json" };
  if (integ.auth.type !== "none") {
    const secret = await credentialValue(userId, integ.auth.credentialKey!);
    if (!secret) return { ok: false, status: null, error: `Save the credential ${integ.auth.credentialKey} in Connections first` };
    if (integ.auth.type === "bearer") headers["authorization"] = `Bearer ${secret}`;
    else if (integ.auth.type === "header") headers[integ.auth.name!.toLowerCase()] = secret;
    else url.searchParams.set(integ.auth.name!, secret);
  }
  let body: string | undefined;
  if (action.method !== "GET" && params["body"] != null) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(params["body"]).slice(0, 100_000);
  }
  try {
    if (isBlockedUrl(url.toString())) throw new Error("Blocked address");
    await assertPublicHost(url.hostname);
    const res = await fetch(url, { method: action.method, headers, body, redirect: "manual", signal: AbortSignal.timeout(10_000) });
    if (res.status >= 300 && res.status < 400) return { ok: false, status: res.status, error: "The API redirected; redirects aren't followed" };
    const text = (await res.text()).slice(0, 20_000);
    let data: unknown = text;
    try { data = JSON.parse(text); } catch { /* keep text */ }
    return res.ok ? { ok: true, status: res.status, data } : { ok: false, status: res.status, data, error: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, status: null, error: err instanceof Error ? err.message : "Request failed" };
  }
}

/** Sandbox test: runs one read-only GET action against the real API. Success marks it tested. */
export async function testIntegration(userId: number, id: number, actionName?: string, params: Record<string, unknown> = {}) {
  const integ = await getIntegration(userId, id);
  if (!integ) return null;
  const reads = integ.actions.filter((a) => a.method === "GET");
  const action = actionName ? reads.find((a) => a.name === actionName) : reads[0];
  if (!action) return { integration: integ, result: { ok: false, status: null, error: "Testing only runs read-only GET actions. Add or pick one." } as CallResult };
  const result = await callAction(userId, integ, action.name, params);
  const lastTest = { ok: result.ok, action: action.name, status: result.status, detail: (result.error ?? JSON.stringify(result.data ?? "")).slice(0, 300), at: new Date().toISOString() };
  const [row] = await db.update(customIntegrationsTable)
    .set({ lastTest, ...(integ.status !== "approved" ? { status: result.ok ? "tested" : "draft" } : {}) })
    .where(and(eq(customIntegrationsTable.id, id), eq(customIntegrationsTable.userId, userId), eq(customIntegrationsTable.updatedAt, integ.updatedAt))).returning();
  return { integration: row ?? integ, result };
}

/** Owner approval; only a definition that passed its sandbox test can be approved. */
export async function setIntegrationStatus(userId: number, id: number, to: "approved" | "disabled") {
  const from = to === "approved" ? ["tested", "disabled"] : ["draft", "tested", "approved"];
  const integ = await getIntegration(userId, id);
  if (!integ) return { error: "Not found", status: 404 };
  if (!from.includes(integ.status) || (to === "approved" && !integ.lastTest?.ok)) {
    return { error: to === "approved" ? "Run a successful test before approving" : "Already disabled", status: 409 };
  }
  const [row] = await db.update(customIntegrationsTable).set({ status: to, approvedAt: to === "approved" ? new Date() : integ.approvedAt })
    .where(and(eq(customIntegrationsTable.id, id), eq(customIntegrationsTable.userId, userId), eq(customIntegrationsTable.updatedAt, integ.updatedAt))).returning();
  return row ? { integration: row } : { error: "It changed; reload and try again", status: 409 };
}

export async function deleteIntegration(userId: number, id: number) {
  const [row] = await db.delete(customIntegrationsTable).where(and(eq(customIntegrationsTable.id, id), eq(customIntegrationsTable.userId, userId))).returning();
  return row ?? null;
}

/** Runs an action on an approved integration (ASH tool and approvals). */
export async function runIntegrationAction(userId: number, key: string, actionName: string, params: Record<string, unknown>) {
  const integ = await getIntegration(userId, slugifyKey(key));
  if (!integ) return { error: `No custom integration "${key}"` };
  if (integ.status !== "approved") return { error: `"${integ.name}" isn't approved yet. The owner tests and approves it on the Capabilities page.` };
  const r = await callAction(userId, integ, actionName, params);
  return r.ok ? { status: r.status, data: r.data } : { error: r.error ?? "Request failed", status: r.status, data: r.data };
}

/** ASH Control kind for a run_integration_action call, from the action's declared kind. */
export async function integrationActionKind(userId: number, args: Record<string, unknown>) {
  const integ = await getIntegration(userId, slugifyKey(String(args["integration"] ?? "")));
  const action = integ?.actions.find((a) => a.name === args["action"]);
  return action ? actionKind(action) : "connect_service";
}

/** Approved integrations by the capability keys they provide. */
export async function approvedCapabilityProviders(userId: number): Promise<Map<string, { id: string; name: string }[]>> {
  const rows = await db.select({ key: customIntegrationsTable.key, name: customIntegrationsTable.name, capabilities: customIntegrationsTable.capabilities })
    .from(customIntegrationsTable).where(and(eq(customIntegrationsTable.userId, userId), eq(customIntegrationsTable.status, "approved")));
  const out = new Map<string, { id: string; name: string }[]>();
  for (const r of rows) for (const c of r.capabilities) out.set(c, [...(out.get(c) ?? []), { id: `custom:${r.key}`, name: r.name }]);
  return out;
}
