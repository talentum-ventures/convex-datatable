import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode
} from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnPinningState,
  type ColumnSizingState,
  type RowSelectionState,
  type SortingState,
  type Updater,
  type VisibilityState
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Filter,
  GripVertical,
  LoaderCircle,
  MoreVertical,
  Pin,
  PinOff,
  Plus,
  Rows3,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_MIN_ROW_HEIGHT,
  DEFAULT_OVERSCAN,
  DEFAULT_PAGE_SIZE,
  DEFAULT_THEME_TOKENS
} from "../core/defaults";
import { cn } from "../core/cn";
import {
  getColumnValue,
  orderColumns,
  setColumnValue
} from "../core/column-utils";
import {
  parseClipboardToCellValue,
  serializeCellForClipboard
} from "../core/cell-value";
import type {
  CellCoord,
  DataTableCellValue,
  DataTableColumn,
  DataTableFilter,
  DataTableFeatureFlags,
  DataTableProps,
  DataTableRowModel,
  DataTableThemeTokens,
  FilterOperator,
  PersistedTableState,
  RowId
} from "../core/types";
import { validateCell, validateRow } from "../core/validation";
import {
  fromTanStackFilters,
  fromTanStackSorting,
  internalToPersistedState,
  persistedStateToInternal,
  toTanStackFilters
} from "../engine/state-converters";
import {
  debugEnabled,
  pushDebugEvent,
  pushDebugEventThrottled
} from "../core/debug";
import { useColumnDefs, type CellCommit } from "../engine/build-columns";
import { expandPasteMatrix, parseTsv, serializeTsv } from "../selection/clipboard";
import { normalizeRange } from "../selection/range";
import { usePersistedState } from "../persistence/use-persisted-state";
import { useRowHeights } from "../virtual/row-heights";
import { computeColumnLayout } from "./column-layout";
import { Button, Checkbox, Input } from "./primitives";

type EditingCell = {
  rowId: RowId;
  columnId: string;
} | null;

function applyUpdater<TValue>(updater: Updater<TValue>, current: TValue): TValue {
  if (typeof updater === "function") {
    const fn = updater as (old: TValue) => TValue;
    return fn(current);
  }
  return updater;
}

function asRequiredFeatureFlags(
  features: DataTableFeatureFlags | undefined
): Required<DataTableFeatureFlags> {
  return {
    ...DEFAULT_FEATURE_FLAGS,
    ...features
  };
}

function cellRange(start: CellCoord | null, end: CellCoord | null): { start: CellCoord; end: CellCoord } | null {
  if (!start && !end) {
    return null;
  }
  if (start && !end) {
    return { start, end: start };
  }
  if (!start && end) {
    return { start: end, end };
  }
  if (start && end) {
    return {
      start,
      end
    };
  }
  return null;
}

type CssVarsStyle = CSSProperties & {
  "--dt-font-family": string;
  "--dt-radius": string;
  "--dt-border-color": string;
  "--dt-header-bg": string;
  "--dt-row-bg": string;
  "--dt-row-hover-bg": string;
  "--dt-pinned-shadow": string;
  "--dt-active-cell-ring": string;
  "--dt-selection-bg": string;
};

type PinZone = "left" | "center" | "right";
type DropPlacement = "before" | "after";
type ColumnMenuAnchor = "left" | "right";

const COLUMN_MENU_WIDTH_PX = 288;
const COLUMN_MENU_GUTTER_PX = 8;

const TEXT_FILTER_OPERATORS: ReadonlyArray<FilterOperator> = [
  "contains",
  "startsWith",
  "endsWith",
  "eq",
  "neq"
];
const NUMBER_FILTER_OPERATORS: ReadonlyArray<FilterOperator> = ["eq", "neq", "gt", "gte", "lt", "lte"];
const DATE_FILTER_OPERATORS: ReadonlyArray<FilterOperator> = ["eq", "neq", "gt", "gte", "lt", "lte"];
const SELECT_FILTER_OPERATORS: ReadonlyArray<FilterOperator> = ["eq", "neq", "in"];
const MULTISELECT_FILTER_OPERATORS: ReadonlyArray<FilterOperator> = ["in"];

function filterOperatorsForColumn<TRow extends DataTableRowModel>(
  column: DataTableColumn<TRow>
): ReadonlyArray<FilterOperator> {
  if (column.kind === "number" || column.kind === "currency") {
    return NUMBER_FILTER_OPERATORS;
  }
  if (column.kind === "date") {
    return DATE_FILTER_OPERATORS;
  }
  if (column.kind === "select") {
    return SELECT_FILTER_OPERATORS;
  }
  if (column.kind === "multiselect") {
    return MULTISELECT_FILTER_OPERATORS;
  }
  return TEXT_FILTER_OPERATORS;
}

function defaultFilterOperatorForColumn<TRow extends DataTableRowModel>(
  column: DataTableColumn<TRow>
): FilterOperator {
  const operators = filterOperatorsForColumn(column);
  const first = operators[0];
  return first ?? "contains";
}

function isActiveFilterValue(value: DataTableFilter["value"]): boolean {
  if (value === null) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return true;
}

function pinZoneForColumnId(columnId: string, pinning: ColumnPinningState): PinZone {
  if ((pinning.left ?? []).includes(columnId)) {
    return "left";
  }
  if ((pinning.right ?? []).includes(columnId)) {
    return "right";
  }
  return "center";
}

function reorderIds(
  ids: ReadonlyArray<string>,
  sourceId: string,
  targetId: string,
  placement: DropPlacement
): string[] {
  const sourceIndex = ids.indexOf(sourceId);
  const targetIndex = ids.indexOf(targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return [...ids];
  }

  const next = [...ids];
  const [moved] = next.splice(sourceIndex, 1);
  if (!moved) {
    return [...ids];
  }

  const nextTargetIndex = next.indexOf(targetId);
  if (nextTargetIndex < 0) {
    return [...ids];
  }

  const insertIndex = placement === "before" ? nextTargetIndex : nextTargetIndex + 1;
  next.splice(insertIndex, 0, moved);
  return next;
}

