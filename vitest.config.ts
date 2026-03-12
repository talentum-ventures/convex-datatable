import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@talentum-ventures/convex-datatable/convex-server",
        replacement: fileURLToPath(
          new URL("./packages/datatable/src/convex/server.ts", import.meta.url)
        )
      },
      {
        find: "@talentum-ventures/convex-datatable/convex",
        replacement: fileURLToPath(
          new URL("./packages/datatable/src/convex/index.ts", import.meta.url)
        )
      },
      {
        find: /^@talentum\/convex-datatable$/,
        replacement: fileURLToPath(
          new URL("./packages/datatable/src/index.ts", import.meta.url)
        )
      }
    ]
  },
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
