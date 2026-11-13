// ASH tool registry for native (OpenRouter function-calling) tool use.
//
// "server" tools run inside the agent loop and their result goes back to the
// model. Every server tool is scoped to the calling user. "client" tools are
// the existing workspace actions the web app already executes from
// SBEP_DATA {"action":"tool_calls"} blocks; the loop forwards them unchanged.
import { db, businessesTable, SOCIAL_PLATFORMS } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { ToolDefinition } from "../openrouter";
import { complete } from "../openrouter";
import { chainFor } from "../models";
import { assembleBusinessContextPackage, assembleCrossBusinessSummary } from "../business-intelligence/context";
import { buildLearnedPatternsNote } from "../ash-brain";
import { SPECIALIST_KEYS } from "./specialists";
import { getEmpireOverview } from "../empire/overview";
import { listBusinessTypes, STREAM_TYPES } from "../empire/business-types";
import { createEmpireBusiness, createIncomeStream } from "../empire/actions";
import { registerAsset, syncUserAssets, ownedBusinessIds } from "../empire/assets";

// Pages ASH can send the user to (the web app's authenticated routes).
const APP_PAGES = [
  "/dashboard", "/builder", "/workspace", "/systems", "/business-portfolio", "/ash-intelligence", "/ash-brain", "/stats",
  "/memory", "/media", "/library", "/analytics", "/logs", "/email-marketing", "/landing-pages", "/domains",
  "/affiliate-links", "/connections", "/social-accounts", "/social", "/clients", "/credits", "/refer", "/settings",
  "/marketplace", "/blueprints", "/empire", "/income-streams", "/asset-vault", "/business-types", "/research-lab",
  "/ash-guide", "/business-import",
] as const;

type Args = Record<string, unknown>;
type JsonSchema = Record<string, unknown>;

interface ToolSpec {
  name: string;
  description: string;
  parameters: JsonSchema;
  // "delegate" tools are run by the agent loop itself (a nested specialist agent).
  kind: "server" | "client" | "delegate";
  run?: (userId: number, args: Args) => Promise<unknown>;
  // Client tools whose workspace call has a different shape than their arguments.
  toClientCall?: (args: Args) => Record<string, unknown>;
}

const obj = (properties: Record<string, JsonSchema>, required: string[] = []): JsonSchema => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
const str = (description: string): JsonSchema => ({ type: "string", description });
const int = (description: string): JsonSchema => ({ type: "integer", description });

