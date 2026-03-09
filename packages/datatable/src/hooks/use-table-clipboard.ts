import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { CellStore } from "../core/cell-store";
import { toast } from "sonner";
import {
  getColumnValue,
} from "../core/column-utils";
import {
  parseClipboardToCellValue,
  serializeCellForClipboard
} from "../core/cell-value";
import { validateCell, validateRow } from "../core/validation";
import type {
  DataTableColumn,
  DataTableDataSource,
  DataTableRowModel,
  EditingCellState,
  RowId,
  RowPatch,
  RowSchema
} from "../core/types";
import { expandPasteMatrix, parseTsv, serializeTsv } from "../selection/clipboard";
import { normalizeRange } from "../selection/range";
import { cellRange } from "./use-table-selection";
import type { UndoEntry, UseUndoStackResult } from "./use-undo-stack";

export type GridPasteEligibilityArgs = {
  clipboardPaste: boolean;
  editing: boolean;
  cellSelect: boolean;
  editingCell: EditingCellState;
  hasUpdateRows: boolean;
  target?: EventTarget | null;
};

export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  const element =
    target instanceof HTMLElement ? target : target instanceof Node ? target.parentElement : null;

  if (!element) {
    return false;
  }

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return true;
  }

  if (element.isContentEditable || element.getAttribute("contenteditable") === "true") {
    return true;
  }

  return element.closest("[data-dt-editor-root='true'], [data-dt-editor-dialog='true']") !== null;
}

export function canHandleGridPaste({
  clipboardPaste,
  editing,
  cellSelect,
  editingCell,
  hasUpdateRows,
  target = null
}: GridPasteEligibilityArgs): boolean {
  if (!clipboardPaste || !editing || !cellSelect || editingCell !== null || !hasUpdateRows) {
    return false;
  }

  return !isEditableKeyboardTarget(target);
}

function appendSkipSuffix(message: string, skippedNonEditable: number): string {
  if (skippedNonEditable === 0) {
    return message;
  }

  const cellLabel = skippedNonEditable === 1 ? "cell" : "cells";
  return `${message} Skipped ${skippedNonEditable} non-editable ${cellLabel}.`;
}

function invalidOptionPasteMessage(appliedCells: number, skippedInvalidOptionCells: number): string {
  const cellLabel = skippedInvalidOptionCells === 1 ? "cell" : "cells";
  if (appliedCells > 0) {
    return `Paste applied with ${skippedInvalidOptionCells} invalid select/multiselect ${cellLabel} skipped.`;
  }

  return `Paste skipped ${skippedInvalidOptionCells} invalid select/multiselect ${cellLabel}.`;
}

export type UseTableClipboardArgs<TRow extends DataTableRowModel> = {
  cellStore: CellStore;
  visibleDataColumns: ReadonlyArray<DataTableColumn<TRow>>;
  displayedRows: ReadonlyArray<TRow>;
  getRowId: (row: TRow) => RowId;
  rowSchema: RowSchema<TRow> | undefined;
  updateRows: DataTableDataSource<TRow>["updateRows"] | undefined;
  clipboardCopyEnabled: boolean;
  clipboardPasteEnabled: boolean;
  editingEnabled: boolean;
  cellSelectEnabled: boolean;
  undoEnabled: boolean;
  undoStack: UseUndoStackResult<TRow>;
  setOptimisticRows: Dispatch<SetStateAction<Record<RowId, TRow>>>;
};

export type UseTableClipboardResult = {
  copySelection: () => Promise<void>;
  pasteFromText: (text: string) => Promise<void>;
};

