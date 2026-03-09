import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "apps/demo/src/**/*.test.ts",
      "apps/demo/src/**/*.test.tsx",
      "packages/datatable/src/**/*.test.ts",
      "packages/datatable/src/**/*.test.tsx",
      "tests/**/*.test.ts"
    ]
  }
});
