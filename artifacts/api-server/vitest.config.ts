import { defineConfig } from "vitest/config";
import crypto from "crypto";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      SESSION_SECRET: "test-jwt-signing-secret-used-only-in-automated-tests-32chars",
      CREDENTIAL_ENCRYPTION_KEY: crypto.randomBytes(32).toString("hex"),
    },
  },
});