export function useTableClipboard<TRow extends DataTableRowModel>({
  cellStore,
  visibleDataColumns,
  displayedRows,
  getRowId,
  rowSchema,
  updateRows,
  clipboardCopyEnabled,
  clipboardPasteEnabled,
  editingEnabled,
  cellSelectEnabled,
  undoEnabled,
  undoStack,
  setOptimisticRows
}: UseTableClipboardArgs<TRow>): UseTableClipboardResult {
  const copySelection = useCallback(async () => {
    if (!clipboardCopyEnabled || !navigator.clipboard) {
      return;
    }

    if (visibleDataColumns.length === 0 || displayedRows.length === 0) {
      return;
    }

    const { activeCell, rangeStart } = cellStore.getSnapshot();
    const range = cellRange(rangeStart, activeCell);
    if (!range) {
      return;
    }

    const normalized = normalizeRange(range);
    const matrix: string[][] = [];

    for (let rowIndex = normalized.start.rowIndex; rowIndex <= normalized.end.rowIndex; rowIndex += 1) {
      const row = displayedRows[rowIndex];
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
  }, [cellStore, clipboardCopyEnabled, displayedRows, visibleDataColumns]);

  const pasteFromText = useCallback(async (text: string) => {
    const { activeCell, rangeStart, editingCell } = cellStore.getSnapshot();
    if (
      !canHandleGridPaste({
        clipboardPaste: clipboardPasteEnabled,
        editing: editingEnabled,
        cellSelect: cellSelectEnabled,
        editingCell,
        hasUpdateRows: updateRows !== undefined
      })
    ) {
      return;
    }

    if (updateRows === undefined) {
      return;
    }

    if (!activeCell || visibleDataColumns.length === 0 || displayedRows.length === 0) {
      return;
    }

    const parsed = parseTsv(text);
    if (parsed.length === 0) {
      return;
    }

    const selectedRange = cellRange(rangeStart, activeCell);
    const normalizedSelectedRange = selectedRange ? normalizeRange(selectedRange) : null;
    const selectedHeight = normalizedSelectedRange
      ? normalizedSelectedRange.end.rowIndex - normalizedSelectedRange.start.rowIndex + 1
      : 0;
    const selectedWidth = normalizedSelectedRange
      ? normalizedSelectedRange.end.columnIndex - normalizedSelectedRange.start.columnIndex + 1
      : 0;
    const shouldExpandFromActiveCell =
      normalizedSelectedRange === null || (selectedHeight === 1 && selectedWidth === 1);
    const baseRange = shouldExpandFromActiveCell
      ? {
          start: activeCell,
          end: {
            rowIndex: activeCell.rowIndex + parsed.length - 1,
            columnIndex: activeCell.columnIndex + (parsed[0]?.length ?? 1) - 1
          }
        }
      : normalizedSelectedRange;

    const expanded = expandPasteMatrix(parsed, baseRange);
    const previousRows = new Map<RowId, TRow>();
    const patches = new Map<RowId, Partial<TRow>>();
    let skippedNonEditable = 0;
    let skippedInvalidOptionCells = 0;

    for (let rowOffset = 0; rowOffset < expanded.length; rowOffset += 1) {
      const matrixRow = expanded[rowOffset];
      if (!matrixRow) {
        continue;
      }

      const rowIndex = baseRange.start.rowIndex + rowOffset;
      const row = displayedRows[rowIndex];
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
        if (!parsedValue.ok) {
          skippedInvalidOptionCells += 1;
          continue;
        }

        const cellValidation = validateCell(column, row, parsedValue.value);
        if (!cellValidation.ok) {
          continue;
        }

        const currentPatch = patches.get(rowId) ?? {};
        patches.set(
          rowId,
          {
            ...currentPatch,
            [column.field]: parsedValue.value
          } as Partial<TRow>
        );
      }
    }

    if (patches.size === 0) {
      if (skippedInvalidOptionCells > 0) {
        toast.error(
          appendSkipSuffix(invalidOptionPasteMessage(0, skippedInvalidOptionCells), skippedNonEditable)
        );
        return;
      }

      if (skippedNonEditable > 0) {
        toast.message(`Skipped ${skippedNonEditable} non-editable cells`);
      }
      return;
    }

    const optimisticUpdate: Record<RowId, TRow> = {};
    const groupedPatches: RowPatch<TRow>[] = [];
    let appliedCells = 0;

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
      groupedPatches.push({ rowId, patch });
      appliedCells += Object.keys(patch).length;
    }

    if (Object.keys(optimisticUpdate).length === 0) {
      if (skippedInvalidOptionCells > 0) {
        toast.error(
          appendSkipSuffix(invalidOptionPasteMessage(0, skippedInvalidOptionCells), skippedNonEditable)
        );
      }
      return;
    }

    const undoEntry: UndoEntry<TRow> | null = undoEnabled
      ? {
          changes: Object.entries(optimisticUpdate).map(([rowId, nextRow]) => {
            const previousRow = previousRows.get(rowId);
            if (!previousRow) {
              throw new Error(`Missing previous row snapshot for ${rowId}`);
            }

            return {
              rowId,
              previousRow,
              nextRow
            };
          })
        }
      : null;

    if (undoEntry) {
      undoStack.pushUndo(undoEntry);
    }

    setOptimisticRows((current) => ({
      ...current,
      ...optimisticUpdate
    }));

    try {
      await updateRows(groupedPatches);
      if (skippedInvalidOptionCells > 0) {
        toast.error(
          appendSkipSuffix(
            invalidOptionPasteMessage(appliedCells, skippedInvalidOptionCells),
            skippedNonEditable
          )
        );
      } else if (skippedNonEditable > 0) {
        toast.message(`Paste applied. Skipped ${skippedNonEditable} non-editable cells`);
      } else {
        toast.success("Paste applied");
      }
    } catch (error) {
      if (undoEntry) {
        undoStack.discard(undoEntry);
      }

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
  }, [
    cellStore,
    cellSelectEnabled,
    clipboardPasteEnabled,
    displayedRows,
    editingEnabled,
    getRowId,
    rowSchema,
    setOptimisticRows,
    undoEnabled,
    undoStack,
    updateRows,
    visibleDataColumns
  ]);

  return {
    copySelection,
    pasteFromText
  };
}
