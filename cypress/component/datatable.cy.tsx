/// <reference types="@testing-library/cypress" />

import { useMemo, useState } from "react";
import {
  DataTable,
  type CollaboratorPresence,
  type DataTableColumn,
  type DataTableDataSource,
  type DataTableFeatureFlags,
  type DataTableRowAction
} from "@talentum-ventures/convex-datatable";
import { Toaster, toast } from "sonner";
import { applyServerQuery } from "../../apps/demo/src/demo-query";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  amount: number;
  notes?: string;
  website?: string;
};

type DateRow = {
  id: string;
  due: string;
};

type MultiSelectRow = {
  id: string;
  tags: ReadonlyArray<string>;
};

type FilterableMultiSelectRow = {
  id: string;
  title: string;
  tags: ReadonlyArray<string>;
};

type OptionParsingRow = {
  id: string;
  status: string;
  tags: ReadonlyArray<string>;
};

type DynamicOptionRow = {
  id: string;
  area: string;
  goal: string;
  owners: ReadonlyArray<string>;
};

const columns: ReadonlyArray<DataTableColumn<TaskRow>> = [
  {
    id: "title",
    field: "title",
    header: "Title",
    kind: "text",
    isEditable: true
  },
  {
    id: "status",
    field: "status",
    header: "Status",
    kind: "select",
    options: [
      { value: "todo", label: "To do", colorClass: "bg-slate-100 text-slate-700" },
      { value: "done", label: "Done", colorClass: "bg-emerald-100 text-emerald-700" }
    ],
    isEditable: true
  },
  {
    id: "amount",
    field: "amount",
    header: "Amount",
    kind: "number",
    isEditable: true
  }
];

const alignmentColumns: ReadonlyArray<DataTableColumn<TaskRow>> = [
  {
    id: "title",
    field: "title",
    header: "Title",
    kind: "text",
    width: 160
  },
  {
    id: "status",
    field: "status",
    header: "Status",
    kind: "select",
    width: 140,
    options: [
      { value: "todo", label: "To do", colorClass: "bg-slate-100 text-slate-700" },
      { value: "done", label: "Done", colorClass: "bg-emerald-100 text-emerald-700" }
    ]
  },
  {
    id: "amount",
    field: "amount",
    header: "Amount",
    kind: "number",
    width: 120
  }
];

const linkOverflowColumns: ReadonlyArray<DataTableColumn<TaskRow>> = [
  {
    id: "title",
    field: "title",
    header: "Title",
    kind: "text",
    width: 120
  },
  {
    id: "website",
    field: "website",
    header: "Website",
    kind: "link",
    width: 120
  },
  {
    id: "amount",
    field: "amount",
    header: "Amount",
    kind: "number",
    width: 100
  }
];

const multilineTextColumns: ReadonlyArray<DataTableColumn<TaskRow>> = [
  {
    id: "title",
    field: "title",
    header: "Title",
    kind: "text",
    width: 160
  }
];

const measuredRowColumns: ReadonlyArray<DataTableColumn<TaskRow>> = [
  {
    id: "notes",
    field: "notes",
    header: "Notes",
    kind: "longText",
    width: 150
  },
  {
    id: "status",
    field: "status",
    header: "Status",
    kind: "select",
    width: 120,
    options: [
      { value: "todo", label: "To do", colorClass: "bg-slate-100 text-slate-700" },
      { value: "done", label: "Done", colorClass: "bg-emerald-100 text-emerald-700" }
    ]
  }
];

const dateColumns: ReadonlyArray<DataTableColumn<DateRow>> = [
  {
    id: "due",
    field: "due",
    header: "Due",
    kind: "date",
    locale: "pt-BR",
    dateStyle: "medium",
    isEditable: true
  }
];

const multiSelectColumns: ReadonlyArray<DataTableColumn<MultiSelectRow>> = [
  {
    id: "tags",
    field: "tags",
    header: "Tags",
    kind: "multiselect",
    isEditable: true,
    width: 220,
    options: [
      { value: "urgent", label: "Urgent", colorClass: "bg-rose-100 text-rose-700" },
      { value: "design", label: "Design", colorClass: "bg-violet-100 text-violet-700" },
      { value: "backend", label: "Backend", colorClass: "bg-slate-100 text-slate-700" },
      { value: "ops", label: "Ops", colorClass: "bg-sky-100 text-sky-700" }
    ]
  }
];

const multiSelectFilterColumns: ReadonlyArray<DataTableColumn<FilterableMultiSelectRow>> = [
  {
    id: "title",
    field: "title",
    header: "Title",
    kind: "text",
    width: 180
  },
  {
    id: "tags",
    field: "tags",
    header: "Tags",
    kind: "multiselect",
    width: 220,
    options: [
      { value: "urgent", label: "Urgent", colorClass: "bg-rose-100 text-rose-700" },
      { value: "backend", label: "Backend", colorClass: "bg-slate-100 text-slate-700" },
      { value: "ops", label: "Ops", colorClass: "bg-sky-100 text-sky-700" }
    ]
  }
];

const optionParsingColumns: ReadonlyArray<DataTableColumn<OptionParsingRow>> = [
  {
    id: "status",
    field: "status",
    header: "Status",
    kind: "select",
    isEditable: true,
    width: 150,
    options: [
      { value: "todo", label: "To do", colorClass: "bg-slate-100 text-slate-700" },
      { value: "done", label: "Done", colorClass: "bg-emerald-100 text-emerald-700" }
    ]
  },
  {
    id: "tags",
    field: "tags",
    header: "Tags",
    kind: "multiselect",
    isEditable: true,
    width: 220,
    options: [
      { value: "urgent", label: "Urgent", colorClass: "bg-rose-100 text-rose-700" },
      { value: "design", label: "Design", colorClass: "bg-violet-100 text-violet-700" },
      { value: "backend", label: "Backend", colorClass: "bg-slate-100 text-slate-700" }
    ]
  }
];

const dynamicOptionColumns: ReadonlyArray<DataTableColumn<DynamicOptionRow>> = [
  {
    id: "area",
    field: "area",
    header: "Area",
    kind: "text",
    width: 140
  },
  {
    id: "goal",
    field: "goal",
    header: "Goal",
    kind: "select",
    isEditable: true,
    width: 180,
    getOptions: (row) =>
      row.area === "Product"
        ? [
            {
              value: "ship",
              label: "Ship roadmap",
              colorStyle: {
                backgroundColor: "rgb(254, 240, 138)",
                color: "rgb(113, 63, 18)"
              }
            },
            {
              value: "plan",
              label: "Plan sprint",
              colorClass: "bg-slate-100 text-slate-700"
            }
          ]
        : [
            {
              value: "close",
              label: "Close deals",
              colorStyle: {
                backgroundColor: "rgb(191, 219, 254)",
                color: "rgb(30, 64, 175)"
              }
            },
            {
              value: "expand",
              label: "Expand accounts",
              colorClass: "bg-emerald-100 text-emerald-700"
            }
          ]
  },
  {
    id: "owners",
    field: "owners",
    header: "Owners",
    kind: "multiselect",
    isEditable: true,
    width: 220,
    getOptions: (row) =>
      row.area === "Product"
        ? [
            {
              value: "maya",
              label: "Maya",
              colorStyle: {
                backgroundColor: "rgb(254, 226, 226)",
                color: "rgb(153, 27, 27)",
                borderColor: "rgb(248, 113, 113)"
              }
            }
          ]
        : [
            {
              value: "rui",
              label: "Rui",
              colorStyle: {
                backgroundColor: "rgb(219, 234, 254)",
                color: "rgb(30, 64, 175)",
                borderColor: "rgb(96, 165, 250)"
              }
            }
          ]
  }
];

function assertHeaderBodyColumnAlignment(columnId: string, rowId: string): void {
  cy.get(`th[data-column-id='${columnId}']`)
    .first()
    .then(($headerCell) => {
      const headerRect = $headerCell[0].getBoundingClientRect();

      cy.get(`tr[data-row-id='${rowId}'] [role='gridcell'][data-column-id='${columnId}']`)
        .first()
        .closest("td")
        .then(($bodyCell) => {
          const bodyRect = $bodyCell[0].getBoundingClientRect();
          expect(Math.abs(headerRect.left - bodyRect.left), `${columnId} left edge alignment`).to.be.lte(1);
          expect(Math.abs(headerRect.right - bodyRect.right), `${columnId} right edge alignment`).to.be.lte(1);
          expect(Math.abs(headerRect.width - bodyRect.width), `${columnId} width alignment`).to.be.lte(1);
        });
    });
}

function assertBodyColumnWidthConsistency(columnId: string, firstRowId: string, secondRowId: string): void {
  cy.get(`tr[data-row-id='${firstRowId}'] [role='gridcell'][data-column-id='${columnId}']`)
    .first()
    .closest("td")
    .then(($firstBodyCell) => {
      const firstRect = $firstBodyCell[0].getBoundingClientRect();

      cy.get(`tr[data-row-id='${secondRowId}'] [role='gridcell'][data-column-id='${columnId}']`)
        .first()
        .closest("td")
        .then(($secondBodyCell) => {
          const secondRect = $secondBodyCell[0].getBoundingClientRect();
          expect(Math.abs(firstRect.width - secondRect.width), `${columnId} row-to-row width consistency`).to.be.lte(1);
          expect(Math.abs(firstRect.left - secondRect.left), `${columnId} row-to-row left edge consistency`).to.be.lte(1);
          expect(Math.abs(firstRect.right - secondRect.right), `${columnId} row-to-row right edge consistency`).to.be.lte(1);
        });
    });
}

function dispatchPlainTextPaste(win: Window, node: Element, text: string): boolean {
  const pasteEvent =
    typeof win.ClipboardEvent === "function"
      ? new win.ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true
        })
      : new win.Event("paste", {
          bubbles: true,
          cancelable: true
        });

  Object.defineProperty(pasteEvent, "clipboardData", {
    value: {
      getData: (format: string): string => (format === "text/plain" ? text : "")
    }
  });

  node.dispatchEvent(pasteEvent);
  return pasteEvent.defaultPrevented;
}

function dispatchDocumentMouseEvent(doc: Document, type: "mousemove" | "mouseup", clientX?: number): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: clientX ?? 0
  });

  doc.dispatchEvent(event);
}

