import {
  createContext,
  useContext,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction
} from "react";
import type { CellCoord, EditingCellState, RowId } from "./types";

type CellStoreSnapshot = {
  activeCell: CellCoord | null;
  rangeStart: CellCoord | null;
  editingCell: EditingCellState;
};

type CellStoreListener = () => void;

function applySetStateAction<TValue>(
  current: TValue,
  next: SetStateAction<TValue>
): TValue {
  if (typeof next === "function") {
    return (next as (value: TValue) => TValue)(current);
  }
  return next;
}

function isSameCellCoord(
  left: CellCoord | null,
  right: CellCoord | null
): boolean {
  return left?.rowIndex === right?.rowIndex && left?.columnIndex === right?.columnIndex;
}

function isSameEditingCell(
  left: EditingCellState,
  right: EditingCellState
): boolean {
  return left?.rowId === right?.rowId && left?.columnId === right?.columnId;
}

function isCellInRange(
  cell: CellCoord,
  start: CellCoord | null,
  end: CellCoord | null
): boolean {
  if (!start || !end) {
    return false;
  }

  const minRow = Math.min(start.rowIndex, end.rowIndex);
  const maxRow = Math.max(start.rowIndex, end.rowIndex);
  const minColumn = Math.min(start.columnIndex, end.columnIndex);
  const maxColumn = Math.max(start.columnIndex, end.columnIndex);

  return (
    cell.rowIndex >= minRow &&
    cell.rowIndex <= maxRow &&
    cell.columnIndex >= minColumn &&
    cell.columnIndex <= maxColumn
  );
}

export class CellStore {
  private snapshot: CellStoreSnapshot = {
    activeCell: null,
    rangeStart: null,
    editingCell: null
  };

  private listeners = new Set<CellStoreListener>();

  subscribe = (listener: CellStoreListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): CellStoreSnapshot => this.snapshot;

  getServerSnapshot = (): CellStoreSnapshot => this.snapshot;

  getActiveCell = (): CellCoord | null => this.snapshot.activeCell;

  getRangeStart = (): CellCoord | null => this.snapshot.rangeStart;

  getEditingCell = (): EditingCellState => this.snapshot.editingCell;

  setActiveCell: Dispatch<SetStateAction<CellCoord | null>> = (next) => {
    const resolved = applySetStateAction(this.snapshot.activeCell, next);
    if (isSameCellCoord(this.snapshot.activeCell, resolved)) {
      return;
    }
    this.snapshot = {
      ...this.snapshot,
      activeCell: resolved
    };
    this.emit();
  };

  setRangeStart: Dispatch<SetStateAction<CellCoord | null>> = (next) => {
    const resolved = applySetStateAction(this.snapshot.rangeStart, next);
    if (isSameCellCoord(this.snapshot.rangeStart, resolved)) {
      return;
    }
    this.snapshot = {
      ...this.snapshot,
      rangeStart: resolved
    };
    this.emit();
  };

  setEditingCell: Dispatch<SetStateAction<EditingCellState>> = (next) => {
    const resolved = applySetStateAction(this.snapshot.editingCell, next);
    if (isSameEditingCell(this.snapshot.editingCell, resolved)) {
      return;
    }
    this.snapshot = {
      ...this.snapshot,
      editingCell: resolved
    };
    this.emit();
  };

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const CellStoreContext = createContext<CellStore | null>(null);

export function useCellStore(): CellStore {
  const store = useContext(CellStoreContext);
  if (!store) {
    throw new Error("CellStoreContext is missing.");
  }
  return store;
}

function useCellStoreSnapshot<TValue>(
  store: CellStore,
  getSnapshot: (snapshot: CellStoreSnapshot) => TValue
): TValue {
  return useSyncExternalStore(
    store.subscribe,
    () => getSnapshot(store.getSnapshot()),
    () => getSnapshot(store.getServerSnapshot())
  );
}

export function useCellIsSelected(
  store: CellStore,
  rowIndex: number,
  columnIndex: number
): boolean {
  return useCellStoreSnapshot(store, (snapshot) => {
    const activeCell = snapshot.activeCell;
    return activeCell?.rowIndex === rowIndex && activeCell?.columnIndex === columnIndex;
  });
}

export function useCellIsInRange(
  store: CellStore,
  rowIndex: number,
  columnIndex: number
): boolean {
  return useCellStoreSnapshot(store, (snapshot) =>
    isCellInRange(
      { rowIndex, columnIndex },
      snapshot.rangeStart,
      snapshot.activeCell
    )
  );
}

export function useCellIsEditing(
  store: CellStore,
  rowId: RowId,
  columnId: string
): boolean {
  return useCellStoreSnapshot(store, (snapshot) => {
    const editingCell = snapshot.editingCell;
    return editingCell?.rowId === rowId && editingCell?.columnId === columnId;
  });
}