function useRowObservers(): {
  connect: (rowId: RowId, node: HTMLTableRowElement | null, onResize: (height: number) => void) => void;
  disconnectAll: () => void;
} {
  const observers = useRef<Record<RowId, ResizeObserver>>({});
  const nodes = useRef<Record<RowId, HTMLTableRowElement | null>>({});

  const connect = useCallback(
    (rowId: RowId, node: HTMLTableRowElement | null, onResize: (height: number) => void) => {
      const currentNode = nodes.current[rowId] ?? null;
      if (node === currentNode) {
        return;
      }

      const existing = observers.current[rowId];

      if (!node) {
        if (currentNode && currentNode.isConnected) {
          return;
        }

        if (existing) {
          existing.disconnect();
          delete observers.current[rowId];
        }
        delete nodes.current[rowId];
        return;
      }

      if (existing) {
        existing.disconnect();
        delete observers.current[rowId];
      }

      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }
        onResize(entry.contentRect.height);
      });

      observer.observe(node);
      observers.current[rowId] = observer;
      nodes.current[rowId] = node;
    },
    []
  );

  const disconnectAll = useCallback(() => {
    for (const observer of Object.values(observers.current)) {
      observer.disconnect();
    }
    observers.current = {};
    nodes.current = {};
  }, []);

  return useMemo(
    () => ({
      connect,
      disconnectAll
    }),
    [connect, disconnectAll]
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function tableStyle(theme: DataTableThemeTokens): CssVarsStyle {
  const style: CssVarsStyle = {
    "--dt-font-family": theme.fontFamily,
    "--dt-radius": theme.radius,
    "--dt-border-color": theme.borderColor,
    "--dt-header-bg": theme.headerBg,
    "--dt-row-bg": theme.rowBg,
    "--dt-row-hover-bg": theme.rowHoverBg,
    "--dt-pinned-shadow": theme.pinnedShadow,
    "--dt-active-cell-ring": theme.activeCellRing,
    "--dt-selection-bg": theme.selectionBg
  };
  return style;
}

function fixedTrackStyle(width: number): CSSProperties {
  const normalizedWidth = `${Math.max(0, Math.round(width))}px`;
  return {
    boxSizing: "border-box",
    width: normalizedWidth,
    minWidth: normalizedWidth,
    maxWidth: normalizedWidth,
    flex: `0 0 ${normalizedWidth}`
  };
}

function resolveThemeTokens(
  theme: Partial<DataTableThemeTokens> | undefined
): DataTableThemeTokens {
  return {
    ...DEFAULT_THEME_TOKENS,
    ...theme
  };
}

function asRecord<TValue>(entries: ReadonlyArray<readonly [string, TValue]>): Record<string, TValue> {
  const output: Record<string, TValue> = {};
  for (const [key, value] of entries) {
    output[key] = value;
  }
  return output;
}

export function DataTable<TRow extends DataTableRowModel>({
  tableId,
  columns,
  getRowId,
  dataSource,
  rowSchema,
  features,
  rowActions,
  minRowHeight,
  pageSize,
  theme,
  className,
  onError
}: DataTableProps<TRow>): JSX.Element {
  const mergedFeatures = useMemo(() => asRequiredFeatureFlags(features), [features]);
  const mergedTheme = useMemo(
    () => resolveThemeTokens(theme),
    [theme]
  );
  const isDebugMode = useMemo(() => debugEnabled(), []);
  const debugScope = useMemo(() => `table:${tableId}`, [tableId]);

  const minHeight = minRowHeight ?? DEFAULT_MIN_ROW_HEIGHT;
  const effectivePageSize = pageSize ?? DEFAULT_PAGE_SIZE;

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({ left: [], right: [] });
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [activeCell, setActiveCell] = useState<CellCoord | null>(null);
  const [rangeStart, setRangeStart] = useState<CellCoord | null>(null);
  const [columnMenuId, setColumnMenuId] = useState<string | null>(null);
  const [columnMenuAnchorById, setColumnMenuAnchorById] = useState<Readonly<Record<string, ColumnMenuAnchor>>>({});
  const [filterOperatorDrafts, setFilterOperatorDrafts] = useState<Readonly<Record<string, FilterOperator>>>({});
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ columnId: string; placement: DropPlacement } | null>(null);
  const [optimisticRows, setOptimisticRows] = useState<Record<RowId, TRow>>({});
  const [deletedRows, setDeletedRows] = useState<Record<RowId, TRow>>({});
  const [draftRow, setDraftRow] = useState<Partial<TRow>>({});
  const commitCounter = useRef(0);
  const commitWindow = useRef<number[]>([]);
  const interactionSequence = useRef(0);

  const orderedColumns = useMemo(
    () => orderColumns(columns, columnOrder),
    [columns, columnOrder]
  );

  const queryState = useMemo(
    () => ({
      sorting: fromTanStackSorting(sorting),
      filters: fromTanStackFilters(columnFilters),
      pageSize: effectivePageSize,
      cursor: null
    }),
    [columnFilters, effectivePageSize, sorting]
  );

  const rowsResult = dataSource.useRows(queryState);

  const deletedRowIds = useMemo(() => new Set(Object.keys(deletedRows)), [deletedRows]);

  const mergedRows = useMemo(() => {
    const rows: TRow[] = [];

    for (const sourceRow of rowsResult.rows) {
      const rowId = getRowId(sourceRow);
      if (deletedRowIds.has(rowId)) {
        continue;
      }
      rows.push(optimisticRows[rowId] ?? sourceRow);
    }

    return rows;
  }, [deletedRowIds, getRowId, optimisticRows, rowsResult.rows]);
  const rowSelectionRef = useRef(rowSelection);
  const mergedRowsRef = useRef(mergedRows);

  rowSelectionRef.current = rowSelection;
  mergedRowsRef.current = mergedRows;

  const rowHeights = useRowHeights({ minRowHeight });
  const setContentHeight = rowHeights.setContentHeight;
  const rowObservers = useRowObservers();

  const persistedState = useMemo(
    () =>
      internalToPersistedState({
        sorting,
        filters: columnFilters,
        columnOrder,
        columnVisibility,
        columnPinning,
        columnSizing
      }),
    [columnFilters, columnOrder, columnPinning, columnSizing, columnVisibility, sorting]
  );

  const hydrateFromPersistence = useCallback((state: PersistedTableState) => {
    const internal = persistedStateToInternal(state);
    setSorting(internal.sorting);
    setColumnFilters(internal.filters);
    setColumnOrder(internal.columnOrder);
    setColumnVisibility(internal.columnVisibility);
    setColumnPinning(internal.columnPinning);
    setColumnSizing(internal.columnSizing);
  }, []);

  usePersistedState({
    tableId,
    state: persistedState,
    onHydrate: hydrateFromPersistence,
    onError
  });

  useEffect(() => {
    if (columnOrder.length > 0) {
      return;
    }
    setColumnOrder(columns.map((column) => column.id));
  }, [columnOrder.length, columns]);

  useEffect(() => {
    if (!columnMenuId) {
      return;
    }

    const onPointerDown = (event: MouseEvent): void => {
      if (!(event.target instanceof Element)) {
        setColumnMenuId(null);
        return;
      }

      if (event.target.closest("[data-dt-column-menu-root='true']")) {
        return;
      }
      setColumnMenuId(null);
    };

    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === "Escape") {
        setColumnMenuId(null);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [columnMenuId]);

  const onCellSelect = useCallback((coord: CellCoord) => {
    if (isDebugMode) {
      pushDebugEventThrottled(debugScope, "cell-select", 120, "cell selected", {
        row: coord.rowIndex,
        column: coord.columnIndex
      });
    }
    setActiveCell(coord);
    setRangeStart(coord);
  }, [debugScope, isDebugMode]);

  const onRangeSelect = useCallback((coord: CellCoord) => {
    if (isDebugMode) {
      pushDebugEventThrottled(debugScope, "range-select", 120, "range anchor updated", {
        row: coord.rowIndex,
        column: coord.columnIndex
      });
    }
    setActiveCell(coord);
    setRangeStart((current) => current ?? coord);
  }, [debugScope, isDebugMode]);

  const onStartEdit = useCallback((rowId: RowId, columnId: string) => {
    setEditingCell({ rowId, columnId });
  }, []);

  const onCancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const commitCellEdit = useCallback<CellCommit<TRow>>(
    async ({ row, rowId, column, value }) => {
      const cellValidation = validateCell(column, row, value);
      if (!cellValidation.ok) {
        toast.error(cellValidation.message ?? "Invalid cell value");
        return;
      }

      const updateResult = setColumnValue(row, rowId, column, value);
      const rowValidation = validateRow(rowSchema, updateResult.nextRow);
      if (!rowValidation.ok) {
        toast.error(rowValidation.message ?? "Invalid row state");
        return;
      }

      setOptimisticRows((current) => ({
        ...current,
        [rowId]: updateResult.nextRow
      }));
      setEditingCell(null);

      if (!dataSource.updateRows) {
        return;
      }

      try {
        await dataSource.updateRows([updateResult.patch]);
      } catch (error) {
        setOptimisticRows((current) => {
          const next = { ...current };
          delete next[rowId];
          return next;
        });
        toast.error(`Failed to update row: ${String(error)}`);
      }
    },
    [dataSource, rowSchema]
  );

  const dataColumnDefs = useColumnDefs({
    columns: orderedColumns,
    getRowId,
    editingCell,
    activeCell,
    rangeStart,
    onStartEdit,
    onCommit: commitCellEdit,
    onCancelEdit,
    onCellSelect,
    onRangeSelect,
    enableEditing: mergedFeatures.editing
  });

  const deleteRowsNow = useCallback(
    async (rowsToDelete: ReadonlyArray<TRow>) => {
      if (!mergedFeatures.rowDelete || !dataSource.deleteRows || rowsToDelete.length === 0) {
        return;
      }

      const rowIds = rowsToDelete.map((row) => getRowId(row));
      const snapshotEntries = rowsToDelete.map((row) => [getRowId(row), row] as const);
      const snapshot = asRecord(snapshotEntries);

      setDeletedRows((current) => ({ ...current, ...snapshot }));

      try {
        await dataSource.deleteRows(rowIds);
      } catch (error) {
        setDeletedRows((current) => {
          const next = { ...current };
          for (const rowId of rowIds) {
            delete next[rowId];
          }
          return next;
        });
        toast.error(`Failed to delete rows: ${String(error)}`);
        return;
      }

      toast.message(`${rowIds.length} row${rowIds.length > 1 ? "s" : ""} deleted`, {
        action:
          dataSource.restoreRows
            ? {
                label: "Undo",
                onClick: () => {
                  const toRestore = rowIds
                    .map((rowId) => snapshot[rowId])
                    .filter((row): row is TRow => Boolean(row));

                  setDeletedRows((current) => {
                    const next = { ...current };
                    for (const rowId of rowIds) {
                      delete next[rowId];
                    }
                    return next;
                  });

                  const restorePromise = dataSource.restoreRows
                    ? dataSource.restoreRows(toRestore)
                    : null;
                  if (restorePromise) {
                    void restorePromise.catch((error) => {
                      toast.error(`Failed to restore rows: ${String(error)}`);
                    });
                  }
                }
              }
            : undefined
      });
    },
    [dataSource, getRowId, mergedFeatures.rowDelete]
  );

  const actionColumn = useMemo(() => {
    if (!mergedFeatures.rowActions) {
      return null;
    }

    const column: ColumnDef<TRow, DataTableCellValue> = {
      id: "__actions__",
      header: "Actions",
      size: 200,
      minSize: 160,
      maxSize: 320,
      accessorFn: () => "",
      enableHiding: false,
      enablePinning: true,
      enableResizing: true,
      cell: (context) => {
        const row = context.row.original;
        const rowId = getRowId(row);
        const customActions = (rowActions ?? []).filter((action) => action.isVisible?.(row) ?? true);

        return (
          <div className="flex flex-wrap items-center gap-1 py-1">
            {mergedFeatures.editing ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const firstEditable = orderedColumns.find((columnConfig) => columnConfig.isEditable ?? false);
                  if (!firstEditable) {
                    return;
                  }
                  setEditingCell({ rowId, columnId: firstEditable.id });
                }}
              >
                Edit
              </Button>
            ) : null}
            {mergedFeatures.rowDelete && dataSource.deleteRows ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  void deleteRowsNow([row]);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            ) : null}
            {customActions.map((action) => (
              <Button
                key={`${rowId}-${action.id}`}
                variant={action.variant === "destructive" ? "destructive" : "secondary"}
                size="sm"
                disabled={action.isDisabled?.(row) ?? false}
                onClick={() => {
                  void action.onSelect({ row, rowId });
                }}
              >
                {action.icon ? <action.icon className="h-3.5 w-3.5" /> : null}
                {action.label}
              </Button>
            ))}
          </div>
        );
      }
    };

    return column;
  }, [
    dataSource.deleteRows,
    deleteRowsNow,
    getRowId,
    mergedFeatures.editing,
    mergedFeatures.rowActions,
    mergedFeatures.rowDelete,
    orderedColumns,
    rowActions
  ]);

  const rowSelectColumn = useMemo(() => {
    if (!mergedFeatures.rowSelect) {
      return null;
    }

    const column: ColumnDef<TRow, DataTableCellValue> = {
      id: "__select__",
      header: () => (
        <Checkbox
          aria-label="Select all rows"
          checked={
            Object.keys(rowSelectionRef.current).length > 0 &&
            mergedRowsRef.current.length > 0 &&
            Object.keys(rowSelectionRef.current).length >= mergedRowsRef.current.length
          }
          onChange={(event) => {
            if (event.target.checked) {
              const nextSelection: RowSelectionState = {};
              for (let index = 0; index < mergedRowsRef.current.length; index += 1) {
                const row = mergedRowsRef.current[index];
                if (!row) {
                  continue;
                }
                nextSelection[getRowId(row)] = true;
              }
              setRowSelection(nextSelection);
            } else {
              setRowSelection({});
            }
          }}
        />
      ),
      accessorFn: () => "",
      enableHiding: false,
      enablePinning: true,
      size: 44,
      minSize: 44,
      maxSize: 44,
      cell: (context) => {
        const row = context.row.original;
        const rowId = getRowId(row);
        return (
          <div className="flex items-center justify-center py-1">
            <Checkbox
              aria-label={`Select row ${rowId}`}
              checked={Boolean(rowSelectionRef.current[rowId])}
              onChange={(event) => {
                const checked = event.target.checked;
                setRowSelection((current) => {
                  if (!checked) {
                    const next = { ...current };
                    delete next[rowId];
                    return next;
                  }
                  return {
                    ...current,
                    [rowId]: true
                  };
                });
              }}
            />
          </div>
        );
      }
    };

    return column;
  }, [getRowId, mergedFeatures.rowSelect]);

  const coreRowModel = useMemo(() => getCoreRowModel(), []);

  const tableColumns = useMemo(() => {
    const output: ColumnDef<TRow, DataTableCellValue>[] = [];
    if (rowSelectColumn) {
      output.push(rowSelectColumn);
    }
    output.push(...dataColumnDefs);
    if (actionColumn) {
      output.push(actionColumn);
    }
    return output;
  }, [actionColumn, dataColumnDefs, rowSelectColumn]);

  const table = useReactTable({
    data: mergedRows,
    columns: tableColumns,
    getCoreRowModel: coreRowModel,
    getRowId: (row) => getRowId(row),
    manualSorting: true,
    manualFiltering: true,
    enableColumnPinning: mergedFeatures.columnPinning,
    enableColumnResizing: mergedFeatures.columnResize,
    enableSorting: mergedFeatures.columnSort,
    enableFilters: mergedFeatures.columnFilter,
    columnResizeMode: "onChange",
    state: {
      sorting,
      columnFilters,
      columnOrder,
      columnVisibility,
      columnPinning,
      columnSizing,
      rowSelection
    },
    onSortingChange: (updater) => {
      setSorting((current) => applyUpdater(updater, current));
    },
    onColumnFiltersChange: (updater) => {
      setColumnFilters((current) => applyUpdater(updater, current));
    },
    onColumnOrderChange: (updater) => {
      setColumnOrder((current) => applyUpdater(updater, current));
    },
    onColumnVisibilityChange: (updater) => {
      setColumnVisibility((current) => applyUpdater(updater, current));
    },
    onColumnPinningChange: (updater) => {
      setColumnPinning((current) => applyUpdater(updater, current));
    },
    onColumnSizingChange: (updater) => {
      setColumnSizing((current) => applyUpdater(updater, current));
    },
    onRowSelectionChange: (updater) => {
      setRowSelection((current) => applyUpdater(updater, current));
    }
  });

  const columnById = useMemo(() => {
    const map = new Map<string, DataTableColumn<TRow>>();
    for (const column of orderedColumns) {
      map.set(column.id, column);
    }
    return map;
  }, [orderedColumns]);

  const decodedFilters = useMemo(() => fromTanStackFilters(columnFilters), [columnFilters]);

  const filterByColumnId = useMemo(() => {
    const map = new Map<string, DataTableFilter>();
    for (const filter of decodedFilters) {
      map.set(filter.columnId, filter);
    }
    return map;
  }, [decodedFilters]);

  const hiddenColumns = useMemo(
    () => orderedColumns.filter((column) => columnVisibility[column.id] === false),
    [columnVisibility, orderedColumns]
  );

  const visibleDataColumns = useMemo(
    () =>
      table
        .getVisibleLeafColumns()
        .map((column) => columnById.get(column.id))
        .filter((column): column is DataTableColumn<TRow> => Boolean(column)),
    [columnById, table]
  );

  const tableRows = table.getRowModel().rows;
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const containerNode = tableContainerRef.current;
    if (!containerNode) {
      return;
    }

    const applyWidth = (nextWidth: number): void => {
      const normalized = Math.max(0, Math.floor(nextWidth));
      setContainerWidth((current) => (current === normalized ? current : normalized));
    };

    applyWidth(containerNode.clientWidth);

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        applyWidth(entry.contentRect.width);
      }
    });

    observer.observe(containerNode);
    return () => {
      observer.disconnect();
    };
  }, []);

  const resolveColumnMenuAnchor = useCallback((trigger: HTMLElement): ColumnMenuAnchor => {
    const triggerRect = trigger.getBoundingClientRect();
    const containerRect = tableContainerRef.current?.getBoundingClientRect();
    const minLeft = (containerRect?.left ?? 0) + COLUMN_MENU_GUTTER_PX;
    const projectedLeft = triggerRect.right - COLUMN_MENU_WIDTH_PX;
    return projectedLeft < minLeft ? "left" : "right";
  }, []);

  const columnRenderLayout = useMemo(() => {
    const visibleColumns = table.getVisibleLeafColumns().map((column) => {
      const columnConfig = columnById.get(column.id);
      const pinned = column.getIsPinned();
      const pinnedSide: "left" | "center" | "right" =
        pinned === "left" || pinned === "right" ? pinned : "center";
      const maxSize = columnConfig?.maxWidth ?? column.columnDef.maxSize ?? null;

      return {
        id: column.id,
        baseWidth: column.getSize(),
        pinned: pinnedSide,
        isDataColumn: Boolean(columnConfig),
        canResize: column.getCanResize(),
        maxWidth: maxSize
      };
    });

    return computeColumnLayout({
      columns: visibleColumns,
      containerWidth
    });
  }, [
    columnById,
    columnOrder,
    columnPinning,
    columnSizing,
    columnVisibility,
    containerWidth,
    table,
    tableColumns
  ]);

  const totalRows = mergedRows.length + (mergedFeatures.rowAdd ? 1 : 0);

  const rowVirtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: (index) => {
      if (index >= mergedRows.length) {
        return minHeight;
      }
      const row = mergedRows[index];
      if (!row) {
        return minHeight;
      }
      return rowHeights.getFinalHeight(getRowId(row));
    },
    overscan: DEFAULT_OVERSCAN
  });

  const setRowElement = useCallback(
    (rowId: RowId, node: HTMLTableRowElement | null) => {
      if (!node) {
        if (!mergedFeatures.virtualization) {
          rowObservers.connect(rowId, null, () => undefined);
        }
        return;
      }

      if (mergedFeatures.virtualization) {
        rowVirtualizer.measureElement(node);
        return;
      }

      rowObservers.connect(rowId, node, (height) => {
        setContentHeight(rowId, height);
      });
    },
    [mergedFeatures.virtualization, rowObservers, rowVirtualizer, setContentHeight]
  );

  const rowRefHandlers = useRef<Record<RowId, (node: HTMLTableRowElement | null) => void>>({});

  const getRowRefHandler = useCallback(
    (rowId: RowId) => {
      const existing = rowRefHandlers.current[rowId];
      if (existing) {
        return existing;
      }

      const handler = (node: HTMLTableRowElement | null) => {
        setRowElement(rowId, node);
        if (!node) {
          delete rowRefHandlers.current[rowId];
        }
      };

      rowRefHandlers.current[rowId] = handler;
      return handler;
    },
    [setRowElement]
  );

  const virtualItems = mergedFeatures.virtualization
    ? rowVirtualizer.getVirtualItems()
    : Array.from({ length: totalRows }, (_, index) => ({
        key: index,
        index,
        start: index * minHeight,
        size: minHeight,
        end: (index + 1) * minHeight,
        lane: 0
      }));

  const totalHeight = mergedFeatures.virtualization
    ? rowVirtualizer.getTotalSize()
    : totalRows * minHeight;

  const onGridScroll = useCallback(() => {
    if (!mergedFeatures.infiniteScroll || !rowsResult.hasMore || rowsResult.isLoadingMore) {
      return;
    }

    const node = tableContainerRef.current;
    if (!node) {
      return;
    }

    const distanceToEnd = node.scrollHeight - (node.scrollTop + node.clientHeight);
    if (distanceToEnd < 220) {
      if (isDebugMode) {
        pushDebugEventThrottled(debugScope, "load-more", 300, "infinite scroll loadMore triggered", {
          distanceToEnd: Math.round(distanceToEnd),
          rowCount: mergedRows.length
        });
      }
      rowsResult.loadMore();
    }
  }, [debugScope, isDebugMode, mergedFeatures.infiniteScroll, mergedRows.length, rowsResult]);

  useEffect(() => {
    return () => {
      rowObservers.disconnectAll();
      rowRefHandlers.current = {};
    };
  }, [rowObservers]);

  useEffect(() => {
    if (!isDebugMode) {
      return;
    }

    pushDebugEvent(debugScope, "table mounted", {
      columns: columns.length,
      pageSize: effectivePageSize,
      virtualization: mergedFeatures.virtualization,
      cellSelect: mergedFeatures.cellSelect
    });

    return () => {
      pushDebugEvent(debugScope, "table unmounted", {
        commits: commitCounter.current
      });
    };
  }, [
    columns.length,
    debugScope,
    effectivePageSize,
    isDebugMode,
    mergedFeatures.cellSelect,
    mergedFeatures.virtualization
  ]);

  useEffect(() => {
    if (!isDebugMode) {
      return;
    }

    const now = performance.now();
    commitCounter.current += 1;
    commitWindow.current.push(now);

    while (commitWindow.current.length > 0 && now - (commitWindow.current[0] ?? now) > 2000) {
      commitWindow.current.shift();
    }

    if (commitWindow.current.length > 60) {
      pushDebugEventThrottled(debugScope, "render-storm", 1000, "high commit frequency", {
        commits2s: commitWindow.current.length,
        mergedRows: mergedRows.length,
        virtualItems: virtualItems.length,
        selectedRows: Object.keys(rowSelection).length,
        editing: editingCell ? 1 : 0
      });
    }

    if (commitCounter.current % 50 === 0) {
      pushDebugEventThrottled(debugScope, "render-checkpoint", 1500, "render checkpoint", {
        commits: commitCounter.current,
        mergedRows: mergedRows.length,
        virtualItems: virtualItems.length
      });
    }
  });

  const moveActiveCell = useCallback(
    (rowDelta: number, columnDelta: number, expandSelection: boolean) => {
      if (visibleDataColumns.length === 0 || mergedRows.length === 0) {
        return;
      }

      const startingCell: CellCoord = activeCell ?? { rowIndex: 0, columnIndex: 0 };

      const nextCoord: CellCoord = {
        rowIndex: clamp(startingCell.rowIndex + rowDelta, 0, Math.max(mergedRows.length - 1, 0)),
        columnIndex: clamp(
          startingCell.columnIndex + columnDelta,
          0,
          Math.max(visibleDataColumns.length - 1, 0)
        )
      };

      setActiveCell(nextCoord);
      if (expandSelection) {
        setRangeStart((current) => current ?? startingCell);
      } else {
        setRangeStart(nextCoord);
      }
    },
    [activeCell, mergedRows.length, visibleDataColumns.length]
  );

  const copySelection = useCallback(async () => {
    if (!mergedFeatures.clipboardCopy || !navigator.clipboard) {
      return;
    }

    if (visibleDataColumns.length === 0 || mergedRows.length === 0) {
      return;
    }

    const range = cellRange(rangeStart, activeCell);
    if (!range) {
      return;
    }

    const normalized = normalizeRange(range);
    const matrix: string[][] = [];

    for (let rowIndex = normalized.start.rowIndex; rowIndex <= normalized.end.rowIndex; rowIndex += 1) {
      const row = mergedRows[rowIndex];
      if (!row) {
        continue;
      }
      const rowCells: string[] = [];

      for (
        let columnIndex = normalized.start.columnIndex;
        columnIndex <= normalized.end.columnIndex;
        columnIndex += 1
      ) {
        const column = visibleDataColumns[columnIndex];
        if (!column) {
          rowCells.push("");
          continue;
        }
        const value = getColumnValue(row, column);
        rowCells.push(serializeCellForClipboard(column, row, value));
      }

      matrix.push(rowCells);
    }

    if (matrix.length === 0) {
      return;
    }

    await navigator.clipboard.writeText(serializeTsv(matrix));
    toast.success("Copied selection");
  }, [activeCell, mergedFeatures.clipboardCopy, mergedRows, rangeStart, visibleDataColumns]);

  const pasteFromText = useCallback(
    async (text: string) => {
      if (!mergedFeatures.clipboardPaste || !mergedFeatures.editing || !dataSource.updateRows) {
        return;
      }

      if (!activeCell || visibleDataColumns.length === 0 || mergedRows.length === 0) {
        return;
      }

      const parsed = parseTsv(text);
      if (parsed.length === 0) {
        return;
      }

      const selectedRange = cellRange(rangeStart, activeCell);
      const baseRange = selectedRange
        ? normalizeRange(selectedRange)
        : {
            start: activeCell,
            end: {
              rowIndex: activeCell.rowIndex + parsed.length - 1,
              columnIndex: activeCell.columnIndex + (parsed[0]?.length ?? 1) - 1
            }
          };

      const expanded = expandPasteMatrix(parsed, baseRange);
      const previousRows = new Map<RowId, TRow>();
      const patches = new Map<RowId, Partial<TRow>>();
      let skippedNonEditable = 0;

      for (let rowOffset = 0; rowOffset < expanded.length; rowOffset += 1) {
        const matrixRow = expanded[rowOffset];
        if (!matrixRow) {
          continue;
        }
        const rowIndex = baseRange.start.rowIndex + rowOffset;
        const row = mergedRows[rowIndex];
        if (!row) {
          continue;
        }
        const rowId = getRowId(row);
        previousRows.set(rowId, row);

        for (let columnOffset = 0; columnOffset < matrixRow.length; columnOffset += 1) {
          const columnIndex = baseRange.start.columnIndex + columnOffset;
          const column = visibleDataColumns[columnIndex];
          if (!column) {
            continue;
          }
          if (!(column.isEditable ?? false)) {
            skippedNonEditable += 1;
            continue;
          }

          const rawValue = matrixRow[columnOffset] ?? "";
          const parsedValue = parseClipboardToCellValue(column, row, rawValue);
          const cellValidation = validateCell(column, row, parsedValue);
          if (!cellValidation.ok) {
            continue;
          }

          const currentPatch = patches.get(rowId) ?? {};
          patches.set(
            rowId,
            {
              ...currentPatch,
              [column.field]: parsedValue
            } as Partial<TRow>
          );
        }
      }

      if (patches.size === 0) {
        if (skippedNonEditable > 0) {
          toast.message(`Skipped ${skippedNonEditable} non-editable cells`);
        }
        return;
      }

      const optimisticUpdate: Record<RowId, TRow> = {};
      for (const [rowId, patch] of patches.entries()) {
        const source = previousRows.get(rowId);
        if (!source) {
          continue;
        }
        const next = {
          ...source,
          ...patch
        } as TRow;

        const rowValidation = validateRow(rowSchema, next);
        if (!rowValidation.ok) {
          continue;
        }

        optimisticUpdate[rowId] = next;
      }

      if (Object.keys(optimisticUpdate).length === 0) {
        return;
      }

      setOptimisticRows((current) => ({
        ...current,
        ...optimisticUpdate
      }));

      const groupedPatches = Array.from(patches.entries()).map(([rowId, patch]) => ({
        rowId,
        patch
      }));

      try {
        await dataSource.updateRows(groupedPatches);
        if (skippedNonEditable > 0) {
          toast.message(`Paste applied. Skipped ${skippedNonEditable} non-editable cells`);
        } else {
          toast.success("Paste applied");
        }
      } catch (error) {
        setOptimisticRows((current) => {
          const next = { ...current };
          for (const rowId of Object.keys(optimisticUpdate)) {
            const previous = previousRows.get(rowId);
            if (previous) {
              next[rowId] = previous;
            }
          }
          return next;
        });
        toast.error(`Paste failed: ${String(error)}`);
      }
    },
    [
      activeCell,
      dataSource,
      getRowId,
      mergedFeatures.clipboardPaste,
      mergedFeatures.editing,
      mergedRows,
      rangeStart,
      rowSchema,
      visibleDataColumns
    ]
  );

  const onGridKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (mergedFeatures.cellSelect) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          moveActiveCell(1, 0, event.shiftKey);
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          moveActiveCell(-1, 0, event.shiftKey);
          return;
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          moveActiveCell(0, -1, event.shiftKey);
          return;
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          moveActiveCell(0, 1, event.shiftKey);
          return;
        }
      }

      if ((event.key === "Enter" || event.key === "F2") && mergedFeatures.editing) {
        const target = activeCell;
        if (!target) {
          return;
        }

        const row = mergedRows[target.rowIndex];
        const column = visibleDataColumns[target.columnIndex];
        if (!row || !column || !(column.isEditable ?? false)) {
          return;
        }

        setEditingCell({ rowId: getRowId(row), columnId: column.id });
        return;
      }

      if (event.key === "Escape") {
        setEditingCell(null);
        return;
      }

      const commandKey = event.metaKey || event.ctrlKey;
      if (commandKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        void copySelection();
        return;
      }

      if (commandKey && event.key.toLowerCase() === "v" && mergedFeatures.clipboardPaste) {
        // Keep default browser paste event and handle via onPaste.
      }
    },
    [
      activeCell,
      copySelection,
      getRowId,
      mergedFeatures.cellSelect,
      mergedFeatures.clipboardPaste,
      mergedFeatures.editing,
      mergedRows,
      moveActiveCell,
      visibleDataColumns
    ]
  );

  const commitDraftRow = useCallback(async () => {
    if (!mergedFeatures.rowAdd || !dataSource.createRow) {
      return;
    }

    const hasValues = Object.values(draftRow).some((value) => value !== "" && value !== null);
    if (!hasValues) {
      return;
    }

    const candidate = draftRow as TRow;

    for (const column of orderedColumns) {
      const value = candidate[column.field];
      if (value === undefined) {
        continue;
      }
      const validation = validateCell(column, candidate, value);
      if (!validation.ok) {
        return;
      }
    }

    const rowValidation = validateRow(rowSchema, candidate);
    if (!rowValidation.ok) {
      return;
    }

    try {
      await dataSource.createRow(draftRow);
      setDraftRow({});
      rowsResult.refresh();
      toast.success("Row added");
    } catch (error) {
      toast.error(`Failed to create row: ${String(error)}`);
    }
  }, [dataSource, draftRow, mergedFeatures.rowAdd, orderedColumns, rowSchema, rowsResult]);

  const setColumnFilter = useCallback((columnId: string, nextFilter: DataTableFilter | null) => {
    setColumnFilters((current) => {
      const next = fromTanStackFilters(current).filter((entry) => entry.columnId !== columnId);
      if (nextFilter && isActiveFilterValue(nextFilter.value)) {
        next.push(nextFilter);
      }
      return toTanStackFilters(next);
    });
  }, []);

  const selectedFilterOperator = useCallback(
    (column: DataTableColumn<TRow>): FilterOperator => {
      const allowed = filterOperatorsForColumn(column);
      const activeOperator = filterByColumnId.get(column.id)?.op;
      if (activeOperator && allowed.includes(activeOperator)) {
        return activeOperator;
      }

      const draftOperator = filterOperatorDrafts[column.id];
      if (draftOperator && allowed.includes(draftOperator)) {
        return draftOperator;
      }

      return defaultFilterOperatorForColumn(column);
    },
    [filterByColumnId, filterOperatorDrafts]
  );

  const setColumnFilterOperator = useCallback(
    (column: DataTableColumn<TRow>, operator: FilterOperator): void => {
      setFilterOperatorDrafts((current) => ({
        ...current,
        [column.id]: operator
      }));

      const activeFilter = filterByColumnId.get(column.id);
      if (!activeFilter) {
        return;
      }

      let nextValue = activeFilter.value;
      if (operator === "in" && !Array.isArray(nextValue)) {
        const seed = String(nextValue ?? "").trim();
        nextValue = seed.length > 0 ? [seed] : [];
      }
      if (operator !== "in" && Array.isArray(nextValue)) {
        nextValue = nextValue[0] ?? "";
      }

      setColumnFilter(column.id, {
        columnId: column.id,
        op: operator,
        value: nextValue
      });
    },
    [filterByColumnId, setColumnFilter]
  );

  const selectColumnFilterTextValue = useCallback(
    (column: DataTableColumn<TRow>): string => {
      const filter = filterByColumnId.get(column.id);
      if (!filter || Array.isArray(filter.value)) {
        return "";
      }
      if (filter.value === null) {
        return "";
      }
      return String(filter.value);
    },
    [filterByColumnId]
  );

  const setColumnFilterTextValue = useCallback(
    (column: DataTableColumn<TRow>, rawValue: string): void => {
      const operator = selectedFilterOperator(column);
      if (rawValue.trim().length === 0) {
        setColumnFilter(column.id, null);
        return;
      }

      if (column.kind === "number" || column.kind === "currency") {
        const parsed = Number(rawValue);
        if (Number.isNaN(parsed)) {
          setColumnFilter(column.id, null);
          return;
        }
        setColumnFilter(column.id, {
          columnId: column.id,
          op: operator,
          value: parsed
        });
        return;
      }

      setColumnFilter(column.id, {
        columnId: column.id,
        op: operator,
        value: rawValue
      });
    },
    [selectedFilterOperator, setColumnFilter]
  );

  const selectColumnFilterValues = useCallback(
    (column: DataTableColumn<TRow>): ReadonlyArray<string> => {
      const filter = filterByColumnId.get(column.id);
      if (!filter) {
        return [];
      }
      if (Array.isArray(filter.value)) {
        return filter.value;
      }
      if (typeof filter.value === "string" && filter.value.trim().length > 0) {
        return [filter.value];
      }
      return [];
    },
    [filterByColumnId]
  );

  const setColumnFilterSingleSelectValue = useCallback(
    (column: DataTableColumn<TRow>, value: string): void => {
      if (value.length === 0) {
        setColumnFilter(column.id, null);
        return;
      }

      const operator = selectedFilterOperator(column);
      const nextValue = operator === "in" ? [value] : value;
      setColumnFilter(column.id, {
        columnId: column.id,
        op: operator,
        value: nextValue
      });
    },
    [selectedFilterOperator, setColumnFilter]
  );

  const toggleColumnFilterInValue = useCallback(
    (column: DataTableColumn<TRow>, value: string, enabled: boolean): void => {
      const currentValues = [...selectColumnFilterValues(column)];
      const withoutCurrent = currentValues.filter((entry) => entry !== value);
      const nextValues = enabled ? [...withoutCurrent, value] : withoutCurrent;

      setFilterOperatorDrafts((current) => ({
        ...current,
        [column.id]: "in"
      }));

      if (nextValues.length === 0) {
        setColumnFilter(column.id, null);
        return;
      }

      setColumnFilter(column.id, {
        columnId: column.id,
        op: "in",
        value: nextValues
      });
    },
    [selectColumnFilterValues, setColumnFilter]
  );

  const clearColumnFilter = useCallback(
    (columnId: string): void => {
      setColumnFilter(columnId, null);
    },
    [setColumnFilter]
  );

  const updatePinnedColumn = useCallback((columnId: string, side: "left" | "right" | "none") => {
    setColumnPinning((current) => {
      const left = (current.left ?? []).filter((id) => id !== columnId);
      const right = (current.right ?? []).filter((id) => id !== columnId);

      if (side === "left") {
        left.push(columnId);
      }
      if (side === "right") {
        right.push(columnId);
      }

      return {
        left,
        right
      };
    });
  }, []);

  const setColumnSortDirection = useCallback((columnId: string, direction: "asc" | "desc") => {
    setSorting([{ id: columnId, desc: direction === "desc" }]);
    setColumnMenuId(null);
  }, []);

  const moveColumnByDrop = useCallback((sourceColumnId: string, targetColumnId: string, placement: DropPlacement) => {
    setColumnOrder((current) => {
      if (sourceColumnId === targetColumnId) {
        return current;
      }
      const sourceZone = pinZoneForColumnId(sourceColumnId, columnPinning);
      const targetZone = pinZoneForColumnId(targetColumnId, columnPinning);
      if (sourceZone !== targetZone) {
        return current;
      }

      const next = reorderIds(current, sourceColumnId, targetColumnId, placement);
      if (next.length !== current.length) {
        return current;
      }

      const unchanged = next.every((entry, index) => entry === current[index]);
      if (unchanged) {
        return current;
      }

      return next;
    });
  }, [columnPinning]);

  const onHeaderDragStart = useCallback(
    (event: DragEvent<HTMLElement>, columnId: string): void => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", columnId);
      const dragPreview = event.currentTarget.closest("th");
      if (dragPreview) {
        const previewRect = dragPreview.getBoundingClientRect();
        const offsetX = Math.max(0, event.clientX - previewRect.left);
        const offsetY = Math.max(0, event.clientY - previewRect.top);
        event.dataTransfer.setDragImage(dragPreview, offsetX, offsetY);
      }
      setColumnMenuId(null);
      setDraggingColumnId(columnId);
      setDragOverTarget(null);
    },
    []
  );

  const onHeaderDragOver = useCallback(
    (event: DragEvent<HTMLTableCellElement>, targetColumnId: string): void => {
      if (!draggingColumnId || draggingColumnId === targetColumnId) {
        return;
      }

      const sourceZone = pinZoneForColumnId(draggingColumnId, columnPinning);
      const targetZone = pinZoneForColumnId(targetColumnId, columnPinning);
      if (sourceZone !== targetZone) {
        return;
      }

      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      const placement: DropPlacement = event.clientX < rect.left + rect.width / 2 ? "before" : "after";
      setDragOverTarget({
        columnId: targetColumnId,
        placement
      });
    },
    [columnPinning, draggingColumnId]
  );

  const onHeaderDrop = useCallback(
    (event: DragEvent<HTMLTableCellElement>, targetColumnId: string): void => {
      if (!draggingColumnId) {
        return;
      }

      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      const placement: DropPlacement = event.clientX < rect.left + rect.width / 2 ? "before" : "after";
      moveColumnByDrop(draggingColumnId, targetColumnId, placement);
      setDraggingColumnId(null);
      setDragOverTarget(null);
    },
    [draggingColumnId, moveColumnByDrop]
  );

  const onHeaderDragEnd = useCallback((): void => {
    setDraggingColumnId(null);
    setDragOverTarget(null);
  }, []);

  const [resizingRow, setResizingRow] = useState<{ rowId: RowId; startHeight: number; startY: number } | null>(
    null
  );

  useEffect(() => {
    if (!resizingRow) {
      return;
    }

    const onPointerMove = (event: PointerEvent): void => {
      const delta = event.clientY - resizingRow.startY;
      rowHeights.setManualRowHeight(resizingRow.rowId, resizingRow.startHeight + delta);
    };

    const onPointerUp = (): void => {
      setResizingRow(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [resizingRow, rowHeights]);

  const logInteractionCapture = useCallback(
    (
      interaction: "pointerdown" | "click",
      target: EventTarget | null,
      modifiers: {
        shift: boolean;
        ctrl: boolean;
        alt: boolean;
        meta: boolean;
        button: number;
      }
    ): void => {
      if (!isDebugMode) {
        return;
      }

      const sequence = interactionSequence.current + 1;
      interactionSequence.current = sequence;

      if (!(target instanceof Element)) {
        pushDebugEvent(debugScope, "interaction captured", {
          sequence,
          kind: interaction,
          tag: "non-element",
          role: "",
          rowId: "",
          rowIndex: "",
          columnId: "",
          button: modifiers.button,
          shift: modifiers.shift ? 1 : 0,
          ctrl: modifiers.ctrl ? 1 : 0,
          alt: modifiers.alt ? 1 : 0,
          meta: modifiers.meta ? 1 : 0
        });
        return;
      }

      const rowNode = target.closest("tr[data-row-id]");
      const cellNode = target.closest("[role='gridcell']");
      const headerNode = target.closest("th");
      const buttonNode = target.closest("button");
      const rowId = rowNode?.getAttribute("data-row-id") ?? "";
      const rowIndex = rowNode?.getAttribute("data-index") ?? "";
      const columnId = cellNode?.getAttribute("data-column-id") ?? "";

      pushDebugEvent(debugScope, "interaction captured", {
        sequence,
        kind: interaction,
        tag: target.tagName.toLowerCase(),
        role: target.getAttribute("role") ?? "",
        rowId,
        rowIndex,
        columnId,
        inHeader: headerNode ? 1 : 0,
        inButton: buttonNode ? 1 : 0,
        button: modifiers.button,
        shift: modifiers.shift ? 1 : 0,
        ctrl: modifiers.ctrl ? 1 : 0,
        alt: modifiers.alt ? 1 : 0,
        meta: modifiers.meta ? 1 : 0
      });
    },
    [debugScope, isDebugMode]
  );

  const rootStyle = tableStyle(mergedTheme);

  return (
    <div
      className={cn(
        "relative rounded-[var(--dt-radius)] border border-[var(--dt-border-color)] bg-white/90 p-3 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.45)]",
        className
      )}
      style={rootStyle}
    >
      <div className="mb-3 grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="flex flex-wrap items-center gap-2">
          {mergedFeatures.rowAdd && dataSource.createRow ? (
            <Button
              size="sm"
              onClick={() => {
                setDraftRow((current) => ({
                  ...current
                }));
              }}
            >
              <Plus className="h-4 w-4" />
              Add row
            </Button>
          ) : null}
          {mergedFeatures.rowDelete && dataSource.deleteRows ? (
            <Button
              variant="destructive"
              size="sm"
              disabled={Object.keys(rowSelection).length === 0}
              onClick={() => {
                const selectedRows = mergedRows.filter((row) => rowSelection[getRowId(row)]);
                void deleteRowsNow(selectedRows);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete selected
            </Button>
          ) : null}
          {mergedFeatures.clipboardCopy ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void copySelection();
              }}
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
          ) : null}
          {rowsResult.isLoading ? (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              Loading rows...
            </span>
          ) : null}
        </div>

        {mergedFeatures.columnVisibility && hiddenColumns.length > 0 ? (
          <details className="group relative min-w-[280px]">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              <span className="inline-flex items-center gap-1">
                <Rows3 className="h-4 w-4" />
                Hidden columns ({hiddenColumns.length})
              </span>
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 z-30 mt-2 max-h-72 w-[360px] overflow-auto rounded-md border border-slate-200 bg-white p-2 shadow-xl">
              <div className="mb-2 flex items-center justify-between border-b border-slate-200 px-2 pb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Column visibility</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    for (const column of hiddenColumns) {
                      table.getColumn(column.id)?.toggleVisibility(true);
                    }
                  }}
                >
                  Show all hidden
                </Button>
              </div>
              {orderedColumns.map((column) => {
                const isVisible = table.getColumn(column.id)?.getIsVisible() ?? true;
                return (
                  <div
                    key={column.id}
                    data-hidden-column-row={column.id}
                    className={cn(
                      "grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md px-2 py-1.5",
                      isVisible ? "" : "bg-amber-50/60"
                    )}
                  >
                    <span className="text-sm text-slate-700">{column.header}</span>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                        isVisible ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
                      )}
                    >
                      {isVisible ? "Visible" : "Hidden"}
                    </span>
                    {!isVisible ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          table.getColumn(column.id)?.toggleVisibility(true);
                        }}
                      >
                        Show
                      </Button>
                    ) : (
                      <span />
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        ) : null}
      </div>

      <div
        className="rounded-md border border-slate-200 bg-[linear-gradient(180deg,hsl(210_50%_98%),hsl(210_35%_97%))]"
        onPointerDownCapture={(event) => {
          logInteractionCapture("pointerdown", event.target, {
            shift: event.shiftKey,
            ctrl: event.ctrlKey,
            alt: event.altKey,
            meta: event.metaKey,
            button: event.button
          });
        }}
        onClickCapture={(event) => {
          logInteractionCapture("click", event.target, {
            shift: event.shiftKey,
            ctrl: event.ctrlKey,
            alt: event.altKey,
            meta: event.metaKey,
            button: event.button
          });
        }}
        onPaste={(event) => {
          if (!mergedFeatures.clipboardPaste) {
            return;
          }
          const text = event.clipboardData.getData("text/plain");
          if (!text) {
            return;
          }
          event.preventDefault();
          void pasteFromText(text);
        }}
      >
        <div
          ref={tableContainerRef}
          className="relative isolate max-h-[560px] overflow-auto"
          onScroll={onGridScroll}
          onKeyDown={onGridKeyDown}
          tabIndex={0}
          role="grid"
          aria-rowcount={totalRows}
          aria-colcount={visibleDataColumns.length}
        >
          <table
            className="border-separate border-spacing-0 text-left"
            style={{
              boxSizing: "border-box",
              display: "grid",
              tableLayout: "fixed",
              width: `${columnRenderLayout.tableRenderWidth}px`,
              minWidth: `${columnRenderLayout.tableRenderWidth}px`,
              fontFamily: "var(--dt-font-family)"
            }}
          >
            <thead
              className="sticky top-0 z-30"
              style={{
                display: "grid",
                background: "var(--dt-header-bg)"
              }}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  style={{
                    display: "flex",
                    width: `${columnRenderLayout.tableRenderWidth}px`
                  }}
                >
                  {headerGroup.headers.map((header) => {
                    const columnConfig = columnById.get(header.column.id);
                    const isDataColumn = Boolean(columnConfig);
                    const canSort = Boolean(columnConfig) && mergedFeatures.columnSort && header.column.getCanSort();
                    const canFilter = Boolean(columnConfig) && mergedFeatures.columnFilter && (columnConfig?.isFilterable ?? true);
                    const canHide = Boolean(columnConfig) && mergedFeatures.columnVisibility && header.column.getCanHide();
                    const canPin = Boolean(columnConfig) && mergedFeatures.columnPinning && (columnConfig?.isPinnable ?? true);
                    const canReorder = Boolean(columnConfig) && mergedFeatures.columnReorder && (columnConfig?.isReorderable ?? true);
                    const currentFilter = columnConfig ? filterByColumnId.get(columnConfig.id) : undefined;
                    const hasFilter = Boolean(currentFilter && isActiveFilterValue(currentFilter.value));
                    const isMenuOpen = columnMenuId === columnConfig?.id;
                    const sortState = header.column.getIsSorted();
                    const filterOperators = columnConfig ? filterOperatorsForColumn(columnConfig) : [];
                    const activeFilterOperator = columnConfig ? selectedFilterOperator(columnConfig) : "contains";
                    const textFilterValue = columnConfig ? selectColumnFilterTextValue(columnConfig) : "";
                    const selectedFilterValues = columnConfig ? selectColumnFilterValues(columnConfig) : [];
                    const dropIndicator =
                      dragOverTarget && columnConfig && dragOverTarget.columnId === columnConfig.id
                        ? dragOverTarget.placement === "before"
                          ? "inset 3px 0 0 hsl(199 89% 48%)"
                          : "inset -3px 0 0 hsl(199 89% 48%)"
                        : undefined;
                    const fallbackHeader = columnConfig?.header ?? "column";
                    const resizeLabel =
                      typeof header.column.columnDef.header === "string" ||
                      typeof header.column.columnDef.header === "number"
                        ? String(header.column.columnDef.header)
                        : fallbackHeader;
                    const resizeHandler = header.getResizeHandler();
                    const pinnedState = header.column.getIsPinned();
                    const renderWidth = columnRenderLayout.renderWidthsById[header.column.id] ?? header.getSize();
                    const leftOffset = columnRenderLayout.leftPinnedOffsetById[header.column.id];
                    const rightOffset = columnRenderLayout.rightPinnedOffsetById[header.column.id];

                    return (
                      <th
                        key={header.id}
                        onDragOver={
                          canReorder && columnConfig
                            ? (event) => {
                                onHeaderDragOver(event, columnConfig.id);
                              }
                            : undefined
                        }
                        onDrop={
                          canReorder && columnConfig
                            ? (event) => {
                                onHeaderDrop(event, columnConfig.id);
                              }
                            : undefined
                        }
                        data-column-id={columnConfig?.id}
                        data-column-sort-status={sortState || "none"}
                        data-column-filter-active={hasFilter ? "true" : "false"}
                        className={cn(
                          "group relative border-b border-r border-[var(--dt-border-color)] px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600",
                          header.column.getIsPinned()
                            ? "sticky z-30 shadow-[var(--dt-pinned-shadow)]"
                            : ""
                        )}
                        style={{
                          ...fixedTrackStyle(renderWidth),
                          background: "var(--dt-header-bg)",
                          boxShadow: dropIndicator,
                          left: pinnedState === "left" ? `${leftOffset ?? 0}px` : undefined,
                          right: pinnedState === "right" ? `${rightOffset ?? 0}px` : undefined
                        }}
                      >
                        <div className="flex w-full items-center justify-between gap-1">
                          <div className="inline-flex min-w-0 items-center gap-1">
                            {canReorder && columnConfig ? (
                              <button
                                type="button"
                                draggable
                                onDragStart={(event) => {
                                  onHeaderDragStart(event, columnConfig.id);
                                }}
                                onDragEnd={onHeaderDragEnd}
                                data-column-reorder-handle={columnConfig.id}
                                aria-label={`Reorder ${fallbackHeader}`}
                                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 transition hover:text-slate-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 group-hover:opacity-100"
                              >
                                <GripVertical className="h-3.5 w-3.5 cursor-grab active:cursor-grabbing" />
                              </button>
                            ) : null}
                            <span className="truncate text-left">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              {sortState === "asc" ? (
                                <span className="inline-flex items-center text-sky-700" aria-label="Sorted ascending">
                                  <ChevronUp className="h-3.5 w-3.5" />
                                </span>
                              ) : sortState === "desc" ? (
                                <span className="inline-flex items-center text-sky-700" aria-label="Sorted descending">
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </span>
                              ) : null}
                              {hasFilter ? (
                                <span className="inline-flex items-center text-emerald-700" aria-label="Filter active">
                                  <Filter className="h-3.5 w-3.5" />
                                </span>
                              ) : null}
                            </span>
                          </div>

                          {isDataColumn ? (
                            <div className="relative" data-dt-column-menu-root="true">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                data-column-menu-trigger={columnConfig?.id}
                                onClick={(event) => {
                                  if (!columnConfig) {
                                    return;
                                  }
                                  const nextOpen = columnMenuId === columnConfig.id ? null : columnConfig.id;
                                  setColumnMenuId(nextOpen);
                                  if (nextOpen) {
                                    const nextAnchor = resolveColumnMenuAnchor(event.currentTarget);
                                    setColumnMenuAnchorById((current) => ({
                                      ...current,
                                      [columnConfig.id]: nextAnchor
                                    }));
                                    const existingOperator = filterByColumnId.get(columnConfig.id)?.op;
                                    if (existingOperator) {
                                      setFilterOperatorDrafts((current) => ({
                                        ...current,
                                        [columnConfig.id]: existingOperator
                                      }));
                                    }
                                  }
                                }}
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                                <span className="sr-only">Open column menu</span>
                              </Button>

                              {isMenuOpen && columnConfig ? (
                                <div
                                  role="dialog"
                                  aria-label={`${columnConfig.header} options`}
                                  className={cn(
                                    "absolute z-40 mt-1 w-72 rounded-md border border-slate-200 bg-white p-2 shadow-xl",
                                    columnMenuAnchorById[columnConfig.id] === "left" ? "left-0" : "right-0"
                                  )}
                                >
                                  <div className="mb-2 border-b border-slate-200 pb-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      {columnConfig.header}
                                    </p>
                                  </div>

                                  {canSort ? (
                                    <div className="mb-2 grid grid-cols-2 gap-1 border-b border-slate-200 pb-2">
                                      <Button
                                        variant={sortState === "asc" ? "secondary" : "ghost"}
                                        size="sm"
                                        onClick={() => {
                                          setColumnSortDirection(columnConfig.id, "asc");
                                        }}
                                      >
                                        <ChevronUp className="h-3.5 w-3.5" />
                                        Sort asc
                                      </Button>
                                      <Button
                                        variant={sortState === "desc" ? "secondary" : "ghost"}
                                        size="sm"
                                        onClick={() => {
                                          setColumnSortDirection(columnConfig.id, "desc");
                                        }}
                                      >
                                        <ChevronDown className="h-3.5 w-3.5" />
                                        Sort desc
                                      </Button>
                                    </div>
                                  ) : null}

                                  {(canHide || canPin) && (
                                    <div className="mb-2 space-y-2 border-b border-slate-200 pb-2">
                                      {canHide ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="w-full justify-start"
                                          onClick={() => {
                                            table.getColumn(columnConfig.id)?.toggleVisibility(false);
                                            setColumnMenuId(null);
                                          }}
                                        >
                                          Hide
                                        </Button>
                                      ) : null}

                                      {canPin ? (
                                        <div className="grid grid-cols-3 gap-1">
                                          <Button
                                            variant={header.column.getIsPinned() === "left" ? "secondary" : "ghost"}
                                            size="sm"
                                            onClick={() => {
                                              updatePinnedColumn(columnConfig.id, "left");
                                            }}
                                          >
                                            <Pin className="h-3.5 w-3.5" />
                                            Left
                                          </Button>
                                          <Button
                                            variant={header.column.getIsPinned() === "right" ? "secondary" : "ghost"}
                                            size="sm"
                                            onClick={() => {
                                              updatePinnedColumn(columnConfig.id, "right");
                                            }}
                                          >
                                            <Pin className="h-3.5 w-3.5" />
                                            Right
                                          </Button>
                                          <Button
                                            variant={header.column.getIsPinned() ? "secondary" : "ghost"}
                                            size="sm"
                                            onClick={() => {
                                              updatePinnedColumn(columnConfig.id, "none");
                                            }}
                                          >
                                            <PinOff className="h-3.5 w-3.5" />
                                            Unpin
                                          </Button>
                                        </div>
                                      ) : null}
                                    </div>
                                  )}

                                  {canFilter ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                          Filter
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            clearColumnFilter(columnConfig.id);
                                          }}
                                        >
                                          Clear
                                        </Button>
                                      </div>

                                      {filterOperators.length > 1 ? (
                                        <select
                                          value={activeFilterOperator}
                                          onChange={(event) => {
                                            setColumnFilterOperator(columnConfig, event.target.value as FilterOperator);
                                          }}
                                          className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-sky-500"
                                        >
                                          {filterOperators.map((operator) => (
                                            <option key={`${columnConfig.id}-${operator}`} value={operator}>
                                              {operator}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-600">
                                          Operator: {filterOperators[0]}
                                        </div>
                                      )}

                                      {columnConfig.kind === "select" ? (
                                        activeFilterOperator === "in" ? (
                                          <div className="max-h-36 space-y-1 overflow-auto rounded-md border border-slate-200 p-2">
                                            {columnConfig.options.map((option) => {
                                              return (
                                                <label
                                                  key={`${columnConfig.id}-${option.value}`}
                                                  className="flex items-center gap-2 text-xs text-slate-700"
                                                >
                                                  <Checkbox
                                                    checked={selectedFilterValues.includes(option.value)}
                                                    onChange={(event) => {
                                                      toggleColumnFilterInValue(
                                                        columnConfig,
                                                        option.value,
                                                        event.target.checked
                                                      );
                                                    }}
                                                  />
                                                  {option.label}
                                                </label>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <select
                                            value={textFilterValue}
                                            onChange={(event) => {
                                              setColumnFilterSingleSelectValue(columnConfig, event.target.value);
                                            }}
                                            className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-sky-500"
                                          >
                                            <option value="">Any</option>
                                            {columnConfig.options.map((option) => (
                                              <option key={`${columnConfig.id}-${option.value}`} value={option.value}>
                                                {option.label}
                                              </option>
                                            ))}
                                          </select>
                                        )
                                      ) : null}

                                      {columnConfig.kind === "multiselect" ? (
                                        <div className="max-h-36 space-y-1 overflow-auto rounded-md border border-slate-200 p-2">
                                          {columnConfig.options.map((option) => {
                                            return (
                                              <label
                                                key={`${columnConfig.id}-${option.value}`}
                                                className="flex items-center gap-2 text-xs text-slate-700"
                                              >
                                                <Checkbox
                                                  checked={selectedFilterValues.includes(option.value)}
                                                  onChange={(event) => {
                                                    toggleColumnFilterInValue(
                                                      columnConfig,
                                                      option.value,
                                                      event.target.checked
                                                    );
                                                  }}
                                                />
                                                {option.label}
                                              </label>
                                            );
                                          })}
                                        </div>
                                      ) : null}

                                      {columnConfig.kind !== "select" && columnConfig.kind !== "multiselect" ? (
                                        <Input
                                          type={
                                            columnConfig.kind === "number" || columnConfig.kind === "currency"
                                              ? "number"
                                              : columnConfig.kind === "date"
                                                ? "date"
                                              : "text"
                                          }
                                          value={textFilterValue}
                                          onChange={(event) => {
                                            setColumnFilterTextValue(columnConfig, event.target.value);
                                          }}
                                          placeholder="Filter value"
                                          className="h-9 text-sm"
                                        />
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          {mergedFeatures.columnResize && header.column.getCanResize() ? (
                            <button
                              type="button"
                              className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-sky-200"
                              data-column-resize-handle={header.column.id}
                              draggable={false}
                              onMouseDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                resizeHandler(event);
                              }}
                              onTouchStart={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                resizeHandler(event);
                              }}
                              aria-label={`Resize ${resizeLabel}`}
                            />
                          ) : null}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <tbody
              style={{
                display: "grid",
                height: `${totalHeight}px`,
                position: "relative",
                width: `${columnRenderLayout.tableRenderWidth}px`,
                minWidth: `${columnRenderLayout.tableRenderWidth}px`
              }}
            >
              {virtualItems.map((virtualRow) => {
                const rowIndex = virtualRow.index;
                const isDraft = rowIndex >= mergedRows.length;

                if (isDraft) {
                  if (!mergedFeatures.rowAdd || !dataSource.createRow) {
                    return null;
                  }

                  return (
                    <tr
                      key="__draft__"
                      className="absolute left-0"
                      style={{
                        display: "flex",
                        transform: `translateY(${virtualRow.start}px)`,
                        height: `${virtualRow.size}px`,
                        width: `${columnRenderLayout.tableRenderWidth}px`
                      }}
                      data-index={rowIndex}
                    >
                      {table.getVisibleLeafColumns().map((column) => {
                        const columnConfig = columnById.get(column.id);
                        const renderWidth = columnRenderLayout.renderWidthsById[column.id] ?? column.getSize();
                        const widthStyle = fixedTrackStyle(renderWidth);

                        if (!columnConfig) {
                          return (
                            <td key={`draft-${column.id}`} style={widthStyle} className="border-r border-b border-slate-200 bg-slate-50" />
                          );
                        }

                        const rawValue = draftRow[columnConfig.field];
                        const value =
                          rawValue === null || rawValue === undefined ? "" : Array.isArray(rawValue) ? rawValue.join(", ") : String(rawValue);

                        return (
                          <td
                            key={`draft-${column.id}`}
                            style={widthStyle}
                            className="border-r border-b border-slate-200 bg-slate-50 px-2 py-1"
                          >
                            <Input
                              value={value}
                              placeholder={`Add ${columnConfig.header}`}
                              onChange={(event) => {
                                const nextValue = parseClipboardToCellValue(
                                  columnConfig,
                                  draftRow as TRow,
                                  event.target.value
                                );

                                setDraftRow((current) => ({
                                  ...current,
                                  [columnConfig.field]: nextValue
                                }));
                              }}
                              onBlur={() => {
                                void commitDraftRow();
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  void commitDraftRow();
                                }
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                }

                const rowModel = tableRows[rowIndex];
                const row = mergedRows[rowIndex];
                if (!rowModel || !row) {
                  return null;
                }

                const rowId = getRowId(row);
                const top = virtualRow.start;

                return (
                  <tr
                    key={rowModel.id}
                    ref={getRowRefHandler(rowId)}
                    className="absolute left-0 bg-[var(--dt-row-bg)] transition-colors hover:bg-[var(--dt-row-hover-bg)]"
                    style={{
                      display: "flex",
                      transform: `translateY(${top}px)`,
                      minHeight: `${rowHeights.getFinalHeight(rowId)}px`,
                      width: `${columnRenderLayout.tableRenderWidth}px`
                    }}
                    data-row-id={rowId}
                    data-index={rowIndex}
                  >
                    {rowModel.getVisibleCells().map((cell) => {
                      const pinned = cell.column.getIsPinned();
                      const renderWidth = columnRenderLayout.renderWidthsById[cell.column.id] ?? cell.column.getSize();
                      const leftOffset = columnRenderLayout.leftPinnedOffsetById[cell.column.id];
                      const rightOffset = columnRenderLayout.rightPinnedOffsetById[cell.column.id];
                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            "border-r border-b border-[var(--dt-border-color)] align-top",
                            pinned ? "sticky z-10 bg-[var(--dt-row-bg)] shadow-[var(--dt-pinned-shadow)]" : ""
                          )}
                          style={{
                            ...fixedTrackStyle(renderWidth),
                            left: pinned === "left" ? `${leftOffset ?? 0}px` : undefined,
                            right: pinned === "right" ? `${rightOffset ?? 0}px` : undefined
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                    {mergedFeatures.rowResize ? (
                      <td
                        className="relative p-0"
                        style={{
                          boxSizing: "border-box",
                          width: "0px",
                          minWidth: "0px",
                          maxWidth: "0px",
                          flex: "0 0 0px"
                        }}
                      >
                        <button
                          type="button"
                          className="absolute bottom-0 left-0 h-1 w-full cursor-row-resize bg-transparent hover:bg-sky-200"
                          aria-label={`Resize row ${rowId}`}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            setResizingRow({
                              rowId,
                              startHeight: rowHeights.getFinalHeight(rowId),
                              startY: event.clientY
                            });
                          }}
                        />
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {rowsResult.error ? <p className="mt-2 text-sm text-rose-600">{rowsResult.error}</p> : null}
      {rowsResult.isLoadingMore ? (
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          Loading more rows...
        </p>
      ) : null}

      <style>{`
        [role="grid"]:focus {
          outline: 2px solid color-mix(in srgb, var(--dt-active-cell-ring), white 42%);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

export function DataTableContainer({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_20%_20%,rgba(125,211,252,0.35),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(253,224,71,0.28),transparent_38%),linear-gradient(180deg,#ffffff,#f1f5f9)] p-3 sm:p-5">
      {children}
    </div>
  );
}