function Harness({
  tableId,
  features,
  rowActions
}: {
  tableId: string;
  features?: DataTableFeatureFlags;
  rowActions?: ReadonlyArray<DataTableRowAction<TaskRow>>;
}): JSX.Element {
  const [rows, setRows] = useState<ReadonlyArray<TaskRow>>([
    { id: "1", title: "Build UI", status: "todo", amount: 10 },
    { id: "2", title: "Ship", status: "done", amount: 20 }
  ]);
  const tableFeatures = useMemo<DataTableFeatureFlags>(
    () => ({
      editing: true,
      rowDelete: true,
      rowAdd: true,
      clipboardPaste: true,
      ...features
    }),
    [features]
  );

  const dataSource = useMemo<DataTableDataSource<TaskRow>>(
    () => ({
      useRows: () => ({
        rows,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMore: () => undefined,
        refresh: () => undefined
      }),
      updateRows: async (changes) => {
        setRows((current) =>
          current.map((row) => {
            const patch = changes.find((entry) => entry.rowId === row.id)?.patch;
            return patch
              ? {
                  ...row,
                  ...patch
                }
              : row;
          })
        );
      },
      deleteRows: async (rowIds) => {
        setRows((current) => current.filter((row) => !rowIds.includes(row.id)));
      },
      restoreRows: async (deletedRows) => {
        setRows((current) => [...deletedRows, ...current]);
      },
      createRow: async (draft) => {
        const row: TaskRow = {
          id: crypto.randomUUID(),
          title: String(draft.title ?? ""),
          status: String(draft.status ?? "todo"),
          amount: Number(draft.amount ?? 0)
        };
        setRows((current) => [row, ...current]);
        return row;
      }
    }),
    [rows]
  );

  return (
    <div className="p-4">
      <DataTable
        tableId={tableId}
        columns={columns}
        dataSource={dataSource}
        getRowId={(row) => row.id}
        features={tableFeatures}
        rowActions={rowActions}
      />
      <output data-testid="title-raw">{rows[0]?.title ?? ""}</output>
      <output data-testid="status-raw">{rows[0]?.status ?? ""}</output>
      <output data-testid="amount-raw">{String(rows[0]?.amount ?? "")}</output>
    </div>
  );
}

function RowActionsHarness({ tableId }: { tableId: string }): JSX.Element {
  const rowActions = useMemo<ReadonlyArray<DataTableRowAction<TaskRow>>>(
    () => [
      {
        id: "archive",
        label: "Archive",
        onSelect: ({ rowId }) => {
          toast.message(`Archived ${rowId}`);
        }
      },
      {
        id: "lock",
        label: "Lock",
        isDisabled: (row) => row.status === "done",
        onSelect: ({ rowId }) => {
          toast.message(`Locked ${rowId}`);
        }
      }
    ],
    []
  );

  return (
    <div className="p-4">
      <Harness tableId={tableId} rowActions={rowActions} />
      <Toaster />
    </div>
  );
}

function PresenceHarness({ tableId }: { tableId: string }): JSX.Element {
  const rows = useMemo<ReadonlyArray<TaskRow>>(
    () => [
      { id: "1", title: "Build UI", status: "todo", amount: 10 },
      { id: "2", title: "Ship", status: "done", amount: 20 }
    ],
    []
  );
  const collaborators = useMemo<ReadonlyArray<CollaboratorPresence>>(
    () => [
      {
        userId: "maya",
        name: "Maya",
        color: "#2563eb",
        activeCell: {
          rowId: "1",
          columnId: "title"
        }
      },
      {
        userId: "rui",
        name: "Rui",
        color: "#dc2626",
        activeCell: {
          rowId: "1",
          columnId: "title"
        }
      },
      {
        userId: "ana",
        name: "Ana",
        color: "#059669",
        activeCell: {
          rowId: "2",
          columnId: "status"
        }
      }
    ],
    []
  );
  const dataSource = useMemo<DataTableDataSource<TaskRow>>(
    () => ({
      useRows: () => ({
        rows,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMore: () => undefined,
        refresh: () => undefined
      })
    }),
    [rows]
  );

  return (
    <div className="p-4">
      <DataTable
        tableId={tableId}
        columns={columns}
        dataSource={dataSource}
        getRowId={(row) => row.id}
        collaborators={collaborators}
        features={{ rowSelect: false, rowActions: false, infiniteScroll: false, virtualization: false }}
      />
    </div>
  );
}

function VirtualizationHarness({ tableId }: { tableId: string }): JSX.Element {
  const rows = useMemo<ReadonlyArray<TaskRow>>(
    () =>
      Array.from({ length: 160 }, (_, index) => ({
        id: String(index + 1),
        title: `Task ${index + 1} with wrapped content ${index % 7 === 0 ? "that should measure row height more often" : ""}`,
        status: index % 3 === 0 ? "todo" : "done",
        amount: 100 + index
      })),
    []
  );

  const dataSource = useMemo<DataTableDataSource<TaskRow>>(
    () => ({
      useRows: () => ({
        rows,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMore: () => undefined,
        refresh: () => undefined
      })
    }),
    [rows]
  );

  return (
    <div className="flex h-[520px] min-h-0 flex-col p-4">
      <DataTable
        tableId={tableId}
        columns={columns}
        dataSource={dataSource}
        getRowId={(row) => row.id}
      />
    </div>
  );
}

function AlignmentHarness({ tableId }: { tableId: string }): JSX.Element {
  const rows = useMemo<ReadonlyArray<TaskRow>>(
    () => [
      { id: "1", title: "Build UI", status: "todo", amount: 10 },
      { id: "2", title: "Ship", status: "done", amount: 20 }
    ],
    []
  );

  const dataSource = useMemo<DataTableDataSource<TaskRow>>(
    () => ({
      useRows: () => ({
        rows,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMore: () => undefined,
        refresh: () => undefined
      })
    }),
    [rows]
  );

  return (
    <div className="w-[1200px] p-4">
      <DataTable
        tableId={tableId}
        columns={alignmentColumns}
        dataSource={dataSource}
        getRowId={(row) => row.id}
        features={{ rowSelect: false, rowActions: false, infiniteScroll: false, virtualization: false }}
      />
    </div>
  );
}

function HorizontalScrollHarness({ tableId }: { tableId: string }): JSX.Element {
  const rows = useMemo<ReadonlyArray<TaskRow>>(
    () => [
      { id: "1", title: "Build UI", status: "todo", amount: 10 },
      { id: "2", title: "Ship", status: "done", amount: 20 }
    ],
    []
  );

  const dataSource = useMemo<DataTableDataSource<TaskRow>>(
    () => ({
      useRows: () => ({
        rows,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMore: () => undefined,
        refresh: () => undefined
      })
    }),
    [rows]
  );

  return (
    <div className="w-[220px] p-4">
      <DataTable
        tableId={tableId}
        columns={alignmentColumns}
        dataSource={dataSource}
        getRowId={(row) => row.id}
        features={{ rowSelect: false, rowActions: false, infiniteScroll: false, virtualization: false }}
      />
    </div>
  );
}

function DraftRowHorizontalScrollHarness({ tableId }: { tableId: string }): JSX.Element {
  const wideColumns = useMemo<ReadonlyArray<DataTableColumn<TaskRow>>>(
    () =>
      columns.map((column) => {
        if (column.id === "title") {
          return { ...column, width: 240 };
        }
        if (column.id === "status") {
          return { ...column, width: 220 };
        }
        if (column.id === "amount") {
          return { ...column, width: 200 };
        }
        return column;
      }),
    []
  );

  const [rows, setRows] = useState<ReadonlyArray<TaskRow>>([
    { id: "1", title: "Build UI", status: "todo", amount: 10 },
    { id: "2", title: "Ship", status: "done", amount: 20 }
  ]);

  const dataSource = useMemo<DataTableDataSource<TaskRow>>(
    () => ({
      useRows: () => ({
        rows,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMore: () => undefined,
        refresh: () => undefined
      }),
      createRow: async (draft) => {
        const row: TaskRow = {
          id: crypto.randomUUID(),
          title: String(draft.title ?? ""),
          status: String(draft.status ?? "todo"),
          amount: Number(draft.amount ?? 0)
        };
        setRows((current) => [row, ...current]);
        return row;
      }
    }),
    [rows]
  );

  return (
    <div className="w-[220px] p-4">
      <DataTable
        tableId={tableId}
        columns={wideColumns}
        dataSource={dataSource}
        getRowId={(row) => row.id}
        features={{
          editing: true,
          rowDelete: true,
          rowAdd: true,
          infiniteScroll: false,
          virtualization: false
        }}
      />
    </div>
  );
}

function LinkOverflowHarness({ tableId }: { tableId: string }): JSX.Element {
  const rows = useMemo<ReadonlyArray<TaskRow>>(
    () => [
      {
        id: "1",
        title: "Build UI",
        status: "todo",
        amount: 10,
        website: "https://example.com/supercalifragilisticexpialidocioussupercalifragilisticexpialidocious"
      }
    ],
    []
  );

  const dataSource = useMemo<DataTableDataSource<TaskRow>>(
    () => ({
      useRows: () => ({
        rows,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMore: () => undefined,
        refresh: () => undefined
      })
    }),
    [rows]
  );

  return (
    <div className="w-[420px] p-4">
      <DataTable
        tableId={tableId}
        columns={linkOverflowColumns}
        dataSource={dataSource}
        getRowId={(row) => row.id}
        features={{ rowSelect: false, rowActions: false, infiniteScroll: false, virtualization: false }}
      />
    </div>
  );
}

function MultilineTextHarness({ tableId }: { tableId: string }): JSX.Element {
  const rows = useMemo<ReadonlyArray<TaskRow>>(
    () => [
      { id: "1", title: "Build\nUI", status: "todo", amount: 10 },
      { id: "2", title: "Ship", status: "done", amount: 20 }
    ],
    []
  );

  const dataSource = useMemo<DataTableDataSource<TaskRow>>(
    () => ({
      useRows: () => ({
        rows,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMore: () => undefined,
        refresh: () => undefined
      })
    }),
    [rows]
  );

  return (
    <div className="w-[240px] p-4">
      <DataTable
        tableId={tableId}
        columns={multilineTextColumns}
        dataSource={dataSource}
        getRowId={(row) => row.id}
        features={{ rowSelect: false, rowActions: false, infiniteScroll: false, virtualization: false }}
      />
    </div>
  );
}

function MeasuredRowsHarness({ tableId }: { tableId: string }): JSX.Element {
  const rows = useMemo<ReadonlyArray<TaskRow>>(
    () => [
      {
        id: "1",
        title: "Build UI",
        status: "todo",
        amount: 10,
        notes:
          "This row uses long text content that wraps across multiple lines so ResizeObserver has a larger measured height to apply."
      },
      {
        id: "2",
        title: "Ship",
        status: "done",
        amount: 20,
        notes: "Short note"
      }
    ],
    []
  );

  const dataSource = useMemo<DataTableDataSource<TaskRow>>(
    () => ({
      useRows: () => ({
        rows,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMore: () => undefined,
        refresh: () => undefined
      })
    }),
    [rows]
  );

  return (
    <div className="w-[360px] p-4">
      <DataTable
        tableId={tableId}
        columns={measuredRowColumns}
        dataSource={dataSource}
        getRowId={(row) => row.id}
        features={{ rowSelect: false, rowActions: false, infiniteScroll: false, virtualization: false }}
      />
    </div>
  );
}

