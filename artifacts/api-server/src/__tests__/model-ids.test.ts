import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { MODELS, CHAINS } from "../lib/models";

// OpenRouter IDs that no longer exist in the catalog. Requests naming only these
// fail with 400/404, so they must not come back into the server code.
const RETIRED_IDS = [
  "perplexity/llama-3.1-sonar-large-128k-online",
  "anthropic/claude-opus-4-5",
  "anthropic/claude-3-5-sonnet",
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3-opus",
  "openai/gpt-4-turbo",
  "google/gemini-2.0-flash",
  "deepseek/deepseek-r1\"",
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "__tests__" ? [] : sourceFiles(p);
    return p.endsWith(".ts") ? [p] : [];
  });
}

describe("OpenRouter model IDs", () => {
  it("canonical models are not retired IDs", () => {
    for (const id of Object.values(MODELS)) {
      expect(RETIRED_IDS.some((r) => r.replace(/"$/, "") === id)).toBe(false);
    }
  });

  it("research has a fallback model", () => {
    expect(CHAINS.research.length).toBeGreaterThan(1);
  });

  it("no server source file names a retired ID", () => {
    const offenders = sourceFiles(join(__dirname, ".."))
      .filter((f) => RETIRED_IDS.some((id) => readFileSync(f, "utf8").includes(id)));
    expect(offenders).toEqual([]);
  });
});
