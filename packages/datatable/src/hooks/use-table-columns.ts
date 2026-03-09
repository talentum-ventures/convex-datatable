import {
  flushSync
} from "react-dom";
import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type DragEvent,
  type RefObject,
  type SetStateAction
} from "react";
import type { ColumnPinningState, ColumnSizingState, SortingState } from "@tanstack/react-table";
import {
  ACTIONS_COLUMN_ID,
  SELECT_COLUMN_ID,
  reorderDataColumnsByPinZone
} from "../engine/managed-columns";

export type DropPlacement = "before" | "after";
export type ColumnMenuAnchor = "left" | "right";

const COLUMN_MENU_WIDTH_PX = 288;
const COLUMN_MENU_GUTTER_PX = 8;

type PinZone = "left" | "center" | "right";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function pinZoneForColumnId(columnId: string, pinning: ColumnPinningState): PinZone {
  if (columnId === SELECT_COLUMN_ID) {
    return "left";
  }
  if (columnId === ACTIONS_COLUMN_ID) {
    return "right";
  }
  if ((pinning.left ?? []).includes(columnId)) {
    return "left";
  }
  if ((pinning.right ?? []).includes(columnId)) {
    return "right";
  }
  return "center";
}

export type UseTableColumnsArgs = {
  tableContainerRef: RefObject<HTMLDivElement | null>;
  columnPinning: ColumnPinningState;
  normalizedColumnOrder: string[];
  normalizedColumnPinning: ColumnPinningState;
  setColumnOrder: Dispatch<SetStateAction<string[]>>;
  setColumnPinning: Dispatch<SetStateAction<ColumnPinningState>>;
  setColumnSizing: Dispatch<SetStateAction<ColumnSizingState>>;
  setSorting: Dispatch<SetStateAction<SortingState>>;
};

export type UseTableColumnsResult = {
  columnMenuId: string | null;
  setColumnMenuId: Dispatch<SetStateAction<string | null>>;
  columnMenuAnchorById: Readonly<Record<string, ColumnMenuAnchor>>;
  draggingColumnId: string | null;
  dragOverTarget: { columnId: string; placement: DropPlacement } | null;
  resolveColumnMenuAnchor: (trigger: HTMLElement) => ColumnMenuAnchor;
  toggleColumnMenu: (columnId: string, trigger: HTMLElement) => void;
  updatePinnedColumn: (columnId: string, side: "left" | "right" | "none") => void;
  setColumnSortDirection: (columnId: string, direction: "asc" | "desc") => void;
  onHeaderDragStart: (event: DragEvent<HTMLElement>, columnId: string) => void;
  onHeaderDragOver: (event: DragEvent<HTMLTableCellElement>, targetColumnId: string) => void;
  onHeaderDrop: (event: DragEvent<HTMLTableCellElement>, targetColumnId: string) => void;
  onHeaderDragEnd: () => void;
  beginColumnResize: (args: {
    ownerDocument: Document;
    columnId: string;
    startWidth: number;
    startX: number;
    minWidth: number;
    maxWidth: number | null;
  }) => void;
};

