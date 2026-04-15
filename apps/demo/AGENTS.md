# Demo App Context

## Purpose
Demonstrate the DataTable package with realistic configuration and interactions.

## Rules
- Keep demo rows and data source deterministic.
- Keep all supported column kinds represented.
- Exercise key feature flags in demo usage (`editing`, `rowAdd`, `rowDelete`, `clipboardPaste`).

## CSS integration

- **`tailwind.config.ts`** includes `packages/datatable/src` in `content`, so the demo emits its own **unlayered** Tailwind utilities for those classes. That validates **safe coexistence** with the library’s published CSS (layered in `@layer datatable` when consumed from `dist`), not that **`dist/styles.css` alone** is complete — standalone consumers should rely on the published stylesheet or scan `node_modules/.../dist/**/*.js` per the README.
- **`vite.config.ts`** should define an explicit resolve alias for `@talentum-ventures/convex-datatable/styles.css` → `packages/datatable/src/styles.css`, **before** the `@talentum-ventures/convex-datatable` entry alias, so `bun run dev` works without building the library first. Without it, the styles subpath may resolve incorrectly or point at missing `dist/styles.css` in a clean checkout.

## Build/Test
- Dev: `bun --filter @rolha/demo dev`
- Typecheck: `bun --filter @rolha/demo typecheck`
- Build: `bun --filter @rolha/demo build`
