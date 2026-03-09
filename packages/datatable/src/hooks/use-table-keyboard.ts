import { useCallback, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { DataTableRowModel, EditingCellState, RowId, RowPatch } from "../core/types";
import type { CellStore } from "../core/cell-store";
import type { UseUndoStackResult, UndoEntry } from "./use-undo-stack";
import { isEditableKeyboardTarget } from "./use-table-clipboard";

function buildUndoSnapshotUpdate<TRow extends DataTableRowModel>(
  entry: UndoEntry<TRow>,
  direction: "previous" | "next"
): {
  optimisticUpdate: Record<RowId, TRow>;
  patches: ReadonlyArray<RowPatch<TRow>>;
} {
  const optimisticUpdate: Record<RowId, TRow> = {};
  const patches: RowPatch<TRow>[] = [];

  for (const change of entry.changes) {
    const row = direction === "previous" ? change.previousRow : change.nextRow;
    optimisticUpdate[change.rowId] = row;
    patches.push({
      rowId: change.rowId,
      patch: row
    });
  }

  return {
    optimisticUpdate,
    patches
  };
}

export type UseTableKeyboardArgs<TRow extends DataTableRowModel> = {
  cellStore: CellStore;
  editingEnabled: boolean;
  cellSelectEnabled: boolean;
  clipboardPasteEnabled: boolean;
  undoEnabled: boolean;
  displayedRows: ReadonlyArray<TRow>;
  visibleDataColumns: ReadonlyArray<{ id: string; isEditable?: boolean | undefined }>;
  getRowId: (row: TRow) => RowId;
  moveActiveCell: (rowDelta: number, columnDelta: number, expandSelection: boolean) => void;
  setEditingCell: Dispatch<SetStateAction<EditingCellState>>;
  copySelection: () => Promise<void>;
  undoStack: UseUndoStackResult<TRow>;
  updateRows: ((changes: ReadonlyArray<RowPatch<TRow>>) => Promise<void>) | undefined;
  setOptimisticRows: Dispatch<SetStateAction<Record<RowId, TRow>>>;
};

export type UseTableKeyboardResult = {
  onGridKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => Promise<void>;
};

export function useTableKeyboard<TRow extends DataTableRowModel>({
  cellStore,
  editingEnabled,
  cellSelectEnabled,
  clipboardPasteEnabled,
  undoEnabled,
  displayedRows,
  visibleDataColumns,
  getRowId,
  moveActiveCell,
  setEditingCell,
  copySelection,
  undoStack,
  updateRows,
  setOptimisticRows
}: UseTableKeyboardArgs<TRow>): UseTableKeyboardResult {
  const onGridKeyDown = useCallback(async (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const targetOwnsKeyboard = isEditableKeyboardTarget(event.target);
    const { activeCell, editingCell } = cellStore.getSnapshot();

    if (cellSelectEnabled && !targetOwnsKeyboard && !editingCell) {
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

    if (targetOwnsKeyboard) {
      return;
    }

    if ((event.key === "Enter" || event.key === "F2") && editingEnabled) {
      const target = activeCell;
      if (!target) {
        return;
      }

      const row = displayedRows[target.rowIndex];
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
    const redoCommand =
      commandKey &&
      (event.key.toLowerCase() === "y" || (event.shiftKey && event.key.toLowerCase() === "z"));

    if (undoEnabled && commandKey && event.key.toLowerCase() === "z" && !event.shiftKey) {
      const entry = undoStack.popUndo();
      if (!entry) {
        return;
      }

      event.preventDefault();
      const { optimisticUpdate, patches } = buildUndoSnapshotUpdate(entry, "previous");

      setOptimisticRows((current) => ({
        ...current,
        ...optimisticUpdate
      }));

      if (!updateRows) {
        return;
      }

      try {
        await updateRows(patches);
      } catch (error) {
        undoStack.popRedo();
        const rollbackUpdate = buildUndoSnapshotUpdate(entry, "next").optimisticUpdate;
        setOptimisticRows((current) => ({
          ...current,
          ...rollbackUpdate
        }));
        toast.error(`Undo failed: ${String(error)}`);
      }
      return;
    }

    if (undoEnabled && redoCommand) {
      const entry = undoStack.popRedo();
      if (!entry) {
        return;
      }

      event.preventDefault();
      const { optimisticUpdate, patches } = buildUndoSnapshotUpdate(entry, "next");

      setOptimisticRows((current) => ({
        ...current,
        ...optimisticUpdate
      }));

      if (!updateRows) {
        return;
      }

      try {
        await updateRows(patches);
      } catch (error) {
        undoStack.popUndo();
        const rollbackUpdate = buildUndoSnapshotUpdate(entry, "previous").optimisticUpdate;
        setOptimisticRows((current) => ({
          ...current,
          ...rollbackUpdate
        }));
        toast.error(`Redo failed: ${String(error)}`);
      }
      return;
    }

    if (commandKey && event.key.toLowerCase() === "c") {
      event.preventDefault();
      await copySelection();
      return;
    }

    if (commandKey && event.key.toLowerCase() === "v" && clipboardPasteEnabled) {
      return;
    }
  }, [
    cellStore,
    cellSelectEnabled,
    clipboardPasteEnabled,
    copySelection,
    displayedRows,
    editingEnabled,
    getRowId,
    moveActiveCell,
    setEditingCell,
    setOptimisticRows,
    undoEnabled,
    undoStack,
    updateRows,
    visibleDataColumns
  ]);

  return {
    onGridKeyDown
  };
}
