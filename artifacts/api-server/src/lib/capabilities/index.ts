// Capability registry: what ASH can do right now for this owner, built from her own tools and the
// connectors the owner has connected. Plans are checked against it; whatever isn't ready becomes a
// capability request (connect a service, an owner-only step, or something the platform lacks).
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, userCredentialsTable, capabilityRequestsTable, type CapabilityRequest } from "@workspace/db";
import { CATALOG_CONNECTOR_MAP } from "../connectors/catalog-map";
import { getConnector } from "../connectors/registry";
import { slugifyKey } from "../empire/business-types";

export type CapabilityStatus = "ready" | "connect" | "manual" | "missing";

interface CapabilityDef {
  key: string;
  name: string;
  /** ASH tools that provide it with no connection. */
  tools?: string[];
  /** Connector ids that provide it once the owner connects one. */
  providers?: string[];
  /** Only the owner can do it (legal, identity, money movement); ASH prepares the work. */
  ownerOnly?: boolean;
}

export const CAPABILITIES: readonly CapabilityDef[] = [
  { key: "research", name: "Market and competitor research", tools: ["research"] },
  { key: "business_workspace", name: "Business workspace, income streams and asset vault", tools: ["create_business", "add_income_stream", "register_asset"] },
  { key: "content_writing", name: "Copy, documents and content", tools: ["file", "consult_specialist"] },
  { key: "images", name: "Image generation", tools: ["image"] },
  { key: "video", name: "Video generation", tools: ["generate_video"] },
  { key: "audio", name: "Voice-overs and music", tools: ["text_to_speech", "generate_music"] },
  { key: "payments", name: "Take payments", providers: ["stripe"] },
  { key: "revenue_tracking", name: "Verified revenue tracking", providers: ["stripe"] },
  { key: "email_marketing", name: "Email lists and campaigns", providers: ["mailchimp", "convertkit", "beehiiv", "sendgrid", "gohighlevel"] },
  { key: "social_posting", name: "Social media posting", providers: ["twitter", "meta", "linkedin", "tiktok", "youtube"] },
  { key: "website", name: "Website or blog publishing", providers: ["wordpress"] },
  { key: "online_store", name: "Online store and products", providers: ["shopify"] },
  { key: "domain_dns", name: "Domains and DNS", providers: ["cloudflare"] },
  { key: "courses", name: "Online courses", providers: ["teachable"] },
  { key: "funnels", name: "Sales funnels", providers: ["clickfunnels", "gohighlevel"] },
  { key: "crm_data", name: "CRM and data sheets", providers: ["airtable", "notion", "google_sheets"] },
  { key: "automation", name: "Workflow automation and notifications", providers: ["zapier", "webhook", "slack"] },
  { key: "advertising", name: "Paid advertising", ownerOnly: true },
  { key: "legal_banking", name: "Business entity, bank and tax setup", ownerOnly: true },
  { key: "outreach", name: "Direct outreach to prospects", providers: ["gmail", "linkedin"] },
];
const BY_KEY = new Map(CAPABILITIES.map((c) => [c.key, c]));

// Words in a plan that imply a capability, for plans whose model reply didn't list capabilities.
const HINTS: [RegExp, string][] = [
  [/stripe|payment|checkout|subscription|billing/i, "payments"],
  [/e-?mail|newsletter|mailchimp|convertkit|beehiiv/i, "email_marketing"],
  [/social|instagram|tiktok|youtube|twitter|facebook|linkedin post/i, "social_posting"],
  [/shopify|store|e-?commerce|print[- ]on[- ]demand|dropship/i, "online_store"],
  [/domain|dns/i, "domain_dns"],
  [/website|blog|wordpress|landing page/i, "website"],
  [/course|teachable/i, "courses"],
  [/funnel/i, "funnels"],
  [/\bads?\b|advertis|ad budget|ppc/i, "advertising"],
  [/outreach|cold e-?mail|prospect/i, "outreach"],
  [/llc|entity|bank account|tax|legal/i, "legal_banking"],
];

/** The capabilities a plan needs: what the model listed plus what its permissions and milestones imply. */
export function capabilitiesForPlan(plan: { capabilities?: string[]; permissions?: string[]; milestones?: string[]; strategy?: string }): string[] {
  const text = [...(plan.permissions ?? []), ...(plan.milestones ?? []), plan.strategy ?? ""].join("\n");
  const keys = new Set<string>(["research", "business_workspace"]);
  for (const k of plan.capabilities ?? []) { const s = slugifyKey(k); if (s) keys.add(s); }
  for (const [re, k] of HINTS) if (re.test(text)) keys.add(k);
  return [...keys].slice(0, 16);
}

const connectorKeys = (connectorId: string) =>
  Object.entries(CATALOG_CONNECTOR_MAP).filter(([, m]) => m.connectorId === connectorId).map(([k]) => k);