const SPECS: ToolSpec[] = [
  {
    name: "list_businesses",
    description: "List the user's businesses (id, name, type, status). Call this before any business-specific tool.",
    parameters: obj({}),
    kind: "server",
    run: (userId) =>
      db
        .select({ id: businessesTable.id, name: businessesTable.name, businessType: businessesTable.businessType, status: businessesTable.status })
        .from(businessesTable)
        .where(eq(businessesTable.ownerId, userId)),
  },
  {
    name: "get_business_context",
    description: "Full measured context for one of the user's businesses: DNA, state, connections, metrics, capabilities, open recommendations.",
    parameters: obj({ businessId: int("Business id from list_businesses") }, ["businessId"]),
    kind: "server",
    run: async (userId, a) => (await assembleBusinessContextPackage({ businessId: Number(a["businessId"]), userId })) ?? { error: "Business not found" },
  },
  {
    name: "get_portfolio_summary",
    description: "Cross-business summary of the user's whole portfolio.",
    parameters: obj({}),
    kind: "server",
    run: (userId) => assembleCrossBusinessSummary(userId),
  },
  {
    name: "get_empire_overview",
    description: "The user's whole empire: every business with its type, income streams, assets, pending approvals, verified revenue (null = no revenue source connected) and projected monthly revenue (estimates, never verified).",
    parameters: obj({}),
    kind: "server",
    run: async (userId) => { await syncUserAssets(userId); return getEmpireOverview(userId); },
  },
  {
    name: "list_business_types",
    description: "Business types the user can create (built-in and their custom types), with each type's usual income streams and assets.",
    parameters: obj({}),
    kind: "server",
    run: (userId) => listBusinessTypes(userId),
  },
  {
    name: "create_business",
    description: "Create a new business in the user's empire. Use when the user asks you to start or add a business. typeKey comes from list_business_types.",
    parameters: obj(
      { name: str("Business name"), typeKey: str("Business type key"), notes: str("Short description of the business"), createDefaultStreams: { type: "boolean", description: "Also add the type's usual income streams as projected" } },
      ["name", "typeKey"],
    ),
    kind: "server",
    run: async (userId, a) => {
      const r = await createEmpireBusiness(userId, { name: String(a["name"]).slice(0, 120), typeKey: String(a["typeKey"]), notes: a["notes"] ? String(a["notes"]).slice(0, 5000) : undefined, createDefaultStreams: a["createDefaultStreams"] === true });
      return "error" in r ? r : { businessId: r.business.id, name: r.business.name, type: r.type.name, streamsCreated: r.streams.length };
    },
  },
  {
    name: "add_income_stream",
    description: "Add an income stream to one of the user's businesses. Status 'projected' until it is earning; estimatedMonthlyRevenue is an estimate in USD.",
    parameters: obj(
      { businessId: int("Business id"), title: str("Stream name"), streamType: { type: "string", enum: [...STREAM_TYPES] }, status: { type: "string", enum: ["active", "projected"] }, estimatedMonthlyRevenue: { type: "number", description: "Estimated USD per month" } },
      ["businessId", "title", "streamType"],
    ),
    kind: "server",
    run: async (userId, a) => (await createIncomeStream(userId, {
      businessId: Number(a["businessId"]), title: String(a["title"]).slice(0, 160), streamType: String(a["streamType"]),
      status: a["status"] ? String(a["status"]) : undefined, estimatedMonthlyRevenue: typeof a["estimatedMonthlyRevenue"] === "number" ? Math.max(0, a["estimatedMonthlyRevenue"]) : null,
    })) ?? { error: "Business not found" },
  },
  {
    name: "register_asset",
    description: "Save something you or the user made (site, page, product, document, agent, automation, account) in the Asset Vault under a business.",
    parameters: obj(
      { name: str("Asset name"), classKey: str("Kind: website, page, application, domain, product, service, offer, campaign, brand_asset, document, ai_agent, automation, integration, email_list, other"), businessId: int("Business id"), externalUrl: str("Public URL if any"), description: str("What it is") },
      ["name", "classKey"],
    ),
    kind: "server",
    run: async (userId, a) => {
      const businessId = a["businessId"] != null ? Number(a["businessId"]) : null;
      if (businessId != null && !(await ownedBusinessIds(userId, [businessId])).has(businessId)) return { error: "Business not found" };
      const url = typeof a["externalUrl"] === "string" && /^https?:\/\//.test(a["externalUrl"]) ? a["externalUrl"].slice(0, 1000) : null;
      const assetId = await registerAsset({ userId, businessId, classKey: String(a["classKey"]).slice(0, 40), name: String(a["name"]).slice(0, 200), description: a["description"] ? String(a["description"]).slice(0, 2000) : null, externalUrl: url, builderSource: "ash", builderObjectId: `ash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
      return { saved: true, assetId };
    },
  },
  {
    name: "research",
    description: "Live web research on a market, competitor, trend or question. Returns a written summary.",
    parameters: obj({ query: str("What to research") }, ["query"]),
    kind: "server",
    run: async (userId, a) => {
      const r = await complete({
        systemPrompt: "You are a business research assistant. Give concise, factual findings with sources where known.",
        prompt: String(a["query"] ?? ""),
        models: chainFor("research"),
        userId,
      });
      return { summary: r.content };
    },
  },
  {
    name: "get_learned_patterns",
    description: "Lessons ASH has learned from past outcomes across the platform, for a business type or goal.",
    parameters: obj({ businessType: str("Business type, e.g. ecommerce"), goal: str("What the user is trying to achieve") }),
    kind: "server",
    run: async (_userId, a) => ({
      note: await buildLearnedPatternsNote({ businessType: (a["businessType"] as string) ?? null, goalText: (a["goal"] as string) ?? null }),
    }),
  },
  {
    name: "consult_specialist",
    description:
      "Delegate a focused sub-task to a specialist agent (finance, marketing, operations, research, strategy) that investigates with its own tools and reports back. Use for in-depth or multi-domain questions; call several specialists for cross-functional plans.",
    parameters: obj(
      {
        specialist: { type: "string", enum: [...SPECIALIST_KEYS] },
        task: str("What the specialist should work out, with any context it needs"),
        businessId: int("Optional business id from list_businesses"),
      },
      ["specialist", "task"],
    ),
    kind: "delegate",
  },
  {
    name: "navigate",
    description: "Take the user to another page of the platform (only when they ask to go somewhere or it clearly helps).",
    parameters: obj({ path: { type: "string", enum: [...APP_PAGES] } }, ["path"]),
    kind: "client",
  },
  {
    name: "image",
    description: "Generate an image in the user's workspace.",
    parameters: obj({ prompt: str("Detailed visual description") }, ["prompt"]),
    kind: "client",
  },
  {
    name: "generate_video",
    description: "Generate a short video in the user's workspace.",
    parameters: obj({ prompt: str("Scene description"), aspectRatio: { type: "string", enum: ["16:9", "9:16"] }, durationSeconds: int("Length in seconds") }, ["prompt"]),
    kind: "client",
  },
  {
    name: "generate_music",
    description: "Generate background music.",
    parameters: obj({ prompt: str("Style and mood"), durationSeconds: int("Length in seconds") }, ["prompt"]),
    kind: "client",
  },
  {
    name: "text_to_speech",
    description: "Turn a script into a voiceover.",
    parameters: obj({ text: str("Full script"), voice: str("Voice style, e.g. warm narrator") }, ["text"]),
    kind: "client",
  },
  {
    name: "file",
    description: "Save a file (document, code, data) to the user's workspace.",
    parameters: obj(
      { name: str("File name with extension"), content: str("Complete file content"), fileType: { type: "string", enum: ["markdown", "json", "python", "html", "javascript", "text", "csv"] } },
      ["name", "content"],
    ),
    kind: "client",
  },
  {
    name: "connector_action",
    description: "Run an action on one of the user's connected services (e.g. slack postMessage). Requires the user to have connected it.",
    parameters: obj({ connectorId: str("Connector id, e.g. slack"), action: str("Action name"), params: { type: "object", additionalProperties: true } }, ["connectorId", "action"]),
    kind: "client",
  },
  {
    name: "schedule_post",
    description: "Add a social post to the user's Content Calendar.",
    parameters: obj(
      { platform: { type: "string", enum: [...SOCIAL_PLATFORMS] }, content: str("Post text"), scheduledAt: str("ISO 8601 time"), linkUrl: str("Optional link") },
      ["platform", "content", "scheduledAt"],
    ),
    kind: "client",
    // The workspace schedules posts through platform_action / schedule_social_post.
    toClientCall: (a) => ({ type: "platform_action", tool: "schedule_social_post", params: a }),
  },
];

export { APP_PAGES };

const BY_NAME = new Map(SPECS.map((s) => [s.name, s]));

export const ASH_TOOLS: ToolDefinition[] = SPECS.map((s) => ({
  type: "function",
  function: { name: s.name, description: s.description, parameters: s.parameters },
}));

export function getTool(name: string): ToolSpec | undefined {
  return BY_NAME.get(name);
}

type Checked = { ok: true; args: Args } | { ok: false; error: string };

const TYPE_CHECKS: Record<string, (v: unknown) => boolean> = {
  string: (v) => typeof v === "string",
  integer: (v) => Number.isInteger(v),
  number: (v) => typeof v === "number" && Number.isFinite(v),
  boolean: (v) => typeof v === "boolean",
  array: Array.isArray,
  object: (v) => typeof v === "object" && v !== null && !Array.isArray(v),
};

/** Enforces a tool's top-level schema: required fields, types and enums; drops undeclared fields. */
export function checkToolArgs(name: string, args: Args): Checked {
  const spec = getTool(name);
  if (!spec) return { ok: false, error: `Unknown tool ${name}` };
  const properties = (spec.parameters["properties"] ?? {}) as Record<string, JsonSchema>;
  const required = (spec.parameters["required"] ?? []) as string[];
  const out: Args = {};
  for (const [key, prop] of Object.entries(properties)) {
    const value = args[key];
    if (value === undefined || value === null) {
      if (required.includes(key)) return { ok: false, error: `Missing ${key}` };
      continue;
    }
    const check = TYPE_CHECKS[prop["type"] as string];
    if (check && !check(value)) return { ok: false, error: `${key} must be ${prop["type"] as string}` };
    const allowed = prop["enum"] as unknown[] | undefined;
    if (allowed && !allowed.includes(value)) return { ok: false, error: `${key} must be one of ${allowed.join(", ")}` };
    out[key] = value;
  }
  return { ok: true, args: out };
}
