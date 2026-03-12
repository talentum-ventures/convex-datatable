# Convex DataTable — Agent Context

## Project Overview

Convex DataTable (`@talentum/convex-datatable`) is a production-ready React data-grid library with an Airtable-style feature set. It is built on TanStack Table internally but exposes a clean public API with **zero TanStack types leaked**. The library is published on npm and designed for use by external consumers.

Key capabilities: 9 typed column kinds, spreadsheet-style editing, cell/range selection, clipboard copy/paste, undo/redo, column resize/reorder/pin/filter/sort/hide, infinite scroll, virtualization, URL and localStorage state persistence, row CRUD with optimistic updates, row schema validation, theming via CSS custom properties, per-row action menus, and optional Convex adapters for paginated data loading and real-time collaborative presence.

## Workspace Layout

```
rolha-grid/
├── packages/datatable/    # Publishable library package (@talentum/convex-datatable)
│   └── src/
│       ├── core/          # Public types, defaults, formatting, validation, filtering, sorting
│       ├── engine/        # TanStack state converters, column definition mapping, column order
│       ├── hooks/         # Internal React hooks (table state, rows, clipboard, keyboard, undo, etc.)
│       ├── persistence/   # URL and localStorage codecs, sync hooks
│       ├── selection/     # Range math and clipboard TSV serialization
│       ├── virtual/       # Row height and virtualization helpers
│       ├── ui/            # DataTable component, DataTableContainer, header, body, cells, toolbar
│       ├── convex/        # Convex adapter hooks and server helpers
│       └── index.ts       # Public API entry point (all exports)
├── apps/demo/             # Vite demo app (in-memory + Convex examples)
│   └── src/
│       ├── in-memory-page.tsx  # In-memory data source demo with all column kinds
│       ├── convex-page.tsx     # Convex-backed demo with presence
│       ├── demo-query.ts       # Client-side query helpers for demo
│       └── App.tsx             # Hash-based routing between demos
├── tests/types/           # Compile-time API contract tests (ts-expect-error assertions)
├── cypress/
│   ├── component/         # Component tests (editing, undo, paste, pinning, reorder, etc.)
│   └── e2e/               # E2E tests against running demo app
├── README.md              # Full external documentation
├── llms.txt               # LLM-optimized documentation
└── AGENTS.md              # This file
```

## Tooling

| Tool | Purpose | Command |
|------|---------|---------|
| bun | Package manager and script runner | `bun install` |
| tsgo | TypeScript type checking (native preview) | `bun run typecheck` |
| oxlint | Linting and formatting | `bun run lint`, `bun run format:check` |
| vitest | Unit tests | `bun run test:unit` |
| cypress | Component and E2E tests | `bun run test:cypress:component`, `bun run test:cypress:e2e` |
| vite | Dev server and build | `bun run dev`, `bun run build` |
| tailwindcss | CSS build for the library | Part of `bun run build` |

## Primary Commands

```bash
bun install                      # Install all dependencies
bun run dev                      # Start demo dev server
bun run build                    # Build datatable package + demo app
bun run typecheck                # Type-check all packages with tsgo
bun run lint                     # Lint all files with oxlint
bun run format:check             # Check formatting with oxlint
bun run test:unit                # Run vitest unit tests
bun run test:types               # Run compile-time type tests
bun run test:cypress:component   # Run Cypress component tests
bun run test:cypress:e2e         # Run Cypress E2E tests (starts dev server automatically)
```

## Architecture

### Public API Surface

All public exports are defined in `packages/datatable/src/index.ts`. This is the single source of truth for what consumers can import. The public API includes:

**Components:** `DataTable`, `DataTableContainer`
**Hooks:** `useConvexDataSource`, `useConvexPresence`
**Types:** All types from `core/types.ts` (50+ exported types)
**Constants:** `DEFAULT_FEATURE_FLAGS`, `DEFAULT_THEME_TOKENS`, `DEFAULT_PAGE_SIZE`
**Persistence utilities:** `encodePersistedStateToUrl`, `decodePersistedStateFromUrl`, `mergePersistedState`, `storageKey`
### Package Exports (package.json)

| Path | Maps to |
|------|---------|
| `@talentum/convex-datatable` | `dist/index.js` |
| `@talentum/convex-datatable/styles.css` | `dist/styles.css` |
| `@talentum/convex-datatable/convex` | `dist/convex/index.js` |
| `@talentum/convex-datatable/convex-server` | `dist/convex/server.js` |

### Core Types (`packages/datatable/src/core/types.ts`)

This 426-line file defines the entire public type surface. Key types:

