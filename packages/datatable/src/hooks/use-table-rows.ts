import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction
} from "react";
import { toast } from "sonner";
import type { CellCommit } from "../engine/column-def-builder";
import { setColumnValue } from "../core/column-utils";
import { validateCell, validateRow } from "../core/validation";
import type {
  DataTableCellValue,
  DataTableColumn,
  DataTableDataSource,
  DataTableRowModel,
  EditingCellState,
  RowId,
  RowSchema
} from "../core/types";
import { type UseUndoStackResult } from "./use-undo-stack";

export function hasDraftCellValue(value: DataTableCellValue): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return value !== "" && value !== null && value !== undefined;
}

function asRecord<TValue>(entries: ReadonlyArray<readonly [string, TValue]>): Record<string, TValue> {
  const output: Record<string, TValue> = {};
  for (const [key, value] of entries) {
    output[key] = value;
  }
  return output;
}

function cloneDraftRow<TRow extends DataTableRowModel>(
  draftRow: Partial<TRow> | undefined
): Partial<TRow> {
  return draftRow ? { ...draftRow } : {};
}

function areCellValuesEqual(left: DataTableCellValue, right: DataTableCellValue): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => areCellValuesEqual(value, right[index]))
    );
  }

  return false;
}

function areDraftRowsEqual<TRow extends DataTableRowModel>(
  left: Partial<TRow>,
  right: Partial<TRow>
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    if (!Object.hasOwn(right, key)) {
      return false;
    }

    if (!areCellValuesEqual(left[key], right[key])) {
      return false;
    }
  }

  return true;
}

export type UseTableRowsArgs<TRow extends DataTableRowModel> = {
  sourceRows: ReadonlyArray<TRow>;
  getRowId: (row: TRow) => RowId;
  orderedColumns: ReadonlyArray<DataTableColumn<TRow>>;
  rowSchema: RowSchema<TRow> | undefined;
  dataSource: DataTableDataSource<TRow>;
  rowsRefresh: () => void;
  rowDeleteEnabled: boolean;
  rowAddEnabled: boolean;
  defaultDraftRow?: Partial<TRow>;
  undoEnabled: boolean;
  setEditingCell: Dispatch<SetStateAction<EditingCellState>>;
  undoStack: UseUndoStackResult<TRow>;
};

export type UseTableRowsResult<TRow extends DataTableRowModel> = {
  optimisticRows: Record<RowId, TRow>;
  setOptimisticRows: Dispatch<SetStateAction<Record<RowId, TRow>>>;
  deletedRows: Record<RowId, TRow>;
  mergedRows: ReadonlyArray<TRow>;
  rowActionMenuRowId: RowId | null;
  setRowActionMenuRowId: Dispatch<SetStateAction<RowId | null>>;
  draftRow: Partial<TRow>;
  hasTouchedDraftRow: boolean;
  draftEditingColumnId: string | null;
  setDraftEditingColumnId: Dispatch<SetStateAction<string | null>>;
  draftRowRef: React.MutableRefObject<Partial<TRow>>;
  onStartEdit: (rowId: RowId, columnId: string) => void;
  onCancelEdit: () => void;
  getEditingDraftValue: (rowId: RowId, columnId: string) => DataTableCellValue | null;
  onEditingDraftChange: (rowId: RowId, columnId: string, value: DataTableCellValue) => void;
  commitCellEdit: CellCommit<TRow>;
  deleteRowsNow: (rowsToDelete: ReadonlyArray<TRow>) => Promise<void>;
  commitDraftRow: (nextDraftRow?: Partial<TRow>) => Promise<void>;
  commitDraftCell: (column: DataTableColumn<TRow>, value: DataTableCellValue) => void;
  cancelDraftCellEdit: () => void;
  clearDraftRow: () => void;
};

