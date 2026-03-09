import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction
} from "react";
import type {
  ColumnFiltersState,
  ColumnPinningState,
  ColumnSizingInfoState,
  ColumnSizingState,
  RowSelectionState,
  SortingState,
  Updater,
  VisibilityState
} from "@tanstack/react-table";
import type { DataTableOnError, PersistedTableState } from "../core/types";
import {
  buildManagedColumnOrder,
  buildManagedColumnPinning,
  sanitizeDataColumnOrder,
  sanitizeDataColumnPinning
} from "../engine/managed-columns";
import {
  internalToPersistedState,
  persistedStateToInternal
} from "../engine/state-converters";
import { usePersistedState } from "../persistence/use-persisted-state";

function applyUpdater<TValue>(updater: Updater<TValue>, current: TValue): TValue {
  if (typeof updater === "function") {
    const fn = updater as (old: TValue) => TValue;
    return fn(current);
  }
  return updater;
}

function defaultColumnSizingInfoState(): ColumnSizingInfoState {
  return {
    startOffset: null,
    startSize: null,
    deltaOffset: null,
    deltaPercentage: null,
    isResizingColumn: false,
    columnSizingStart: []
  };
}

type StateSetter<TValue> = Dispatch<SetStateAction<TValue>>;

export type UseTableStateArgs = {
  tableId: string;
  dataColumnIds: ReadonlyArray<string>;
  includeSelectColumn: boolean;
  includeActionsColumn: boolean;
  onError: DataTableOnError | undefined;
};

export type UseTableStateResult = {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnVisibility: VisibilityState;
  columnPinning: ColumnPinningState;
  columnSizing: ColumnSizingState;
  columnSizingInfo: ColumnSizingInfoState;
  rowSelection: RowSelectionState;
  normalizedColumnOrder: string[];
  normalizedColumnPinning: ColumnPinningState;
  reactTableState: {
    sorting: SortingState;
    columnFilters: ColumnFiltersState;
    columnOrder: string[];
    columnVisibility: VisibilityState;
    columnPinning: ColumnPinningState;
    columnSizing: ColumnSizingState;
    columnSizingInfo: ColumnSizingInfoState;
    rowSelection: RowSelectionState;
  };
  setSorting: StateSetter<SortingState>;
  setColumnFilters: StateSetter<ColumnFiltersState>;
  setColumnOrder: StateSetter<string[]>;
  setColumnPinning: StateSetter<ColumnPinningState>;
  setColumnSizing: StateSetter<ColumnSizingState>;
  setRowSelection: StateSetter<RowSelectionState>;
  onSortingChange: (updater: Updater<SortingState>) => void;
  onColumnFiltersChange: (updater: Updater<ColumnFiltersState>) => void;
  onColumnOrderChange: (updater: Updater<string[]>) => void;
  onColumnVisibilityChange: (updater: Updater<VisibilityState>) => void;
  onColumnPinningChange: (updater: Updater<ColumnPinningState>) => void;
  onColumnSizingChange: (updater: Updater<ColumnSizingState>) => void;
  onColumnSizingInfoChange: (updater: Updater<ColumnSizingInfoState>) => void;
  onRowSelectionChange: (updater: Updater<RowSelectionState>) => void;
};

