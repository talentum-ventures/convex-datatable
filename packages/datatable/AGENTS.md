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

## Testing Expectations
- Unit tests near source modules (`*.test.ts`).
- Preserve round-trip tests for persistence/state conversion.
- Preserve parser/formatter tests for clipboard and column values.
