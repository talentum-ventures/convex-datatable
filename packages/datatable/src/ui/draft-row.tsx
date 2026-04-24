import { Check, Pencil, X } from "lucide-react";
import type { Column } from "@tanstack/react-table";
import { useRef, type CSSProperties } from "react";
import { cn } from "../core/cn";
import type {
  DataTableCellValue,
  DataTableColumn,
  DataTableRowModel
} from "../core/types";
import { renderColumnContent, renderColumnEditor } from "../engine/column-def-builder";
import type { ColumnLayoutResult } from "./column-layout";
import { Button } from "./primitives";

function draftRowPinnedCellLayout<TRow extends DataTableRowModel>(
  column: Column<TRow, DataTableCellValue>,
  columnRenderLayout: ColumnLayoutResult,
  renderWidth: number,
  fixedTrackStyle: (width: number) => CSSProperties
): {
  dataPinnedState: string;
  combinedStyle: CSSProperties;
  isFirstRightPinned: boolean;
  pinnedSurfaceClass: string;
} {
  const pinned = column.getIsPinned();
  const leftOffset = columnRenderLayout.leftPinnedOffsetById[column.id];
  const rightOffset = columnRenderLayout.rightPinnedOffsetById[column.id];
  const isFirstRightPinned = columnRenderLayout.firstRightPinnedColumnId === column.id;
  return {
    dataPinnedState: pinned || "center",
    combinedStyle: {
      ...fixedTrackStyle(renderWidth),
      left: pinned === "left" ? `${leftOffset ?? 0}px` : undefined,
      right: pinned === "right" ? `${rightOffset ?? 0}px` : undefined
    },
    isFirstRightPinned,
    pinnedSurfaceClass: pinned
      ? "sticky z-10 shadow-[var(--dt-pinned-shadow)] [background:var(--dt-pinned-row-bg)] group-hover:[background:var(--dt-pinned-row-hover-bg)]"
      : "bg-slate-50"
  };
}

export type DraftRowProps<TRow extends DataTableRowModel> = {
  rowIndex: number;
  top: number;
  size: number;
  sticky?: boolean;
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
  onCommitDraftCellAndAdvance: (column: DataTableColumn<TRow>, value: DataTableCellValue) => void;
  onCancelDraftEdit: () => void;
  onSubmitDraftRow: () => void;
  onDiscardDraftRow: () => void;
  actionsColumnId: string;
};

