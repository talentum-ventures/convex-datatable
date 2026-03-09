import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties
} from "react";
import {
  getCoreRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type RowSelectionState
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { LoaderCircle } from "lucide-react";
import {
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_MIN_ROW_HEIGHT,
  DEFAULT_OVERSCAN,
  DEFAULT_PAGE_SIZE,
  DEFAULT_THEME_TOKENS
} from "../core/defaults";
import { cn } from "../core/cn";
import { applyClientQuery } from "../core/filtering";
import {
  orderColumns,
} from "../core/column-utils";
import { useTableSelection } from "../hooks/use-table-selection";
import { useUndoStack } from "../hooks/use-undo-stack";
import type {
  CellCoord,
  CollaboratorCellCoord,
  CollaboratorPresence,
  DataTableCellValue,
  DataTableColumn,
  DataTableFeatureFlags,
  DataTableProps,
  DataTableRowModel,
  DataTableThemeTokens,
  RowId
} from "../core/types";
import {
  fromTanStackFilters,
  fromTanStackSorting
} from "../engine/state-converters";
import {
  debugEnabled,
  pushDebugEvent,
  pushDebugEventThrottled
} from "../debug";
import { useColumnDefs } from "../hooks/use-column-defs";
import {
  canHandleGridPaste,
  useTableClipboard,
  type EditingCellState
} from "../hooks/use-table-clipboard";
import { useTableKeyboard } from "../hooks/use-table-keyboard";
import { useTableFilters } from "../hooks/use-table-filters";
import { useTableState } from "../hooks/use-table-state";
import { useTableColumns } from "../hooks/use-table-columns";
import { hasDraftCellValue, useTableRows } from "../hooks/use-table-rows";
import { useRowObservers } from "../hooks/use-row-observers";
import { useRowHeights } from "../virtual/row-heights";
import { scrollCellIntoView } from "../virtual/scroll";
import { buildStaticVirtualItems, getStaticVirtualTotalHeight } from "../virtual/static-virtual-items";
import { computeColumnLayout } from "./column-layout";
import { RowActions } from "./row-actions";
import { TableBody } from "./table-body";
import { TableHeader } from "./table-header";
import { TableToolbar } from "./table-toolbar";
import {
  ACTIONS_COLUMN_ID,
  SELECT_COLUMN_ID,
} from "../engine/managed-columns";
import { getVisibleDataColumnIdsInUiOrder, getVisibleLeafColumnIdsInUiOrder } from "../engine/visible-column-order";
import { Checkbox } from "./primitives";

export { applyClientQuery } from "../core/filtering";
export { canHandleGridPaste } from "../hooks/use-table-clipboard";

export function shouldCenterHeaderContent(columnId: string): boolean {
  return columnId === SELECT_COLUMN_ID;
}

function asRequiredFeatureFlags(
  features: DataTableFeatureFlags | undefined
): Required<DataTableFeatureFlags> {
  return {
    ...DEFAULT_FEATURE_FLAGS,
    ...features
  };
}

type CssVarsStyle = CSSProperties & {
  "--dt-font-family": string;
  "--dt-radius": string;
  "--dt-border-color": string;
  "--dt-header-bg": string;
  "--dt-pinned-header-bg": string;
  "--dt-row-bg": string;
  "--dt-row-hover-bg": string;
  "--dt-pinned-row-bg": string;
  "--dt-pinned-row-hover-bg": string;
  "--dt-pinned-shadow": string;
  "--dt-active-cell-ring": string;
  "--dt-selection-bg": string;
};

const EMPTY_COLLABORATORS: ReadonlyArray<CollaboratorPresence> = [];

const DRAFT_ROW_ID = "__draft__";
const useSafeLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function tableStyle(theme: DataTableThemeTokens): CssVarsStyle {
  const style: CssVarsStyle = {
    "--dt-font-family": theme.fontFamily,
    "--dt-radius": theme.radius,
    "--dt-border-color": theme.borderColor,
    "--dt-header-bg": theme.headerBg,
    "--dt-pinned-header-bg": theme.pinnedHeaderBg,
    "--dt-row-bg": theme.rowBg,
    "--dt-row-hover-bg": theme.rowHoverBg,
    "--dt-pinned-row-bg": theme.pinnedRowBg,
    "--dt-pinned-row-hover-bg": theme.pinnedRowHoverBg,
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

function renderedWidthForColumn<TRow extends DataTableRowModel, TValue>(
  column: Column<TRow, TValue>,
  renderWidthsById: Readonly<Record<string, number>>
): number {
  return renderWidthsById[column.id] ?? column.getSize();
}

function resolveThemeTokens(
  theme: Partial<DataTableThemeTokens> | undefined
): DataTableThemeTokens {
  return {
    ...DEFAULT_THEME_TOKENS,
    ...theme
  };
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
  collaborators,
  onActiveCellChange,
  onError
}: DataTableProps<TRow>): JSX.Element {
  const mergedFeatures = useMemo(() => asRequiredFeatureFlags(features), [features]);
  const mergedTheme = useMemo(
    () => resolveThemeTokens(theme),
    [theme]
  );
  const isDebugMode = useMemo(() => debugEnabled(), []);
  const debugScope = useMemo(() => `table:${tableId}`, [tableId]);
  const dataColumnIds = useMemo(() => columns.map((column) => column.id), [columns]);
  const minHeight = minRowHeight ?? DEFAULT_MIN_ROW_HEIGHT;
  const effectivePageSize = pageSize ?? DEFAULT_PAGE_SIZE;
  const [editingCell, setEditingCell] = useState<EditingCellState>(null);
  const undoStack = useUndoStack<TRow>();
  const commitCounter = useRef(0);
  const commitWindow = useRef<number[]>([]);
  const interactionSequence = useRef(0);
  const deleteEnabled = mergedFeatures.rowDelete && Boolean(dataSource.deleteRows);
  const customRowActionsEnabled = mergedFeatures.rowActions && (rowActions?.length ?? 0) > 0;
  const hasActionColumn = deleteEnabled || customRowActionsEnabled;
  const {
    sorting,
    columnFilters,
    columnVisibility,
    columnPinning,
    columnSizing,
    rowSelection,
    normalizedColumnOrder,
    normalizedColumnPinning,
    reactTableState,
    setSorting,
    setColumnFilters,
    setColumnOrder,
    setColumnPinning,
    setColumnSizing,
    setRowSelection,
    onSortingChange,
    onColumnFiltersChange,
    onColumnOrderChange,
    onColumnVisibilityChange,
    onColumnPinningChange,
    onColumnSizingChange,
    onColumnSizingInfoChange,
    onRowSelectionChange
  } = useTableState({
    tableId,
    dataColumnIds,
    includeSelectColumn: mergedFeatures.rowSelect,
    includeActionsColumn: hasActionColumn,
    onError
  });
  const {
    filterByColumnId,
    selectedFilterOperator,
    setColumnFilterOperator,
    selectColumnFilterTextValue,
    setColumnFilterTextValue,
    selectColumnFilterValues,
    toggleColumnFilterInValue,
    clearColumnFilter
  } = useTableFilters<TRow>({
    columnFilters,
    setColumnFilters
  });
  const {
    activeCell,
    rangeStart,
    setActiveCell,
    setRangeStart,
    onCellSelect,
    onRangeSelect
  } = useTableSelection({
    isDebugMode,
    debugScope
  });

  const orderedColumns = useMemo(
    () => orderColumns(columns, normalizedColumnOrder),
    [columns, normalizedColumnOrder]
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
  const {
    setOptimisticRows,
    mergedRows,
    rowActionMenuRowId,
    setRowActionMenuRowId,
    draftRow,
    draftEditingColumnId,
    setDraftEditingColumnId,
    draftRowRef,
    onStartEdit,
    onCancelEdit,
    commitCellEdit,
    deleteRowsNow,
    commitDraftRow,
    commitDraftCell,
    cancelDraftCellEdit
  } = useTableRows({
    sourceRows: rowsResult.rows,
    getRowId,
    orderedColumns,
    rowSchema,
    dataSource,
    rowsRefresh: rowsResult.refresh,
    rowDeleteEnabled: mergedFeatures.rowDelete,
    rowAddEnabled: mergedFeatures.rowAdd,
    undoEnabled: mergedFeatures.undo,
    setEditingCell,
    undoStack
  });
  const rowSelectionRef = useRef(rowSelection);
  const mergedRowsRef = useRef(mergedRows);

  rowSelectionRef.current = rowSelection;
  mergedRowsRef.current = mergedRows;

  const rowHeights = useRowHeights({ minRowHeight });
  const setContentHeight = rowHeights.setContentHeight;
  const rowObservers = useRowObservers();

  const dataColumnDefs = useColumnDefs({
    columns: orderedColumns,
    getRowId,
    editingCell,
    activeCell,
    rangeStart,
    collaborators: collaborators ?? EMPTY_COLLABORATORS,
    onStartEdit,
    onCommit: commitCellEdit,
    onCancelEdit,
    onCellSelect,
    onRangeSelect,
    enableEditing: mergedFeatures.editing
  });

  const actionColumn = useMemo(() => {
    if (!hasActionColumn) {
      return null;
    }

    const column: ColumnDef<TRow, DataTableCellValue> = {
      id: ACTIONS_COLUMN_ID,
      header: () => <span className="sr-only">Row actions</span>,
      size: 65,
      minSize: 65,
      maxSize: 65,
      accessorFn: () => "",
      enableHiding: false,
      enablePinning: true,
      enableResizing: true,
      cell: (context) => {
        const row = context.row.original;
        const rowId = getRowId(row);
        const visibleRowActions = customRowActionsEnabled
          ? (rowActions ?? []).filter((action) => action.isVisible?.(row) ?? true)
          : [];
        const isMenuOpen = rowActionMenuRowId === rowId;
        return (
          <RowActions
            row={row}
            rowId={rowId}
            rowActions={visibleRowActions}
            isMenuOpen={isMenuOpen}
            canDelete={deleteEnabled}
            onDelete={() => {
              setRowActionMenuRowId(null);
              void deleteRowsNow([row]);
            }}
            onToggleMenu={() => {
              setRowActionMenuRowId((current) => (current === rowId ? null : rowId));
            }}
            onActionSelect={async (action) => {
              setRowActionMenuRowId(null);
              await action.onSelect({ row, rowId });
            }}
          />
        );
      }
    };

    return column;
  }, [
    customRowActionsEnabled,
    deleteRowsNow,
    deleteEnabled,
    getRowId,
    hasActionColumn,
    rowActionMenuRowId,
    rowActions,
    setRowActionMenuRowId
  ]);

  const rowSelectColumn = useMemo(() => {
    if (!mergedFeatures.rowSelect) {
      return null;
    }

    const column: ColumnDef<TRow, DataTableCellValue> = {
      id: SELECT_COLUMN_ID,
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
  }, [getRowId, mergedFeatures.rowSelect, setRowSelection]);

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
  const columnById = useMemo(() => {
    const map = new Map<string, DataTableColumn<TRow>>();
    for (const column of orderedColumns) {
      map.set(column.id, column);
    }
    return map;
  }, [orderedColumns]);
  const displayedRows = useMemo(
    () =>
      applyClientQuery(
        mergedRows,
        {
          sorting: queryState.sorting,
          filters: queryState.filters
        },
        columnById
      ),
    [columnById, mergedRows, queryState.filters, queryState.sorting]
  );
  const tableData = useMemo(() => [...displayedRows], [displayedRows]);

  const table = useReactTable({
    data: tableData,
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
    state: reactTableState,
    onSortingChange,
    onColumnFiltersChange,
    onColumnOrderChange,
    onColumnVisibilityChange,
    onColumnPinningChange,
    onColumnSizingChange,
    onColumnSizingInfoChange,
    onRowSelectionChange
  });

  const hiddenColumns = useMemo(
    () => orderedColumns.filter((column) => columnVisibility[column.id] === false),
    [columnVisibility, orderedColumns]
  );

  const visibleLeafColumnIdsInUiOrder = getVisibleLeafColumnIdsInUiOrder(table);
  const visibleLeafColumnsInUiOrder = visibleLeafColumnIdsInUiOrder
    .map((columnId) => table.getColumn(columnId))
    .filter((column): column is Column<TRow, DataTableCellValue> => Boolean(column));
  const visibleDataColumnIdsInUiOrder = getVisibleDataColumnIdsInUiOrder(table);
  const visibleDataColumns = visibleDataColumnIdsInUiOrder
    .map((columnId) => columnById.get(columnId))
    .filter((column): column is DataTableColumn<TRow> => Boolean(column));
  const visibleDataColumnIndexById = useMemo(() => {
    const indexById: Record<string, number> = {};

    for (let index = 0; index < visibleDataColumns.length; index += 1) {
      const column = visibleDataColumns[index];
      if (!column) {
        continue;
      }

      indexById[column.id] = index;
    }

    return indexById;
  }, [visibleDataColumns]);
  const resolvedActiveCell = useMemo<CollaboratorCellCoord | null>(() => {
    if (!activeCell) {
      return null;
    }

    const row = displayedRows[activeCell.rowIndex];
    const column = visibleDataColumns[activeCell.columnIndex];

    if (!row || !column) {
      return null;
    }

    return {
      rowId: getRowId(row),
      columnId: column.id
    };
  }, [activeCell, displayedRows, getRowId, visibleDataColumns]);
  const firstVisibleDraftColumnId = useMemo(() => {
    for (const column of visibleLeafColumnsInUiOrder) {
      const columnConfig = columnById.get(column.id);
      if (columnConfig) {
        return columnConfig.id;
      }
    }

    return orderedColumns[0]?.id ?? null;
  }, [columnById, orderedColumns, visibleLeafColumnsInUiOrder]);
  const tableRows = table.getRowModel().rows;
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const previousEditingCellRef = useRef<EditingCellState>(editingCell);
  const rowElementsRef = useRef<Record<RowId, HTMLTableRowElement | null>>({});
  const [containerWidth, setContainerWidth] = useState(0);

  useSafeLayoutEffect(() => {
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

  useEffect(() => {
    if (!onActiveCellChange) {
      return;
    }

    onActiveCellChange(resolvedActiveCell);
  }, [onActiveCellChange, resolvedActiveCell]);

  useEffect(() => {
    const previousEditingCell = previousEditingCellRef.current;
    previousEditingCellRef.current = editingCell;

    if (!previousEditingCell || editingCell) {
      return;
    }

    const containerNode = tableContainerRef.current;
    if (!containerNode) {
      return;
    }

    const activeElement = document.activeElement;
    if (activeElement === document.body) {
      containerNode.focus({ preventScroll: true });
      return;
    }

    if (activeElement instanceof Node && containerNode.contains(activeElement)) {
      containerNode.focus({ preventScroll: true });
    }
  }, [editingCell]);
  const {
    columnMenuId,
    setColumnMenuId,
    columnMenuAnchorById,
    dragOverTarget,
    toggleColumnMenu,
    updatePinnedColumn,
    setColumnSortDirection,
    onHeaderDragStart,
    onHeaderDragOver,
    onHeaderDrop,
    onHeaderDragEnd,
    beginColumnResize
  } = useTableColumns({
    tableContainerRef,
    columnPinning,
    normalizedColumnOrder,
    normalizedColumnPinning,
    setColumnOrder,
    setColumnPinning,
    setColumnSizing,
    setSorting
  });

  const columnRenderLayout = computeColumnLayout({
    columns: visibleLeafColumnsInUiOrder.map((column) => {
      const columnConfig = columnById.get(column.id);
      const pinnedState = column.getIsPinned();
      const maxSize = columnConfig?.maxWidth ?? column.columnDef.maxSize ?? null;

      return {
        id: column.id,
        baseWidth: columnSizing[column.id] ?? column.getSize(),
        pinned: pinnedState === "left" || pinnedState === "right" ? pinnedState : "center",
        isDataColumn: Boolean(columnConfig),
        canResize: column.getCanResize(),
        maxWidth: maxSize
      };
    }),
    containerWidth
  });

  const totalRows = displayedRows.length + (mergedFeatures.rowAdd ? 1 : 0);
  const rowOrderSignature = useMemo(
    () => displayedRows.map((row) => String(getRowId(row))).join("\u001f"),
    [displayedRows, getRowId]
  );

  const rowVirtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: (index) => {
      if (index >= displayedRows.length) {
        return minHeight;
      }
      const row = displayedRows[index];
      if (!row) {
        return minHeight;
      }
      return rowHeights.getFinalHeight(getRowId(row));
    },
    overscan: DEFAULT_OVERSCAN
  });

  const leftPinnedWidth = table
    .getLeftVisibleLeafColumns()
    .reduce((sum, column) => sum + renderedWidthForColumn(column, columnRenderLayout.renderWidthsById), 0);
  const rightPinnedWidth = table
    .getRightVisibleLeafColumns()
    .reduce((sum, column) => sum + renderedWidthForColumn(column, columnRenderLayout.renderWidthsById), 0);

  useSafeLayoutEffect(() => {
    if (!activeCell) {
      return;
    }

    const containerNode = tableContainerRef.current;
    if (!containerNode) {
      return;
    }

    if (mergedFeatures.virtualization) {
      rowVirtualizer.scrollToIndex(activeCell.rowIndex, { align: "auto" });
    }

    let frameId = 0;
    let attemptCount = 0;

    const syncActiveCellIntoView = (): void => {
      const cellSelector = `[role="gridcell"][data-row-index='${activeCell.rowIndex}'][data-column-index='${activeCell.columnIndex}']`;
      const cellNode = containerNode.querySelector(cellSelector);
      if (!(cellNode instanceof HTMLElement)) {
        if (attemptCount < 3) {
          attemptCount += 1;
          frameId = requestAnimationFrame(syncActiveCellIntoView);
        }
        return;
      }

      const headerNode = containerNode.querySelector("thead");
      const stickyHeaderHeight = headerNode instanceof HTMLElement ? headerNode.getBoundingClientRect().height : 0;

      scrollCellIntoView({
        containerNode,
        cellNode,
        stickyHeaderHeight,
        leftPinnedWidth,
        rightPinnedWidth
      });
    };

    syncActiveCellIntoView();

    return () => {
      if (frameId !== 0) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [activeCell, leftPinnedWidth, mergedFeatures.virtualization, rightPinnedWidth, rowVirtualizer]);

  useSafeLayoutEffect(() => {
    if (!mergedFeatures.virtualization) {
      return;
    }

    for (const node of Object.values(rowElementsRef.current)) {
      if (node) {
        rowVirtualizer.measureElement(node);
      }
    }
  }, [mergedFeatures.virtualization, rowOrderSignature, rowVirtualizer]);

  const setRowElement = useCallback(
    (rowId: RowId, node: HTMLTableRowElement | null) => {
      rowElementsRef.current[rowId] = node;

      if (!node) {
        delete rowElementsRef.current[rowId];
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

  const staticVirtualItems = useMemo(() => {
    if (mergedFeatures.virtualization) {
      return [];
    }

    return buildStaticVirtualItems({
      count: totalRows,
      getSize: (index) => {
        const row = displayedRows[index];
        return row ? rowHeights.getFinalHeight(getRowId(row)) : minHeight;
      }
    });
  }, [displayedRows, getRowId, mergedFeatures.virtualization, minHeight, rowHeights, totalRows]);

  const virtualItems = mergedFeatures.virtualization
    ? rowVirtualizer.getVirtualItems()
    : staticVirtualItems;

  const totalHeight = mergedFeatures.virtualization
    ? rowVirtualizer.getTotalSize()
    : getStaticVirtualTotalHeight(staticVirtualItems);

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
          rowCount: displayedRows.length
        });
      }
      rowsResult.loadMore();
    }
  }, [debugScope, displayedRows.length, isDebugMode, mergedFeatures.infiniteScroll, rowsResult]);

  useEffect(() => {
    return () => {
      rowObservers.disconnectAll();
      rowRefHandlers.current = {};
      rowElementsRef.current = {};
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
        mergedRows: displayedRows.length,
        virtualItems: virtualItems.length,
        selectedRows: Object.keys(rowSelection).length,
        editing: editingCell ? 1 : 0
      });
    }

    if (commitCounter.current % 50 === 0) {
      pushDebugEventThrottled(debugScope, "render-checkpoint", 1500, "render checkpoint", {
        commits: commitCounter.current,
        mergedRows: displayedRows.length,
        virtualItems: virtualItems.length
      });
    }
  });

  const moveActiveCell = useCallback(
    (rowDelta: number, columnDelta: number, expandSelection: boolean) => {
      if (visibleDataColumns.length === 0 || displayedRows.length === 0) {
        return;
      }

      const startingCell: CellCoord = activeCell ?? { rowIndex: 0, columnIndex: 0 };

      const nextCoord: CellCoord = {
        rowIndex: clamp(startingCell.rowIndex + rowDelta, 0, Math.max(displayedRows.length - 1, 0)),
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
    [activeCell, displayedRows.length, setActiveCell, setRangeStart, visibleDataColumns.length]
  );
  const { copySelection, pasteFromText } = useTableClipboard({
    activeCell,
    rangeStart,
    visibleDataColumns,
    displayedRows,
    getRowId,
    rowSchema,
    updateRows: dataSource.updateRows,
    clipboardCopyEnabled: mergedFeatures.clipboardCopy,
    clipboardPasteEnabled: mergedFeatures.clipboardPaste,
    editingEnabled: mergedFeatures.editing,
    cellSelectEnabled: mergedFeatures.cellSelect,
    editingCell,
    undoEnabled: mergedFeatures.undo,
    undoStack,
    setOptimisticRows
  });

  const { onGridKeyDown } = useTableKeyboard({
    activeCell,
    editingCell,
    editingEnabled: mergedFeatures.editing,
    cellSelectEnabled: mergedFeatures.cellSelect,
    clipboardPasteEnabled: mergedFeatures.clipboardPaste,
    undoEnabled: mergedFeatures.undo,
    displayedRows,
    visibleDataColumns,
    getRowId,
    moveActiveCell,
    setEditingCell,
    copySelection,
    undoStack,
    updateRows: dataSource.updateRows,
    setOptimisticRows
  });

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
      <TableToolbar
        canAddRow={mergedFeatures.rowAdd && Boolean(dataSource.createRow)}
        canDeleteRows={mergedFeatures.rowDelete && Boolean(dataSource.deleteRows)}
        canCopySelection={mergedFeatures.clipboardCopy}
        canManageVisibility={mergedFeatures.columnVisibility}
        isLoadingRows={rowsResult.isLoading}
        hiddenColumns={hiddenColumns}
        orderedColumns={orderedColumns}
        table={table}
        rowSelection={rowSelection}
        mergedRows={mergedRows}
        getRowId={getRowId}
        onAddRow={() => {
          const hasPendingDraftValues = Object.values(draftRowRef.current).some((value) =>
            hasDraftCellValue(value)
          );

          rowVirtualizer.scrollToIndex(displayedRows.length, { align: "end" });

          if (hasPendingDraftValues) {
            void commitDraftRow();
            return;
          }

          if (firstVisibleDraftColumnId) {
            setEditingCell(null);
            setDraftEditingColumnId(firstVisibleDraftColumnId);
          }
        }}
        onDeleteSelected={() => {
          const selectedRows = mergedRows.filter((row) => rowSelection[getRowId(row)]);
          void deleteRowsNow(selectedRows);
        }}
        onCopy={() => {
          void copySelection();
        }}
      />

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
          if (
            !canHandleGridPaste({
              clipboardPaste: mergedFeatures.clipboardPaste,
              editing: mergedFeatures.editing,
              cellSelect: mergedFeatures.cellSelect,
              editingCell,
              hasUpdateRows: dataSource.updateRows !== undefined,
              target: event.target
            })
          ) {
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
            <TableHeader
              table={table}
              columnById={columnById}
              columnRenderLayout={columnRenderLayout}
              columnSizing={columnSizing}
              fixedTrackStyle={fixedTrackStyle}
              columnMenuId={columnMenuId}
              columnMenuAnchorById={columnMenuAnchorById}
              dragOverTarget={dragOverTarget}
              mergedFeatures={{
                columnSort: mergedFeatures.columnSort,
                columnFilter: mergedFeatures.columnFilter,
                columnVisibility: mergedFeatures.columnVisibility,
                columnPinning: mergedFeatures.columnPinning,
                columnReorder: mergedFeatures.columnReorder,
                columnResize: mergedFeatures.columnResize
              }}
              filterByColumnId={filterByColumnId}
              selectedFilterOperator={selectedFilterOperator}
              selectColumnFilterTextValue={selectColumnFilterTextValue}
              selectColumnFilterValues={selectColumnFilterValues}
              setColumnFilterOperator={setColumnFilterOperator}
              setColumnFilterTextValue={setColumnFilterTextValue}
              toggleColumnFilterInValue={toggleColumnFilterInValue}
              clearColumnFilter={clearColumnFilter}
              toggleColumnMenu={toggleColumnMenu}
              setColumnMenuId={setColumnMenuId}
              updatePinnedColumn={updatePinnedColumn}
              setColumnSortDirection={setColumnSortDirection}
              onHeaderDragStart={onHeaderDragStart}
              onHeaderDragOver={onHeaderDragOver}
              onHeaderDrop={onHeaderDrop}
              onHeaderDragEnd={onHeaderDragEnd}
              beginColumnResize={beginColumnResize}
            />

            <TableBody
              tableRows={tableRows}
              displayedRows={displayedRows}
              virtualItems={virtualItems}
              totalHeight={totalHeight}
              rowAddEnabled={mergedFeatures.rowAdd}
              rowResizeEnabled={mergedFeatures.rowResize}
              canCreateRow={Boolean(dataSource.createRow)}
              draftRowId={DRAFT_ROW_ID}
              draftRow={draftRow}
              draftEditingColumnId={draftEditingColumnId}
              visibleLeafColumnsInUiOrder={visibleLeafColumnsInUiOrder}
              columnById={columnById}
              columnRenderLayout={columnRenderLayout}
              visibleDataColumnIndexById={visibleDataColumnIndexById}
              fixedTrackStyle={fixedTrackStyle}
              isDraftValuePresent={hasDraftCellValue}
              onBeginDraftEdit={(columnId) => {
                setEditingCell(null);
                setDraftEditingColumnId(columnId);
              }}
              onCommitDraftCell={commitDraftCell}
              onCancelDraftEdit={cancelDraftCellEdit}
              getRowId={getRowId}
              rowActionMenuRowId={rowActionMenuRowId}
              getRowRefHandler={getRowRefHandler}
              rowHeights={rowHeights}
              onStartRowResize={(rowId, clientY) => {
                setResizingRow({
                  rowId,
                  startHeight: rowHeights.getFinalHeight(rowId),
                  startY: clientY
                });
              }}
            />
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
