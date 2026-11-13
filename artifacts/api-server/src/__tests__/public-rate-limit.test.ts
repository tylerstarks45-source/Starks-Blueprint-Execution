import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import { isPublicWriteRequest } from "../middlewares/security";

describe("public endpoint abuse limits", () => {
  it("classifies anonymous write endpoints", () => {
    expect(isPublicWriteRequest("POST", "/contact")).toBe(true);
    expect(isPublicWriteRequest("POST", "/landing-pages/12/submit")).toBe(true);
    expect(isPublicWriteRequest("POST", "/public/ab-tests/tok/convert")).toBe(true);
    expect(isPublicWriteRequest("GET", "/public/ab-tests/tok/assign")).toBe(true);
    expect(isPublicWriteRequest("POST", "/affiliate/abc/conversion")).toBe(true);
    expect(isPublicWriteRequest("POST", "/webhooks/tok123")).toBe(true);
    expect(isPublicWriteRequest("GET", "/email/unsubscribe")).toBe(true);
    expect(isPublicWriteRequest("POST", "/auth/reset-password")).toBe(true);
    expect(isPublicWriteRequest("POST", "/webhooks/sendgrid")).toBe(false);
    expect(isPublicWriteRequest("POST", "/stripe/webhook")).toBe(false);
    expect(isPublicWriteRequest("GET", "/landing-pages")).toBe(false);
    expect(isPublicWriteRequest("POST", "/businesses")).toBe(false);
  });

  it("returns 429 once one IP floods a public form", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 32; i++) {
      const res = await request(app).post("/api/public/ab-tests/no-such-token/convert").send({});
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 30)).not.toContain(429);
    expect(statuses.at(-1)).toBe(429);
  });
});