- **`DataTableProps<TRow>`** — main component props
- **`DataTableColumn<TRow>`** — discriminated union of 9 column kinds (`text`, `longText`, `number`, `currency`, `select`, `multiselect`, `link`, `date`, `reactNode`)
- **`DataTableDataSource<TRow>`** — hook-based data interface (`useRows`, optional `createRow`, `updateRows`, `deleteRows`, `restoreRows`)
- **`DataTableQueryState`** — query state passed to `useRows` (`sorting`, `filters`, `pageSize`, `cursor`)
- **`DataTableFeatureFlags`** — 19 independent boolean toggles
- **`DataTableThemeTokens`** — 12 CSS theme tokens
- **`DataTableRowAction<TRow>`** — per-row action menu items
- **`RowSchema<TRow>`** — structural `safeParse` interface for row validation
- **`CollaboratorPresence`** — user presence data for collaborative editing
- **`ConvexDataSourceConfig<TRow>`** and **`ConvexPresenceConfig`** — Convex adapter configs

### TanStack Isolation (`packages/datatable/src/engine/state-converters.ts`)

All TanStack Table state is mapped through converter functions. Public types never reference TanStack types. Key converters:

- `toTanStackSorting` / `fromTanStackSorting` — `DataTableSort[]` ↔ TanStack `SortingState`
- `toTanStackFilters` / `fromTanStackFilters` — `DataTableFilter[]` ↔ TanStack `ColumnFiltersState` (with `dtf1:` prefix encoding)
- `toColumnVisibility` / `fromColumnVisibility` — `string[]` ↔ TanStack `VisibilityState`
- `toColumnSizing` / `fromColumnSizing` — `Record<string, number>` ↔ TanStack `ColumnSizingState`
- `toColumnPinning` / `fromColumnPinning` — `{ left, right }` ↔ TanStack `ColumnPinningState`
- `persistedStateToInternal` / `internalToPersistedState` — full round-trip

### State Persistence (`packages/datatable/src/persistence/`)

- **`query-codec.ts`** — URL parameter encoding/decoding with `dt_{tableId}_` prefix. Encodes sorting, filters, column order, pinning, hidden columns, and widths.
- **`storage.ts`** — localStorage read/write with JSON serialization.
- **`use-persisted-state.ts`** — Hook that merges URL + storage state on mount, then debounce-writes changes (URL: 150ms, storage: 250ms).

### Convex Adapter (`packages/datatable/src/convex/`)

- **`use-convex-data-source.ts`** — Converts `ConvexDataSourceConfig` into `DataTableDataSource` with cursor-based pagination.
- **`use-convex-presence.ts`** — Manages collaborative presence with debounced heartbeats (150ms cell changes, 10s keep-alive interval).
- **`server.ts`** — Server-side Convex handlers: `heartbeatHandler`, `getPresenceHandler`, `clearStalePresenceHandler`, and `presenceFields` validator.

### Component Tree

```
DataTable (data-table.tsx)
├── CellStoreContext.Provider
├── CollaboratorStoreContext.Provider
└── div (root, CSS variables injected)
    ├── TableToolbar (add row, delete, copy, column visibility)
    ├── div (grid container)
    │   └── div (scroll container, role="grid")
    │       └── table
    │           ├── TableHeader (sort, filter, pin, reorder, resize)
    │           │   └── ColumnMenu (portaled dropdown)
    │           └── TableBody (virtualized)
    │               ├── MemoRow (per visible row)
    │               │   └── DataCell (per cell, handles editing, selection, collaborator outlines)
    │               └── DraftRow (when rowAdd is enabled)
    ├── Error/Loading messages
    └── <style> (focus ring)
```

### Internal Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useTableState` | `hooks/use-table-state.ts` | Sorting, filters, column order/visibility/pinning/sizing, row selection; hydrates from persistence |
| `useTableRows` | `hooks/use-table-rows.ts` | Optimistic updates, draft row, edit commit, delete, undo tracking |
| `useColumnDefs` | `hooks/use-column-defs.ts` | Maps `DataTableColumn[]` to TanStack `ColumnDef[]` |
| `useTableColumns` | `hooks/use-table-columns.ts` | Column menu state, pinning, sort, drag/drop, resize |
| `useTableSelection` | `hooks/use-table-selection.ts` | Active cell, range start, cell/range select callbacks |
| `useTableFilters` | `hooks/use-table-filters.ts` | Filter state, operators, text/multiselect filter values |
| `useTableClipboard` | `hooks/use-table-clipboard.ts` | Copy (TSV), paste, `canHandleGridPaste` check |
| `useTableKeyboard` | `hooks/use-table-keyboard.ts` | Arrow keys, Enter/F2 edit, Escape, Ctrl+Z/Y, Ctrl+C |
| `useUndoStack` | `hooks/use-undo-stack.ts` | Push/pop undo/redo with capped stack |
| `useRowObservers` | `hooks/use-row-observers.ts` | ResizeObserver per row for content-measured height |
| `useRowHeights` | `hooks/use-row-heights.ts` | Manual/content heights, `getFinalHeight` |

### Defaults (`packages/datatable/src/core/defaults.ts`)

