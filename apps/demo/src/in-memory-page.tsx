import { useMemo, useRef, useState } from "react";
import { Copy, Eye, Flag, Globe, Layers, LoaderCircle, Plus, Trash2 } from "lucide-react";
import {
  DataTable,
  DataTableContainer,
  type DataTableColumn,
  type DataTableDataSource,
  type DataTableQueryState,
  type DataTableRowAction,
  type DataTableToolbarState
} from "@talentum-ventures/convex-datatable";
import { z } from "zod";
import { applyServerQuery } from "./demo-query";

type DemoRow = {
  id: string;
  name: string;
  description: string;
  amount: number;
  status: string;
  tags: ReadonlyArray<string>;
  website: string;
  createdAt: string;
  meta: string;
};

function generateRows(): ReadonlyArray<DemoRow> {
  const statuses = ["todo", "in_progress", "done"] as const;
  const tags = ["urgent", "design", "backend", "ops", "qa"] as const;

  const output: DemoRow[] = [];

  for (let index = 1; index <= 180; index += 1) {
    const status = statuses[index % statuses.length] ?? "todo";
    const rowTags = [tags[index % tags.length] ?? "ops", tags[(index + 2) % tags.length] ?? "qa"];

    output.push({
      id: String(index),
      name: `Project ${index}`,
      description:
        index % 2 === 0
          ? `Long note for project ${index}. This row wraps and increases row content minimum height.`
          : `Short note ${index}`,
      amount: 1000 + index * 9.35,
      status,
      tags: rowTags,
      website: `https://example.com/projects/${index}`,
      createdAt: `2026-02-${String((index % 28) + 1).padStart(2, "0")}`,
      meta: `#${index}`
    });
  }

  return output;
}

function queryCacheKey(state: DataTableQueryState): string {
  const sortingPart = state.sorting
    .map((entry) => `${entry.columnId}.${entry.direction}`)
    .join("|");

  const filtersPart = state.filters
    .map((entry) => {
      const value = Array.isArray(entry.value) ? entry.value.join("~") : String(entry.value);
      return `${entry.columnId}.${entry.op}.${value}`;
    })
    .join("|");

  return `${sortingPart}::${filtersPart}::${state.pageSize}::${state.cursor ?? ""}`;
}

