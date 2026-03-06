import { useCallback, useMemo, useState } from "react";
import { DEFAULT_MIN_ROW_HEIGHT } from "../core/defaults";
import type { RowId } from "../core/types";

export type UseRowHeightsArgs = {
  minRowHeight: number | undefined;
};

export type UseRowHeightsResult = {
  rowHeights: Readonly<Record<RowId, number>>;
  contentHeights: Readonly<Record<RowId, number>>;
  setManualRowHeight: (rowId: RowId, height: number) => void;
  setContentHeight: (rowId: RowId, height: number) => void;
  getFinalHeight: (rowId: RowId) => number;
};

export function useRowHeights({ minRowHeight }: UseRowHeightsArgs): UseRowHeightsResult {
  const baseHeight = minRowHeight ?? DEFAULT_MIN_ROW_HEIGHT;

  const [manualHeights, setManualHeights] = useState<Record<RowId, number>>({});
  const [contentHeights, setContentHeights] = useState<Record<RowId, number>>({});

  const setManualRowHeight = useCallback((rowId: RowId, height: number) => {
    const nextHeight = Math.max(Math.round(height), baseHeight);
    setManualHeights((current) => {
      if (current[rowId] === nextHeight) {
        return current;
      }
      return {
        ...current,
        [rowId]: nextHeight
      };
    });
  }, [baseHeight]);

  const setContentHeight = useCallback((rowId: RowId, height: number) => {
    const nextHeight = Math.max(Math.round(height), baseHeight);
    setContentHeights((current) => {
      if (current[rowId] === nextHeight) {
        return current;
      }
      return {
        ...current,
        [rowId]: nextHeight
      };
    });
  }, [baseHeight]);

  const getFinalHeight = useCallback(
    (rowId: RowId) => {
      const manual = manualHeights[rowId] ?? baseHeight;
      const content = contentHeights[rowId] ?? baseHeight;
      return Math.max(baseHeight, content, manual);
    },
    [baseHeight, contentHeights, manualHeights]
  );

  return useMemo(
    () => ({
      rowHeights: manualHeights,
      contentHeights,
      setManualRowHeight,
      setContentHeight,
      getFinalHeight
    }),
    [contentHeights, getFinalHeight, manualHeights, setContentHeight, setManualRowHeight]
  );
}
