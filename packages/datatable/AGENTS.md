# Datatable Package Context

## Scope
Reusable DataTable implementation and public API.

## Important Folders
- `src/core`: types, defaults, formatting, validation utilities.
- `src/engine`: TanStack mapping and column definition internals.
- `src/persistence`: URL/localStorage codecs and sync hooks.
- `src/selection`: range math and clipboard TSV logic.
- `src/virtual`: row-height and virtualization helpers.
- `src/ui`: DataTable component and UI primitives.
- `src/convex`: Convex adapter helper.

## Contracts
- Keep external API in `src/index.ts` stable and explicit.
- Never export TanStack types from public surface.
- Row schema contract is structural (`safeParse`) to avoid cross-package zod identity coupling.

## CSS Build

- **`src/styles.css`** must keep `@tailwind base`, `@tailwind components`, and `@tailwind utilities`. With `corePlugins.preflight: false`, the base layer emits only `--tw-*` variable initialization (no global element reset).
- **`tailwind.config.ts`** must keep `corePlugins: { preflight: false }` so the published bundle never ships Tailwind preflight.
- **Build pipeline** — `build:css` runs the Tailwind CLI; `build:css:layer` wraps `dist/styles.css` in `@layer datatable { ... }`. The layer script must stay **idempotent** (skip wrapping if the file already starts with `@layer datatable{`) so manual re-runs do not nest layers.
- **Utilities that rely on base `--tw-*` init** include `ring-*`, `shadow-*`, `-translate-y-*`, `rotate-*`, `border-spacing-*`, and related transform/filter utilities.
- **Do not add a Tailwind `prefix`** without updating every `className` in source and verifying portaled UI (column menu, select/multiselect dialogs attach to `document.body`).

## Testing Expectations
- Unit tests near source modules (`*.test.ts`).
- Preserve round-trip tests for persistence/state conversion.
- Preserve parser/formatter tests for clipboard and column values.
