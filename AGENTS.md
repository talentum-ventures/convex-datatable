# Rolha Grid - Agent Context

## Project Purpose
- Deliver a production-ready, AG Grid-inspired React DataTable.
- Keep a clean external API with no TanStack internals leaked.
- Keep authored source fully type-safe (`strict`, no `any`, no `unknown`).

## Workspace Layout
- `apps/demo`: Vite demo app showcasing real usage.
- `packages/datatable`: reusable DataTable package.
- `tests/types`: compile-time API contract tests.
- `cypress`: component and e2e tests.

## Tooling Baseline
- Package manager: `bun`.
- Lint/format: `oxlint`.
- Typecheck: `tsgo`.
- Unit tests: `vitest`.
- UI tests: `cypress`.

## Primary Commands
- `bun install`
- `bun run format:check`
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`
- `bun run test:types`
- `bun run test:cypress:component`
- `bun run test:cypress:e2e`
- `bun run build`

## Key Architecture Rules
- Public types live in `packages/datatable/src/core/types.ts` and are re-exported in `packages/datatable/src/index.ts`.
- TanStack state mapping is isolated in `packages/datatable/src/engine/state-converters.ts`.
- URL/localStorage persistence logic is isolated under `packages/datatable/src/persistence`.
- Convex integration stays adapter-based under `packages/datatable/src/convex`.
- Theme tokens drive styling; keep defaults polished and minimal-config.

## Quality Gates
- Do not introduce `any` or `unknown` in authored TS/TSX.
- Every new behavior should include tests (unit/type and Cypress where feasible).
- Keep feature flags independent and default profile aligned with productive-safe defaults.
