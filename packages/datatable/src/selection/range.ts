import type { CellCoord, CellRange } from "../core/types";

export function normalizeRange(range: CellRange): CellRange {
  return {
    start: {
      rowIndex: Math.min(range.start.rowIndex, range.end.rowIndex),
      columnIndex: Math.min(range.start.columnIndex, range.end.columnIndex)
    },
    end: {
      rowIndex: Math.max(range.start.rowIndex, range.end.rowIndex),
      columnIndex: Math.max(range.start.columnIndex, range.end.columnIndex)
    }
  };
}

export function isCellInRange(cell: CellCoord, range: CellRange): boolean {
  const normalized = normalizeRange(range);
  return (
    cell.rowIndex >= normalized.start.rowIndex &&
    cell.rowIndex <= normalized.end.rowIndex &&
    cell.columnIndex >= normalized.start.columnIndex &&
    cell.columnIndex <= normalized.end.columnIndex
  );
}

export function forEachCellInRange(
  range: CellRange,
  callback: (coord: CellCoord) => void
): void {
  const normalized = normalizeRange(range);

  for (let rowIndex = normalized.start.rowIndex; rowIndex <= normalized.end.rowIndex; rowIndex += 1) {
    for (
      let columnIndex = normalized.start.columnIndex;
      columnIndex <= normalized.end.columnIndex;
      columnIndex += 1
    ) {
      callback({ rowIndex, columnIndex });
    }
  }
}

export function selectionDimensions(range: CellRange): {
  rows: number;
  columns: number;
} {
  const normalized = normalizeRange(range);
  return {
    rows: normalized.end.rowIndex - normalized.start.rowIndex + 1,
    columns: normalized.end.columnIndex - normalized.start.columnIndex + 1
  };
}