function VirtualizedDeleteMeasuredRowsHarness({ tableId }: { tableId: string }): JSX.Element {
  const [rows, setRows] = useState<ReadonlyArray<TaskRow>>([
    {
      id: "1",
      title: "Build UI",
      status: "todo",
      amount: 10,
      notes:
        "This row uses long text content that wraps across multiple lines so deleting it should force the remaining rows to recompute their virtual positions immediately."
    },
    {
      id: "2",
      title: "Ship",
      status: "done",
      amount: 20,
      notes: "Short note"
    },
    {
      id: "3",
      title: "QA",
      status: "todo",
      amount: 30,
      notes: "Another short note"
    }
  ]);

  const dataSource = useMemo<DataTableDataSource<TaskRow>>(
    () => ({
      useRows: () => ({
        rows,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMore: () => undefined,
        refresh: () => undefined
      }),
      deleteRows: async (rowIds) => {
        setRows((current) => current.filter((row) => !rowIds.includes(row.id)));
      }
    }),
    [rows]
  );

  return (
    <div className="w-[360px] p-4">
      <DataTable
        tableId={tableId}
        columns={measuredRowColumns}
        dataSource={dataSource}
        getRowId={(row) => row.id}
        features={{ rowDelete: true, rowSelect: false, rowActions: false, infiniteScroll: false }}
      />
    </div>
  );
}

function DateHarness({ tableId }: { tableId: string }): JSX.Element {
  const [rows, setRows] = useState<ReadonlyArray<DateRow>>([{ id: "1", due: "2026-03-05" }]);

  const dataSource = useMemo<DataTableDataSource<DateRow>>(
    () => ({
      useRows: () => ({
        rows,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMore: () => undefined,
        refresh: () => undefined
      }),
      updateRows: async (changes) => {
        setRows((current) =>
          current.map((row) => {
            const patch = changes.find((entry) => entry.rowId === row.id)?.patch;
            return patch
              ? {
                  ...row,
                  ...patch
                }
              : row;
          })
        );
      }
    }),
    [rows]
  );

  return (
    <div className="w-[320px] p-4">
      <DataTable
        tableId={tableId}
        columns={dateColumns}
        dataSource={dataSource}
        getRowId={(row) => row.id}
        features={{
          editing: true,
          clipboardPaste: true,
          rowSelect: false,
          rowActions: false,
          infiniteScroll: false,
          virtualization: false
        }}
      />
      <output data-testid="due-raw">{rows[0]?.due ?? ""}</output>
    </div>
  );
}

function MultiSelectFilterHarness({ tableId }: { tableId: string }): JSX.Element {
  const rows = useMemo<ReadonlyArray<FilterableMultiSelectRow>>(
    () => [
      { id: "1", title: "Ops only", tags: ["ops"] },
      { id: "2", title: "Urgent Ops", tags: ["urgent", "ops"] },
      { id: "3", title: "Backend only", tags: ["backend"] }
    ],
    []
  );

  const dataSource = useMemo<DataTableDataSource<FilterableMultiSelectRow>>(
    () => ({
      useRows: (query) => ({
        rows: applyServerQuery(rows, query),
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMore: () => undefined,
        refresh: () => undefined
      })
    }),
    [rows]
  );

  return (
    <div className="p-4">
      <DataTable
        tableId={tableId}
        columns={multiSelectFilterColumns}
        dataSource={dataSource}
        getRowId={(row) => row.id}
        features={{ columnFilter: true, rowSelect: false, rowActions: false, infiniteScroll: false, virtualization: false }}
      />
    </div>
  );
}

function MultiSelectHarness({ tableId }: { tableId: string }): JSX.Element {
  const [rows, setRows] = useState<ReadonlyArray<MultiSelectRow>>([{ id: "1", tags: ["urgent", "backend"] }]);

  const dataSource = useMemo<DataTableDataSource<MultiSelectRow>>(
    () => ({
      useRows: () => ({
        rows,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMore: () => undefined,
        refresh: () => undefined
      }),
      updateRows: async (changes) => {
        setRows((current) =>
          current.map((row) => {
            const patch = changes.find((entry) => entry.rowId === row.id)?.patch;
            return patch
              ? {
                  ...row,
                  ...patch
                }
              : row;
          })
        );
      }
    }),
    [rows]
  );

  return (
    <div className="w-[360px] p-4">
      <DataTable
        tableId={tableId}
        columns={multiSelectColumns}
        dataSource={dataSource}
        getRowId={(row) => row.id}
        features={{ editing: true, rowSelect: false, rowActions: false, infiniteScroll: false, virtualization: false }}
      />
      <output data-testid="tags-raw">{rows[0]?.tags.join(",") ?? ""}</output>
    </div>
  );
}

function StrictOptionParsingHarness({ tableId }: { tableId: string }): JSX.Element {
  const [rows, setRows] = useState<ReadonlyArray<OptionParsingRow>>([
    { id: "1", status: "done", tags: ["urgent"] }
  ]);

  const dataSource = useMemo<DataTableDataSource<OptionParsingRow>>(
    () => ({
      useRows: () => ({
        rows,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMore: () => undefined,
        refresh: () => undefined
      }),
      updateRows: async (changes) => {
        setRows((current) =>
          current.map((row) => {
            const patch = changes.find((entry) => entry.rowId === row.id)?.patch;
            return patch
              ? {
                  ...row,
                  ...patch
                }
              : row;
          })
        );
      },
      createRow: async (draft) => {
        const row: OptionParsingRow = {
          id: crypto.randomUUID(),
          status: String(draft.status ?? ""),
          tags: Array.isArray(draft.tags) ? draft.tags.map((entry) => String(entry)) : []
        };
        setRows((current) => [row, ...current]);
        return row;
      }
    }),
    [rows]
  );

  return (
    <div className="w-[420px] p-4">
      <Toaster richColors closeButton />
      <DataTable
        tableId={tableId}
        columns={optionParsingColumns}
        dataSource={dataSource}
        getRowId={(row) => row.id}
        features={{ editing: true, rowAdd: true, clipboardPaste: true, rowSelect: false, rowActions: false, infiniteScroll: false, virtualization: false }}
      />
      <output data-testid="status-raw">{rows[0]?.status ?? ""}</output>
      <output data-testid="tags-raw">{rows[0]?.tags.join(",") ?? ""}</output>
      <output data-testid="row-count">{String(rows.length)}</output>
    </div>
  );
}

function CustomToolbarHarness({ tableId }: { tableId: string }): JSX.Element {
  const [rows, setRows] = useState<ReadonlyArray<TaskRow>>([
    { id: "1", title: "Build UI", status: "todo", amount: 10 },
    { id: "2", title: "Ship", status: "done", amount: 20 }
  ]);

  const dataSource = useMemo<DataTableDataSource<TaskRow>>(
    () => ({
      useRows: () => ({
        rows,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMore: () => undefined,
        refresh: () => undefined
      }),
      deleteRows: async (rowIds) => {
        setRows((current) => current.filter((row) => !rowIds.includes(row.id)));
      },
      createRow: async (draft) => {
        const nextRow: TaskRow = {
          id: crypto.randomUUID(),
          title: String(draft.title ?? ""),
          status: String(draft.status ?? "todo"),
          amount: Number(draft.amount ?? 0)
        };
        setRows((current) => [nextRow, ...current]);
        return nextRow;
      }
    }),
    [rows]
  );

  return (
    <div className="p-4">
      <DataTable
        tableId={tableId}
        columns={columns}
        dataSource={dataSource}
        getRowId={(row) => row.id}
        features={{
          editing: true,
          rowAdd: true,
          rowDelete: true,
          columnVisibility: true,
          virtualization: false
        }}
        renderToolbar={(state) => (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => state.deleteSelected()}>
              Delete from custom toolbar
            </button>
            <output data-testid="custom-selected-count">{String(state.selectedRowCount)}</output>
            <output data-testid="custom-hidden-count">{String(state.hiddenColumns.length)}</output>
            {state.hiddenColumns.map((column) => (
              <button key={column.id} type="button" onClick={() => state.showColumn(column.id)}>
                {`Show ${column.header}`}
              </button>
            ))}
          </div>
        )}
      />
    </div>
  );
}

function DynamicOptionHarness({ tableId }: { tableId: string }): JSX.Element {
  const [rows, setRows] = useState<ReadonlyArray<DynamicOptionRow>>([
    { id: "1", area: "Product", goal: "ship", owners: ["maya"] },
    { id: "2", area: "Sales", goal: "close", owners: ["rui"] }
  ]);

  const dataSource = useMemo<DataTableDataSource<DynamicOptionRow>>(
    () => ({
      useRows: () => ({
        rows,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMore: () => undefined,
        refresh: () => undefined
      }),
      updateRows: async (changes) => {
        setRows((current) =>
          current.map((row) => {
            const patch = changes.find((entry) => entry.rowId === row.id)?.patch;
            return patch
              ? {
                  ...row,
                  ...patch
                }
              : row;
          })
        );
      }
    }),
    [rows]
  );

  return (
    <div className="w-[520px] p-4">
      <DataTable
        tableId={tableId}
        columns={dynamicOptionColumns}
        dataSource={dataSource}
        getRowId={(row) => row.id}
        features={{
          editing: true,
          rowSelect: false,
          rowActions: false,
          infiniteScroll: false,
          virtualization: false
        }}
      />
      <output data-testid="goal-1-raw">{rows.find((row) => row.id === "1")?.goal ?? ""}</output>
    </div>
  );
}