const automated = (connectorId: string) => {
  const meta = getConnector(connectorId, {})?.describe();
  return !!meta && meta.available && meta.actions.some((a) => (meta.actionMeta[a] ?? "automated") === "automated");
};

async function connectedConnectors(userId: number): Promise<Set<string>> {
  const rows = await db.select({ key: userCredentialsTable.credentialKey }).from(userCredentialsTable)
    .where(and(eq(userCredentialsTable.userId, userId), eq(userCredentialsTable.status, "connected")));
  const keys = new Set(rows.map((r) => r.key));
  const out = new Set<string>();
  for (const [key, m] of Object.entries(CATALOG_CONNECTOR_MAP)) if (keys.has(key)) out.add(m.connectorId);
  return out;
}

export interface CapabilityView {
  key: string;
  name: string;
  status: CapabilityStatus;
  tools: string[];
  providers: { id: string; name: string; connected: boolean; credentialKeys: string[] }[];
  note: string;
}

function view(def: CapabilityDef | undefined, key: string, connected: Set<string>): CapabilityView {
  if (!def) return { key, name: key.replace(/_/g, " "), status: "missing", tools: [], providers: [], note: "ASH has no tool or connector for this yet." };
  const providers = (def.providers ?? []).filter(automated).map((id) => ({
    id, name: getConnector(id, {})!.displayName, connected: connected.has(id), credentialKeys: connectorKeys(id),
  }));
  if (def.tools?.length) return { key, name: def.name, status: "ready", tools: def.tools, providers, note: "ASH can do this now." };
  if (def.ownerOnly) return { key, name: def.name, status: "manual", tools: [], providers, note: "Only you can do this. ASH prepares the work and asks you." };
  if (providers.some((p) => p.connected)) return { key, name: def.name, status: "ready", tools: [], providers, note: `Connected through ${providers.filter((p) => p.connected).map((p) => p.name).join(", ")}.` };
  if (providers.length) return { key, name: def.name, status: "connect", tools: [], providers, note: `Connect ${providers.map((p) => p.name).join(" or ")} in Connections.` };
  return { key, name: def.name, status: "missing", tools: [], providers: [], note: "ASH has no tool or connector for this yet." };
}

export async function getCapabilityMap(userId: number): Promise<CapabilityView[]> {
  const connected = await connectedConnectors(userId);
  return CAPABILITIES.map((c) => view(c, c.key, connected));
}

export async function checkCapabilities(userId: number, keys: string[]): Promise<CapabilityView[]> {
  const connected = await connectedConnectors(userId);
  return keys.map((k) => view(BY_KEY.get(k), k, connected));
}

/** Opens a request for each capability that isn't ready, skipping ones already open. */
export async function requestMissingCapabilities(userId: number, keys: string[], ctx: { planId?: number | null; missionId?: number | null; reason?: string }) {
  const notReady = (await checkCapabilities(userId, keys)).filter((c) => c.status !== "ready");
  if (!notReady.length) return [];
  const open = await db.select({ capability: capabilityRequestsTable.capability }).from(capabilityRequestsTable)
    .where(and(eq(capabilityRequestsTable.userId, userId), eq(capabilityRequestsTable.status, "open"), inArray(capabilityRequestsTable.capability, notReady.map((c) => c.key))));
  const have = new Set(open.map((o) => o.capability));
  const fresh = notReady.filter((c) => !have.has(c.key));
  if (!fresh.length) return [];
  return db.insert(capabilityRequestsTable).values(fresh.map((c) => ({
    userId, capability: c.key, name: c.name, kind: c.status, reason: (ctx.reason ?? c.note).slice(0, 500),
    planId: ctx.planId ?? null, missionId: ctx.missionId ?? null,
  }))).returning();
}

/** Open requests, after resolving any whose capability has since become ready. */
export async function listCapabilityRequests(userId: number): Promise<CapabilityRequest[]> {
  const open = await db.select().from(capabilityRequestsTable)
    .where(and(eq(capabilityRequestsTable.userId, userId), eq(capabilityRequestsTable.status, "open"))).orderBy(desc(capabilityRequestsTable.createdAt));
  if (!open.length) return [];
  const status = new Map((await checkCapabilities(userId, [...new Set(open.map((r) => r.capability))])).map((c) => [c.key, c.status]));
  const done = open.filter((r) => status.get(r.capability) === "ready").map((r) => r.id);
  if (done.length) {
    await db.update(capabilityRequestsTable).set({ status: "resolved", resolvedAt: new Date() })
      .where(and(eq(capabilityRequestsTable.userId, userId), inArray(capabilityRequestsTable.id, done)));
  }
  return open.filter((r) => !done.includes(r.id));
}

export async function dismissCapabilityRequest(userId: number, id: number) {
  const [r] = await db.update(capabilityRequestsTable).set({ status: "dismissed", resolvedAt: new Date() })
    .where(and(eq(capabilityRequestsTable.id, id), eq(capabilityRequestsTable.userId, userId), eq(capabilityRequestsTable.status, "open"))).returning();
  return r ?? null;
}
