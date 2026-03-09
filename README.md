# Rolha Grid

Rolha Grid is a production-focused React datatable library with an AG Grid-style feature set on top of TanStack Table internals. The public API stays library-shaped: consumers work with `DataTable`, typed column definitions, data sources, feature flags, theme tokens, and optional Convex adapters without importing TanStack state directly.

## What It Provides

- Strictly typed columns for `text`, `longText`, `number`, `currency`, `select`, `multiselect`, `link`, `date`, and `reactNode`
- Inline editing, draft-row creation, row deletion, undo/redo, clipboard copy/paste, and sheet-style cell selection
- Column sorting, filtering, visibility, pinning, reordering, and resizing
- Virtualized and measured row rendering
- URL and `localStorage` persistence for table state
- Collaboration presence rendering and Convex adapter support

## Workspace

- `apps/demo`: live Vite demo that exercises the library against a realistic dataset
- `packages/datatable`: reusable library package
- `tests/types`: compile-time public API contract tests
- `cypress`: component and e2e coverage

## Installation

```bash
bun install
```

For library consumers:

```bash
bun add @rolha/datatable
```

Peer dependencies:

- `react`
- `react-dom`
- `convex` is optional unless you use the Convex adapters

## Quick Start

```tsx
import { DataTable, type DataTableColumn, type DataTableDataSource } from "@rolha/datatable";

type InvoiceRow = {
  id: string;
  description: string;
  amount: number;
  status: string;
  createdAt: string;
};

const columns: ReadonlyArray<DataTableColumn<InvoiceRow>> = [
  {
    id: "description",
    field: "description",
    header: "Description",
    kind: "longText",
    isEditable: true
  },
  {
    id: "amount",
    field: "amount",
    header: "Amount",
    kind: "currency",
    currency: "USD",
    isEditable: true
  },
  {
    id: "status",
    field: "status",
    header: "Status",
    kind: "select",
    options: [
      { value: "todo", label: "To Do", colorClass: "bg-amber-100 text-amber-800" },
      { value: "done", label: "Done", colorClass: "bg-emerald-100 text-emerald-800" }
    ]
  },
  {
    id: "createdAt",
    field: "createdAt",
    header: "Created",
    kind: "date"
  }
];

const dataSource: DataTableDataSource<InvoiceRow> = {
  useRows: () => ({
    rows: [],
    hasMore: false,
    isLoading: false,
    isLoadingMore: false,
    error: null,
    loadMore: () => undefined,
    refresh: () => undefined
  }),
  updateRows: async () => undefined,
  createRow: async (draft) => ({
    id: crypto.randomUUID(),
    description: String(draft.description ?? ""),
    amount: Number(draft.amount ?? 0),
    status: String(draft.status ?? "todo"),
    createdAt: String(draft.createdAt ?? "")
  })
};

export function Invoices(): JSX.Element {
  return (
    <DataTable
      tableId="invoices"
      columns={columns}
      getRowId={(row) => row.id}
      dataSource={dataSource}
    />
  );
}
```

## Column Kinds

- `text`: single-line string cell
- `longText`: multiline string cell
- `number`: numeric input and display
- `currency`: locale-aware currency formatting
- `select`: single option with badge rendering
- `multiselect`: array of options with stacked badges
- `link`: clickable URL cell
- `date`: native date editor with canonical ISO clipboard semantics
- `reactNode`: fully custom render/editor/clipboard behavior

## Features

Feature flags are independent. They live on `DataTableFeatureFlags` and are merged with safe defaults internally.

Common toggles:

- `columnResize`
- `columnReorder`
- `columnPinning`
- `columnVisibility`
- `columnFilter`
- `columnSort`
- `rowDelete`
- `rowSelect`
- `rowAdd`
- `rowActions`
- `editing`
- `cellSelect`
- `clipboardCopy`
- `clipboardPaste`
- `undo`
- `infiniteScroll`
- `virtualization`

## Data Sources

The core API uses a typed adapter:

- `useRows(query)` returns rows plus loading state and pagination control
- `createRow`, `updateRows`, `deleteRows`, and `restoreRows` are optional mutators

This keeps the UI decoupled from local state, server state, or Convex.

## Persistence

Table state persists in two places:

- URL query params for shareable state
- `localStorage` for sticky local preferences

Encoded state includes sorting, filters, column order, pinning, hidden columns, and widths.

## Theming

`DataTableThemeTokens` controls:

- typography
- borders and radius
- header and row surfaces
- pinned column surfaces and shadows
- active-cell ring
- selection background

Pass a partial `theme` prop to override only the tokens you need.

## Collaboration

Presence data is passed through `collaborators` and rendered as:

- collaborator outlines on active cells
- stacked labels anchored to the cell

For Convex-backed presence, use:

- `useConvexDataSource`
- `useConvexPresence`
- `@rolha/datatable/convex-server`

## Architecture

Current package structure:

- `core/`: pure domain logic and public types
- `engine/`: TanStack-facing column/state helpers
- `hooks/`: extracted stateful table logic
- `ui/`: React presentation and orchestration
- `selection/`, `virtual/`, `persistence/`, `convex/`, `debug/`: focused support layers

Dependency rule:

- `ui` imports from `hooks`, `engine`, and `core`
- `hooks` imports from `engine` and `core`
- `engine` imports from `core`
- `core` imports no React or TanStack runtime concerns

## Development

```bash
bun run typecheck
bun run lint
bun run format:check
bun run test:unit
bun run test:types
bun run test:cypress:component
bun run test:cypress:e2e
bun run build
```

## Contributing

- Keep authored TypeScript strict and avoid `any`/`unknown`
- Preserve the public API surface re-exported from `packages/datatable/src/index.ts`
- Prefer extracting pure logic or narrow hooks before changing behavior
- Add tests for every new behavior or regression fix