function DefaultDraftRowHarness({ tableId }: { tableId: string }): JSX.Element {
  const [rows, setRows] = useState<ReadonlyArray<TaskRow>>([{ id: "1", title: "Build UI", status: "todo", amount: 10 }]);

  const dataSource = useMemo<DataTableDataSource<TaskRow>>(
    () => ({
      useRows: () => ({
        rows,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMore: () => undefined,
        refresh: () => undefined
      }),
      createRow: async (draft) => {
        const nextRow: TaskRow = {
          id: crypto.randomUUID(),
          title: String(draft.title ?? ""),
          status: String(draft.status ?? "todo"),
          amount: Number(draft.amount ?? 0)
        };
        setRows((current) => [nextRow, ...current]);
        return nextRow;
      }
    }),
    [rows]
  );

  return (
    <div className="p-4">
      <DataTable
        tableId={tableId}
        columns={columns}
        dataSource={dataSource}
        getRowId={(row) => row.id}
        defaultDraftRow={{
          status: "done",
          amount: 42
        }}
        features={{
          editing: true,
          rowAdd: true,
          rowSelect: false,
          rowActions: false,
          infiniteScroll: false,
          virtualization: false
        }}
      />
      <output data-testid="drafted-title-raw">{rows[0]?.title ?? ""}</output>
      <output data-testid="drafted-status-raw">{rows[0]?.status ?? ""}</output>
      <output data-testid="drafted-amount-raw">{String(rows[0]?.amount ?? "")}</output>
    </div>
  );
}

