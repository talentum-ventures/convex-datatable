import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "packages/datatable/src/**/*.test.ts",
      "packages/datatable/src/**/*.test.tsx",
      "tests/**/*.test.ts"
    ]
  }
});
