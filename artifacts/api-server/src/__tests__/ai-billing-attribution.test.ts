/**
 * Internal AI steps (research planning/summary, goal/task/milestone planning)
 * must pass the requesting user's id to OpenRouter so the call is credit-gated
 * and billed to that user instead of running free.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/openrouter", () => ({
  complete: vi.fn(),
  streamCompletion: vi.fn(),
}));

import { complete as _complete } from "../lib/openrouter";
import { generateResearchPlan } from "../lib/research-engine/planner";
import { generateStructuredSummary } from "../lib/research-engine/summarizer";

const mockComplete = vi.mocked(_complete);

const reply = (content: string) => ({
  content, model: "m", promptTokens: 1, completionTokens: 1, totalTokens: 2, estimatedCost: null,
});

describe("AI billing attribution", () => {
  beforeEach(() => mockComplete.mockReset());

  it("research plan is billed to the requesting user", async () => {
    mockComplete.mockResolvedValue(reply('{"steps":[{"query":"q","purpose":"p"}]}'));
    await generateResearchPlan("market", "pricing for X", 42);
    expect(mockComplete).toHaveBeenCalledWith(expect.objectContaining({ userId: 42 }));
  });

  it("research summary is billed to the requesting user", async () => {
    mockComplete.mockResolvedValue(reply('{"title":"t","summary":"s","keyFindings":[],"confidence":50}'));
    await generateStructuredSummary({
      researchType: "market",
      objective: "pricing for X",
      findings: [{ query: "q", content: "c" } as never],
      userId: 42,
    });
    expect(mockComplete).toHaveBeenCalledWith(expect.objectContaining({ userId: 42 }));
  });
});
