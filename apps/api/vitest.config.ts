import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

// Load the test environment before tests run (dotenv/config above loads .env for
// config.ts; this makes sure .env.test also populates process.env for the tests).
loadEnv({ path: ".env.test", override: false });

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
  resolve: {
    // Keep workspace TS source resolution simple under vitest.
    extensions: [".ts", ".js"],
  },
});