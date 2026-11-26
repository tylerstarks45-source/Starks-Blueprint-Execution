import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app";

describe("webhook request parsing", () => {
  it.each([
    "/api/stripe/webhook",
    "/api/email/webhooks/sendgrid",
    "/api/webhooks/sendgrid",
    "/api/STRIPE/webhook/",
  ])("rejects bodies over the limit at %s", async (path) => {
    const response = await request(app)
      .post(path)
      .set("Content-Type", "application/json")
      .send({ data: "a".repeat(1024 * 1024) });

    expect(response.status).toBe(413);
    expect(response.body).toEqual({ error: "Request body too large" });
  });

  it("returns a client error for invalid webhook JSON", async () => {
    const response = await request(app)
      .post("/api/email/webhooks/sendgrid")
      .set("Content-Type", "application/json")
      .send("{");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Malformed JSON body" });
  });
});
