import { flexRender, type Column, type Row } from "@tanstack/react-table";
import type { VirtualItem } from "@tanstack/react-virtual";
import { cn } from "../core/cn";
import type {
  DataTableCellValue,
  DataTableColumn,
  DataTableRowModel,
  RowId
} from "../core/types";
import { ACTIONS_COLUMN_ID } from "../engine/managed-columns";
import type { UseRowHeightsResult } from "../virtual/row-heights";
import type { ColumnLayoutResult } from "./column-layout";
import { DraftRow } from "./draft-row";

export type TableBodyProps<TRow extends DataTableRowModel> = {
  tableRows: ReadonlyArray<Row<TRow>>;
  displayedRows: ReadonlyArray<TRow>;
  virtualItems: ReadonlyArray<VirtualItem>;
  totalHeight: number;
  rowAddEnabled: boolean;
  rowResizeEnabled: boolean;
  canCreateRow: boolean;
  draftRowId: string;
  draftRow: Partial<TRow>;
  draftEditingColumnId: string | null;
  visibleLeafColumnsInUiOrder: ReadonlyArray<Column<TRow, DataTableCellValue>>;
  columnById: ReadonlyMap<string, DataTableColumn<TRow>>;
  columnRenderLayout: ColumnLayoutResult;
  visibleDataColumnIndexById: Readonly<Record<string, number>>;
  fixedTrackStyle: (width: number) => React.CSSProperties;
  isDraftValuePresent: (value: DataTableCellValue) => boolean;
  onBeginDraftEdit: (columnId: string) => void;
  onCommitDraftCell: (column: DataTableColumn<TRow>, value: DataTableCellValue) => void;
  onCancelDraftEdit: () => void;
  getRowId: (row: TRow) => RowId;
  rowActionMenuRowId: RowId | null;
  getRowRefHandler: (rowId: RowId) => (node: HTMLTableRowElement | null) => void;
  rowHeights: UseRowHeightsResult;
  onStartRowResize: (rowId: RowId, clientY: number) => void;
};

export function TableBody<TRow extends DataTableRowModel>({
  tableRows,
  displayedRows,
  virtualItems,
  totalHeight,
  rowAddEnabled,
  rowResizeEnabled,
  canCreateRow,
  draftRowId,
  draftRow,
  draftEditingColumnId,
  visibleLeafColumnsInUiOrder,
  columnById,
  columnRenderLayout,
  visibleDataColumnIndexById,
  fixedTrackStyle,
  isDraftValuePresent,
  onBeginDraftEdit,
  onCommitDraftCell,
  onCancelDraftEdit,
  getRowId,
  rowActionMenuRowId,
  getRowRefHandler,
  rowHeights,
  onStartRowResize
}: TableBodyProps<TRow>): JSX.Element {
  return (
    <tbody
      style={{
        display: "grid",
        height: `${totalHeight}px`,
        position: "relative",
        width: `${columnRenderLayout.tableRenderWidth}px`,
        minWidth: `${columnRenderLayout.tableRenderWidth}px`
      }}
    >
      {virtualItems.map((virtualRow) => {
        const rowIndex = virtualRow.index;
        const isDraft = rowIndex >= displayedRows.length;

        if (isDraft) {
          if (!rowAddEnabled || !canCreateRow) {
            return null;
          }

          return (
            <DraftRow
              key={draftRowId}
              rowIndex={rowIndex}
              top={virtualRow.start}
              size={virtualRow.size}
              draftRowId={draftRowId}
              draftRow={draftRow}
              draftEditingColumnId={draftEditingColumnId}
              visibleLeafColumnsInUiOrder={visibleLeafColumnsInUiOrder}
              columnById={columnById}
              columnRenderLayout={columnRenderLayout}
              visibleDataColumnIndexById={visibleDataColumnIndexById}
              fixedTrackStyle={fixedTrackStyle}
              isDraftValuePresent={isDraftValuePresent}
              onBeginDraftEdit={onBeginDraftEdit}
              onCommitDraftCell={onCommitDraftCell}
              onCancelDraftEdit={onCancelDraftEdit}
              actionsColumnId={ACTIONS_COLUMN_ID}
            />
          );
        }

        const rowModel = tableRows[rowIndex];
        const row = displayedRows[rowIndex];
        if (!rowModel || !row) {
          return null;
        }

        const rowId = getRowId(row);
        const top = virtualRow.start;
        const isRowActionMenuOpen = rowActionMenuRowId === rowId;

        return (
          <tr
            key={rowModel.id}
            ref={getRowRefHandler(rowId)}
            className={cn(
              "group absolute left-0 overflow-visible bg-[var(--dt-row-bg)] transition-colors hover:bg-[var(--dt-row-hover-bg)]",
              isRowActionMenuOpen ? "z-50" : "z-0"
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
              const isOpenActionMenuCell = isActionCell && rowActionMenuRowId === rowId;

              return (
                <td
                  key={cell.id}
                  data-pinned-state={pinned || "center"}
                  className={cn(
                    "border-r border-b border-[var(--dt-border-color)] p-0 align-top",
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
      })}
    </tbody>
  );
}
