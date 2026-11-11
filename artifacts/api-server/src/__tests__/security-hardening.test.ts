/**
 * Security hardening regression tests: security headers, AI rate limiting,
 * redaction of internal error details, the JSON error handler, and the
 * parameterized replacements for former sql.raw() call sites.
 */
import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import app from "../app";
import {
  createAiRateLimiter,
  isExpensiveAiRequest,
  isSensitiveErrorMessage,
  jsonErrorHandler,
  publicErrorMessage,
  redactServerErrors,
} from "../middlewares/security";
import { getLifecycleSummary } from "../lib/unified-customer-intelligence/lifecycle-engine";
import { buildURCMPSummary } from "../lib/unified-revenue-commerce/urcmp-orchestrator";

describe("security headers", () => {
  it("sets helmet headers and hides x-powered-by on API responses", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(res.headers["strict-transport-security"]).toBeDefined();
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("returns JSON (not an HTML stack page) for malformed JSON bodies", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{not json");
    expect(res.status).toBe(400);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(JSON.stringify(res.body)).not.toMatch(/node_modules|at \S+\.js/);
  });
});

describe("AI rate limiter", () => {
  it("classifies expensive AI endpoints", () => {
    expect(isExpensiveAiRequest("POST", "/ai-orchestrator/chat")).toBe(true);
    expect(isExpensiveAiRequest("POST", "/ai-orchestrator/stream")).toBe(true);
    expect(isExpensiveAiRequest("POST", "/build-engine/execute-step")).toBe(true);
    // Forwarded to /ai-orchestrator/stream, which is the one that is counted.
    expect(isExpensiveAiRequest("POST", "/executive-brain/stream")).toBe(false);
    // Non-spending writes under AI prefixes.
    expect(isExpensiveAiRequest("POST", "/ai-orchestrator/files")).toBe(false);
    expect(isExpensiveAiRequest("PUT", "/ai-orchestrator/files/12")).toBe(false);
    expect(isExpensiveAiRequest("POST", "/build-engine/skip-step")).toBe(false);
    expect(isExpensiveAiRequest("POST", "/ai-orchestrator/connector-action")).toBe(false);
    expect(isExpensiveAiRequest("POST", "/landing-pages/generate")).toBe(true);
    expect(isExpensiveAiRequest("POST", "/media-gen/image")).toBe(true);
    expect(isExpensiveAiRequest("GET", "/ai-orchestrator/brain")).toBe(false);
    expect(isExpensiveAiRequest("POST", "/businesses")).toBe(false);
  });

  it("returns 429 with a JSON body once the per-minute limit is exceeded", async () => {
    const mini = express();
    mini.use(createAiRateLimiter(2));
    mini.post("/ai-orchestrator/chat", (_req, res) => { res.json({ ok: true }); });
    mini.post("/businesses", (_req, res) => { res.json({ ok: true }); });

    expect((await request(mini).post("/ai-orchestrator/chat")).status).toBe(200);
    expect((await request(mini).post("/ai-orchestrator/chat")).status).toBe(200);
    const limited = await request(mini).post("/ai-orchestrator/chat");
    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe("rate_limited");
    // Non-AI routes are not counted against the AI budget.
    expect((await request(mini).post("/businesses")).status).toBe(200);
  });
});

describe("error redaction", () => {
  function miniApp(handler: express.RequestHandler) {
    const mini = express();
    mini.use(redactServerErrors);
    mini.get("/x", handler);
    mini.use(jsonErrorHandler);
    return mini;
  }

  it("detects configuration and internal details", () => {
    expect(isSensitiveErrorMessage("OPENROUTER_API_KEY environment variable is not set")).toBe(true);
    expect(isSensitiveErrorMessage('relation "users" does not exist')).toBe(true);
    expect(isSensitiveErrorMessage("connect ECONNREFUSED 127.0.0.1:5432")).toBe(true);
    expect(isSensitiveErrorMessage("Failed to create node")).toBe(false);
  });

  it("maps a missing AI provider key to a generic 503", async () => {
    const res = await request(miniApp((_req, res) => {
      res.status(500).json({ error: "OPENROUTER_API_KEY environment variable is not set" });
    })).get("/x");
    expect(res.status).toBe(503);
    expect(res.body.code).toBe("ai_unavailable");
    expect(JSON.stringify(res.body)).not.toContain("OPENROUTER_API_KEY");
  });

  it("replaces internal 5xx details and strips stack fields", async () => {
    const res = await request(miniApp((_req, res) => {
      res.status(500).json({ error: 'duplicate key value violates unique constraint "users_email_key"', stack: "Error\n at x.js:1" });
    })).get("/x");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });

  it("strips raw provider details from 5xx bodies", async () => {
    const res = await request(miniApp((_req, res) => {
      res.status(502).json({ error: "Image generation failed", details: '{"error":"invalid key sk-or-123"}' });
    })).get("/x");
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: "Image generation failed" });
  });

  it("keeps safe, user-facing 5xx messages and leaves 4xx untouched", async () => {
    const safe = await request(miniApp((_req, res) => { res.status(500).json({ error: "Distillation failed" }); })).get("/x");
    expect(safe.body.error).toBe("Distillation failed");
    const bad = await request(miniApp((_req, res) => { res.status(400).json({ error: "DATABASE_URL is required" }); })).get("/x");
    expect(bad.body.error).toBe("DATABASE_URL is required");
  });

  it("returns generic JSON for thrown errors", async () => {
    const res = await request(miniApp(() => { throw new Error("SESSION_SECRET leaked"); })).get("/x");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });

  it("publicErrorMessage hides sensitive messages behind the fallback", () => {
    expect(publicErrorMessage(new Error("connect ECONNREFUSED 10.0.0.1:5432"), "ASH request failed")).toBe("ASH request failed");
    expect(publicErrorMessage(new Error("Insufficient credits"), "ASH request failed")).toBe("Insufficient credits");
  });
});

describe("parameterized queries (former sql.raw call sites)", () => {
  it("getLifecycleSummary runs with user and business filters", async () => {
    await expect(getLifecycleSummary(-1, -1)).resolves.toEqual({});
  });

  it("buildURCMPSummary runs with a user filter", async () => {
    const summary = await buildURCMPSummary(-1);
    expect(summary).toBeDefined();
  });
});
