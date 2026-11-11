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
import { MODELS } from "../models";
import { assembleBusinessContextPackage, assembleCrossBusinessSummary } from "../business-intelligence/context";
import { buildLearnedPatternsNote } from "../ash-brain";

type Args = Record<string, unknown>;
type JsonSchema = Record<string, unknown>;

interface ToolSpec {
  name: string;
  description: string;
  parameters: JsonSchema;
  kind: "server" | "client";
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
    name: "research",
    description: "Live web research on a market, competitor, trend or question. Returns a written summary.",
    parameters: obj({ query: str("What to research") }, ["query"]),
    kind: "server",
    run: async (userId, a) => {
      const r = await complete({
        systemPrompt: "You are a business research assistant. Give concise, factual findings with sources where known.",
        prompt: String(a["query"] ?? ""),
        model: MODELS.research,
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
