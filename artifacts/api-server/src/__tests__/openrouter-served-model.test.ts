import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { db, openrouterUsageTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { complete, streamCompletion } from "../lib/openrouter";

const servedModel = (tag: string) => `test/served-${tag}-${Date.now()}`;
const rowsFor = (model: string) =>
  db.select().from(openrouterUsageTable).where(eq(openrouterUsageTable.model, model));

describe("usage is logged under the model OpenRouter actually served", () => {
  beforeAll(() => { process.env.OPENROUTER_API_KEY ??= "test-key"; });
  afterEach(() => vi.restoreAllMocks());

  it("complete() with a fallback chain", async () => {
    const served = servedModel("complete");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      model: served,
      choices: [{ message: { content: "ok" } }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }), { status: 200 }));
    const result = await complete({ prompt: "hi", models: ["primary/model", served] });
    expect(result.model).toBe(served);
    expect((await rowsFor(served)).length).toBe(1);
  });

  it("streamCompletion() with a fallback chain", async () => {
    const served = servedModel("stream");
    const sse = [
      `data: ${JSON.stringify({ model: served, choices: [{ delta: { content: "o" } }] })}`,
      `data: ${JSON.stringify({ model: served, choices: [{ delta: { content: "k" } }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } })}`,
      "data: [DONE]", "",
    ].join("\n\n");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(sse, { status: 200 }));
    let text = "";
    for await (const chunk of streamCompletion({ prompt: "hi", models: ["primary/model", served] })) text += chunk;
    expect(text).toBe("ok");
    expect((await rowsFor(served)).length).toBe(1);
  });

  it("streamCompletion() stopped after the first chunk", async () => {
    const served = servedModel("early-stop");
    const sse = [
      `data: ${JSON.stringify({ model: served, choices: [{ delta: { content: "o" } }] })}`,
      `data: ${JSON.stringify({ model: served, choices: [{ delta: { content: "k" } }] })}`,
      "data: [DONE]", "",
    ].join("\n\n");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(sse, { status: 200 }));
    for await (const _chunk of streamCompletion({ prompt: "hi", models: ["primary/model", served] })) break;
    expect((await rowsFor(served)).length).toBe(1);
  });
});
