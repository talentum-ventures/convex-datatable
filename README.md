# Rolha Grid

AG Grid-inspired, fully type-safe React datatable built with TanStack Table internals, shadcn-style UI, virtualization, URL/localStorage persistence, and Convex adapter support.

Tooling baseline:
- Lint/format: `oxlint`
- Typecheck compiler: `tsgo`

## Workspace

- `apps/demo`: Vite demo app
- `packages/datatable`: reusable DataTable library
- `tests/types`: compile-time API tests
- `cypress`: component + e2e tests

## Scripts

- `bun run dev`
- `bun run build`
- `bun run typecheck`
- `bun run format`
- `bun run format:check`
- `bun run lint`
- `bun run test:unit`
- `bun run test:types`
- `bun run test:cypress:component`
- `bun run test:cypress:e2e`
