# Convex DataTable

A production-ready, fully typed React data-grid component with Airtable-style editing, selection, clipboard, persistence, and optional Convex real-time adapters. Built on [TanStack Table](https://tanstack.com/table) internally, but exposes a clean public API with **zero TanStack types leaked**.

[![npm](https://img.shields.io/npm/v/@talentum/convex-datatable)](https://www.npmjs.com/package/@talentum/convex-datatable)
[![license](https://img.shields.io/npm/l/@talentum/convex-datatable)](./LICENSE)

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Components](#components)
  - [DataTable](#datatable)
  - [DataTableContainer](#datatablecontainer)
- [Columns](#columns)
  - [Common Column Properties](#common-column-properties)
  - [Column Kinds](#column-kinds)
  - [Custom Renderers](#custom-renderers)
  - [Validators](#validators)
- [Data Source](#data-source)
  - [Read-only Data Source](#read-only-data-source)
  - [Full CRUD Data Source](#full-crud-data-source)
  - [Query State](#query-state)
- [Feature Flags](#feature-flags)
- [Row Actions](#row-actions)
- [Row Schema Validation](#row-schema-validation)
- [Theming](#theming)
  - [Theme Tokens](#theme-tokens)
  - [CSS Variables](#css-variables)
  - [Surface Variants](#surface-variants)
- [Persistence](#persistence)
  - [URL Persistence](#url-persistence)
  - [localStorage Persistence](#localstorage-persistence)
  - [Persistence Utilities](#persistence-utilities)
- [Convex Adapter](#convex-adapter)
  - [useConvexDataSource](#useconvexdatasource)
  - [useConvexPresence](#useconvexpresence)
  - [Convex Server Helpers](#convex-server-helpers)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Clipboard](#clipboard)
- [Client-Side Filtering](#client-side-filtering)
- [Package Exports](#package-exports)
- [API Reference](#api-reference)
  - [DataTableProps](#datatableprops)
  - [DataTableColumn](#datatablecolumn-1)
  - [DataTableDataSource](#datatabledatasource-1)
  - [DataTableFeatureFlags](#datatablefeatureflags-1)
  - [DataTableThemeTokens](#datatablethemetokens-1)
  - [DataTableRowAction](#datatablerowaction-1)
  - [DataTableQueryState](#datatablequerystate-1)
  - [CollaboratorPresence](#collaboratorpresence)
  - [ConvexDataSourceConfig](#convexdatasourceconfig)
  - [ConvexPresenceConfig](#convexpresenceconfig)
  - [RowSchema](#rowschema)
- [TypeScript](#typescript)
- [Browser Support](#browser-support)
- [License](#license)

---

## Features

- **9 typed column kinds** — `text`, `longText`, `number`, `currency`, `select`, `multiselect`, `link`, `date`, `reactNode`
- **Spreadsheet-style editing** — click-to-edit, Enter/F2 to start, Escape to cancel, auto-save on blur
- **Cell selection and range selection** — click a cell, Shift+click for range, keyboard arrow navigation
- **Clipboard** — Ctrl+C to copy selection as TSV, Ctrl+V to paste (multi-cell grid paste supported)
- **Undo / Redo** — Ctrl+Z / Ctrl+Shift+Z for edit and paste operations
- **Row operations** — add new rows (draft row), delete rows with soft-delete toast, restore rows
- **Column resize** — drag column borders to resize
- **Column reorder** — drag-and-drop column headers
- **Column pinning** — pin columns left or right with sticky positioning and shadow
- **Column visibility** — show/hide columns from the toolbar
- **Column sorting** — single-column sort with ascending/descending toggle
- **Column filtering** — per-column filter with operators (`eq`, `neq`, `contains`, `startsWith`, `endsWith`, `gt`, `gte`, `lt`, `lte`, `in`)
- **Infinite scroll** — automatic load-more as the user scrolls to the bottom
- **Virtualization** — only visible rows rendered via `@tanstack/react-virtual`
- **State persistence** — sorting, filters, column order, pinning, visibility, and widths persisted to URL and `localStorage`
- **Theming** — 12 theme tokens mapped to CSS custom properties; partial overrides supported
- **Row actions** — configurable action menu per row with icons, variants, visibility/disabled guards
- **Row schema validation** — structural `safeParse` contract (works with Zod, Valibot, or any compatible library)
- **Convex integration** — optional adapters for paginated data loading and real-time collaborative presence
- **Collaborator presence** — colored cell outlines and name labels for other users' active cells
- **Custom cell renderers and editors** — full control over cell display and editing UI

---

## Installation

```bash
npm install @talentum/convex-datatable
```

Peer dependencies:

| Package     | Version    | Required |
|-------------|------------|----------|
| `react`     | `^18.3.1`  | Yes      |
| `react-dom` | `^18.3.1`  | Yes      |
| `convex`    | `^1.32.0`  | No — only needed if using the Convex adapter |

### Styling

Import the bundled stylesheet in your app entry point:

```ts
import "@talentum/convex-datatable/styles.css";
```

The stylesheet includes all Tailwind utility classes used by the component. If your app already builds Tailwind and you prefer to merge the DataTable classes into your own build, add the dist path to your Tailwind `content` globs instead:

```js
// tailwind.config.js
export default {
  content: [
    "./src/**/*.{ts,tsx}",
    "./node_modules/@talentum/convex-datatable/dist/**/*.js"
  ]
};
```

> The explicit CSS import is the default recommendation because content-scanning `node_modules` is toolchain-dependent.

---

## Quick Start

```tsx
import "@talentum/convex-datatable/styles.css";
import {
  DataTable,
  DataTableContainer,
  type DataTableColumn,
  type DataTableDataSource
} from "@talentum/convex-datatable";

type Invoice = {
  id: string;
  customer: string;
  amount: number;
  status: string;
  issuedAt: string;
};

const rows: Invoice[] = [
  { id: "1", customer: "Acme Corp", amount: 1250, status: "paid", issuedAt: "2026-03-01" },
  { id: "2", customer: "Globex", amount: 3180, status: "draft", issuedAt: "2026-03-02" }
];

const columns: DataTableColumn<Invoice>[] = [
  { id: "customer", field: "customer", header: "Customer", kind: "text" },
  { id: "amount", field: "amount", header: "Amount", kind: "currency", currency: "USD" },
  {
    id: "status",
    field: "status",
    header: "Status",
    kind: "select",
    options: [
      { value: "draft", label: "Draft", colorClass: "bg-amber-100 text-amber-900" },
      { value: "paid", label: "Paid", colorClass: "bg-emerald-100 text-emerald-900" }
    ]
  },
  { id: "issuedAt", field: "issuedAt", header: "Issued", kind: "date" }
];

const dataSource: DataTableDataSource<Invoice> = {
  useRows: () => ({
    rows,
    hasMore: false,
    isLoading: false,
    isLoadingMore: false,
    error: null,
    loadMore: () => {},
    refresh: () => {}
  })
};

export function InvoicesTable() {
  return (
    <DataTableContainer>
      <DataTable
        tableId="invoices"
        columns={columns}
        getRowId={(row) => row.id}
        dataSource={dataSource}
      />
    </DataTableContainer>
  );
}
```

---

## Components

### DataTable

The main component. Renders a full-featured data grid with a toolbar, headers, scrollable body, and optional draft row.

```tsx
<DataTable<MyRow>
  tableId="my-table"
  columns={columns}
  getRowId={(row) => row.id}
  dataSource={dataSource}
  features={{ editing: true, rowAdd: true }}
  theme={{ activeCellRing: "hsl(220 90% 50%)" }}
/>
```

See [DataTableProps](#datatableprops) for the full props reference.

### DataTableContainer

An optional wrapper that adds a polished gradient background and rounded container styling. Place `DataTable` inside it:

```tsx
<DataTableContainer>
  <DataTable ... />
</DataTableContainer>
```

If you prefer a plain look, skip `DataTableContainer` and pass `surface="plain"` to `DataTable`.

---

## Columns

### Common Column Properties

Every column kind shares these properties (from `ColumnCommon<TRow, K, TValue>`):

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | Yes | Unique column identifier. |
| `field` | `StringKey<TRow>` | Yes | The row property this column reads from. Must be a valid key of your row type. |
| `header` | `string` | Yes | Display label in the header. |
| `description` | `string` | No | Tooltip text shown on the header. |
| `width` | `number` | No | Initial column width in pixels. |
| `minWidth` | `number` | No | Minimum resize width. |
| `maxWidth` | `number` | No | Maximum resize width. |
| `isEditable` | `boolean` | No | Whether this column allows editing. Requires the `editing` feature flag. |
| `isResizable` | `boolean` | No | Override the global `columnResize` flag for this column. |
| `isReorderable` | `boolean` | No | Override the global `columnReorder` flag for this column. |
| `isPinnable` | `boolean` | No | Override the global `columnPinning` flag for this column. |
| `isHideable` | `boolean` | No | Override the global `columnVisibility` flag for this column. |
| `isSortable` | `boolean` | No | Override the global `columnSort` flag for this column. |
| `isFilterable` | `boolean` | No | Override the global `columnFilter` flag for this column. |
| `accessor` | `(row: TRow) => TValue` | No | Custom value accessor. If omitted, the value is read from `row[field]`. |
| `validator` | `(value: TValue, row: TRow) => string \| null` | No | Cell-level validation. Return an error message or `null`. |
| `parseInput` | `(input: string, row: TRow) => TValue` | No | Parse user-entered text into the cell's value type. |
| `serializeClipboard` | `(value: TValue, row: TRow) => string` | No | Serialize the cell value for clipboard copy. |
| `parseClipboard` | `(text: string, row: TRow) => TValue` | No | Parse clipboard text into the cell's value type (for paste). |
| `renderCell` | `(ctx: DataTableCellRenderContext) => ReactNode` | No | Custom cell renderer. |
| `renderEditor` | `(ctx: DataTableCellEditorContext) => ReactNode` | No | Custom editor component when the cell is being edited. |

### Column Kinds

#### `text`

Single-line text field.

```ts
{ id: "name", field: "name", header: "Name", kind: "text", placeholder: "Enter name..." }
```

| Extra Property | Type | Description |
|----------------|------|-------------|
| `placeholder` | `string` | Placeholder text for the editor. |

#### `longText`

Multi-line text field with `pre-wrap` rendering.

```ts
{ id: "notes", field: "notes", header: "Notes", kind: "longText", maxLines: 5 }
```

| Extra Property | Type | Description |
|----------------|------|-------------|
| `placeholder` | `string` | Placeholder text for the editor. |
| `maxLines` | `number` | Maximum visible lines before truncation. |

#### `number`

Numeric field with optional precision bounds.

```ts
{ id: "qty", field: "qty", header: "Quantity", kind: "number", precision: 0, minimum: 0 }
```

| Extra Property | Type | Description |
|----------------|------|-------------|
| `precision` | `number` | Decimal places. |
| `minimum` | `number` | Minimum allowed value. |
| `maximum` | `number` | Maximum allowed value. |

#### `currency`

Formatted currency value using `Intl.NumberFormat`.

```ts
{ id: "price", field: "price", header: "Price", kind: "currency", currency: "USD", locale: "en-US" }
```

| Extra Property | Type | Required | Description |
|----------------|------|----------|-------------|
| `currency` | `string` | Yes | ISO 4217 currency code (e.g. `"USD"`, `"EUR"`). |
| `locale` | `string` | No | BCP 47 locale for formatting. |
| `minimumFractionDigits` | `number` | No | Minimum decimal digits. |
| `maximumFractionDigits` | `number` | No | Maximum decimal digits. |

#### `select`

Single-value dropdown from a predefined set of options.

```ts
{
  id: "status",
  field: "status",
  header: "Status",
  kind: "select",
  options: [
    { value: "active", label: "Active", colorClass: "bg-green-100 text-green-800" },
    { value: "inactive", label: "Inactive", colorClass: "bg-gray-100 text-gray-800" }
  ]
}
```

| Extra Property | Type | Required | Description |
|----------------|------|----------|-------------|
| `options` | `SelectOption[]` | Yes | Available options. |

**`SelectOption`:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `value` | `string` | Yes | Stored value. |
| `label` | `string` | Yes | Display label. |
| `colorClass` | `string` | Yes | Tailwind classes for the badge (e.g. `"bg-blue-100 text-blue-800"`). |
| `icon` | `ComponentType` | No | Optional icon component. |

#### `multiselect`

Multi-value tag selector. The cell value is `ReadonlyArray<string>`.

```ts
{
  id: "tags",
  field: "tags",
  header: "Tags",
  kind: "multiselect",
  options: [
    { value: "urgent", label: "Urgent", colorClass: "bg-rose-100 text-rose-700" },
    { value: "design", label: "Design", colorClass: "bg-violet-100 text-violet-700" }
  ]
}
```

| Extra Property | Type | Required | Description |
|----------------|------|----------|-------------|
| `options` | `SelectOption[]` | Yes | Available options. |

#### `link`

Clickable URL with optional target and rel attributes.

```ts
{ id: "url", field: "url", header: "Website", kind: "link", target: "_blank" }
```

| Extra Property | Type | Description |
|----------------|------|-------------|
| `target` | `"_self" \| "_blank"` | Link target. |
| `rel` | `string` | `rel` attribute value. |

#### `date`

Date value formatted via `Intl.DateTimeFormat`. Accepts `string` (ISO) or `Date` values.

```ts
{ id: "createdAt", field: "createdAt", header: "Created", kind: "date", dateStyle: "medium" }
```

| Extra Property | Type | Description |
|----------------|------|-------------|
| `locale` | `string` | BCP 47 locale. |
| `timezone` | `string` | IANA timezone. |
| `dateStyle` | `"full" \| "long" \| "medium" \| "short"` | Date format style. |

#### `reactNode`

Fully custom column for arbitrary React content. All five lifecycle callbacks are **required**.

```ts
{
  id: "custom",
  field: "custom",
  header: "Custom",
  kind: "reactNode",
  renderCell: ({ value }) => <MyBadge>{value}</MyBadge>,
  renderEditor: ({ value, commit, cancel }) => (
    <input
      autoFocus
      defaultValue={String(value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Escape") cancel();
        if (e.key === "Enter") commit(e.currentTarget.value);
      }}
    />
  ),
  parseInput: (input) => input,
  parseClipboard: (text) => text,
  serializeClipboard: (value) => String(value)
}
```

| Required Property | Type | Description |
|-------------------|------|-------------|
| `renderCell` | `(ctx) => ReactNode` | Render the display content. |
| `renderEditor` | `(ctx) => ReactNode` | Render the editor. |
| `parseInput` | `(input, row) => DataTableReactValue` | Parse text input to value. |
| `parseClipboard` | `(text, row) => DataTableReactValue` | Parse clipboard text to value. |
| `serializeClipboard` | `(value, row) => string` | Serialize value for clipboard. |

### Custom Renderers

Any column kind can provide `renderCell` and `renderEditor` to override the built-in rendering.

**`DataTableCellRenderContext<TRow, TValue>`:**

| Property | Type | Description |
|----------|------|-------------|
| `row` | `TRow` | The full row data. |
| `rowId` | `string` | The row's unique ID. |
| `value` | `TValue` | The cell's current value. |
| `isEditing` | `boolean` | Whether the cell is in edit mode. |

**`DataTableCellEditorContext<TRow, TValue>`:**

| Property | Type | Description |
|----------|------|-------------|
| `row` | `TRow` | The full row data. |
| `rowId` | `string` | The row's unique ID. |
| `value` | `TValue` | The cell's current value. |
| `commit` | `(nextValue: TValue) => void` | Save the new value. |
| `cancel` | `() => void` | Discard changes and exit edit mode. |

### Validators

Set per-column `validator` to run cell-level validation. If it returns a non-null string, the error is shown and the edit is rejected.

```ts
{
  id: "name",
  field: "name",
  header: "Name",
  kind: "text",
  isEditable: true,
  validator: (value) => value.trim().length > 0 ? null : "Name is required"
}
```

For full-row validation, use [Row Schema Validation](#row-schema-validation).

---

## Data Source

The `DataTableDataSource<TRow>` type decouples the DataTable from any specific backend, HTTP client, or state management library. It uses a hook-based pattern for reading data and optional async functions for mutations.

### Read-only Data Source

At minimum, provide `useRows` — a React hook that receives the current query state and returns rows plus pagination controls:

```ts
const dataSource: DataTableDataSource<MyRow> = {
  useRows: (query) => {
    // `query` contains sorting, filters, pageSize, and cursor
    const { data, isLoading } = useSWR(`/api/rows?${serialize(query)}`);

    return {
      rows: data?.rows ?? [],
      hasMore: data?.hasMore ?? false,
      isLoading,
      isLoadingMore: false,
      error: null,
      loadMore: () => { /* fetch next page */ },
      refresh: () => { /* refetch from start */ }
    };
  }
};
```

**`DataTableRowsResult<TRow>`** (returned by `useRows`):

| Property | Type | Description |
|----------|------|-------------|
| `rows` | `ReadonlyArray<TRow>` | The current page of rows. |
| `hasMore` | `boolean` | Whether more rows are available. |
| `isLoading` | `boolean` | True during initial load (no rows yet). |
| `isLoadingMore` | `boolean` | True while loading the next page (rows already visible). |
| `error` | `string \| null` | Error message, if any. |
| `loadMore` | `() => void` | Called by infinite scroll to load the next page. |
| `refresh` | `() => void` | Reset and reload from the beginning. |

### Full CRUD Data Source

To enable editing, row creation, deletion, and undo-restore, add optional mutation functions:

```ts
const dataSource: DataTableDataSource<MyRow> = {
  useRows: (query) => { /* ... */ },

  createRow: async (draft) => {
    const newRow = await api.post("/rows", draft);
    return newRow; // must return the full created row
  },

  updateRows: async (changes) => {
    // `changes` is ReadonlyArray<{ rowId: string, patch: Partial<MyRow> }>
    await api.patch("/rows/batch", { changes });
  },

  deleteRows: async (rowIds) => {
    await api.delete("/rows/batch", { rowIds });
  },

  restoreRows: async (rows) => {
    // Called when the user clicks "Undo" on a delete toast
    await api.post("/rows/restore", { rows });
  }
};
```

| Function | Signature | Required | Description |
|----------|-----------|----------|-------------|
| `useRows` | `(query: DataTableQueryState) => DataTableRowsResult<TRow>` | Yes | React hook for data fetching. |
| `createRow` | `(draft: Partial<TRow>) => Promise<TRow>` | No | Create a new row from partial data. |
| `updateRows` | `(changes: ReadonlyArray<RowPatch<TRow>>) => Promise<void>` | No | Batch update rows. |
| `deleteRows` | `(rowIds: ReadonlyArray<string>) => Promise<void>` | No | Delete rows by ID. |
| `restoreRows` | `(rows: ReadonlyArray<TRow>) => Promise<void>` | No | Restore previously deleted rows. |

### Query State

The `DataTableQueryState` object passed to `useRows`:

| Property | Type | Description |
|----------|------|-------------|
| `sorting` | `ReadonlyArray<DataTableSort>` | Active sorts (e.g. `[{ columnId: "name", direction: "asc" }]`). |
| `filters` | `ReadonlyArray<DataTableFilter>` | Active filters (e.g. `[{ columnId: "status", op: "eq", value: "active" }]`). |
| `pageSize` | `number` | Rows per page (default `50`). |
| `cursor` | `string \| null` | Pagination cursor (null for the first page). |

---

## Feature Flags

Feature flags are independent toggles merged with defaults. Pass only the flags you want to change:

```tsx
<DataTable
  features={{
    editing: true,
    rowAdd: true,
    rowDelete: true,
    undo: true,
    virtualization: true
  }}
  ...
/>
```

| Flag | Default | Description |
|------|---------|-------------|
| `columnResize` | `true` | Drag column borders to resize. |
| `rowResize` | `true` | Drag row borders to resize height. |
| `columnReorder` | `true` | Drag-and-drop column headers to reorder. |
| `columnPinning` | `true` | Pin columns left or right via the column menu. |
| `columnVisibility` | `true` | Show/hide columns from the toolbar. |
| `columnFilter` | `true` | Per-column filtering via the column menu. |
| `columnSort` | `true` | Click headers or use the column menu to sort. |
| `rowDelete` | `false` | Enable row deletion with undo toast. Requires `dataSource.deleteRows`. |
| `rowSelect` | `true` | Show row selection checkboxes. |
| `rowAdd` | `false` | Show "Add row" button and draft row. Requires `dataSource.createRow`. |
| `rowActions` | `true` | Show the row action overflow menu. |
| `editing` | `false` | Enable cell editing. Columns must also set `isEditable: true`. |
| `cellSelect` | `true` | Enable click-to-select cells with keyboard navigation. |
| `clipboardCopy` | `true` | Enable Ctrl+C to copy selected cells. |
| `clipboardPaste` | `true` | Enable Ctrl+V to paste into cells. Requires `editing` and `dataSource.updateRows`. |
| `undo` | `false` | Enable Ctrl+Z / Ctrl+Shift+Z undo/redo for edits and pastes. |
| `infiniteScroll` | `true` | Automatically call `loadMore` when the user scrolls near the bottom. |
| `virtualization` | `true` | Only render visible rows for large datasets (via `@tanstack/react-virtual`). |

---

## Row Actions

Define per-row action menu items:

```tsx
const rowActions: DataTableRowAction<MyRow>[] = [
  {
    id: "view",
    label: "View details",
    icon: Eye,
    onSelect: ({ row, rowId }) => navigate(`/rows/${rowId}`)
  },
  {
    id: "delete",
    label: "Delete",
    icon: Trash,
    variant: "destructive",
    isVisible: (row) => row.status !== "archived",
    isDisabled: (row) => row.isLocked,
    onSelect: async ({ rowId }) => { await api.delete(`/rows/${rowId}`); }
  }
];

<DataTable rowActions={rowActions} ... />
```

**`DataTableRowAction<TRow>`:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | Yes | Unique action identifier. |
| `label` | `string` | Yes | Display text in the menu. |
| `icon` | `ComponentType` | No | Icon component (e.g. from `lucide-react`). |
| `variant` | `"default" \| "destructive"` | No | Visual style. Destructive actions render in red. |
| `isVisible` | `(row: TRow) => boolean` | No | Hide the action for certain rows. |
| `isDisabled` | `(row: TRow) => boolean` | No | Disable the action for certain rows. |
| `onSelect` | `(ctx: { row, rowId }) => void \| Promise<void>` | Yes | Callback when the action is selected. |

---

## Row Schema Validation

Provide a `rowSchema` to validate new rows created via the draft row. The schema uses a structural `safeParse` interface, so it works with Zod, Valibot, or any library that implements `{ safeParse(value) }`:

```tsx
import { z } from "zod";

const rowSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  amount: z.number().min(0),
  website: z.string().url()
});

<DataTable rowSchema={rowSchema} ... />
```

**`RowSchema<TRow>` interface:**

```ts
type RowSchema<TRow> = {
  safeParse: (value: TRow) => RowSchemaResult<TRow>;
};

type RowSchemaResult<TRow> =
  | { success: true; data: TRow }
  | { success: false; error: { issues: ReadonlyArray<RowSchemaIssue> } };

type RowSchemaIssue = {
  path: ReadonlyArray<PropertyKey>;
  message: string;
};
```

---

## Theming

### Theme Tokens

Pass a partial `theme` prop to override any subset of tokens. Unspecified tokens use the defaults.

```tsx
import { DEFAULT_THEME_TOKENS } from "@talentum/convex-datatable";

<DataTable
  theme={{
    headerBg: "linear-gradient(180deg, #1e293b, #0f172a)",
    rowBg: "#0f172a",
    rowHoverBg: "#1e293b",
    borderColor: "#334155",
    activeCellRing: "hsl(210 100% 60%)",
    selectionBg: "hsla(210 100% 60% / 0.15)"
  }}
  ...
/>
```

### Theme Tokens Reference

| Token | Type | Default | Description |
|-------|------|---------|-------------|
| `fontFamily` | `string` | `"'IBM Plex Sans', 'Avenir Next', 'Segoe UI', sans-serif"` | Table font family. |
| `radius` | `string` | `"14px"` | Border radius of the outer table container. |
| `borderColor` | `string` | `"hsl(215 18% 85%)"` | Cell and header border color. |
| `headerBg` | `string` | `"linear-gradient(180deg, hsl(210 33% 98%), hsl(210 35% 95%))"` | Header row background. |
| `pinnedHeaderBg` | `string` | `"linear-gradient(180deg, hsl(210 28% 96%), hsl(210 28% 92.5%))"` | Pinned column header background. |
| `rowBg` | `string` | `"hsl(0 0% 100%)"` | Row background. |
| `rowHoverBg` | `string` | `"hsl(206 45% 97%)"` | Row background on hover. |
| `pinnedRowBg` | `string` | `"hsl(210 20% 97%)"` | Pinned column cell background. |
| `pinnedRowHoverBg` | `string` | `"hsl(206 42% 95%)"` | Pinned column cell background on hover. |
| `pinnedShadow` | `string` | `"0 0 0 1px hsl(213 20% 84%), 0 8px 24px -16px hsl(215 30% 35%)"` | Box shadow for pinned column edges. |
| `activeCellRing` | `string` | `"hsl(206 90% 48%)"` | Outline color of the focused cell. |
| `selectionBg` | `string` | `"hsl(205 86% 94%)"` | Background color of selected cell ranges. |

### CSS Variables

Theme tokens are injected as CSS custom properties on the table root element. You can also target these in your own CSS:

| CSS Variable | Token |
|-------------|-------|
| `--dt-font-family` | `fontFamily` |
| `--dt-radius` | `radius` |
| `--dt-border-color` | `borderColor` |
| `--dt-header-bg` | `headerBg` |
| `--dt-pinned-header-bg` | `pinnedHeaderBg` |
| `--dt-row-bg` | `rowBg` |
| `--dt-row-hover-bg` | `rowHoverBg` |
| `--dt-pinned-row-bg` | `pinnedRowBg` |
| `--dt-pinned-row-hover-bg` | `pinnedRowHoverBg` |
| `--dt-pinned-shadow` | `pinnedShadow` |
| `--dt-active-cell-ring` | `activeCellRing` |
| `--dt-selection-bg` | `selectionBg` |

### Surface Variants

| Value | Description |
|-------|-------------|
| `"default"` | Standard appearance with borders and background styling (default). |
| `"plain"` | Minimal appearance without outer container styling. |

---

## Persistence

Convex DataTable automatically persists table view state (sorting, filters, column order, pinning, visibility, and column widths) to both the URL and `localStorage`. This allows users to share filtered/sorted views via URL and have their preferences remembered across sessions.

### URL Persistence

Table state is encoded into URL search parameters using a `dt_{tableId}_` prefix. For a table with `tableId="invoices"`:

| Parameter | Example |
|-----------|---------|
| `dt_invoices_sort` | `amount.desc` |
| `dt_invoices_filter` | `status.eq.s:active` |
| `dt_invoices_order` | `name,amount,status` |
| `dt_invoices_pin_left` | `name` |
| `dt_invoices_pin_right` | `actions` |
| `dt_invoices_hidden` | `description` |
| `dt_invoices_width` | `name.220` |

URL parameters are debounced at 150ms to avoid history spam.

### localStorage Persistence

State is also saved to `localStorage` under the key `rolha-grid:{pathname}:{tableId}:state:v1`. Storage writes are debounced at 250ms.

When both URL and storage state exist, **URL takes priority** for non-empty values.

### Persistence Utilities

These functions are exported for advanced use cases (e.g. server-side rendering, custom persistence):

```ts
import {
  encodePersistedStateToUrl,
  decodePersistedStateFromUrl,
  mergePersistedState,
  storageKey
} from "@talentum/convex-datatable";
```

| Function | Description |
|----------|-------------|
| `encodePersistedStateToUrl(tableId, state, currentParams)` | Encode persisted state into `URLSearchParams`. |
| `decodePersistedStateFromUrl(tableId, params, onError?)` | Decode persisted state from `URLSearchParams`. |
| `mergePersistedState(fromUrl, fromStorage)` | Merge URL and storage state (URL wins for non-empty). |
| `storageKey(pathname, tableId)` | Returns the `localStorage` key for the given table. |

---

## Convex Adapter

The Convex adapter provides two hooks for building a real-time, paginated data source backed by [Convex](https://convex.dev). Import from the dedicated subpath:

```ts
import { useConvexDataSource, useConvexPresence } from "@talentum/convex-datatable/convex";
```

### useConvexDataSource

Converts a Convex page query into a `DataTableDataSource`:

```tsx
import { useConvexDataSource } from "@talentum/convex-datatable/convex";

function useMyPageQuery(args: {
  cursor: string | null;
  pageSize: number;
  state: DataTableQueryState;
}) {
  const result = useQuery(api.myTable.listPage, args);
  if (!result) return { rows: [], nextCursor: null, status: "loading" as const, error: null };
  return { rows: result.rows, nextCursor: result.nextCursor, status: "loaded" as const, error: null };
}

const dataSource = useConvexDataSource({
  tableId: "my-table",
  pageSize: 25,
  usePageQuery: useMyPageQuery,
  createRow: async (draft) => { /* mutation */ },
  updateRows: async (changes) => { /* mutation */ },
  deleteRows: async (rowIds) => { /* mutation */ },
  restoreRows: async (rows) => { /* mutation */ }
});
```

**`ConvexDataSourceConfig<TRow>`:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `tableId` | `string` | Yes | Unique identifier matching your Convex table. |
| `pageSize` | `number` | No | Rows per page (default `50`). |
| `usePageQuery` | `(args) => ConvexPageResult<TRow>` | Yes | Hook returning page data. |
| `createRow` | `(draft: Partial<TRow>) => Promise<TRow>` | No | Create mutation. |
| `updateRows` | `(changes: RowPatch<TRow>[]) => Promise<void>` | No | Batch update mutation. |
| `deleteRows` | `(rowIds: string[]) => Promise<void>` | No | Delete mutation. |
| `restoreRows` | `(rows: TRow[]) => Promise<void>` | No | Restore mutation. |

**`ConvexPageResult<TRow>`** (returned by `usePageQuery`):

| Property | Type | Description |
|----------|------|-------------|
| `rows` | `ReadonlyArray<TRow>` | Rows for the current page. |
| `nextCursor` | `string \| null` | Cursor for the next page, or null if no more. |
| `status` | `"loading" \| "loaded" \| "error"` | Current load status. |
| `error` | `string \| null` | Error message, if any. |

### useConvexPresence

Adds real-time collaborative presence — colored outlines and name labels on the cells other users are currently viewing:

```tsx
import { useConvexPresence } from "@talentum/convex-datatable/convex";

const presence = useConvexPresence({
  tableId: "my-table",
  userId: currentUser.id,
  userName: currentUser.name,
  userColor: "#2563eb",          // optional; auto-assigned from palette if omitted
  usePresenceData: (tableId) => {
    return useQuery(api.presence.getPresence, { tableId }) ?? [];
  },
  sendHeartbeat: async (entry) => {
    await mutation(api.presence.heartbeat, entry);
  },
  debounceMs: 150,               // optional (default 150)
  heartbeatIntervalMs: 10_000    // optional (default 10s)
});

<DataTable
  collaborators={presence.collaborators}
  onActiveCellChange={presence.onActiveCellChange}
  ...
/>
```

**`ConvexPresenceConfig`:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `tableId` | `string` | Yes | Table identifier (must match data source). |
| `userId` | `string` | Yes | Current user's unique ID. |
| `userName` | `string` | Yes | Current user's display name. |
| `userColor` | `string` | No | Explicit hex color. If omitted, one is auto-assigned from a built-in palette. |
| `usePresenceData` | `(tableId: string) => ConvexPresenceEntry[]` | Yes | Hook returning all presence entries for the table. |
| `sendHeartbeat` | `(entry: ConvexPresenceEntry) => void \| Promise<void>` | Yes | Mutation to upsert the user's presence. |
| `debounceMs` | `number` | No | Debounce before sending heartbeat on cell change (default `150`). |
| `heartbeatIntervalMs` | `number` | No | Interval for keep-alive heartbeats (default `10000`). |

**Return value:**

| Property | Type | Description |
|----------|------|-------------|
| `collaborators` | `ReadonlyArray<CollaboratorPresence>` | Other users' presence data (pass to `DataTable`). |
| `onActiveCellChange` | `(cell: CollaboratorCellCoord \| null) => void` | Callback to pass to `DataTable`. |

### Convex Server Helpers

Server-side helper functions for setting up the presence table in your Convex backend:

```ts
import {
  presenceFields,
  heartbeatHandler,
  getPresenceHandler,
  clearStalePresenceHandler
} from "@talentum/convex-datatable/convex-server";
```

#### Schema Setup

Use `presenceFields` in your Convex schema:

```ts
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { presenceFields } from "@talentum/convex-datatable/convex-server";

export default defineSchema({
  presence: defineTable(presenceFields)
});
```

#### Handlers

Register the handlers as Convex functions:

```ts
// convex/presence.ts
import { mutation, query } from "./_generated/server";
import {
  heartbeatHandler,
  getPresenceHandler,
  clearStalePresenceHandler
} from "@talentum/convex-datatable/convex-server";

export const heartbeat = mutation(heartbeatHandler("presence"));
export const getPresence = query(getPresenceHandler("presence"));
export const clearStale = mutation(clearStalePresenceHandler("presence"));
```

| Handler | Type | Description |
|---------|------|-------------|
| `heartbeatHandler(tableName)` | Mutation | Upsert a user's presence entry (creates or updates). |
| `getPresenceHandler(tableName)` | Query | Returns all non-stale presence entries for a table (stale = 30s by default). |
| `clearStalePresenceHandler(tableName)` | Mutation | Removes stale entries; returns the count removed. |

---

## Keyboard Shortcuts

When `cellSelect` is enabled:

| Shortcut | Action |
|----------|--------|
| Arrow keys | Move active cell |
| Tab / Shift+Tab | Move to next/previous cell |
| Enter / F2 | Start editing the active cell |
| Escape | Cancel edit, or deselect cell |
| Ctrl+C / Cmd+C | Copy selected range as TSV |
| Ctrl+V / Cmd+V | Paste from clipboard into cells |
| Ctrl+Z / Cmd+Z | Undo last edit or paste |
| Ctrl+Shift+Z / Cmd+Shift+Z | Redo |
| Shift+Click | Extend selection to a range |
| Delete / Backspace | Clear cell content (when editing) |

---

## Clipboard

- **Copy:** Copies the selected cell range as tab-separated values (TSV). Multi-row selections include newlines.
- **Paste:** Parses TSV from the clipboard and writes values into the grid starting at the active cell. The paste matrix is expanded to fill the selection if the pasted area is smaller.
- **Serialization:** Each column kind has built-in clipboard serialization. Override with `serializeClipboard` and `parseClipboard` on the column definition.

---

## Client-Side Filtering

The `applyClientQuery` utility is re-exported from the DataTable component for use in in-memory data sources:

```ts
import { DataTable } from "@talentum/convex-datatable";

// DataTable.applyClientQuery is available as a static export
const filtered = applyClientQuery(rows, { sorting, filters }, columnByIdMap);
```

This applies the same filter operators and sort logic that the table uses internally, useful when implementing an in-memory `useRows` function.

---

## Package Exports

| Import Path | Contents |
|-------------|----------|
| `@talentum/convex-datatable` | `DataTable`, `DataTableContainer`, all types, defaults, persistence utilities |
| `@talentum/convex-datatable/styles.css` | Bundled CSS stylesheet |
| `@talentum/convex-datatable/convex` | `useConvexDataSource`, `useConvexPresence` |
| `@talentum/convex-datatable/convex-server` | `presenceFields`, `heartbeatHandler`, `getPresenceHandler`, `clearStalePresenceHandler` |

---

## API Reference

### DataTableProps

```ts
type DataTableProps<TRow extends DataTableRowModel> = {
  tableId: string;
  columns: ReadonlyArray<DataTableColumn<TRow>>;
  getRowId: (row: TRow) => RowId;
  dataSource: DataTableDataSource<TRow>;
  rowSchema?: RowSchema<TRow>;
  features?: DataTableFeatureFlags;
  rowActions?: ReadonlyArray<DataTableRowAction<TRow>>;
  minRowHeight?: number;
  pageSize?: number;
  theme?: Partial<DataTableThemeTokens>;
  surface?: "default" | "plain";
  className?: string;
  collaborators?: ReadonlyArray<CollaboratorPresence>;
  onActiveCellChange?: (cell: CollaboratorCellCoord | null) => void;
  onError?: DataTableOnError;
};
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `tableId` | `string` | Yes | — | Unique ID used for persistence keys. |
| `columns` | `DataTableColumn<TRow>[]` | Yes | — | Column definitions. |
| `getRowId` | `(row: TRow) => string` | Yes | — | Extract a unique ID from each row. |
| `dataSource` | `DataTableDataSource<TRow>` | Yes | — | Data fetching and mutation interface. |
| `rowSchema` | `RowSchema<TRow>` | No | — | Schema for validating draft rows. |
| `features` | `DataTableFeatureFlags` | No | See [defaults](#feature-flags) | Feature toggles (merged with defaults). |
| `rowActions` | `DataTableRowAction<TRow>[]` | No | — | Per-row action menu items. |
| `minRowHeight` | `number` | No | `40` | Minimum row height in pixels. |
| `pageSize` | `number` | No | `50` | Rows per page for pagination. |
| `theme` | `Partial<DataTableThemeTokens>` | No | See [defaults](#theme-tokens-reference) | Partial theme overrides. |
| `surface` | `"default" \| "plain"` | No | `"default"` | Container visual style. |
| `className` | `string` | No | — | Additional CSS class on the table root. |
| `collaborators` | `CollaboratorPresence[]` | No | — | Other users' presence data. |
| `onActiveCellChange` | `(cell \| null) => void` | No | — | Callback when the local user's active cell changes. |
| `onError` | `(message: string) => void` | No | — | Error callback for persistence and validation errors. |

### DataTableColumn

A discriminated union of all column kinds. See [Column Kinds](#column-kinds) for details on each variant.

```ts
type DataTableColumn<TRow> =
  | TextColumn<TRow>
  | LongTextColumn<TRow>
  | NumberColumn<TRow>
  | CurrencyColumn<TRow>
  | SelectColumn<TRow>
  | MultiSelectColumn<TRow>
  | LinkColumn<TRow>
  | DateColumn<TRow>
  | ReactNodeColumn<TRow>;
```

### DataTableDataSource

```ts
type DataTableDataSource<TRow> = {
  useRows: (query: DataTableQueryState) => DataTableRowsResult<TRow>;
  createRow?: (draft: Partial<TRow>) => Promise<TRow>;
  updateRows?: (changes: ReadonlyArray<RowPatch<TRow>>) => Promise<void>;
  deleteRows?: (rowIds: ReadonlyArray<RowId>) => Promise<void>;
  restoreRows?: (rows: ReadonlyArray<TRow>) => Promise<void>;
};
```

### DataTableFeatureFlags

```ts
type DataTableFeatureFlags = {
  columnResize?: boolean;
  rowResize?: boolean;
  columnReorder?: boolean;
  columnPinning?: boolean;
  columnVisibility?: boolean;
  columnFilter?: boolean;
  columnSort?: boolean;
  rowDelete?: boolean;
  rowSelect?: boolean;
  rowAdd?: boolean;
  rowActions?: boolean;
  editing?: boolean;
  cellSelect?: boolean;
  clipboardCopy?: boolean;
  clipboardPaste?: boolean;
  undo?: boolean;
  infiniteScroll?: boolean;
  virtualization?: boolean;
};
```

### DataTableThemeTokens

```ts
type DataTableThemeTokens = {
  fontFamily: string;
  radius: string;
  borderColor: string;
  headerBg: string;
  pinnedHeaderBg: string;
  rowBg: string;
  rowHoverBg: string;
  pinnedRowBg: string;
  pinnedRowHoverBg: string;
  pinnedShadow: string;
  activeCellRing: string;
  selectionBg: string;
};
```

### DataTableRowAction

```ts
type DataTableRowAction<TRow> = {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  variant?: "default" | "destructive";
  isVisible?: (row: TRow) => boolean;
  isDisabled?: (row: TRow) => boolean;
  onSelect: (ctx: DataTableRowActionContext<TRow>) => void | Promise<void>;
};
```

### DataTableQueryState

```ts
type DataTableQueryState = {
  sorting: ReadonlyArray<DataTableSort>;
  filters: ReadonlyArray<DataTableFilter>;
  pageSize: number;
  cursor: string | null;
};
```

### CollaboratorPresence

```ts
type CollaboratorPresence = {
  userId: string;
  name: string;
  color: string;
  activeCell: CollaboratorCellCoord | null;
};

type CollaboratorCellCoord = {
  rowId: RowId;
  columnId: ColumnId;
};
```

### ConvexDataSourceConfig

```ts
type ConvexDataSourceConfig<TRow> = {
  tableId: string;
  pageSize?: number;
  usePageQuery: (args: {
    cursor: string | null;
    pageSize: number;
    state: DataTableQueryState;
  }) => ConvexPageResult<TRow>;
  createRow?: (draft: Partial<TRow>) => Promise<TRow>;
  updateRows?: (changes: ReadonlyArray<RowPatch<TRow>>) => Promise<void>;
  deleteRows?: (rowIds: ReadonlyArray<RowId>) => Promise<void>;
  restoreRows?: (rows: ReadonlyArray<TRow>) => Promise<void>;
};
```

### ConvexPresenceConfig

```ts
type ConvexPresenceConfig = {
  tableId: string;
  userId: string;
  userName: string;
  userColor?: string;
  usePresenceData: (tableId: string) => ReadonlyArray<ConvexPresenceEntry>;
  sendHeartbeat: (entry: ConvexPresenceEntry) => void | Promise<void>;
  debounceMs?: number;
  heartbeatIntervalMs?: number;
};
```

### RowSchema

```ts
type RowSchema<TRow> = {
  safeParse: (value: TRow) => RowSchemaResult<TRow>;
};
```

---

## TypeScript

Convex DataTable is written in strict TypeScript with `noImplicitAny`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` enabled. All public types are exported from the main entry point.

The `field` property on column definitions is typed as `StringKey<TRow>` (i.e. `Extract<keyof TRow, string>`), which means TypeScript will reject invalid field names at compile time:

```ts
type MyRow = { id: string; name: string; age: number };

// OK
const col: DataTableColumn<MyRow> = { id: "name", field: "name", header: "Name", kind: "text" };

// Compile error: '"invalid"' is not assignable to '"id" | "name" | "age"'
const bad: DataTableColumn<MyRow> = { id: "x", field: "invalid", header: "X", kind: "text" };
```

---

## Browser Support

Convex DataTable targets modern browsers with ES2022 support:

- Chrome / Edge 94+
- Firefox 93+
- Safari 15.4+

---

## License

[MIT](./LICENSE)
