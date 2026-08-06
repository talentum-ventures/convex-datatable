import {
  useCallback,
  type Dispatch,
  type KeyboardEvent as ReactKeyboardEvent,
  type SetStateAction
} from "react";
import { toast } from "sonner";
import { diffRows } from "../core/column-utils";
import type { DataTableRowModel, EditingCellState, RowId, RowPatch } from "../core/types";
import type { CellStore } from "../core/cell-store";
import type { UseUndoStackResult, UndoEntry } from "./use-undo-stack";
import { isEditableKeyboardTarget } from "./use-table-clipboard";

function mergePatchesIntoOptimistic<TRow extends DataTableRowModel>(
  current: Record<RowId, Partial<TRow>>,
  patches: ReadonlyArray<RowPatch<TRow>>
): Record<RowId, Partial<TRow>> {
  const next = { ...current };
  for (const { rowId, patch } of patches) {
    next[rowId] = {
      ...next[rowId],
      ...patch
    };
  }
  return next;
}

function buildUndoSnapshotUpdate<TRow extends DataTableRowModel>(
  entry: UndoEntry<TRow>,
  direction: "previous" | "next"
): {
  patches: ReadonlyArray<RowPatch<TRow>>;
} {
  const patches: RowPatch<TRow>[] = [];

  for (const change of entry.changes) {
    const row = direction === "previous" ? change.previousRow : change.nextRow;
    const sourceRow = direction === "previous" ? change.nextRow : change.previousRow;
    patches.push({
      rowId: change.rowId,
      patch: diffRows(sourceRow, row)
    });
  }

  return {
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
  onStartEdit: (rowId: RowId, columnId: string) => void;
  onCancelEdit: () => void;
  copySelection: () => Promise<void>;
  undoStack: UseUndoStackResult<TRow>;
  updateRows: ((changes: ReadonlyArray<RowPatch<TRow>>) => Promise<void>) | undefined;
  setOptimisticRows: Dispatch<SetStateAction<Record<RowId, Partial<TRow>>>>;
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
  onStartEdit,
  onCancelEdit,
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

      onStartEdit(getRowId(row), column.id);
      return;
    }

    if (event.key === "Escape") {
      if (editingCell) {
        onCancelEdit();
      } else {
        setEditingCell(null);
      }
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
      const { patches } = buildUndoSnapshotUpdate(entry, "previous");

      setOptimisticRows((current) => mergePatchesIntoOptimistic(current, patches));

      if (!updateRows) {
        return;
      }

      try {
        await updateRows(patches);
      } catch (error) {
        undoStack.popRedo();
        const rollbackPatches = buildUndoSnapshotUpdate(entry, "next").patches;
        setOptimisticRows((current) => mergePatchesIntoOptimistic(current, rollbackPatches));
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
      const { patches } = buildUndoSnapshotUpdate(entry, "next");

      setOptimisticRows((current) => mergePatchesIntoOptimistic(current, patches));

      if (!updateRows) {
        return;
      }

      try {
        await updateRows(patches);
      } catch (error) {
        undoStack.popUndo();
        const rollbackPatches = buildUndoSnapshotUpdate(entry, "previous").patches;
        setOptimisticRows((current) => mergePatchesIntoOptimistic(current, rollbackPatches));
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
    onCancelEdit,
    onStartEdit,
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
