import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@talentum-ventures/convex-datatable": fileURLToPath(new URL("../../packages/datatable/src/index.ts", import.meta.url))
    }
  },
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()]
    }
  }
});