export function DraftRow<TRow extends DataTableRowModel>({
  rowIndex,
  top,
  size,
  sticky,
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
  onCommitDraftCellAndAdvance,
  onCancelDraftEdit,
  onSubmitDraftRow,
  onDiscardDraftRow,
  actionsColumnId
}: DraftRowProps<TRow>): JSX.Element {
  const shouldAdvanceDraftCellRef = useRef(false);
  const draftCandidateRow = draftRow as TRow;
  const hasDraftValues = Object.values(draftRow).some((value) => isDraftValuePresent(value));
  const hasActionsColumn = visibleLeafColumnsInUiOrder.some((column) => column.id === actionsColumnId);
  const fallbackControlsColumnId =
    hasActionsColumn ? null : visibleLeafColumnsInUiOrder.at(-1)?.id ?? null;

  const actionButtons = (
    <div className="flex items-center justify-center gap-1 px-1 py-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 px-0 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
        aria-label="Discard draft row"
        disabled={!hasDraftValues}
        onClick={(event) => {
          event.stopPropagation();
          onDiscardDraftRow();
        }}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="sm"
        className="h-7 w-7 px-0"
        aria-label="Create row"
        disabled={!hasDraftValues}
        onClick={(event) => {
          event.stopPropagation();
          onSubmitDraftRow();
        }}
      >
        <Check className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  return (
    <tr
      key={draftRowId}
      className={cn(
        "group overflow-visible bg-slate-50",
        sticky ? "" : "absolute left-0"
      )}
      style={{
        display: "flex",
        ...(sticky ? {} : { top: `${top}px` }),
        minHeight: `${size}px`,
        width: `${columnRenderLayout.tableRenderWidth}px`
      }}
      data-row-id={draftRowId}
      data-index={rowIndex}
    >
      {visibleLeafColumnsInUiOrder.map((column) => {
        if (column.id === actionsColumnId) {
          const renderWidth = columnRenderLayout.renderWidthsById[column.id] ?? column.getSize();
          const { dataPinnedState, combinedStyle, isFirstRightPinned, pinnedSurfaceClass } =
            draftRowPinnedCellLayout(column, columnRenderLayout, renderWidth, fixedTrackStyle);

          return (
            <td
              key={`draft-${column.id}`}
              data-pinned-state={dataPinnedState}
              style={combinedStyle}
              className={cn(
                "border-b border-l border-r border-slate-200 p-0 align-top",
                isFirstRightPinned ? "border-l border-l-slate-200" : "",
                "relative overflow-visible border-l border-l-slate-200",
                pinnedSurfaceClass
              )}
            >
              {actionButtons}
            </td>
          );
        }

        const columnConfig = columnById.get(column.id);
        const renderWidth = columnRenderLayout.renderWidthsById[column.id] ?? column.getSize();

        if (!columnConfig) {
          const { dataPinnedState, combinedStyle, isFirstRightPinned, pinnedSurfaceClass } =
            draftRowPinnedCellLayout(column, columnRenderLayout, renderWidth, fixedTrackStyle);

          return (
            <td
              key={`draft-${column.id}`}
              data-pinned-state={dataPinnedState}
              style={combinedStyle}
              className={cn(
                "border-r border-b border-slate-200",
                isFirstRightPinned ? "border-l border-l-slate-200" : "",
                pinnedSurfaceClass
              )}
            />
          );
        }

        const value = draftRow[columnConfig.field];
        const isEditingDraftCell = draftEditingColumnId === columnConfig.id;
        const draftColumnIndex = visibleDataColumnIndexById[columnConfig.id] ?? 0;
        const showPlaceholder = !isDraftValuePresent(value);
        const showInlineActionButtons = column.id === fallbackControlsColumnId;
        const content = isEditingDraftCell
          ? renderColumnEditor({
              column: columnConfig,
              row: draftCandidateRow,
              rowId: draftRowId,
              value,
              onCommit: (nextValue) => {
                const shouldAdvance = shouldAdvanceDraftCellRef.current;
                shouldAdvanceDraftCellRef.current = false;
                if (shouldAdvance) {
                  onCommitDraftCellAndAdvance(columnConfig, nextValue);
                  return;
                }

                onCommitDraftCell(columnConfig, nextValue);
              },
              onCancel: onCancelDraftEdit
            })
          : showPlaceholder
            ? (
                <span className="text-sm leading-5 text-slate-400">{`Add ${columnConfig.header}`}</span>
              )
            : renderColumnContent({
                column: columnConfig,
                row: draftCandidateRow,
                rowId: draftRowId,
                value,
                isEditing: false
              });
        const indicator = isEditingDraftCell
          ? (
              <span className="pointer-events-none absolute right-1 top-1 rounded bg-emerald-100 p-0.5 text-emerald-700">
                <Check className="h-3 w-3" />
              </span>
            )
          : showInlineActionButtons
            ? null
            : (
                <span className="pointer-events-none absolute right-1 top-1 hidden rounded bg-white/80 p-0.5 text-slate-500 group-hover:block">
                  <Pencil className="h-3 w-3" />
                </span>
              );

        const { dataPinnedState, combinedStyle, isFirstRightPinned, pinnedSurfaceClass } =
          draftRowPinnedCellLayout(column, columnRenderLayout, renderWidth, fixedTrackStyle);

        return (
          <td
            key={`draft-${column.id}`}
            data-pinned-state={dataPinnedState}
            style={combinedStyle}
            className={cn(
              "border-r border-b border-slate-200 p-0 align-top",
              isFirstRightPinned ? "border-l border-l-slate-200" : "",
              pinnedSurfaceClass,
              isEditingDraftCell && "!z-30"
            )}
          >
            <div
              role="gridcell"
              data-row-id={draftRowId}
              data-row-index={rowIndex}
              data-column-id={columnConfig.id}
              data-column-index={draftColumnIndex}
              className={cn(
                "group relative box-border h-full min-h-10 w-full min-w-0 px-2 py-1 text-sm text-slate-800",
                isEditingDraftCell ? "z-20 overflow-visible bg-white" : "overflow-hidden",
                isEditingDraftCell ? "outline outline-2 outline-[var(--dt-active-cell-ring)] outline-offset-[-2px]" : ""
              )}
              onClick={() => {
                onBeginDraftEdit(columnConfig.id);
              }}
              onDoubleClick={() => {
                onBeginDraftEdit(columnConfig.id);
              }}
              onKeyDownCapture={(event) => {
                if (!isEditingDraftCell) {
                  return;
                }

                const isCommitEnter =
                  event.key === "Enter" && (columnConfig.kind !== "longText" || !event.shiftKey);
                shouldAdvanceDraftCellRef.current = event.key === "Tab" || isCommitEnter;
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === "F2") {
                  event.preventDefault();
                  onBeginDraftEdit(columnConfig.id);
                }
              }}
              tabIndex={0}
            >
              <div
                className={cn(
                  "flex h-full min-w-0 items-center gap-2",
                  showInlineActionButtons ? "justify-between" : ""
                )}
              >
                <div className="flex min-w-0 flex-1 items-center">{content}</div>
                  {showInlineActionButtons ? actionButtons : null}
              </div>
              {indicator}
            </div>
          </td>
        );
      })}
    </tr>
  );
}
