import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/support/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/support/test-env.ts"],
    include: ["tests/integration/**/*.test.ts"],
    hookTimeout: 20_000,
    testTimeout: 20_000,
    fileParallelism: false,
    reporters: ["default"],
  },
});
