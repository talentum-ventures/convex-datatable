import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type {
  CollaboratorCellCoord,
  CollaboratorPresence,
  ConvexDataSourceConfig,
  ConvexPresenceConfig,
  DataTableColumn,
  DataTableDataSource,
  DataTableFeatureFlags,
  DataTableProps,
  DataTableRowAction
} from "@talentum/convex-datatable";
import { useConvexPresence } from "@talentum/convex-datatable";
import {
  clearStalePresenceHandler,
  getPresenceHandler,
  heartbeatHandler,
  presenceFields
} from "@talentum/convex-datatable/convex-server";

type InvoiceRow = {
  id: string;
  description: string;
  amount: number;
  status: string;
  tags: string[];
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
      {
        value: "todo",
        label: "To Do",
        colorClass: "bg-amber-100 text-amber-700"
      }
    ]
  },
  {
    id: "tags",
    field: "tags",
    header: "Tags",
    kind: "multiselect",
    options: [
      {
        value: "urgent",
        label: "Urgent",
        colorClass: "bg-rose-100 text-rose-700"
      }
    ]
  },
  {
    id: "createdAt",
    field: "createdAt",
    header: "Created",
    kind: "date"
  }
];

const rowAction: DataTableRowAction<InvoiceRow> = {
  id: "archive",
  label: "Archive",
  onSelect: ({ rowId }) => {
    expectTypeOf(rowId).toEqualTypeOf<string>();
  }
};

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
  deleteRows: async () => undefined,
  restoreRows: async () => undefined,
  createRow: async (draft) => ({
    id: "x",
    description: String(draft.description ?? ""),
    amount: Number(draft.amount ?? 0),
    status: String(draft.status ?? "todo"),
    tags: Array.isArray(draft.tags) ? draft.tags : [],
    createdAt: String(draft.createdAt ?? "")
  })
};

const featureFlags: DataTableFeatureFlags = {
  autoSave: false
};

const props: DataTableProps<InvoiceRow> = {
  tableId: "invoice-table",
  columns,
  getRowId: (row) => row.id,
  dataSource,
  features: featureFlags,
  rowSchema: z.object({
    id: z.string(),
    description: z.string(),
    amount: z.number(),
    status: z.string(),
    tags: z.array(z.string()),
    createdAt: z.string()
  }),
  rowActions: [rowAction],
  surface: "plain",
  collaborators: [
    {
      userId: "remote-user",
      name: "Remote",
      color: "#2563eb",
      activeCell: {
        rowId: "invoice-1",
        columnId: "description"
      }
    }
  ],
  onActiveCellChange: (cell) => {
    expectTypeOf(cell).toEqualTypeOf<CollaboratorCellCoord | null>();
  }
};

describe("public api", () => {
  it("keeps DataTableProps fully typed", () => {
    expectTypeOf(props.getRowId).returns.toEqualTypeOf<string>();
    expectTypeOf(props.columns).toEqualTypeOf<ReadonlyArray<DataTableColumn<InvoiceRow>>>();
  });

  it("keeps Convex adapter config typed", () => {
    const config: ConvexDataSourceConfig<InvoiceRow> = {
      tableId: "invoice-table",
      usePageQuery: () => ({
        rows: [],
        nextCursor: null,
        status: "loaded",
        error: null
      })
    };

    expectTypeOf(config.tableId).toEqualTypeOf<string>();
  });

  it("keeps collaborative presence hooks typed", () => {
    const config: ConvexPresenceConfig = {
      tableId: "invoice-table",
      userId: "local-user",
      userName: "Local",
      usePresenceData: () => [],
      sendHeartbeat: () => undefined
    };

    expectTypeOf(config.userId).toEqualTypeOf<string>();
    expectTypeOf(useConvexPresence).parameters.toEqualTypeOf<[ConvexPresenceConfig]>();
    expectTypeOf<ReturnType<typeof useConvexPresence>["collaborators"]>().toEqualTypeOf<
      ReadonlyArray<CollaboratorPresence>
    >();
  });

  it("exposes the Convex server helpers on the public subpath", () => {
    expectTypeOf(presenceFields.tableId).toBeObject();
    expectTypeOf(heartbeatHandler).toBeFunction();
    expectTypeOf(getPresenceHandler).toBeFunction();
    expectTypeOf(clearStalePresenceHandler).toBeFunction();
  });

  it("rejects invalid field access", () => {
    const invalidColumn: DataTableColumn<InvoiceRow> = {
      id: "invalid",
      // @ts-expect-error invalid field must exist on row type
      field: "missing",
      header: "Invalid",
      kind: "text"
    };

    expectTypeOf(invalidColumn.id).toEqualTypeOf<string>();
  });
});
