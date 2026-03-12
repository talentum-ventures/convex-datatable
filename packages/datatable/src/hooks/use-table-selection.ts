import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { CellStore } from "../core/cell-store";
import type { CellCoord } from "../core/types";

export function cellRange(
  start: CellCoord | null,
  end: CellCoord | null
): { start: CellCoord; end: CellCoord } | null {
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

export type UseTableSelectionArgs = {
  cellStore: CellStore;
};

export type UseTableSelectionResult = {
  activeCell: CellCoord | null;
  rangeStart: CellCoord | null;
  setActiveCell: Dispatch<SetStateAction<CellCoord | null>>;
  setRangeStart: Dispatch<SetStateAction<CellCoord | null>>;
  onCellSelect: (coord: CellCoord) => void;
  onRangeSelect: (coord: CellCoord) => void;
};

export function useTableSelection({
  cellStore
}: UseTableSelectionArgs): UseTableSelectionResult {
  const activeCell = cellStore.getActiveCell();
  const rangeStart = cellStore.getRangeStart();
  const setActiveCell = cellStore.setActiveCell;
  const setRangeStart = cellStore.setRangeStart;

  const onCellSelect = useCallback((coord: CellCoord) => {
    setActiveCell(coord);
    setRangeStart(coord);
  }, [setActiveCell, setRangeStart]);

  const onRangeSelect = useCallback((coord: CellCoord) => {
    setActiveCell(coord);
    setRangeStart((current) => current ?? coord);
  }, [setActiveCell, setRangeStart]);

  return {
    activeCell,
    rangeStart,
    setActiveCell,
    setRangeStart,
    onCellSelect,
    onRangeSelect
  };
}
