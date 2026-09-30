import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "node",
    // Route-handler suites transform server modules in beforeAll; give
    // them headroom when the machine is saturated (default is 10 s).
    hookTimeout: 60000,
  },
});