export function useTableColumns({
  tableContainerRef,
  columnPinning,
  normalizedColumnOrder,
  normalizedColumnPinning,
  setColumnOrder,
  setColumnPinning,
  setColumnSizing,
  setSorting
}: UseTableColumnsArgs): UseTableColumnsResult {
  const [columnMenuId, setColumnMenuId] = useState<string | null>(null);
  const [columnMenuAnchorById, setColumnMenuAnchorById] = useState<
    Readonly<Record<string, ColumnMenuAnchor>>
  >({});
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{
    columnId: string;
    placement: DropPlacement;
  } | null>(null);

  useEffect(() => {
    if (!columnMenuId) {
      return;
    }

    const onPointerDown = (event: MouseEvent): void => {
      if (!(event.target instanceof Element)) {
        setColumnMenuId(null);
        return;
      }

      if (event.target.closest("[data-dt-column-menu-root='true']")) {
        return;
      }
      setColumnMenuId(null);
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setColumnMenuId(null);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [columnMenuId]);

  const resolveColumnMenuAnchor = useCallback((trigger: HTMLElement): ColumnMenuAnchor => {
    const triggerRect = trigger.getBoundingClientRect();
    const containerRect = tableContainerRef.current?.getBoundingClientRect();
    const minLeft = (containerRect?.left ?? 0) + COLUMN_MENU_GUTTER_PX;
    const projectedLeft = triggerRect.right - COLUMN_MENU_WIDTH_PX;
    return projectedLeft < minLeft ? "left" : "right";
  }, [tableContainerRef]);

  const toggleColumnMenu = useCallback((columnId: string, trigger: HTMLElement) => {
    setColumnMenuId((current) => {
      const nextOpen = current === columnId ? null : columnId;
      if (nextOpen) {
        const nextAnchor = resolveColumnMenuAnchor(trigger);
        setColumnMenuAnchorById((anchorState) => ({
          ...anchorState,
          [columnId]: nextAnchor
        }));
      }
      return nextOpen;
    });
  }, [resolveColumnMenuAnchor]);

  const updatePinnedColumn = useCallback((columnId: string, side: "left" | "right" | "none") => {
    setColumnPinning((current) => {
      const left = (current.left ?? []).filter((id) => id !== columnId);
      const right = (current.right ?? []).filter((id) => id !== columnId);

      if (side === "left") {
        left.push(columnId);
      }
      if (side === "right") {
        right.push(columnId);
      }

      return {
        left,
        right
      };
    });
  }, [setColumnPinning]);

  const setColumnSortDirection = useCallback((columnId: string, direction: "asc" | "desc") => {
    setSorting((current) => {
      const activeSort = current[0];
      if (activeSort?.id === columnId && activeSort.desc === (direction === "desc")) {
        return [];
      }

      return [{ id: columnId, desc: direction === "desc" }];
    });
    setColumnMenuId(null);
  }, [setSorting]);

  const moveColumnByDrop = useCallback((sourceColumnId: string, targetColumnId: string, placement: DropPlacement) => {
    const next = reorderDataColumnsByPinZone({
      columnOrder: normalizedColumnOrder,
      columnPinning: normalizedColumnPinning,
      sourceColumnId,
      targetColumnId,
      placement
    });

    if (!next.changed) {
      return;
    }

    setColumnOrder(next.columnOrder);
    setColumnPinning(next.columnPinning);
  }, [normalizedColumnOrder, normalizedColumnPinning, setColumnOrder, setColumnPinning]);

  const onHeaderDragStart = useCallback((event: DragEvent<HTMLElement>, columnId: string): void => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", columnId);
    const dragPreview = event.currentTarget.closest("th");
    if (dragPreview) {
      const previewRect = dragPreview.getBoundingClientRect();
      const offsetX = Math.max(0, event.clientX - previewRect.left);
      const offsetY = Math.max(0, event.clientY - previewRect.top);
      event.dataTransfer.setDragImage(dragPreview, offsetX, offsetY);
    }
    setColumnMenuId(null);
    setDraggingColumnId(columnId);
    setDragOverTarget(null);
  }, []);

  const onHeaderDragOver = useCallback((event: DragEvent<HTMLTableCellElement>, targetColumnId: string): void => {
    if (!draggingColumnId || draggingColumnId === targetColumnId) {
      return;
    }

    const sourceZone = pinZoneForColumnId(draggingColumnId, columnPinning);
    const targetZone = pinZoneForColumnId(targetColumnId, columnPinning);
    if (sourceZone !== targetZone) {
      return;
    }

    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const placement: DropPlacement = event.clientX < rect.left + rect.width / 2 ? "before" : "after";
    setDragOverTarget({
      columnId: targetColumnId,
      placement
    });
  }, [columnPinning, draggingColumnId]);

  const onHeaderDrop = useCallback((event: DragEvent<HTMLTableCellElement>, targetColumnId: string): void => {
    if (!draggingColumnId) {
      return;
    }

    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const placement: DropPlacement = event.clientX < rect.left + rect.width / 2 ? "before" : "after";
    moveColumnByDrop(draggingColumnId, targetColumnId, placement);
    setDraggingColumnId(null);
    setDragOverTarget(null);
  }, [draggingColumnId, moveColumnByDrop]);

  const onHeaderDragEnd = useCallback((): void => {
    setDraggingColumnId(null);
    setDragOverTarget(null);
  }, []);

  const beginColumnResize = useCallback((args: {
    ownerDocument: Document;
    columnId: string;
    startWidth: number;
    startX: number;
    minWidth: number;
    maxWidth: number | null;
  }): void => {
    const maxWidth = args.maxWidth ?? Number.MAX_SAFE_INTEGER;

    const applyNextWidth = (clientX: number): void => {
      const delta = clientX - args.startX;
      const nextWidth = clamp(args.startWidth + delta, args.minWidth, maxWidth);
      const normalizedWidth = `${Math.round(nextWidth)}px`;

      for (const headerCell of args.ownerDocument.querySelectorAll<HTMLElement>(
        `th[data-column-id='${args.columnId}']`
      )) {
        headerCell.style.boxSizing = "border-box";
        headerCell.style.width = normalizedWidth;
        headerCell.style.minWidth = normalizedWidth;
        headerCell.style.maxWidth = normalizedWidth;
        headerCell.style.flex = `0 0 ${normalizedWidth}`;
      }

      for (const gridCell of args.ownerDocument.querySelectorAll<HTMLElement>(
        `[role='gridcell'][data-column-id='${args.columnId}']`
      )) {
        const bodyCell = gridCell.closest("td");
        if (!(bodyCell instanceof HTMLElement)) {
          continue;
        }

        bodyCell.style.boxSizing = "border-box";
        bodyCell.style.width = normalizedWidth;
        bodyCell.style.minWidth = normalizedWidth;
        bodyCell.style.maxWidth = normalizedWidth;
        bodyCell.style.flex = `0 0 ${normalizedWidth}`;
      }

      flushSync(() => {
        setColumnSizing((current) => {
          const roundedWidth = Math.round(nextWidth);
          if (current[args.columnId] === roundedWidth) {
            return current;
          }

          return {
            ...current,
            [args.columnId]: roundedWidth
          };
        });
      });
    };

    const cleanup = (): void => {
      args.ownerDocument.removeEventListener("mousemove", onMouseMove);
      args.ownerDocument.removeEventListener("mouseup", onMouseUp);
      args.ownerDocument.removeEventListener("touchmove", onTouchMove);
      args.ownerDocument.removeEventListener("touchend", onTouchEnd);
    };

    const onMouseMove = (event: MouseEvent): void => {
      applyNextWidth(event.clientX);
    };

    const onMouseUp = (): void => {
      cleanup();
    };

    const onTouchMove = (event: TouchEvent): void => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      applyNextWidth(touch.clientX);
    };

    const onTouchEnd = (): void => {
      cleanup();
    };

    args.ownerDocument.addEventListener("mousemove", onMouseMove);
    args.ownerDocument.addEventListener("mouseup", onMouseUp);
    args.ownerDocument.addEventListener("touchmove", onTouchMove, { passive: true });
    args.ownerDocument.addEventListener("touchend", onTouchEnd);
    applyNextWidth(args.startX + 1);
  }, [setColumnSizing]);

  return {
    columnMenuId,
    setColumnMenuId,
    columnMenuAnchorById,
    draggingColumnId,
    dragOverTarget,
    resolveColumnMenuAnchor,
    toggleColumnMenu,
    updatePinnedColumn,
    setColumnSortDirection,
    onHeaderDragStart,
    onHeaderDragOver,
    onHeaderDrop,
    onHeaderDragEnd,
    beginColumnResize
  };
}
