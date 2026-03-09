import { useCallback, useMemo, useRef } from "react";
import type { DataTableRowModel, RowId } from "../core/types";

const MAX_UNDO_ENTRIES = 50;

export type UndoChange<TRow extends DataTableRowModel> = {
  rowId: RowId;
  previousRow: TRow;
  nextRow: TRow;
};

export type UndoEntry<TRow extends DataTableRowModel> = {
  changes: ReadonlyArray<UndoChange<TRow>>;
};

export type UseUndoStackResult<TRow extends DataTableRowModel> = {
  pushUndo: (entry: UndoEntry<TRow>) => void;
  popUndo: () => UndoEntry<TRow> | null;
  popRedo: () => UndoEntry<TRow> | null;
  discard: (entry: UndoEntry<TRow>) => void;
};

export function useUndoStack<TRow extends DataTableRowModel>(): UseUndoStackResult<TRow> {
  const undoStackRef = useRef<UndoEntry<TRow>[]>([]);
  const redoStackRef = useRef<UndoEntry<TRow>[]>([]);

  const pushUndo = useCallback((entry: UndoEntry<TRow>) => {
    undoStackRef.current.push(entry);
    if (undoStackRef.current.length > MAX_UNDO_ENTRIES) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
  }, []);

  const popUndo = useCallback((): UndoEntry<TRow> | null => {
    const entry = undoStackRef.current.pop() ?? null;
    if (!entry) {
      return null;
    }
    redoStackRef.current.push(entry);
    return entry;
  }, []);

  const popRedo = useCallback((): UndoEntry<TRow> | null => {
    const entry = redoStackRef.current.pop() ?? null;
    if (!entry) {
      return null;
    }
    undoStackRef.current.push(entry);
    return entry;
  }, []);

  const discard = useCallback((entry: UndoEntry<TRow>) => {
    undoStackRef.current = undoStackRef.current.filter((candidate) => candidate !== entry);
    redoStackRef.current = redoStackRef.current.filter((candidate) => candidate !== entry);
  }, []);

  return useMemo(
    () => ({
      pushUndo,
      popUndo,
      popRedo,
      discard
    }),
    [discard, popRedo, popUndo, pushUndo]
  );
}