export function useTableRows<TRow extends DataTableRowModel>({
  sourceRows,
  getRowId,
  orderedColumns,
  rowSchema,
  dataSource,
  rowsRefresh,
  rowDeleteEnabled,
  rowAddEnabled,
  defaultDraftRow,
  undoEnabled,
  setEditingCell,
  undoStack
}: UseTableRowsArgs<TRow>): UseTableRowsResult<TRow> {
  type EditingSnapshot = {
    row: TRow;
    columnId: string;
    draftValue: DataTableCellValue | null;
  };

  const [optimisticRows, setOptimisticRows] = useState<Record<RowId, TRow>>({});
  const [deletedRows, setDeletedRows] = useState<Record<RowId, TRow>>({});
  const [rowActionMenuRowId, setRowActionMenuRowId] = useState<RowId | null>(null);
  const [draftRow, setDraftRow] = useState<Partial<TRow>>(() => cloneDraftRow(defaultDraftRow));
  const [draftEditingColumnId, setDraftEditingColumnId] = useState<string | null>(null);
  const draftRowRef = useRef<Partial<TRow>>(draftRow);
  const touchedDraftFieldsRef = useRef<Set<string>>(new Set());
  const previousDefaultDraftRowRef = useRef<Partial<TRow>>(cloneDraftRow(defaultDraftRow));
  const editingCellRef = useRef<EditingCellState>(null);
  const editingSnapshotRef = useRef<Record<RowId, EditingSnapshot>>({});

  draftRowRef.current = draftRow;

  useEffect(() => {
    const nextDefaultDraftRow = cloneDraftRow(defaultDraftRow);
    const previousDefaultDraftRow = previousDefaultDraftRowRef.current;
    if (areDraftRowsEqual(previousDefaultDraftRow, nextDefaultDraftRow)) {
      return;
    }

    previousDefaultDraftRowRef.current = nextDefaultDraftRow;

    setDraftRow((currentDraftRow) => {
      const nextDraftRow = { ...currentDraftRow };
      const touchedDraftFields = touchedDraftFieldsRef.current;
      const allKeys = new Set([
        ...Object.keys(previousDefaultDraftRow),
        ...Object.keys(nextDefaultDraftRow)
      ]);

      for (const key of allKeys) {
        if (touchedDraftFields.has(key)) {
          continue;
        }

        if (key in nextDefaultDraftRow) {
          nextDraftRow[key as keyof TRow] = nextDefaultDraftRow[key as keyof TRow];
          continue;
        }

        delete nextDraftRow[key as keyof TRow];
      }

      draftRowRef.current = nextDraftRow;
      return nextDraftRow;
    });
  }, [defaultDraftRow]);

  const deletedRowIds = useMemo(() => new Set(Object.keys(deletedRows)), [deletedRows]);

  const mergedRows = useMemo(() => {
    const rows: TRow[] = [];
    for (const sourceRow of sourceRows) {
      const rowId = getRowId(sourceRow);
      if (deletedRowIds.has(rowId)) {
        continue;
      }

      rows.push(optimisticRows[rowId] ?? editingSnapshotRef.current[rowId]?.row ?? sourceRow);
    }
    return rows;
  }, [deletedRowIds, getRowId, optimisticRows, sourceRows]);

  useEffect(() => {
    if (!rowActionMenuRowId) {
      return;
    }

    const onPointerDown = (event: MouseEvent): void => {
      if (!(event.target instanceof Element)) {
        setRowActionMenuRowId(null);
        return;
      }

      if (event.target.closest("[data-dt-row-action-menu-root='true']")) {
        return;
      }

      setRowActionMenuRowId(null);
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setRowActionMenuRowId(null);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [rowActionMenuRowId]);

  const onStartEdit = useCallback((rowId: RowId, columnId: string) => {
    const currentRow = mergedRows.find((candidateRow) => getRowId(candidateRow) === rowId);

    if (currentRow) {
      editingSnapshotRef.current[rowId] = {
        row: currentRow,
        columnId,
        draftValue: null
      };
    }

    editingCellRef.current = { rowId, columnId };
    setDraftEditingColumnId(null);
    setEditingCell({ rowId, columnId });
  }, [getRowId, mergedRows, setEditingCell]);

  const onCancelEdit = useCallback(() => {
    const editingCell = editingCellRef.current;
    if (editingCell) {
      delete editingSnapshotRef.current[editingCell.rowId];
    }

    editingCellRef.current = null;
    setEditingCell(null);
  }, [setEditingCell]);

  const getEditingDraftValue = useCallback((rowId: RowId, columnId: string): DataTableCellValue | null => {
    const snapshot = editingSnapshotRef.current[rowId];
    if (snapshot?.columnId !== columnId) {
      return null;
    }

    return snapshot.draftValue;
  }, []);

  const onEditingDraftChange = useCallback((rowId: RowId, columnId: string, value: DataTableCellValue) => {
    const snapshot = editingSnapshotRef.current[rowId];
    if (snapshot?.columnId !== columnId) {
      return;
    }

    snapshot.draftValue = value;
  }, []);

  const commitCellEdit = useCallback<CellCommit<TRow>>(async ({ row, rowId, column, value }) => {
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

    const undoEntry = undoEnabled
      ? {
          changes: [
            {
              rowId,
              previousRow: row,
              nextRow: updateResult.nextRow
            }
          ]
        }
      : null;

    if (undoEntry) {
      undoStack.pushUndo(undoEntry);
    }

    setOptimisticRows((current) => ({
      ...current,
      [rowId]: updateResult.nextRow
    }));
    delete editingSnapshotRef.current[rowId];
    editingCellRef.current = null;
    setEditingCell(null);

    if (!dataSource.updateRows) {
      return;
    }

    try {
      await dataSource.updateRows([updateResult.patch]);
    } catch (error) {
      if (undoEntry) {
        undoStack.discard(undoEntry);
      }
      setOptimisticRows((current) => {
        const next = { ...current };
        delete next[rowId];
        return next;
      });
      toast.error(`Failed to update row: ${String(error)}`);
    }
  }, [dataSource, rowSchema, setEditingCell, undoEnabled, undoStack]);

  const deleteRowsNow = useCallback(async (rowsToDelete: ReadonlyArray<TRow>) => {
    if (!rowDeleteEnabled || !dataSource.deleteRows || rowsToDelete.length === 0) {
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
  }, [dataSource, getRowId, rowDeleteEnabled]);

  const commitDraftRow = useCallback(async (nextDraftRow?: Partial<TRow>) => {
    if (!rowAddEnabled || !dataSource.createRow) {
      return;
    }

    const currentDraftRow = nextDraftRow ?? draftRowRef.current;
    const hasValues = Object.values(currentDraftRow).some((value) => hasDraftCellValue(value));
    if (!hasValues) {
      return;
    }

    const candidate = currentDraftRow as TRow;

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

    try {
      await dataSource.createRow(currentDraftRow);
      touchedDraftFieldsRef.current = new Set();
      const resetDraftRow = cloneDraftRow(previousDefaultDraftRowRef.current);
      draftRowRef.current = resetDraftRow;
      setDraftRow(resetDraftRow);
      setDraftEditingColumnId(null);
      rowsRefresh();
      toast.success("Row added");
    } catch (error) {
      toast.error(`Failed to create row: ${String(error)}`);
    }
  }, [dataSource, orderedColumns, rowAddEnabled, rowsRefresh]);

  const commitDraftCell = useCallback((column: DataTableColumn<TRow>, value: DataTableCellValue) => {
    const nextDraftRow = {
      ...draftRowRef.current,
      [column.field]: value
    };

    touchedDraftFieldsRef.current.add(column.field);
    draftRowRef.current = nextDraftRow;
    setDraftRow(nextDraftRow);
    setDraftEditingColumnId(null);
  }, []);

  const cancelDraftCellEdit = useCallback(() => {
    setDraftEditingColumnId(null);
  }, []);

  const clearDraftRow = useCallback(() => {
    touchedDraftFieldsRef.current = new Set();
    const resetDraftRow = cloneDraftRow(previousDefaultDraftRowRef.current);
    draftRowRef.current = resetDraftRow;
    setDraftRow(resetDraftRow);
    setDraftEditingColumnId(null);
  }, []);

  return {
    optimisticRows,
    setOptimisticRows,
    deletedRows,
    mergedRows,
    rowActionMenuRowId,
    setRowActionMenuRowId,
    draftRow,
    hasTouchedDraftRow: touchedDraftFieldsRef.current.size > 0,
    draftEditingColumnId,
    setDraftEditingColumnId,
    draftRowRef,
    onStartEdit,
    onCancelEdit,
    getEditingDraftValue,
    onEditingDraftChange,
    commitCellEdit,
    deleteRowsNow,
    commitDraftRow,
    commitDraftCell,
    cancelDraftCellEdit,
    clearDraftRow
  };
}