describe("DataTable component", () => {
  it("edits a text cell", () => {
    cy.mount(<Harness tableId="cypress-table-edit" />);

    cy.contains("Build UI").dblclick();
    cy.findByLabelText("Edit Title")
      .should("have.attr", "contenteditable", "true")
      .type("{selectall}{backspace}Build table");
    cy.findByLabelText("Edit Title").blur();
    cy.findByLabelText("Edit Title").should("not.exist");
    cy.contains("Build table").should("exist");
  });

  it("undoes and redoes a cell edit with keyboard shortcuts", () => {
    cy.mount(<Harness tableId="cypress-table-edit-undo-redo" features={{ undo: true }} />);

    cy.contains("Build UI").dblclick();
    cy.findByLabelText("Edit Title")
      .should("have.attr", "contenteditable", "true")
      .type("{selectall}{backspace}Undo title");
    cy.findByLabelText("Edit Title").blur();
    cy.findByTestId("title-raw").should("have.text", "Undo title");

    cy.findByRole("grid").focus().trigger("keydown", { key: "z", ctrlKey: true });
    cy.findByTestId("title-raw").should("have.text", "Build UI");

    cy.findByRole("grid").focus().trigger("keydown", { key: "Z", ctrlKey: true, shiftKey: true });
    cy.findByTestId("title-raw").should("have.text", "Undo title");
  });

  it("undoes and redoes paste operations", () => {
    cy.mount(<Harness tableId="cypress-table-paste-undo-redo" features={{ undo: true }} />);

    cy.get("[role='gridcell'][data-column-id='title']").first().click();

    cy.window().then((win) =>
      cy.findByRole("grid").then(($grid) => {
        const defaultPrevented = dispatchPlainTextPaste(win, $grid[0], "Paste title");
        expect(defaultPrevented).to.equal(true);
      })
    );

    cy.findByTestId("title-raw").should("have.text", "Paste title");
    cy.findByTestId("status-raw").should("have.text", "todo");
    cy.findByTestId("amount-raw").should("have.text", "10");

    cy.findByRole("grid").focus().trigger("keydown", { key: "z", ctrlKey: true });
    cy.findByTestId("title-raw").should("have.text", "Build UI");
    cy.findByTestId("status-raw").should("have.text", "todo");
    cy.findByTestId("amount-raw").should("have.text", "10");

    cy.findByRole("grid").focus().trigger("keydown", { key: "y", ctrlKey: true });
    cy.findByTestId("title-raw").should("have.text", "Paste title");
    cy.findByTestId("status-raw").should("have.text", "todo");
    cy.findByTestId("amount-raw").should("have.text", "10");
  });

  it("clears redo history after a new edit", () => {
    cy.mount(<Harness tableId="cypress-table-redo-cleared" features={{ undo: true }} />);

    cy.contains("Build UI").dblclick();
    cy.findByLabelText("Edit Title").type("{selectall}{backspace}First change");
    cy.findByLabelText("Edit Title").blur();
    cy.findByTestId("title-raw").should("have.text", "First change");

    cy.findByRole("grid").focus().trigger("keydown", { key: "z", ctrlKey: true });
    cy.findByTestId("title-raw").should("have.text", "Build UI");

    cy.contains("Build UI").dblclick();
    cy.findByLabelText("Edit Title").type("{selectall}{backspace}Second change");
    cy.findByLabelText("Edit Title").blur();
    cy.findByTestId("title-raw").should("have.text", "Second change");

    cy.findByRole("grid").focus().trigger("keydown", { key: "y", ctrlKey: true });
    cy.findByTestId("title-raw").should("have.text", "Second change");
  });

  it("renders collaborator outlines and stacked labels on matching cells", () => {
    let statusCell: HTMLElement | null = null;

    cy.mount(<PresenceHarness tableId="cypress-table-collaborators" />);

    cy.get("tr[data-row-id='1'] [role='gridcell'][data-column-id='title']")
      .as("sharedCell")
      .should("have.attr", "data-has-collaborators", "true");

    cy.get("@sharedCell")
      .find("[data-dt-collaborator-outline]")
      .should("have.length", 2);
    cy.get("@sharedCell")
      .find("[data-dt-collaborator-outline='maya']")
      .invoke("attr", "style")
      .should("contain", "#2563eb");
    cy.get("@sharedCell")
      .find("[data-dt-collaborator-outline='rui']")
      .invoke("attr", "style")
      .should("contain", "#dc2626");
    cy.get("@sharedCell")
      .find("[data-dt-collaborator-label]")
      .should("have.length", 2);
    cy.get("@sharedCell")
      .find("[data-dt-collaborator-label='maya']")
      .should("have.text", "Maya");
    cy.get("@sharedCell")
      .find("[data-dt-collaborator-label='rui']")
      .should("have.text", "Rui");

    cy.get("tr[data-row-id='2'] [role='gridcell'][data-column-id='status']")
      .as("statusCell")
      .should("have.attr", "data-has-collaborators", "true")
      .find("[data-dt-collaborator-label='ana']")
      .should("have.text", "Ana");

    cy.get("@statusCell").should(($cell) => {
      const cell = $cell[0];
      if (!(cell instanceof HTMLElement)) {
        throw new Error("Expected status collaborator cell to be an HTMLElement");
      }

      statusCell = cell;
      expect(window.getComputedStyle(cell).overflow).to.equal("visible");
    });

    cy.get("[data-dt-collaborator-label='ana']").should(($label) => {
      const label = $label[0];

      if (!(label instanceof HTMLElement)) {
        throw new Error("Expected collaborator label to be an HTMLElement");
      }
      if (!(statusCell instanceof HTMLElement)) {
        throw new Error("Expected aliased status cell to resolve to an HTMLElement");
      }

      const labelRect = label.getBoundingClientRect();
      const cellRect = statusCell.getBoundingClientRect();
      expect(labelRect.top).to.be.lessThan(cellRect.top);

      const hitTarget = document.elementFromPoint(labelRect.left + 4, labelRect.top + 4);
      expect(hitTarget instanceof HTMLElement).to.equal(true);
      expect(hitTarget?.closest("[data-dt-collaborator-label='ana']")).to.equal(label);
    });

    cy.get("tr[data-row-id='2'] [role='gridcell'][data-column-id='amount']").should(
      "have.attr",
      "data-has-collaborators",
      "false"
    );
  });

  it("toggles column visibility", () => {
    cy.mount(<Harness tableId="cypress-table-visibility" />);

    cy.contains("Hidden columns").should("not.exist");

    cy.get("[data-column-menu-trigger='amount']").first().click({ force: true });
    cy.contains("button", "Hide").click();
    cy.findByRole("columnheader", { name: /Amount/i }).should("not.exist");
    cy.contains("Hidden columns (1)").should("exist");

    cy.contains("Hidden columns (1)").click();
    cy.get("[data-hidden-column-row='amount']").contains("button", "Show").click();
    cy.findByRole("columnheader", { name: /Amount/i }).should("exist");
  });

  it("uses a custom toolbar render prop to drive selection and hidden-column actions", () => {
    cy.mount(<CustomToolbarHarness tableId="cypress-table-custom-toolbar" />);

    cy.contains("button", "Add row").should("not.exist");
    cy.findByTestId("custom-selected-count").should("have.text", "0");

    cy.findByLabelText("Select row 1").check({ force: true });
    cy.findByTestId("custom-selected-count").should("have.text", "1");

    cy.get("[data-column-menu-trigger='amount']").first().click({ force: true });
    cy.contains("button", "Hide").click();
    cy.findByTestId("custom-hidden-count").should("have.text", "1");
    cy.contains("button", "Show Amount").click();
    cy.findByRole("columnheader", { name: /Amount/i }).should("exist");
    cy.findByTestId("custom-hidden-count").should("have.text", "0");

    cy.contains("button", "Delete from custom toolbar").click();
    cy.contains("Build UI").should("not.exist");
  });

  it("keeps managed utility columns around pinned data columns", () => {
    cy.mount(<Harness tableId="cypress-table-utility-column-order" />);

    cy.get("[data-column-menu-trigger='status']").first().click({ force: true });
    cy.contains("button", "Left").click({ force: true });
    cy.get("body").click(0, 0);

    cy.get("[data-column-menu-trigger='amount']").first().click({ force: true });
    cy.contains("button", "Right").click({ force: true });
    cy.get("body").click(0, 0);

    cy.get("thead th").then(($headers) => {
      const headerIds = [...$headers].map((header) => {
        if (header.querySelector("input[aria-label='Select all rows']")) {
          return "__select__";
        }

        const columnId = header.getAttribute("data-column-id");
        if (columnId) {
          return columnId;
        }

        if (header.textContent?.includes("Row actions")) {
          return "__actions__";
        }

        return "unknown";
      });

      expect(headerIds).to.deep.equal(["__select__", "status", "title", "amount", "__actions__"]);
    });

    cy.get("tr[data-row-id='1'] > td").then(($cells) => {
      const cellIds = [...$cells].map((cell) => {
        if (cell.querySelector("input[aria-label='Select row 1']")) {
          return "__select__";
        }

        const gridCell = cell.querySelector("[role='gridcell'][data-column-id]");
        if (gridCell instanceof HTMLElement) {
          return gridCell.dataset.columnId ?? "unknown";
        }

        if (cell.querySelector("[aria-label='Delete row 1']")) {
          return "__actions__";
        }

        return "unknown";
      });

      expect(cellIds).to.deep.equal(["__select__", "status", "title", "amount", "__actions__"]);
    });
  });

  it("renders compact row actions with overflow menu items", () => {
    cy.mount(<RowActionsHarness tableId="cypress-table-row-actions" />);

    cy.contains("th", "Actions").should("not.exist");
    cy.contains("button", "Edit").should("not.exist");
    cy.contains("button", "Archive").should("not.exist");

    cy.findByLabelText("Delete row 1").should("exist");
    cy.findByRole("button", { name: "Delete row 1" }).should("have.text", "");

    cy.findByLabelText("Open actions for row 1").click();
    cy.findByRole("menu", { name: "Actions for row 1" }).within(() => {
      cy.findByRole("menuitem", { name: "Archive" }).should("exist");
      cy.findByRole("menuitem", { name: "Lock" }).should("exist");
    });

    cy.get("body").click(0, 0);
    cy.findByRole("menu", { name: "Actions for row 1" }).should("not.exist");

    cy.findByLabelText("Open actions for row 1").click();
    cy.findByRole("menuitem", { name: "Archive" }).click();
    cy.findByRole("menu", { name: "Actions for row 1" }).should("not.exist");
    cy.contains("Archived 1").should("exist");
  });

  it("shows disabled custom row actions inside the overflow menu", () => {
    cy.mount(<RowActionsHarness tableId="cypress-table-row-actions-disabled" />);

    cy.findByLabelText("Open actions for row 2").click();
    cy.findByRole("menu", { name: "Actions for row 2" }).within(() => {
      cy.findByRole("menuitem", { name: "Lock" }).should("be.disabled");
    });
  });

  it("does not render an empty actions column when no row-level actions are available", () => {
    cy.mount(
      <Harness
        tableId="cypress-table-no-actions-column"
        features={{
          rowDelete: false,
          rowActions: false,
          rowSelect: false,
          infiniteScroll: false,
          virtualization: false
        }}
      />
    );

    cy.get("thead th").should("have.length", 3);
    cy.findByLabelText("Delete row 1").should("not.exist");
    cy.findByLabelText("Open actions for row 1").should("not.exist");
  });

  it("shows hide in the pin action row and only shows unpin for pinned columns", () => {
    cy.mount(<Harness tableId="cypress-table-column-menu-actions" />);

    cy.get("[data-column-menu-trigger='title']").first().click({ force: true });

    cy.get("[role='dialog'][aria-label='Title options']").within(() => {
      cy.contains("button", "Left").should("exist");
      cy.contains("button", "Right").should("exist");
      cy.contains("button", "Hide").find("svg").should("exist");
      cy.contains("button", "Unpin").should("not.exist");
      cy.contains("button", "Left").click();
      cy.contains("button", "Left").should("not.exist");
      cy.contains("button", "Right").should("not.exist");
      cy.contains("button", "Unpin").should("exist");
      cy.contains("button", "Hide").should("exist");
    });

    cy.get("th[data-column-id='title']").should("have.attr", "data-pinned-state", "left");
  });

  it("sorts through the column dialog and exposes status in header attrs", () => {
    cy.mount(<Harness tableId="cypress-table-sort" />);

    cy.get("[data-column-menu-trigger='amount']").first().click({ force: true });
    cy.contains("button", "Sort desc").click();

    cy.get("th[data-column-id='amount']").should("have.attr", "data-column-sort-status", "desc");

    cy.get("[data-column-menu-trigger='amount']").first().click({ force: true });
    cy.contains("button", "Sort desc").click();

    cy.get("th[data-column-id='amount']").should("have.attr", "data-column-sort-status", "none");
  });

  it("applies select filters through the column dialog", () => {
    cy.mount(<Harness tableId="cypress-table-filter" />);

    cy.get("[data-column-menu-trigger='status']").first().click({ force: true });
    cy.get("[role='dialog'][aria-label='Status options']").within(() => {
      cy.contains("Operator: in").should("exist");
      cy.contains("label", "To do").find("input").check({ force: true });
    });

    cy.contains("Build UI").should("exist");
    cy.contains("Ship").should("not.exist");
    cy.get("th[data-column-id='status']").should("have.attr", "data-column-filter-active", "true");
  });

  it("applies multiselect filters using membership semantics", () => {
    cy.mount(<MultiSelectFilterHarness tableId="cypress-table-multiselect-filter" />);

    cy.get("[data-column-menu-trigger='tags']").first().click({ force: true });
    cy.get("[role='dialog'][aria-label='Tags options']").within(() => {
      cy.contains("Operator: in").should("exist");
      cy.contains("label", "Ops").find("input").check({ force: true });
    });

    cy.contains("Ops only").should("exist");
    cy.contains("Urgent Ops").should("exist");
    cy.contains("Backend only").should("not.exist");
    cy.get("th[data-column-id='tags']").should("have.attr", "data-column-filter-active", "true");
  });

  it("reorders columns via drag and drop in the same pin zone", () => {
    cy.mount(<Harness tableId="cypress-table-reorder" />);

    cy.window().then((win) => {
      const dataTransfer = new win.DataTransfer();

      cy.get("[data-column-reorder-handle='title']").trigger("dragstart", { dataTransfer, force: true });
      cy.get("th[data-column-id='amount']").then(($target) => {
        const rect = $target[0].getBoundingClientRect();
        cy.wrap($target).trigger("dragover", { dataTransfer, clientX: rect.right - 2 });
        cy.wrap($target).trigger("drop", { dataTransfer, clientX: rect.right - 2 });
      });
      cy.get("[data-column-reorder-handle='title']").trigger("dragend", { dataTransfer, force: true });
    });

    cy.get("thead tr")
      .first()
      .find("th[data-column-id]")
      .then(($cells) => {
        const order = [...$cells].map((cell) => cell.getAttribute("data-column-id"));
        expect(order).to.deep.equal(["status", "amount", "title"]);
      });
  });

  it("ignores drag reorder across pin zones", () => {
    cy.mount(<Harness tableId="cypress-table-reorder-zones" />);

    cy.get("[data-column-menu-trigger='title']").first().click({ force: true });
    cy.contains("button", "Left").click({ force: true });
    cy.get("body").click(0, 0);

    cy.window().then((win) => {
      const dataTransfer = new win.DataTransfer();

      cy.get("[data-column-reorder-handle='title']").trigger("dragstart", { dataTransfer, force: true });
      cy.get("th[data-column-id='amount']").then(($target) => {
        const rect = $target[0].getBoundingClientRect();
        cy.wrap($target).trigger("dragover", { dataTransfer, clientX: rect.left + 2 });
        cy.wrap($target).trigger("drop", { dataTransfer, clientX: rect.left + 2 });
      });
      cy.get("[data-column-reorder-handle='title']").trigger("dragend", { dataTransfer, force: true });
    });

    cy.get("thead tr")
      .first()
      .find("th[data-column-id]")
      .then(($cells) => {
        const order = [...$cells].map((cell) => cell.getAttribute("data-column-id"));
        expect(order).to.deep.equal(["title", "status", "amount"]);
      });
  });

  it("reorders left-pinned columns and preserves the updated order after unpinning", () => {
    cy.mount(<Harness tableId="cypress-table-reorder-pinned-left" />);

    cy.get("[data-column-menu-trigger='title']").first().click({ force: true });
    cy.contains("button", "Left").click({ force: true });
    cy.get("body").click(0, 0);

    cy.get("[data-column-menu-trigger='amount']").first().click({ force: true });
    cy.contains("button", "Left").click({ force: true });
    cy.get("body").click(0, 0);

    cy.window().then((win) => {
      const dataTransfer = new win.DataTransfer();

      cy.get("[data-column-reorder-handle='amount']").trigger("dragstart", { dataTransfer, force: true });
      cy.get("th[data-column-id='title']").then(($target) => {
        const rect = $target[0].getBoundingClientRect();
        cy.wrap($target).trigger("dragover", { dataTransfer, clientX: rect.left + 2 });
        cy.wrap($target).trigger("drop", { dataTransfer, clientX: rect.left + 2 });
      });
      cy.get("[data-column-reorder-handle='amount']").trigger("dragend", { dataTransfer, force: true });
    });

    cy.get("thead tr")
      .first()
      .find("th[data-column-id]")
      .then(($cells) => {
        const order = [...$cells].map((cell) => cell.getAttribute("data-column-id"));
        expect(order).to.deep.equal(["amount", "title", "status"]);
      });

    cy.get("[data-column-menu-trigger='amount']").first().click({ force: true });
    cy.contains("button", "Unpin").click({ force: true });

    cy.get("thead tr")
      .first()
      .find("th[data-column-id]")
      .then(($cells) => {
        const order = [...$cells].map((cell) => cell.getAttribute("data-column-id"));
        expect(order).to.deep.equal(["title", "amount", "status"]);
      });
  });

  it("renders pinned columns with a darker header and body surface", () => {
    cy.mount(<AlignmentHarness tableId="cypress-table-pinned-surface" />);

    cy.get("[data-column-menu-trigger='title']").first().click({ force: true });
    cy.contains("button", "Left").click({ force: true });

    cy.get("th[data-column-id='title']")
      .should("have.attr", "data-pinned-state", "left")
      .then(($pinnedHeader) => {
        const pinnedHeaderStyle = getComputedStyle($pinnedHeader[0]);

        cy.get("th[data-column-id='status']")
          .should("have.attr", "data-pinned-state", "center")
          .then(($centerHeader) => {
            const centerHeaderStyle = getComputedStyle($centerHeader[0]);
            expect(pinnedHeaderStyle.backgroundImage).to.not.equal(centerHeaderStyle.backgroundImage);
          });
      });

    cy.get(`tr[data-row-id='1'] [role='gridcell'][data-column-id='title']`)
      .first()
      .closest("td")
      .should("have.attr", "data-pinned-state", "left")
      .then(($pinnedCell) => {
        const pinnedCellStyle = getComputedStyle($pinnedCell[0]);

        cy.get(`tr[data-row-id='1'] [role='gridcell'][data-column-id='status']`)
          .first()
          .closest("td")
          .should("have.attr", "data-pinned-state", "center")
          .then(($centerCell) => {
            const centerCellStyle = getComputedStyle($centerCell[0]);
            expect(pinnedCellStyle.backgroundColor).to.not.equal(centerCellStyle.backgroundColor);
          });
      });
  });

  it("renders a left separator for the first right-pinned column", () => {
    cy.mount(<Harness tableId="cypress-table-right-pinned-separator" />);

    cy.get("[data-column-menu-trigger='title']").first().click({ force: true });
    cy.contains("button", "Right").click({ force: true });

    cy.get("th[data-column-id='title']")
      .should("have.attr", "data-pinned-state", "right")
      .should("have.class", "border-l");

    cy.get(`tr[data-row-id='1'] [role='gridcell'][data-column-id='title']`)
      .first()
      .closest("td")
      .should("have.attr", "data-pinned-state", "right")
      .should("have.class", "border-l");
  });

  it("resizes a column from the resize handle without changing header order", () => {
    cy.mount(<Harness tableId="cypress-table-resize-no-reorder" />);

    let beforeWidth = 0;
    let resizeStartX = 0;

    cy.get("th[data-column-id='status']").then(($header) => {
      beforeWidth = $header[0].getBoundingClientRect().width;
      const rect = $header[0].getBoundingClientRect();
      resizeStartX = Math.round(rect.right - 1);

      cy.get("[data-column-resize-handle='status']").trigger("mousedown", {
        button: 0,
        clientX: resizeStartX,
        force: true
      });
    });

    cy.document().then((doc) => {
      dispatchDocumentMouseEvent(doc, "mousemove", resizeStartX + 80);
      dispatchDocumentMouseEvent(doc, "mouseup");
    });

    cy.get("th[data-column-id='status']").then(($header) => {
      const afterWidth = $header[0].getBoundingClientRect().width;
      expect(afterWidth).to.be.greaterThan(beforeWidth);
    });

    cy.get("thead tr")
      .first()
      .find("th[data-column-id]")
      .then(($cells) => {
        const order = [...$cells].map((cell) => cell.getAttribute("data-column-id"));
        expect(order).to.deep.equal(["title", "status", "amount"]);
      });
  });

  it("keeps header and body column edges aligned in fill mode and after resize", () => {
    cy.mount(<AlignmentHarness tableId="cypress-table-alignment" />);

    assertHeaderBodyColumnAlignment("title", "1");
    assertHeaderBodyColumnAlignment("status", "1");
    assertHeaderBodyColumnAlignment("amount", "1");
    assertBodyColumnWidthConsistency("title", "1", "2");
    assertBodyColumnWidthConsistency("status", "1", "2");
    assertBodyColumnWidthConsistency("amount", "1", "2");

    let resizeStartX = 0;

    cy.get("th[data-column-id='status']").then(($header) => {
      const rect = $header[0].getBoundingClientRect();
      resizeStartX = Math.round(rect.right - 1);
      cy.get("[data-column-resize-handle='status']").trigger("mousedown", {
        button: 0,
        clientX: resizeStartX,
        force: true
      });
    });

    cy.document().then((doc) => {
      dispatchDocumentMouseEvent(doc, "mousemove", resizeStartX + 120);
      dispatchDocumentMouseEvent(doc, "mouseup");
    });

    assertHeaderBodyColumnAlignment("title", "1");
    assertHeaderBodyColumnAlignment("status", "1");
    assertHeaderBodyColumnAlignment("amount", "1");
    assertBodyColumnWidthConsistency("title", "1", "2");
    assertBodyColumnWidthConsistency("status", "1", "2");
    assertBodyColumnWidthConsistency("amount", "1", "2");
  });

  it("clips long link content inside the cell boundary", () => {
    cy.mount(<LinkOverflowHarness tableId="cypress-table-link-overflow" />);

    cy.get(`tr[data-row-id='1'] [role='gridcell'][data-column-id='website']`)
      .first()
      .then(($cell) => {
        const cell = $cell[0];
        const cellRect = cell.getBoundingClientRect();
        const style = getComputedStyle(cell);

        expect(style.overflowX, "website cell overflow should be clipped").to.equal("hidden");
        expect(cell.scrollWidth, "website cell should still contain overflowing content").to.be.greaterThan(cell.clientWidth);

        cy.wrap($cell)
          .closest("td")
          .then(($bodyCell) => {
            const bodyRect = $bodyCell[0].getBoundingClientRect();
            expect(Math.abs(cellRect.right - bodyRect.right), "website cell should stay within its column width").to.be.lte(1);
          });
      });
  });

  it("preserves newlines when rendering text cells in read mode", () => {
    cy.mount(<MultilineTextHarness tableId="cypress-table-multiline-text" />);

    cy.get(`tr[data-row-id='1'] [role='gridcell'][data-column-id='title'] span`).should(($value) => {
      const style = getComputedStyle($value[0]);
      expect(style.whiteSpace).to.equal("pre-wrap");
    });

    cy.get(`tr[data-row-id='1'] [role='gridcell'][data-column-id='title']`)
      .first()
      .then(($multilineCell) => {
        const multilineHeight = $multilineCell[0].getBoundingClientRect().height;

        cy.get(`tr[data-row-id='2'] [role='gridcell'][data-column-id='title']`)
          .first()
          .then(($singleLineCell) => {
            const singleLineHeight = $singleLineCell[0].getBoundingClientRect().height;
            expect(multilineHeight).to.be.greaterThan(singleLineHeight);
          });
      });
  });

  it("stacks non-virtualized rows using measured row heights", () => {
    cy.mount(<MeasuredRowsHarness tableId="cypress-table-measured-row-heights" />);

    cy.get("tbody").should(($tbody) => {
      const tbody = $tbody[0];
      const firstRow = tbody.querySelector("tr[data-row-id='1']");
      const secondRow = tbody.querySelector("tr[data-row-id='2']");

      expect(firstRow, "first row should render").to.not.equal(null);
      expect(secondRow, "second row should render").to.not.equal(null);

      if (!(firstRow instanceof HTMLTableRowElement) || !(secondRow instanceof HTMLTableRowElement)) {
        throw new Error("Expected measured rows to render as table rows");
      }

      const firstRect = firstRow.getBoundingClientRect();
      const secondRect = secondRow.getBoundingClientRect();
      const tbodyRect = tbody.getBoundingClientRect();

      expect(firstRect.height, "first row should grow beyond the base min height").to.be.greaterThan(40);
      expect(
        Math.abs(secondRect.top - firstRect.bottom),
        "second row should start where the first row ends"
      ).to.be.lte(1);
      expect(
        Math.abs(tbodyRect.height - (secondRect.bottom - tbodyRect.top)),
        "tbody height should reach the last rendered row"
      ).to.be.lte(1);
    });
  });

  it("recomputes virtual row positions after deleting a tall measured row", () => {
    cy.mount(<VirtualizedDeleteMeasuredRowsHarness tableId="cypress-table-virtualized-delete-measured-rows" />);

    cy.get("tbody").should(($tbody) => {
      const tbody = $tbody[0];
      const firstRow = tbody.querySelector("tr[data-row-id='1']");
      const secondRow = tbody.querySelector("tr[data-row-id='2']");

      expect(firstRow, "first row should render").to.not.equal(null);
      expect(secondRow, "second row should render").to.not.equal(null);

      if (!(firstRow instanceof HTMLTableRowElement) || !(secondRow instanceof HTMLTableRowElement)) {
        throw new Error("Expected virtualized measured rows to render as table rows");
      }

      const firstRect = firstRow.getBoundingClientRect();
      const secondRect = secondRow.getBoundingClientRect();

      expect(firstRect.height, "first row should grow beyond the base min height").to.be.greaterThan(40);
      expect(
        Math.abs(secondRect.top - firstRect.bottom),
        "second row should start where the first row ends before deletion"
      ).to.be.lte(1);
    });

    cy.findByLabelText("Delete row 1").click();
    cy.get("tr[data-row-id='1']").should("not.exist");

    cy.get("tbody").should(($tbody) => {
      const tbody = $tbody[0];
      const firstRemainingRow = tbody.querySelector("tr[data-row-id='2']");
      const secondRemainingRow = tbody.querySelector("tr[data-row-id='3']");
      const tbodyRect = tbody.getBoundingClientRect();

      expect(firstRemainingRow, "row 2 should remain").to.not.equal(null);
      expect(secondRemainingRow, "row 3 should remain").to.not.equal(null);

      if (
        !(firstRemainingRow instanceof HTMLTableRowElement) ||
        !(secondRemainingRow instanceof HTMLTableRowElement)
      ) {
        throw new Error("Expected remaining virtualized rows to render as table rows");
      }

      const firstRect = firstRemainingRow.getBoundingClientRect();
      const secondRect = secondRemainingRow.getBoundingClientRect();

      expect(
        Math.abs(firstRect.top - tbodyRect.top),
        "first remaining row should move to the top immediately after deletion"
      ).to.be.lte(1);
      expect(
        Math.abs(secondRect.top - firstRect.bottom),
        "next remaining row should follow the first remaining row without a stale gap"
      ).to.be.lte(1);
    });
  });

  it("adds a row from the draft row and deletes selected rows", () => {
    cy.mount(<Harness tableId="cypress-table-row-mutations" />);

    cy.contains("Add row").click();
    cy.findByLabelText("Edit Title").type("New task{enter}");
    cy.contains("Add row").click();

    cy.contains("New task").should("exist");

    cy.findByLabelText("Select row 1").check({ force: true });
    cy.contains("Delete selected").click();
    cy.contains("Build UI").should("not.exist");
  });

  it("creates a row directly from the draft row controls", () => {
    cy.mount(<Harness tableId="cypress-table-inline-draft-create" />);

    cy.contains("Add row").click();
    cy.findByLabelText("Edit Title").type("Inline submit{enter}");
    cy.findByLabelText("Create row").click();

    cy.contains("Inline submit").should("exist");
  });

  it("pins draft row create and discard controls to the right when the grid is scrolled horizontally", () => {
    cy.mount(<DraftRowHorizontalScrollHarness tableId="cypress-table-draft-row-pinned-actions" />);

    cy.findByRole("grid").scrollTo("bottom");
    cy.contains("Add row").click();
    cy.findByLabelText("Edit Title").type("Draft pinned{enter}");

    cy.findByRole("grid").then(($grid) => {
      const grid = $grid[0];
      grid.scrollLeft = grid.scrollWidth - grid.clientWidth;
    });

    cy.findByRole("grid").should(($grid) => {
      expect($grid[0]?.scrollLeft ?? 0).to.be.greaterThan(0);
    });

    cy.get("tr[data-row-id='__draft__'] td[data-pinned-state='right']").then(($td) => {
      expect(getComputedStyle($td[0]).position).to.equal("sticky");
    });

    cy.findByLabelText("Create row").then(($btn) => {
      const buttonRect = $btn[0].getBoundingClientRect();
      cy.findByRole("grid").then(($grid) => {
        const gridRect = $grid[0].getBoundingClientRect();
        expect(buttonRect.right, "create control should stay inside the scroll viewport").to.be.lte(gridRect.right + 1);
        expect(buttonRect.left, "create control should stay inside the scroll viewport").to.be.gte(gridRect.left - 1);
      });
    });
  });

  it("pins draft row data cells to the left when the column is pinned left and the grid is scrolled horizontally", () => {
    cy.mount(<DraftRowHorizontalScrollHarness tableId="cypress-table-draft-row-pinned-left" />);

    cy.get("[data-column-menu-trigger='title']").first().click({ force: true });
    cy.contains("button", "Left").click({ force: true });
    cy.get("body").click(0, 0);

    cy.findByRole("grid").scrollTo("bottom");
    cy.contains("Add row").click();
    cy.findByLabelText("Edit Title").type("Left pin draft{enter}");

    cy.findByRole("grid").then(($grid) => {
      const grid = $grid[0];
      grid.scrollLeft = grid.scrollWidth - grid.clientWidth;
    });

    cy.findByRole("grid").should(($grid) => {
      expect($grid[0]?.scrollLeft ?? 0).to.be.greaterThan(0);
    });

    cy.get("tr[data-row-id='__draft__'] [role='gridcell'][data-column-id='title']").then(($cell) => {
      const cell = $cell[0];
      const td = cell.closest("td");
      expect(td, "title draft cell should be wrapped in td").to.not.equal(null);
      if (td) {
        expect(getComputedStyle(td).position).to.equal("sticky");
        expect(td.dataset.pinnedState).to.equal("left");
      }
    });

    cy.get("tr[data-row-id='__draft__'] [role='gridcell'][data-column-id='title']").then(($cell) => {
      const cellRect = $cell[0].getBoundingClientRect();
      cy.findByRole("grid").then(($grid) => {
        const gridRect = $grid[0].getBoundingClientRect();
        expect(cellRect.left, "pinned title draft cell should stay inside the scroll viewport").to.be.gte(gridRect.left - 1);
        expect(cellRect.right, "pinned title draft cell should stay inside the scroll viewport").to.be.lte(
          gridRect.right + 1
        );
      });
    });
  });

  it("prefills and resets draft rows from defaultDraftRow", () => {
    cy.mount(<DefaultDraftRowHarness tableId="cypress-table-default-draft-row" />);

    cy.get("tr[data-row-id='__draft__'] [role='gridcell'][data-column-id='status']").contains("Done");
    cy.get("tr[data-row-id='__draft__'] [role='gridcell'][data-column-id='amount']").contains("42");

    cy.contains("Add row").click();
    cy.findByLabelText("Edit Title").type("Prefilled task{enter}");
    cy.contains("Add row").click();

    cy.findByTestId("drafted-title-raw").should("have.text", "Prefilled task");
    cy.findByTestId("drafted-status-raw").should("have.text", "done");
    cy.findByTestId("drafted-amount-raw").should("have.text", "42");
    cy.get("tr[data-row-id='__draft__'] [role='gridcell'][data-column-id='status']").contains("Done");
    cy.get("tr[data-row-id='__draft__'] [role='gridcell'][data-column-id='amount']").contains("42");
  });

  it("supports keyboard editing trigger", () => {
    cy.mount(<Harness tableId="cypress-table-keyboard" />);

    cy.findByRole("grid").focus().trigger("keydown", { key: "ArrowRight" });
    cy.findByRole("grid").trigger("keydown", { key: "Enter" });
    cy.findByRole("listbox", { name: /Edit Status/i })
      .should("have.focus")
      .then(($listbox) => {
        const dialog = $listbox.closest("[role='dialog']")[0];
        expect(dialog?.parentElement, "select editor dialog should portal to body").to.equal(
          $listbox[0].ownerDocument.body
        );
      });
    cy.findByRole("listbox", { name: /Edit Status/i }).within(() => {
      cy.contains("[role='option']", "Done")
        .find("span")
        .first()
        .should("have.class", "bg-emerald-100");
    });
    cy.findByRole("listbox", { name: /Edit Status/i }).should("have.attr", "aria-activedescendant", "status-option-0");
    cy.findByRole("listbox", { name: /Edit Status/i }).trigger("keydown", { key: "ArrowDown", force: true });
    cy.findByRole("listbox", { name: /Edit Status/i }).should("have.attr", "aria-activedescendant", "status-option-1");
    cy.findByRole("listbox", { name: /Edit Status/i }).trigger("keydown", { key: "Enter", force: true });
    cy.contains("Done").should("exist");
  });

  it("edits a date cell directly from the native picker", () => {
    cy.mount(<DateHarness tableId="cypress-table-date-edit" />);

    cy.get("[role='gridcell'][data-column-id='due']").dblclick();
    cy.findByLabelText("Edit Due")
      .should("have.attr", "type", "date")
      .then(($input) => {
        const input = $input[0];
        if (!(input instanceof HTMLInputElement)) {
          throw new Error("Expected a date input");
        }

        const view = input.ownerDocument.defaultView;
        if (!view) {
          throw new Error("Expected a window for the date input");
        }

        input.focus();
        input.value = "2026-04-09";
        input.dispatchEvent(new view.Event("input", { bubbles: true }));
        input.dispatchEvent(new view.Event("change", { bubbles: true }));
      });
    cy.findByLabelText("Edit Due").should("not.exist");
    cy.get("[data-testid='due-raw']").should("have.text", "2026-04-09");
  });

  it("copies date cells as ISO clipboard values", () => {
    cy.mount(<DateHarness tableId="cypress-table-date-copy" />);

    cy.window().then((win) => {
      const writeText = cy.stub().as("writeText");
      Object.defineProperty(win.navigator, "clipboard", {
        configurable: true,
        value: {
          writeText
        }
      });
    });

    cy.get("[role='gridcell'][data-column-id='due']").first().click();
    cy.contains("button", "Copy").click();

    cy.get("@writeText").should("have.been.calledWith", "2026-03-05");
  });

  it("pastes formatted date text into date cells as canonical ISO values", () => {
    cy.mount(<DateHarness tableId="cypress-table-date-paste" />);

    cy.get("[role='gridcell'][data-column-id='due']").first().click();

    cy.window().then((win) =>
      cy.findByRole("grid").then(($grid) => {
        const defaultPrevented = dispatchPlainTextPaste(win, $grid[0], "2 de fev. de 2026");
        expect(defaultPrevented).to.equal(true);
      })
    );

    cy.get("[data-testid='due-raw']").should("have.text", "2026-02-02");
  });

  it("edits multiselect cells with badges and a listbox dialog", () => {
    cy.mount(<MultiSelectHarness tableId="cypress-table-multiselect-edit" />);

    cy.get("[role='gridcell'][data-column-id='tags']").dblclick();

    cy.findByRole("listbox", { name: /Edit Tags/i })
      .should("have.focus")
      .should("have.attr", "aria-multiselectable", "true")
      .then(($listbox) => {
        const dialog = $listbox.closest("[role='dialog']")[0];
        expect(dialog?.parentElement, "multiselect editor dialog should portal to body").to.equal(
          $listbox[0].ownerDocument.body
        );
      });

    cy.get("[role='gridcell'][data-column-id='tags']").within(() => {
      cy.contains("span", "Urgent").should("exist");
      cy.contains("span", "Backend").should("exist");
    });

    cy.findByRole("listbox", { name: /Edit Tags/i }).within(() => {
      cy.contains("[role='option']", "Design")
        .find("span")
        .first()
        .should("have.class", "bg-violet-100");
      cy.contains("[role='option']", "Design").click();
    });

    cy.findByRole("listbox", { name: /Edit Tags/i }).trigger("keydown", { key: "Enter", force: true });
    cy.findByRole("listbox", { name: /Edit Tags/i }).should("not.exist");
    cy.get("[data-testid='tags-raw']").should("have.text", "urgent,backend,design");
  });

  it("shows row-aware select options and renders inline option styles", () => {
    cy.mount(<DynamicOptionHarness tableId="cypress-table-dynamic-options" />);

    cy.get("tr[data-row-id='1'] [role='gridcell'][data-column-id='goal']").dblclick();
    cy.findByRole("listbox", { name: /Edit Goal/i }).within(() => {
      cy.contains("[role='option']", "Ship roadmap").should("exist");
      cy.contains("[role='option']", "Plan sprint").click();
      cy.contains("[role='option']", "Close deals").should("not.exist");
    });
    cy.findByTestId("goal-1-raw").should("have.text", "plan");

    cy.get("tr[data-row-id='1'] [role='gridcell'][data-column-id='owners']")
      .contains("span", "Maya")
      .then(($badge) => {
        const style = getComputedStyle($badge[0]);
        expect(style.backgroundColor).to.equal("rgb(254, 226, 226)");
        expect(style.color).to.equal("rgb(153, 27, 27)");
        expect(style.borderColor).to.equal("rgb(248, 113, 113)");
      });
  });

  it("navigates selected cells by visual order when a column is pinned left", () => {
    cy.mount(<Harness tableId="cypress-table-pinned-keyboard-navigation" />);

    cy.get("[data-column-menu-trigger='status']").first().click({ force: true });
    cy.contains("button", "Left").click({ force: true });
    cy.get("body").click(0, 0);

    cy.get(`tr[data-row-id='1'] [role='gridcell'][data-column-id='title']`).click();
    cy.findByRole("grid").focus().trigger("keydown", { key: "ArrowRight" });
    cy.findByRole("grid").trigger("keydown", { key: "Enter" });
    cy.findByLabelText("Edit Amount").should("exist");
    cy.findByLabelText("Edit Status").should("not.exist");
    cy.findByLabelText("Edit Amount").type("{esc}");

    cy.get(`tr[data-row-id='1'] [role='gridcell'][data-column-id='amount']`).click();
    cy.findByRole("grid").focus().trigger("keydown", { key: "ArrowLeft" });
    cy.findByRole("grid").trigger("keydown", { key: "Enter" });
    cy.findByLabelText("Edit Title").should("exist");
    cy.findByLabelText("Edit Status").should("not.exist");
  });

  it("scrolls horizontally to keep the active cell in view during keyboard navigation", () => {
    cy.mount(<HorizontalScrollHarness tableId="cypress-table-keyboard-horizontal-scroll" />);

    cy.get(`tr[data-row-id='1'] [role='gridcell'][data-column-id='title']`).click();
    cy.findByRole("grid").focus();
    cy.findByRole("grid").should(($grid) => {
      expect($grid[0]?.scrollLeft ?? 0).to.equal(0);
    });

    cy.findByRole("grid").trigger("keydown", { key: "ArrowRight" });
    cy.findByRole("grid").trigger("keydown", { key: "ArrowRight" });

    cy.findByRole("grid").should(($grid) => {
      expect($grid[0]?.scrollLeft ?? 0).to.be.greaterThan(0);
    });

    cy.get(`tr[data-row-id='1'] [role='gridcell'][data-column-id='amount']`).then(($cell) => {
      const cellRect = $cell[0].getBoundingClientRect();

      cy.findByRole("grid").then(($grid) => {
        const gridRect = $grid[0].getBoundingClientRect();
        expect(cellRect.right, "amount cell should be inside the scroll viewport").to.be.lte(gridRect.right + 1);
      });
    });
  });

  it("scrolls vertically to keep the active cell in view during keyboard navigation", () => {
    cy.mount(<VirtualizationHarness tableId="cypress-table-keyboard-vertical-scroll" />);

    cy.get(`tr[data-row-id='1'] [role='gridcell'][data-column-id='title']`).click();
    cy.findByRole("grid").focus();

    Array.from({ length: 20 }).forEach(() => {
      cy.findByRole("grid").trigger("keydown", { key: "ArrowDown" });
    });

    cy.findByRole("grid").should(($grid) => {
      expect($grid[0]?.scrollTop ?? 0).to.be.greaterThan(0);
    });

    cy.get(`[role='gridcell'][data-row-index='20'][data-column-id='title']`).should("exist");
  });

  it("keeps arrow keys inside the active editor bound to the editor", () => {
    cy.mount(<Harness tableId="cypress-table-editor-arrow-ownership" />);

    cy.contains("Build UI").dblclick();
    cy.findByLabelText("Edit Title").type("{rightarrow}{esc}");
    cy.findByLabelText("Edit Title").should("not.exist");
    cy.findByRole("grid").should("have.focus").trigger("keydown", { key: "Enter" });
    cy.findByLabelText("Edit Title").should("exist");
  });

  it("applies enhanced paste only while sheet selection mode owns the grid", () => {
    cy.mount(<Harness tableId="cypress-table-grid-paste-selection" />);

    cy.get("[role='gridcell'][data-column-id='title']").first().click();

    cy.window().then((win) =>
      cy.findByRole("grid").then(($grid) => {
        const defaultPrevented = dispatchPlainTextPaste(win, $grid[0], "Pasted title");
        expect(defaultPrevented).to.equal(true);
      })
    );

    cy.findByTestId("title-raw").should("have.text", "Pasted title");
  });

  it("does not hijack paste while editing inside a cell", () => {
    cy.mount(<Harness tableId="cypress-table-editor-native-paste" />);

    cy.contains("Build UI").dblclick();
    cy.findByLabelText("Edit Title").should("exist");

    cy.window().then((win) =>
      cy.findByLabelText("Edit Title").then(($editor) => {
        const defaultPrevented = dispatchPlainTextPaste(win, $editor[0], "native paste");
        expect(defaultPrevented).to.equal(false);
      })
    );

    cy.findByLabelText("Edit Title").should("exist");
    cy.findByTestId("title-raw").should("have.text", "Build UI");
  });

  it("does not apply enhanced paste when cell selection is disabled", () => {
    cy.mount(
      <Harness
        tableId="cypress-table-grid-paste-disabled-without-selection"
        features={{ cellSelect: false }}
      />
    );

    cy.get("[role='gridcell'][data-column-id='title']").first().click();

    cy.window().then((win) =>
      cy.findByRole("grid").then(($grid) => {
        const defaultPrevented = dispatchPlainTextPaste(win, $grid[0], "Should not paste");
        expect(defaultPrevented).to.equal(false);
      })
    );

    cy.findByTestId("title-raw").should("have.text", "Build UI");
  });

  it("canonicalizes pasted select labels to option values and preserves badge styling", () => {
    cy.mount(<StrictOptionParsingHarness tableId="cypress-table-option-paste-select" />);

    cy.get("[role='gridcell'][data-column-id='status']").first().click();

    cy.window().then((win) =>
      cy.findByRole("grid").then(($grid) => {
        const defaultPrevented = dispatchPlainTextPaste(win, $grid[0], "To do");
        expect(defaultPrevented).to.equal(true);
      })
    );

    cy.findByTestId("status-raw").should("have.text", "todo");
    cy.get("[role='gridcell'][data-column-id='status']").first().within(() => {
      cy.contains("span", "To do").should("have.class", "bg-slate-100");
    });
  });

  it("canonicalizes pasted multiselect labels to option values and preserves badge styling", () => {
    cy.mount(<StrictOptionParsingHarness tableId="cypress-table-option-paste-multiselect" />);

    cy.get("[role='gridcell'][data-column-id='tags']").first().click();

    cy.window().then((win) =>
      cy.findByRole("grid").then(($grid) => {
        const defaultPrevented = dispatchPlainTextPaste(win, $grid[0], "Urgent, Design");
        expect(defaultPrevented).to.equal(true);
      })
    );

    cy.findByTestId("tags-raw").should("have.text", "urgent,design");
    cy.get("[role='gridcell'][data-column-id='tags']").first().within(() => {
      cy.contains("span", "Urgent").should("have.class", "bg-rose-100");
      cy.contains("span", "Design").should("have.class", "bg-violet-100");
    });
  });

  it("skips invalid pasted option cells while applying valid ones", () => {
    cy.stub(toast, "error").as("toastError");
    cy.mount(<StrictOptionParsingHarness tableId="cypress-table-option-paste-invalid" />);

    cy.get("[role='gridcell'][data-column-id='status']").first().click();

    cy.window().then((win) =>
      cy.findByRole("grid").then(($grid) => {
        const defaultPrevented = dispatchPlainTextPaste(win, $grid[0], "To do\tUrgent, Missing");
        expect(defaultPrevented).to.equal(true);
      })
    );

    cy.findByTestId("status-raw").should("have.text", "todo");
    cy.findByTestId("tags-raw").should("have.text", "urgent");
    cy.get("@toastError").should(
      "have.been.calledWith",
      "Paste applied with 1 invalid select/multiselect cell skipped."
    );
  });

  it("creates a row from the draft row with the shared select and multiselect editors", () => {
    cy.stub(toast, "success").as("toastSuccess");
    cy.mount(<StrictOptionParsingHarness tableId="cypress-table-option-draft-valid" />);

    cy.contains("Add row").click();
    cy.findByRole("listbox", { name: /Edit Status/i })
      .should("have.focus")
      .then(($listbox) => {
        const dialog = $listbox.closest("[role='dialog']")[0];
        expect(dialog?.parentElement, "draft select editor dialog should portal to body").to.equal(
          $listbox[0].ownerDocument.body
        );
      });
    cy.findByRole("listbox", { name: /Edit Status/i }).within(() => {
      cy.contains("[role='option']", "To do").click();
    });

    cy.get("tr[data-row-id='__draft__'] [role='gridcell'][data-column-id='tags']").click();
    cy.findByRole("listbox", { name: /Edit Tags/i })
      .should("have.focus")
      .then(($listbox) => {
        const dialog = $listbox.closest("[role='dialog']")[0];
        expect(dialog?.parentElement, "draft multiselect editor dialog should portal to body").to.equal(
          $listbox[0].ownerDocument.body
        );
      });
    cy.findByRole("listbox", { name: /Edit Tags/i }).within(() => {
      cy.contains("[role='option']", "Urgent").click();
      cy.contains("[role='option']", "Design").click();
    });
    cy.findByRole("listbox", { name: /Edit Tags/i }).trigger("keydown", { key: "Enter", force: true });
    cy.contains("Add row").click();

    cy.findByTestId("row-count").should("have.text", "2");
    cy.findByTestId("status-raw").should("have.text", "todo");
    cy.findByTestId("tags-raw").should("have.text", "urgent,design");
    cy.get("@toastSuccess").should("have.been.calledWith", "Row added");
  });

  it("keeps the draft row pending until the add action is confirmed", () => {
    cy.mount(<StrictOptionParsingHarness tableId="cypress-table-option-draft-invalid" />);

    cy.contains("Add row").click();
    cy.findByRole("listbox", { name: /Edit Status/i }).within(() => {
      cy.contains("[role='option']", "To do").click();
    });

    cy.findByTestId("row-count").should("have.text", "1");
    cy.findByTestId("status-raw").should("have.text", "done");
    cy.findByTestId("tags-raw").should("have.text", "urgent");
  });

  it("restores grid focus after escape so keyboard navigation resumes immediately", () => {
    cy.mount(<Harness tableId="cypress-table-post-escape-navigation" />);

    cy.contains("Build UI").dblclick();
    cy.findByLabelText("Edit Title").type("{esc}");
    cy.findByLabelText("Edit Title").should("not.exist");
    cy.findByRole("grid").should("have.focus");
    cy.findByRole("grid").trigger("keydown", { key: "ArrowRight" });
    cy.findByRole("grid").trigger("keydown", { key: "Enter" });
    cy.findByRole("listbox", { name: /Edit Status/i }).should("exist");
  });

  it("does not continuously emit virtualizer measurement warnings while idle", () => {
    const warningMessage = "Missing attribute name 'data-index={index}' on measured element.";
    let warningCount = 0;
    let restoreConsole: (() => void) | null = null;
    let firstSampleCount = 0;

    cy.window().then((win) => {
      const originalWarn = win.console.warn.bind(win.console);
      const originalError = win.console.error.bind(win.console);

      win.console.warn = (...args) => {
        if (args.some((arg) => typeof arg === "string" && arg.includes(warningMessage))) {
          warningCount += 1;
          return;
        }
        originalWarn(...args);
      };

      win.console.error = (...args) => {
        if (args.some((arg) => typeof arg === "string" && arg.includes(warningMessage))) {
          warningCount += 1;
          return;
        }
        originalError(...args);
      };

      restoreConsole = () => {
        win.console.warn = originalWarn;
        win.console.error = originalError;
      };
    });

    cy.mount(<VirtualizationHarness tableId="virtualization-regression-table-idle" />);
    cy.findByRole("grid").scrollTo("bottom");
    cy.findByRole("grid").scrollTo("top");
    cy.wait(300);

    cy.then(() => {
      firstSampleCount = warningCount;
    });

    cy.wait(500);

    cy.then(() => {
      expect(
        warningCount,
        "virtualizer warning count should stabilize instead of increasing in a render loop"
      ).to.equal(firstSampleCount);

      restoreConsole?.();
    });
  });

  it("keeps header backgrounds opaque while scrolling", () => {
    cy.mount(<VirtualizationHarness tableId="virtualization-regression-table-header" />);

    cy.findByRole("grid").scrollTo(0, 420);

    cy.get("thead").then(($thead) => {
      const style = getComputedStyle($thead[0]);
      expect(
        style.backgroundImage !== "none" || style.backgroundColor !== "rgba(0, 0, 0, 0)",
        "thead should render a painted background"
      ).to.equal(true);
    });

    cy.get("thead tr")
      .eq(0)
      .find("th")
      .first()
      .then(($headerCell) => {
        const style = getComputedStyle($headerCell[0]);
        expect(
          style.backgroundImage !== "none" || style.backgroundColor !== "rgba(0, 0, 0, 0)",
          "header cell should render a painted background"
        ).to.equal(true);
      });
  });
});
