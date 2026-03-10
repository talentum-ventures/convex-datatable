import { defineConfig } from "cypress";
import react from "@vitejs/plugin-react";

const workspaceRoot = process.cwd();
const autoprefixer = require("autoprefixer");
const tailwindcss = require("tailwindcss");
const tailwindContent = [
  `${workspaceRoot}/apps/demo/index.html`,
  `${workspaceRoot}/apps/demo/src/**/*.{ts,tsx}`,
  `${workspaceRoot}/packages/datatable/src/**/*.{ts,tsx}`,
  `${workspaceRoot}/cypress/component/**/*.{ts,tsx}`
];

export default defineConfig({
  viewportWidth: 1400,
  viewportHeight: 900,
  e2e: {
    baseUrl: "http://localhost:5173",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts"
  },
  component: {
    specPattern: "cypress/component/**/*.cy.tsx",
    supportFile: "cypress/support/component.ts",
    indexHtmlFile: "cypress/support/component-index.html",
    devServer: {
      framework: "react",
      bundler: "vite",
      viteConfig: {
        plugins: [react()],
        css: {
          postcss: {
            plugins: [
              tailwindcss({
                darkMode: ["class"],
                content: tailwindContent,
                theme: {
                  extend: {}
                },
                plugins: []
              }),
              autoprefixer()
            ]
          }
        },
        resolve: {
          alias: {
            "@talentum/convex-datatable": `${workspaceRoot}/packages/datatable/src/index.ts`,
            react: `${workspaceRoot}/packages/datatable/node_modules/react`,
            "react-dom": `${workspaceRoot}/packages/datatable/node_modules/react-dom`,
            "react-dom/client": `${workspaceRoot}/packages/datatable/node_modules/react-dom/client.js`
          },
          dedupe: ["react", "react-dom"]
        }
      }
    }
  }
});