export function useTableState({
  tableId,
  dataColumnIds,
  includeSelectColumn,
  includeActionsColumn,
  onError
}: UseTableStateArgs): UseTableStateResult {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({ left: [], right: [] });
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [columnSizingInfo, setColumnSizingInfo] = useState<ColumnSizingInfoState>(() =>
    defaultColumnSizingInfoState()
  );
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const normalizedColumnOrder = useMemo(
    () =>
      sanitizeDataColumnOrder({
        dataColumnIds,
        userColumnOrder: columnOrder
      }),
    [columnOrder, dataColumnIds]
  );

  const normalizedColumnPinning = useMemo(
    () =>
      sanitizeDataColumnPinning({
        dataColumnIds,
        userColumnPinning: columnPinning
      }),
    [columnPinning, dataColumnIds]
  );

  const fullColumnOrder = useMemo(
    () =>
      buildManagedColumnOrder({
        dataColumnIds,
        userColumnOrder: normalizedColumnOrder,
        includeSelect: includeSelectColumn,
        includeActions: includeActionsColumn
      }),
    [dataColumnIds, includeActionsColumn, includeSelectColumn, normalizedColumnOrder]
  );

  const managedColumnPinning = useMemo(
    () =>
      buildManagedColumnPinning({
        dataColumnIds,
        userColumnPinning: normalizedColumnPinning,
        includeSelect: includeSelectColumn,
        includeActions: includeActionsColumn
      }),
    [dataColumnIds, includeActionsColumn, includeSelectColumn, normalizedColumnPinning]
  );

  const persistedState = useMemo(
    () =>
      internalToPersistedState({
        sorting,
        filters: columnFilters,
        columnOrder: normalizedColumnOrder,
        columnVisibility,
        columnPinning: normalizedColumnPinning,
        columnSizing
      }),
    [
      columnFilters,
      columnSizing,
      columnVisibility,
      normalizedColumnOrder,
      normalizedColumnPinning,
      sorting
    ]
  );

  const hydrateFromPersistence = useCallback((state: PersistedTableState) => {
    const internal = persistedStateToInternal(state);
    setSorting(internal.sorting);
    setColumnFilters(internal.filters);
    setColumnOrder(
      sanitizeDataColumnOrder({
        dataColumnIds,
        userColumnOrder: internal.columnOrder
      })
    );
    setColumnVisibility(internal.columnVisibility);
    setColumnPinning(
      sanitizeDataColumnPinning({
        dataColumnIds,
        userColumnPinning: internal.columnPinning
      })
    );
    setColumnSizing(internal.columnSizing);
    setColumnSizingInfo(defaultColumnSizingInfoState());
  }, [dataColumnIds]);

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
    setColumnOrder([...dataColumnIds]);
  }, [columnOrder.length, dataColumnIds]);

  const onSortingChange = useCallback((updater: Updater<SortingState>) => {
    setSorting((current) => applyUpdater(updater, current));
  }, []);

  const onColumnFiltersChange = useCallback((updater: Updater<ColumnFiltersState>) => {
    setColumnFilters((current) => applyUpdater(updater, current));
  }, []);

  const onColumnOrderChange = useCallback((updater: Updater<string[]>) => {
    setColumnOrder((current) => {
      const next = applyUpdater(
        updater,
        buildManagedColumnOrder({
          dataColumnIds,
          userColumnOrder: current,
          includeSelect: includeSelectColumn,
          includeActions: includeActionsColumn
        })
      );

      return sanitizeDataColumnOrder({
        dataColumnIds,
        userColumnOrder: next
      });
    });
  }, [dataColumnIds, includeActionsColumn, includeSelectColumn]);

  const onColumnVisibilityChange = useCallback((updater: Updater<VisibilityState>) => {
    setColumnVisibility((current) => applyUpdater(updater, current));
  }, []);

  const onColumnPinningChange = useCallback((updater: Updater<ColumnPinningState>) => {
    setColumnPinning((current) => {
      const next = applyUpdater(
        updater,
        buildManagedColumnPinning({
          dataColumnIds,
          userColumnPinning: current,
          includeSelect: includeSelectColumn,
          includeActions: includeActionsColumn
        })
      );

      return sanitizeDataColumnPinning({
        dataColumnIds,
        userColumnPinning: next
      });
    });
  }, [dataColumnIds, includeActionsColumn, includeSelectColumn]);

  const onColumnSizingChange = useCallback((updater: Updater<ColumnSizingState>) => {
    setColumnSizing((current) => applyUpdater(updater, current));
  }, []);

  const onColumnSizingInfoChange = useCallback((updater: Updater<ColumnSizingInfoState>) => {
    setColumnSizingInfo((current) => applyUpdater(updater, current));
  }, []);

  const onRowSelectionChange = useCallback((updater: Updater<RowSelectionState>) => {
    setRowSelection((current) => applyUpdater(updater, current));
  }, []);

  const reactTableState = useMemo(
    () => ({
      sorting,
      columnFilters,
      columnOrder: fullColumnOrder,
      columnVisibility,
      columnPinning: managedColumnPinning,
      columnSizing,
      columnSizingInfo,
      rowSelection
    }),
    [
      columnFilters,
      columnSizing,
      columnSizingInfo,
      columnVisibility,
      fullColumnOrder,
      managedColumnPinning,
      rowSelection,
      sorting
    ]
  );

  return {
    sorting,
    columnFilters,
    columnVisibility,
    columnPinning,
    columnSizing,
    columnSizingInfo,
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
  };
}
