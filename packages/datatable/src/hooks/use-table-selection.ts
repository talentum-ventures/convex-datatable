import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import type { CellCoord } from "../core/types";
import { pushDebugEventThrottled } from "../debug";

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
  isDebugMode: boolean;
  debugScope: string;
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
  isDebugMode,
  debugScope
}: UseTableSelectionArgs): UseTableSelectionResult {
  const [activeCell, setActiveCell] = useState<CellCoord | null>(null);
  const [rangeStart, setRangeStart] = useState<CellCoord | null>(null);

  const onCellSelect = useCallback((coord: CellCoord) => {
    if (isDebugMode) {
      pushDebugEventThrottled(debugScope, "cell-select", 120, "cell selected", {
        row: coord.rowIndex,
        column: coord.columnIndex
      });
    }
    setActiveCell(coord);
    setRangeStart(coord);
  }, [debugScope, isDebugMode]);

  const onRangeSelect = useCallback((coord: CellCoord) => {
    if (isDebugMode) {
      pushDebugEventThrottled(debugScope, "range-select", 120, "range anchor updated", {
        row: coord.rowIndex,
        column: coord.columnIndex
      });
    }
    setActiveCell(coord);
    setRangeStart((current) => current ?? coord);
  }, [debugScope, isDebugMode]);

  return {
    activeCell,
    rangeStart,
    setActiveCell,
    setRangeStart,
    onCellSelect,
    onRangeSelect
  };
}
