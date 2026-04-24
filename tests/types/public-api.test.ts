import { describe, expectTypeOf, it } from "vitest";
import type {
  CollaboratorCellCoord,
  CollaboratorPresence,
  ConvexDataSourceConfig,
  ConvexPresenceConfig,
  DataTableColumn,
  DataTableDataSource,
  DataTableFilter,
  DataTableFeatureFlags,
  DataTableProps,
  DataTableRowAction,
  DataTableToolbarState,
  FilterOperator,
  RowSchema,
  SelectOption
} from "@talentum-ventures/convex-datatable";
import { useConvexPresence } from "@talentum-ventures/convex-datatable/convex";
import {
  clearStalePresenceHandler,
  getPresenceHandler,
  heartbeatHandler,
  presenceFields
} from "@talentum-ventures/convex-datatable/convex-server";

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

const featureFlags: DataTableFeatureFlags = {};

const invalidFeatureFlags: DataTableFeatureFlags = {
  // @ts-expect-error autoSave was removed from the public feature flags
  autoSave: false
};

const rowSchema: RowSchema<InvoiceRow> = {
  safeParse: (value) => ({
    success: true,
    data: value
  })
};

const props: DataTableProps<InvoiceRow> = {
  tableId: "invoice-table",
  columns,
  getRowId: (row) => row.id,
  dataSource,
  features: featureFlags,
  rowSchema,
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
  },
  renderToolbar: (state) => {
    expectTypeOf(state).toEqualTypeOf<DataTableToolbarState>();
    return state.hiddenColumns.length;
  }
};

describe("public api", () => {
  it("keeps DataTableProps fully typed", () => {
    expectTypeOf(props.getRowId).returns.toEqualTypeOf<string>();
    expectTypeOf(props.columns).toEqualTypeOf<ReadonlyArray<DataTableColumn<InvoiceRow>>>();
    expectTypeOf(invalidFeatureFlags).toEqualTypeOf<DataTableFeatureFlags>();
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

  it("supports row-aware options and inline option styles", () => {
    const dynamicSelectColumn: DataTableColumn<InvoiceRow> = {
      id: "status",
      field: "status",
      header: "Status",
      kind: "select",
      getOptions: (row) => [
        {
          value: row.status,
          label: "Dynamic",
          colorStyle: {
            backgroundColor: "#111827",
            color: "#ffffff"
          }
        }
      ]
    };
    const styledMultiSelectColumn: DataTableColumn<InvoiceRow> = {
      id: "tags",
      field: "tags",
      header: "Tags",
      kind: "multiselect",
      options: [
        {
          value: "urgent",
          label: "Urgent",
          colorStyle: {
            backgroundColor: "#fecaca",
            color: "#7f1d1d",
            borderColor: "#ef4444"
          }
        }
      ]
    };
    const invalidSelectColumn: DataTableColumn<InvoiceRow> = {
      id: "invalid",
      field: "status",
      header: "Invalid",
      kind: "select",
      options: [],
      // @ts-expect-error options and getOptions are mutually exclusive
      getOptions: () => []
    };
    // @ts-expect-error SelectOption requires colorClass or colorStyle
    const invalidOption: SelectOption = {
      value: "todo",
      label: "To Do"
    };
    const invalidOptionColumn: DataTableColumn<InvoiceRow> = {
      id: "invalid-option",
      field: "status",
      header: "Invalid option",
      kind: "select",
      options: [invalidOption]
    };

    expectTypeOf(dynamicSelectColumn.id).toEqualTypeOf<string>();
    expectTypeOf(styledMultiSelectColumn.id).toEqualTypeOf<string>();
    expectTypeOf(invalidSelectColumn.id).toEqualTypeOf<string>();
    expectTypeOf(invalidOptionColumn.id).toEqualTypeOf<string>();
  });

  it("exposes empty-filter configuration and operators in the public types", () => {
    const filter: DataTableFilter = {
      columnId: "status",
      op: "isEmpty",
      value: null
    };
    const explicitTextColumn: DataTableColumn<InvoiceRow> = {
      id: "description-empty",
      field: "description",
      header: "Description",
      kind: "text",
      allowEmptyFilter: true
    };
    const explicitSelectColumn: DataTableColumn<InvoiceRow> = {
      id: "status-no-empty",
      field: "status",
      header: "Status",
      kind: "select",
      allowEmptyFilter: false,
      options: [
        {
          value: "todo",
          label: "To Do",
          colorClass: "bg-amber-100 text-amber-700"
        }
      ]
    };

    expectTypeOf<FilterOperator>().toMatchTypeOf<DataTableFilter["op"]>();
    expectTypeOf(filter.op).toEqualTypeOf<FilterOperator>();
    expectTypeOf(explicitTextColumn.allowEmptyFilter).toEqualTypeOf<boolean | undefined>();
    expectTypeOf(explicitSelectColumn.allowEmptyFilter).toEqualTypeOf<boolean | undefined>();
  });
});