function renderDemoToolbar(state: DataTableToolbarState): JSX.Element {
  const {
    canAddRow,
    addRow,
    canDeleteSelected,
    deleteSelected,
    selectedRowCount,
    canCopy,
    copy,
    hiddenColumns,
    showColumn,
    showAllColumns,
    isLoading
  } = state;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-sky-200/80 bg-gradient-to-br from-sky-50/90 via-white to-white p-3 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-800">Custom toolbar (renderToolbar)</p>
        <div className="flex flex-wrap items-center gap-2">
          {canAddRow ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700"
              onClick={addRow}
            >
              <Plus className="h-4 w-4" />
              Add row
            </button>
          ) : null}

          {canDeleteSelected ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-rose-700"
              onClick={deleteSelected}
            >
              <Trash2 className="h-4 w-4" />
              Delete selected
            </button>
          ) : null}

          {canCopy ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
              onClick={copy}
            >
              <Copy className="h-4 w-4" />
              Copy
            </button>
          ) : null}

          {isLoading ? (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              Loading rows…
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex w-full max-w-md flex-col gap-2 sm:w-auto sm:items-end">
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-slate-600">
          <span className="rounded-full bg-white px-2 py-0.5 font-medium text-slate-800 ring-1 ring-slate-200">
            {selectedRowCount === 0 ? "No rows selected" : `${selectedRowCount} selected`}
          </span>
        </div>

        {hiddenColumns.length > 0 ? (
          <div className="w-full rounded-lg border border-amber-200 bg-amber-50/80 p-2 sm:max-w-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900">
                <Eye className="h-3.5 w-3.5" />
                Hidden columns ({hiddenColumns.length})
              </span>
              <button
                type="button"
                className="shrink-0 rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] font-medium text-amber-900 hover:bg-amber-100"
                onClick={showAllColumns}
              >
                Show all
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {hiddenColumns.map((column) => (
                <button
                  key={column.id}
                  type="button"
                  className="inline-flex max-w-full items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                  title={column.header}
                  onClick={() => {
                    showColumn(column.id);
                  }}
                >
                  <span className="truncate">{column.header}</span>
                  <span className="text-sky-600">+</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function InMemoryPage(): JSX.Element {
  const [rows, setRows] = useState<ReadonlyArray<DemoRow>>(generateRows());
  const [softDeleted, setSoftDeleted] = useState<Record<string, DemoRow>>({});
  const [limit, setLimit] = useState(50);
  const queryCacheRef = useRef<{
    queryKey: string;
    rowsRef: ReadonlyArray<DemoRow>;
    projected: ReadonlyArray<DemoRow>;
  } | null>(null);
  const rowsResultCacheRef = useRef<{
    queryKey: string;
    limit: number;
    rowsRef: ReadonlyArray<DemoRow>;
    projectedRef: ReadonlyArray<DemoRow>;
    result: {
      rows: ReadonlyArray<DemoRow>;
      hasMore: boolean;
      isLoading: boolean;
      isLoadingMore: boolean;
      error: string | null;
      loadMore: () => void;
      refresh: () => void;
    };
  } | null>(null);

  const columns = useMemo<ReadonlyArray<DataTableColumn<DemoRow>>>(
    () => [
      {
        id: "name",
        field: "name",
        header: "Project",
        kind: "text",
        width: 180,
        isEditable: true,
        validator: (value) => (value.trim().length > 0 ? null : "Project name is required")
      },
      {
        id: "description",
        field: "description",
        header: "Description",
        kind: "longText",
        width: 260,
        isEditable: true
      },
      {
        id: "amount",
        field: "amount",
        header: "Budget",
        kind: "currency",
        currency: "USD",
        width: 120,
        isEditable: true,
        validator: (value) => (value >= 0 ? null : "Budget cannot be negative")
      },
      {
        id: "status",
        field: "status",
        header: "Status",
        kind: "select",
        width: 150,
        isEditable: true,
        options: [
          {
            value: "todo",
            label: "To do",
            colorClass: "bg-amber-100 text-amber-800",
            icon: Flag
          },
          {
            value: "in_progress",
            label: "In progress",
            colorClass: "bg-sky-100 text-sky-800",
            icon: Layers
          },
          {
            value: "done",
            label: "Done",
            colorClass: "bg-emerald-100 text-emerald-800",
            icon: Globe
          }
        ]
      },
      {
        id: "tags",
        field: "tags",
        header: "Tags",
        kind: "multiselect",
        width: 220,
        isEditable: true,
        options: [
          {
            value: "urgent",
            label: "Urgent",
            colorClass: "bg-rose-100 text-rose-700"
          },
          {
            value: "design",
            label: "Design",
            colorClass: "bg-violet-100 text-violet-700"
          },
          {
            value: "backend",
            label: "Backend",
            colorClass: "bg-slate-100 text-slate-700"
          },
          {
            value: "ops",
            label: "Ops",
            colorClass: "bg-cyan-100 text-cyan-700"
          },
          {
            value: "qa",
            label: "QA",
            colorClass: "bg-lime-100 text-lime-700"
          }
        ]
      },
      {
        id: "website",
        field: "website",
        header: "Website",
        kind: "link",
        width: 260,
        isEditable: true
      },
      {
        id: "createdAt",
        field: "createdAt",
        header: "Created",
        kind: "date",
        width: 140,
        isEditable: true
      },
      {
        id: "meta",
        field: "meta",
        header: "Meta",
        kind: "reactNode",
        width: 120,
        isEditable: true,
        renderCell: ({ value }) => <>{value}</>,
        renderEditor: ({ value, commit, cancel }) => (
          <input
            autoFocus
            className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            defaultValue={String(value)}
            onBlur={(event) => {
              commit(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                cancel();
              }
              if (event.key === "Enter") {
                commit(event.currentTarget.value);
              }
            }}
          />
        ),
        parseInput: (input) => input,
        parseClipboard: (text) => text,
        serializeClipboard: (value) => String(value)
      }
    ],
    []
  );

  const rowSchema = useMemo(
    () =>
      z.object({
        id: z.string(),
        name: z.string().min(1),
        description: z.string(),
        amount: z.number().min(0),
        status: z.string(),
        tags: z.array(z.string()),
        website: z.string().url(),
        createdAt: z.string(),
        meta: z.string()
      }),
    []
  );

  const rowActions = useMemo<ReadonlyArray<DataTableRowAction<DemoRow>>>(
    () => [
      {
        id: "open",
        label: "Open",
        onSelect: ({ row }) => {
          window.open(row.website, "_blank", "noreferrer");
        }
      }
    ],
    []
  );

  const features = useMemo(
    () => ({
      editing: true,
      rowAdd: true,
      rowDelete: true,
      clipboardPaste: true,
      cellSelect: true,
      rowResize: false,
      virtualization: true,
      undo: true
    }),
    []
  );

  const theme = useMemo(
    () => ({
      activeCellRing: "hsl(200 100% 42%)",
      selectionBg: "hsl(200 80% 93%)"
    }),
    []
  );

  const dataSource = useMemo<DataTableDataSource<DemoRow>>(
    () => ({
      useRows: (query) => {
        const queryKey = queryCacheKey(query);
        const cache = queryCacheRef.current;
        const projected =
          cache && cache.queryKey === queryKey && cache.rowsRef === rows
            ? cache.projected
            : applyServerQuery(rows, query);

        if (!cache || cache.queryKey !== queryKey || cache.rowsRef !== rows) {
          queryCacheRef.current = {
            queryKey,
            rowsRef: rows,
            projected
          };
        }

        const rowsResultCache = rowsResultCacheRef.current;
        if (
          rowsResultCache &&
          rowsResultCache.queryKey === queryKey &&
          rowsResultCache.limit === limit &&
          rowsResultCache.rowsRef === rows &&
          rowsResultCache.projectedRef === projected
        ) {
          return rowsResultCache.result;
        }

        const scoped = projected.length <= limit ? projected : projected.slice(0, limit);

        const result = {
          rows: scoped,
          hasMore: projected.length > scoped.length,
          isLoading: false,
          isLoadingMore: false,
          error: null,
          loadMore: () => {
            setLimit((current) => current + query.pageSize);
          },
          refresh: () => {
            setLimit(50);
          }
        };

        rowsResultCacheRef.current = {
          queryKey,
          limit,
          rowsRef: rows,
          projectedRef: projected,
          result
        };

        return result;
      },
      createRow: async (draft) => {
        const newRow: DemoRow = {
          id: crypto.randomUUID(),
          name: String(draft.name ?? "Untitled"),
          description: String(draft.description ?? ""),
          amount: Number(draft.amount ?? 0),
          status: String(draft.status ?? "todo"),
          tags: Array.isArray(draft.tags) ? draft.tags.map((entry) => String(entry)) : [],
          website: String(draft.website ?? "https://example.com"),
          createdAt: String(draft.createdAt ?? "2026-03-05"),
          meta: "new"
        };

        setRows((current) => [newRow, ...current]);
        return newRow;
      },
      updateRows: async (changes) => {
        setRows((current) => {
          const patchMap = new Map<string, Partial<DemoRow>>();
          for (const change of changes) {
            patchMap.set(change.rowId, change.patch);
          }

          return current.map((row) => {
            const patch = patchMap.get(row.id);
            if (!patch) {
              return row;
            }
            return {
              ...row,
              ...patch
            };
          });
        });
      },
      deleteRows: async (rowIds) => {
        setRows((current) => {
          const removed: Record<string, DemoRow> = {};
          const remaining = current.filter((row) => {
            if (rowIds.includes(row.id)) {
              removed[row.id] = row;
              return false;
            }
            return true;
          });
          setSoftDeleted((currentDeleted) => ({ ...currentDeleted, ...removed }));
          return remaining;
        });
      },
      restoreRows: async (deletedRows) => {
        setRows((current) => [...deletedRows, ...current]);
        setSoftDeleted((current) => {
          const next = { ...current };
          for (const row of deletedRows) {
            delete next[row.id];
          }
          return next;
        });
      }
    }),
    [limit, rows]
  );

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-hidden sm:gap-5">
      <section className="space-y-1 sm:space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-2xl">In-memory example</h2>
        <p className="hidden max-w-4xl text-sm text-slate-600 sm:block">
          Fully type-safe Airtable-inspired datatable powered by TanStack internals, using an in-memory data source for rapid interaction and feature coverage.
        </p>
        <p className="text-xs text-slate-500">Soft deleted rows in memory: {Object.keys(softDeleted).length}</p>
      </section>

      <DataTableContainer>
        <DataTable<DemoRow>
          tableId="demo-projects"
          columns={columns}
          dataSource={dataSource}
          getRowId={(row) => row.id}
          rowSchema={rowSchema}
          rowActions={rowActions}
          features={features}
          theme={theme}
          renderToolbar={renderDemoToolbar}
        />
      </DataTableContainer>
    </div>
  );
}
