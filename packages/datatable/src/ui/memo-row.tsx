import { memo } from "react";
import { flexRender, type Row } from "@tanstack/react-table";
import { cn } from "../core/cn";
import type {
  DataTableRowModel,
  RowId
} from "../core/types";
import { ACTIONS_COLUMN_ID } from "../engine/managed-columns";
import type { UseRowHeightsResult } from "../virtual/row-heights";
import type { ColumnLayoutResult } from "./column-layout";

export type MemoRowProps<TRow extends DataTableRowModel> = {
  rowModel: Row<TRow>;
  rowId: RowId;
  rowIndex: number;
  top: number;
  hasCollaborators: boolean;
  isRowActionMenuOpen: boolean;
  columnRenderLayout: ColumnLayoutResult;
  fixedTrackStyle: (width: number) => React.CSSProperties;
  getRowRefHandler: (rowId: RowId) => (node: HTMLTableRowElement | null) => void;
  rowHeights: UseRowHeightsResult;
  rowResizeEnabled: boolean;
  onStartRowResize: (rowId: RowId, clientY: number) => void;
};

const MemoRowInner = <TRow extends DataTableRowModel>({
  rowModel,
  rowId,
  rowIndex,
  top,
  hasCollaborators,
  isRowActionMenuOpen,
  columnRenderLayout,
  fixedTrackStyle,
  getRowRefHandler,
  rowHeights,
  rowResizeEnabled,
  onStartRowResize
}: MemoRowProps<TRow>): JSX.Element => (
  <tr
    ref={getRowRefHandler(rowId)}
    className={cn(
      "group absolute left-0 overflow-visible bg-[var(--dt-row-bg)] transition-colors hover:bg-[var(--dt-row-hover-bg)]",
      isRowActionMenuOpen ? "z-50" : hasCollaborators ? "z-20" : "z-0"
    )}
    style={{
      display: "flex",
      transform: `translateY(${top}px)`,
      minHeight: `${rowHeights.getFinalHeight(rowId)}px`,
      width: `${columnRenderLayout.tableRenderWidth}px`
    }}
    data-row-id={rowId}
    data-index={rowIndex}
  >
    {rowModel.getVisibleCells().map((cell) => {
      const pinned = cell.column.getIsPinned();
      const renderWidth = columnRenderLayout.renderWidthsById[cell.column.id] ?? cell.column.getSize();
      const leftOffset = columnRenderLayout.leftPinnedOffsetById[cell.column.id];
      const rightOffset = columnRenderLayout.rightPinnedOffsetById[cell.column.id];
      const isActionCell = cell.column.id === ACTIONS_COLUMN_ID;
      const isOpenActionMenuCell = isActionCell && isRowActionMenuOpen;
      const isFirstRightPinned = columnRenderLayout.firstRightPinnedColumnId === cell.column.id;

      return (
        <td
          key={cell.id}
          data-pinned-state={pinned || "center"}
          className={cn(
            "border-r border-b border-[var(--dt-border-color)] p-0 align-top",
            isFirstRightPinned ? "border-l border-l-[var(--dt-border-color)]" : "",
            isActionCell ? "relative overflow-visible border-l border-l-[var(--dt-border-color)]" : "",
            isOpenActionMenuCell ? "z-40" : "",
            pinned
              ? isOpenActionMenuCell
                ? "sticky z-40 shadow-[var(--dt-pinned-shadow)] [background:var(--dt-pinned-row-bg)] group-hover:[background:var(--dt-pinned-row-hover-bg)]"
                : "sticky z-10 shadow-[var(--dt-pinned-shadow)] [background:var(--dt-pinned-row-bg)] group-hover:[background:var(--dt-pinned-row-hover-bg)]"
              : ""
          )}
          style={{
            ...fixedTrackStyle(renderWidth),
            left: pinned === "left" ? `${leftOffset ?? 0}px` : undefined,
            right: pinned === "right" ? `${rightOffset ?? 0}px` : undefined
          }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      );
    })}

    {rowResizeEnabled ? (
      <button
        type="button"
        className="absolute bottom-0 left-0 z-10 h-1 w-full cursor-row-resize bg-transparent hover:bg-sky-200"
        aria-label={`Resize row ${rowId}`}
        onPointerDown={(event) => {
          event.preventDefault();
          onStartRowResize(rowId, event.clientY);
        }}
      />
    ) : null}
  </tr>
);

export const MemoRow = memo(MemoRowInner) as typeof MemoRowInner;
