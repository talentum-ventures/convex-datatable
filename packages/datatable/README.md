# `@talentum/convex-datatable`

`@talentum/convex-datatable` is a production-focused React data table with an Airtable-style feature set and a library-shaped API. You work with typed columns, a typed data source, feature flags, theme tokens, and optional Convex helpers without importing TanStack state directly.

## Install

```bash
npm install @talentum/convex-datatable
```

Peer dependencies:

- `react`
- `react-dom`
- `convex` is optional unless you use the Convex adapters

## Styling

Recommended:

```ts
import "@talentum/convex-datatable/styles.css";
```

If your app already runs Tailwind and you intentionally want Convex DataTable styles folded into your own generated stylesheet, add this scan path:

```txt
node_modules/@talentum/convex-datatable/dist/**/*.js
```

Scanning installed package files is toolchain-dependent, so the explicit CSS import remains the default recommendation.

## Minimal Usage

```tsx
import "@talentum/convex-datatable/styles.css";
import {
  DataTable,
  type DataTableColumn,
  type DataTableDataSource
} from "@talentum/convex-datatable";

type InvoiceRow = {
  id: string;
  customer: string;
  amount: number;
  status: string;
  issuedAt: string;
};

const rows: ReadonlyArray<InvoiceRow> = [
  {
    id: "inv_1",
    customer: "Acme Corp",
    amount: 1250,
    status: "draft",
    issuedAt: "2026-03-01"
  },
  {
    id: "inv_2",
    customer: "Globex",
    amount: 3180,
    status: "paid",
    issuedAt: "2026-03-02"
  }
];

const columns: ReadonlyArray<DataTableColumn<InvoiceRow>> = [
  {
    id: "customer",
    field: "customer",
    header: "Customer",
    kind: "text"
  },
  {
    id: "amount",
    field: "amount",
    header: "Amount",
    kind: "currency",
    currency: "USD"
  },
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
  {
    id: "issuedAt",
    field: "issuedAt",
    header: "Issued",
    kind: "date"
  }
];

const dataSource: DataTableDataSource<InvoiceRow> = {
  useRows: () => ({
    rows,
    hasMore: false,
    isLoading: false,
    isLoadingMore: false,
    error: null,
    loadMore: () => undefined,
    refresh: () => undefined
  })
};

export function InvoicesTable(): JSX.Element {
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

## What You Get

- Typed column kinds for text, long text, number, currency, select, multiselect, link, date, and custom React node cells
- Inline editing, row creation, row deletion, undo, clipboard copy and paste, and spreadsheet-style selection
- Sorting, filtering, resizing, reordering, visibility, and pinning
- Infinite scroll and virtualization
- URL and `localStorage` persistence
- Optional Convex data-source and presence adapters

## Convex

Preferred client imports:

```ts
import { useConvexDataSource, useConvexPresence } from "@talentum/convex-datatable/convex";
```

Server helpers:

```ts
import {
  clearStalePresenceHandler,
  getPresenceHandler,
  heartbeatHandler
} from "@talentum/convex-datatable/convex-server";
```

The root package still re-exports the client Convex hooks for compatibility, but `@talentum/convex-datatable/convex` is the preferred path for new code.

## Theming

Use the public theme exports to start from the defaults and override only what you need:

```tsx
import {
  DEFAULT_THEME_TOKENS,
  DataTable,
  type DataTableThemeTokens
} from "@talentum/convex-datatable";

const theme: DataTableThemeTokens = {
  ...DEFAULT_THEME_TOKENS,
  headerBg: "linear-gradient(180deg, hsl(222 50% 98%), hsl(222 42% 94%))",
  rowHoverBg: "hsl(222 48% 97%)",
  activeCellRing: "hsl(221 83% 53%)"
};

export function ThemedTable(): JSX.Element {
  return <DataTable tableId="themed" columns={columns} getRowId={(row) => row.id} dataSource={dataSource} theme={theme} />;
}
```

You can also pass a partial `theme` prop if you only want to change a few tokens.

## Package Exports

- `@talentum/convex-datatable`
- `@talentum/convex-datatable/styles.css`
- `@talentum/convex-datatable/convex`
- `@talentum/convex-datatable/convex-server`
