import {
  forwardRef,
  memo,
  useImperativeHandle,
  useMemo,
  type RefAttributes
} from "react";
import type { Column, Row } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import type {
  DataTableCellValue,
  DataTableColumn,
  DataTableRowModel,
  RowId
} from "../core/types";
import { ACTIONS_COLUMN_ID } from "../engine/managed-columns";
import {
  buildStaticVirtualItems,
  getStaticVirtualTotalHeight
} from "../virtual/static-virtual-items";
import type { UseRowHeightsResult } from "../virtual/row-heights";
import type { ColumnLayoutResult } from "./column-layout";
import { DraftRow } from "./draft-row";
import { MemoRow } from "./memo-row";

export type TableBodyHandle = {
  scrollToIndex: (index: number, align?: "auto" | "start" | "center" | "end") => void;
  measureRow: (node: HTMLTableRowElement | null) => void;
};

export type TableBodyProps<TRow extends DataTableRowModel> = {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  virtualizationEnabled: boolean;
  totalRows: number;
  minHeight: number;
  overscan: number;
  tableRows: ReadonlyArray<Row<TRow>>;
  displayedRows: ReadonlyArray<TRow>;
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
  onSubmitDraftRow: () => void;
  onDiscardDraftRow: () => void;
  collaboratorRowIds: ReadonlySet<RowId>;
  getRowId: (row: TRow) => RowId;
  rowActionMenuRowId: RowId | null;
  getRowRefHandler: (rowId: RowId) => (node: HTMLTableRowElement | null) => void;
  rowHeights: UseRowHeightsResult;
  onStartRowResize: (rowId: RowId, clientY: number) => void;
};

function TableBodyInner<TRow extends DataTableRowModel>({
  scrollContainerRef,
  virtualizationEnabled,
  totalRows,
  minHeight,
  overscan,
  tableRows,
  displayedRows,
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
  onSubmitDraftRow,
  onDiscardDraftRow,
  collaboratorRowIds,
  getRowId,
  rowActionMenuRowId,
  getRowRefHandler,
  rowHeights,
  onStartRowResize
}: TableBodyProps<TRow>, ref: React.ForwardedRef<TableBodyHandle>): JSX.Element {
  const rowVirtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: (index) => {
      if (index >= displayedRows.length) {
        return minHeight;
      }
      const row = displayedRows[index];
      if (!row) {
        return minHeight;
      }
      return rowHeights.getFinalHeight(getRowId(row));
    },
    overscan
  });
  const staticVirtualItems = useMemo(() => {
    if (virtualizationEnabled) {
      return [];
    }

    return buildStaticVirtualItems({
      count: totalRows,
      getSize: (index) => {
        const row = displayedRows[index];
        return row ? rowHeights.getFinalHeight(getRowId(row)) : minHeight;
      }
    });
  }, [displayedRows, getRowId, minHeight, rowHeights, totalRows, virtualizationEnabled]);
  const virtualItems = virtualizationEnabled
    ? rowVirtualizer.getVirtualItems()
    : staticVirtualItems;
  const totalHeight = virtualizationEnabled
    ? rowVirtualizer.getTotalSize()
    : getStaticVirtualTotalHeight(staticVirtualItems);

  useImperativeHandle(ref, () => ({
    scrollToIndex: (index, align = "auto") => {
      rowVirtualizer.scrollToIndex(index, { align });
    },
    measureRow: (node) => {
      if (virtualizationEnabled && node) {
        rowVirtualizer.measureElement(node);
      }
    }
  }), [rowVirtualizer, virtualizationEnabled]);

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
              onSubmitDraftRow={onSubmitDraftRow}
              onDiscardDraftRow={onDiscardDraftRow}
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
        const hasCollaborators = collaboratorRowIds.has(rowId);
        const isRowActionMenuOpen = rowActionMenuRowId === rowId;

        return (
          <MemoRow
            key={rowModel.id}
            rowModel={rowModel}
            rowId={rowId}
            rowIndex={rowIndex}
            top={top}
            hasCollaborators={hasCollaborators}
            isRowActionMenuOpen={isRowActionMenuOpen}
            columnRenderLayout={columnRenderLayout}
            fixedTrackStyle={fixedTrackStyle}
            getRowRefHandler={getRowRefHandler}
            rowHeights={rowHeights}
            rowResizeEnabled={rowResizeEnabled}
            onStartRowResize={onStartRowResize}
          />
        );
      })}
    </tbody>
  );
}

const ForwardedTableBody = forwardRef(TableBodyInner) as <TRow extends DataTableRowModel>(
  props: TableBodyProps<TRow> & RefAttributes<TableBodyHandle>
) => JSX.Element;

export const TableBody = memo(ForwardedTableBody) as typeof ForwardedTableBody;
