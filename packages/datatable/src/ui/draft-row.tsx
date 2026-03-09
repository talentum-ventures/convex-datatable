import { Check, Pencil } from "lucide-react";
import type { Column } from "@tanstack/react-table";
import { cn } from "../core/cn";
import type {
  DataTableCellValue,
  DataTableColumn,
  DataTableRowModel
} from "../core/types";
import { renderColumnContent, renderColumnEditor } from "../engine/column-def-builder";
import type { ColumnLayoutResult } from "./column-layout";

export type DraftRowProps<TRow extends DataTableRowModel> = {
  rowIndex: number;
  top: number;
  size: number;
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
  actionsColumnId: string;
};

export function DraftRow<TRow extends DataTableRowModel>({
  rowIndex,
  top,
  size,
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
  actionsColumnId
}: DraftRowProps<TRow>): JSX.Element {
  const draftCandidateRow = draftRow as TRow;

  return (
    <tr
      key={draftRowId}
      className="absolute left-0 bg-slate-50"
      style={{
        display: "flex",
        transform: `translateY(${top}px)`,
        height: `${size}px`,
        width: `${columnRenderLayout.tableRenderWidth}px`
      }}
      data-row-id={draftRowId}
      data-index={rowIndex}
    >
      {visibleLeafColumnsInUiOrder.map((column) => {
        const columnConfig = columnById.get(column.id);
        const renderWidth = columnRenderLayout.renderWidthsById[column.id] ?? column.getSize();
        const widthStyle = fixedTrackStyle(renderWidth);

        if (!columnConfig) {
          return (
            <td
              key={`draft-${column.id}`}
              style={widthStyle}
              className={cn(
                "border-r border-b border-slate-200 bg-slate-50",
                column.id === actionsColumnId ? "border-l border-l-slate-200" : ""
              )}
            />
          );
        }

        const value = draftRow[columnConfig.field];
        const isEditingDraftCell = draftEditingColumnId === columnConfig.id;
        const draftColumnIndex = visibleDataColumnIndexById[columnConfig.id] ?? 0;
        const showPlaceholder = !isDraftValuePresent(value);
        const content = isEditingDraftCell
          ? renderColumnEditor({
              column: columnConfig,
              row: draftCandidateRow,
              rowId: draftRowId,
              value,
              onCommit: (nextValue) => {
                onCommitDraftCell(columnConfig, nextValue);
              },
              onCancel: onCancelDraftEdit
            })
          : showPlaceholder
            ? <span className="text-sm text-slate-400">{`Add ${columnConfig.header}`}</span>
            : renderColumnContent({
                column: columnConfig,
                row: draftCandidateRow,
                rowId: draftRowId,
                value,
                isEditing: false
              });

        return (
          <td
            key={`draft-${column.id}`}
            style={widthStyle}
            className="border-r border-b border-slate-200 bg-slate-50 p-0 align-top"
          >
            <div
              role="gridcell"
              data-row-id={draftRowId}
              data-row-index={rowIndex}
              data-column-id={columnConfig.id}
              data-column-index={draftColumnIndex}
              className={cn(
                "group relative box-border h-full min-h-10 w-full min-w-0 px-2 py-1 text-sm text-slate-800",
                isEditingDraftCell &&
                  (columnConfig.kind === "select" ||
                    columnConfig.kind === "multiselect" ||
                    columnConfig.kind === "date")
                  ? "z-20 overflow-visible bg-white"
                  : "overflow-hidden",
                isEditingDraftCell ? "outline outline-2 outline-[var(--dt-active-cell-ring)] outline-offset-[-2px]" : ""
              )}
              onClick={() => {
                onBeginDraftEdit(columnConfig.id);
              }}
              onDoubleClick={() => {
                onBeginDraftEdit(columnConfig.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === "F2") {
                  event.preventDefault();
                  onBeginDraftEdit(columnConfig.id);
                }
              }}
              tabIndex={0}
            >
              {content}
              {!isEditingDraftCell ? (
                <span className="pointer-events-none absolute right-1 top-1 hidden rounded bg-white/80 p-0.5 text-slate-500 group-hover:block">
                  <Pencil className="h-3 w-3" />
                </span>
              ) : (
                <span className="pointer-events-none absolute right-1 top-1 rounded bg-emerald-100 p-0.5 text-emerald-700">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </div>
          </td>
        );
      })}
    </tr>
  );
}