| Constant | Value |
|----------|-------|
| `DEFAULT_PAGE_SIZE` | `50` |
| `DEFAULT_OVERSCAN` | `8` |
| `DEFAULT_MIN_ROW_HEIGHT` | `40` |
| `URL_WRITE_DEBOUNCE_MS` | `150` |
| `STORAGE_WRITE_DEBOUNCE_MS` | `250` |
| `DELETE_UNDO_MS` | `4000` |

**Default Feature Flags:** `columnResize: true`, `rowResize: true`, `columnReorder: true`, `columnPinning: true`, `columnVisibility: true`, `columnFilter: true`, `columnSort: true`, `rowDelete: false`, `rowSelect: true`, `rowAdd: false`, `rowActions: true`, `editing: false`, `cellSelect: true`, `clipboardCopy: true`, `clipboardPaste: true`, `undo: false`, `autoSave: true`, `infiniteScroll: true`, `virtualization: true`.

**Default Theme Tokens:** IBM Plex Sans font, 14px radius, light gradient headers, white rows, blue active cell ring, blue selection background. See `defaults.ts` for exact values.

## Quality Gates

- **No `any` or `unknown`** in authored TypeScript/TSX. The codebase uses `strict`, `noImplicitAny`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`.
- **Every new behavior must include tests** — unit tests (vitest) near source modules, type tests in `tests/types/`, and Cypress component/E2E tests where feasible.
- **Feature flags are independent** — never assume one flag implies another. The default profile is "productive-safe" (read-only features on, write features off).
- **Never export TanStack types** from the public API surface.
- **Row schema uses structural typing** (`safeParse` interface) to avoid cross-package Zod identity coupling.
- **Preserve round-trip tests** for persistence/state conversion.
- **Preserve parser/formatter tests** for clipboard and column values.

## Testing Structure

### Unit Tests (vitest)

Tests live next to source files as `*.test.ts`. Key test areas:

| Module | Tested Behaviors |
|--------|-----------------|
| `core/defaults` | Feature flags structure, page size, theme tokens |
| `core/formatters` | Currency/date formatting, invalid dates, `parseDateValue` |
| `core/validation` | `validateCell`, `validateRow` with Zod |
| `core/filtering` | All filter operators, `applyClientQuery`, `isActiveFilterValue` |
| `core/sorting` | `comparableSortValue`, `compareValues` |
| `core/cell-value` | Clipboard serialization/parsing for all column kinds |
| `core/column-utils` | `setColumnValue`, `diffRows` |
| `core/collaborator-store` | Store identity, listener notifications |
| `engine/state-converters` | Sorting, filters, visibility, pinning, sizing round-trips |
| `engine/managed-columns` | Column order, pinning, reorder within pin zones |
| `engine/visible-column-order` | Visible column ordering |
| `hooks/use-table-rows` | Editing state, optimistic updates, autosave rollback, draft row |
| `hooks/use-undo-stack` | Undo/redo stack operations, caps, redo clearing |
| `selection/clipboard` | Range normalization, TSV serialize/parse, paste matrix expansion |
| `persistence/query-codec` | URL encode/decode round-trips, merge logic, invalid entries |
| `convex/use-convex-presence` | Presence color resolution, filtering, heartbeat debounce |
| `ui/data-table` | `canHandleGridPaste`, surface variants, `onActiveCellChange`, column menu |
| `ui/column-layout` | Layout computation (widths, fill, max, pinned offsets) |

### Type Tests (`tests/types/public-api.test.ts`)

Compile-time tests ensuring the public API contract is maintained. Uses `@ts-expect-error` assertions to verify type constraints (e.g. invalid `field` values are rejected).

### Cypress Tests

**Component tests** (`cypress/component/datatable.cy.tsx`):
Editing, undo/redo, paste undo, collaborator outlines, column visibility, column pinning, row actions, column menu operations, multiselect filters, column reorder (within/across pin zones), resize, header/body alignment, link overflow, multiline text, measured rows, row mutations (add/delete), keyboard navigation, scroll behavior, clipboard operations, focus management, virtualization, header opacity.

**E2E tests** (`cypress/e2e/demo.cy.ts`):
Full app loading, column visibility toggle, row actions, header/body alignment, cell editing.

## Sub-Package Agent Contexts

Each workspace package has its own `AGENTS.md` with scoped rules:

- **`packages/datatable/AGENTS.md`** — library-specific contracts, folder structure, testing expectations
- **`apps/demo/AGENTS.md`** — demo app rules (deterministic data, all column kinds, key feature flags)

## Dependencies

### Runtime (library)
`@tanstack/react-table`, `@tanstack/react-virtual`, `@tanstack/store`, `class-variance-authority`, `clsx`, `lucide-react`, `sonner`, `tailwind-merge`, `zod`

### Peer
`react` ^18.3.1, `react-dom` ^18.3.1, `convex` ^1.32.0 (optional)

### Dev (workspace)
`typescript`, `@typescript/native-preview`, `vitest`, `cypress`, `vite`, `tailwindcss`, `oxlint`, `@testing-library/react`, `@testing-library/cypress`
