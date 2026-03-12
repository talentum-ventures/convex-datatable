import { memo, type CSSProperties } from "react";
import { cn } from "../core/cn";
import {
  useCellIsEditing,
  useCellIsInRange,
  useCellIsSelected,
  useCellStore
} from "../core/cell-store";
import {
  useCollaboratorStore,
  useCollaboratorsForCell
} from "../core/collaborator-store";
import type {
  CellCoord,
  DataTableCellValue,
  DataTableColumn,
  DataTableRowModel,
  RowId
} from "../core/types";
import {
  type CellCommit,
  renderColumnContent,
  renderColumnEditor,
  renderEditableIndicator,
  renderEditIndicator
} from "../engine/column-def-builder";

export type DataCellProps<TRow extends DataTableRowModel> = {
  column: DataTableColumn<TRow>;
  row: TRow;
  rowId: RowId;
  value: DataTableCellValue;
  restoredDraft?: string | null;
  rowIndex: number;
  columnIndex: number;
  enableEditing: boolean;
  onCommit: CellCommit<TRow>;
  onDraftChange?: (args: {
    rowId: RowId;
    columnId: string;
    value: DataTableCellValue;
  }) => void;
  onCancelEdit: () => void;
  onStartEdit: (rowId: RowId, columnId: string) => void;
  onCellSelect: (coord: CellCoord) => void;
  onRangeSelect: (coord: CellCoord) => void;
};

const DataCellInner = <TRow extends DataTableRowModel>({
  column,
  row,
  rowId,
  value,
  restoredDraft,
  rowIndex,
  columnIndex,
  enableEditing,
  onCommit,
  onDraftChange,
  onCancelEdit,
  onStartEdit,
  onCellSelect,
  onRangeSelect
}: DataCellProps<TRow>): JSX.Element => {
  const cellStore = useCellStore();
  const collaboratorStore = useCollaboratorStore();
  const isSelected = useCellIsSelected(cellStore, rowIndex, columnIndex);
  const isRangeSelected = useCellIsInRange(cellStore, rowIndex, columnIndex);
  const isEditing = useCellIsEditing(cellStore, rowId, column.id);
  const collaboratorsInCell = useCollaboratorsForCell(collaboratorStore, rowId, column.id);
  const currentCoord: CellCoord = {
    rowIndex,
    columnIndex
  };
  const canEdit = enableEditing && (column.isEditable ?? false);
  const hasCollaborators = collaboratorsInCell.length > 0;
  const shouldAllowOverflow = hasCollaborators || (
    isEditing && (column.kind === "select" || column.kind === "multiselect" || column.kind === "date")
  );

  const content = isEditing
    ? renderColumnEditor({
        column,
        row,
        rowId,
        value,
        onCommit: (nextValue) => {
          onCommit({ row, rowId, column, value: nextValue });
        },
        ...(restoredDraft !== undefined ? { restoredDraft } : {}),
        ...(onDraftChange
          ? {
              onDraftChange: (nextValue: DataTableCellValue) => {
                onDraftChange({ rowId, columnId: column.id, value: nextValue });
              }
            }
          : {}),
        onCancel: onCancelEdit
      })
    : renderColumnContent({
        column,
        row,
        rowId,
        value,
        isEditing
      });

  return (
    <div
      role="gridcell"
      data-row-id={String(rowId)}
      data-row-index={rowIndex}
      data-column-id={column.id}
      data-column-index={columnIndex}
      data-has-collaborators={hasCollaborators ? "true" : "false"}
      className={cn(
        "group relative box-border h-full min-h-10 w-full min-w-0 px-2 py-1 text-sm text-slate-800",
        shouldAllowOverflow ? "overflow-visible" : "overflow-hidden",
        hasCollaborators ? "z-20" : "",
        isEditing && (column.kind === "select" || column.kind === "multiselect" || column.kind === "date")
          ? "z-20"
          : "",
        isEditing ? "bg-white" : isRangeSelected ? "bg-[var(--dt-selection-bg)]" : "",
        isSelected ? "outline outline-2 outline-[var(--dt-active-cell-ring)] outline-offset-[-2px]" : ""
      )}
      onClick={(event) => {
        if (event.shiftKey) {
          onRangeSelect(currentCoord);
          return;
        }
        onCellSelect(currentCoord);
      }}
      onDoubleClick={() => {
        if (canEdit) {
          onStartEdit(rowId, column.id);
        }
      }}
    >
      {collaboratorsInCell.map((collaborator, index) => (
        <span
          key={`${collaborator.userId}-outline`}
          aria-hidden="true"
          data-dt-collaborator-outline={collaborator.userId}
          className="pointer-events-none absolute rounded-[3px]"
          style={
            {
              "--dt-collaborator-outline": collaborator.color,
              inset: `${index * 3}px`,
              boxShadow: "inset 0 0 0 2px var(--dt-collaborator-outline)"
            } as CSSProperties & { "--dt-collaborator-outline": string }
          }
        />
      ))}
      {hasCollaborators ? (
        <span className="absolute right-1 top-0 z-10 flex -translate-y-1/2 flex-col items-end gap-1">
          {collaboratorsInCell.map((collaborator) => (
            <span
              key={`${collaborator.userId}-label`}
              data-dt-collaborator-label={collaborator.userId}
              className="max-w-[10rem] truncate rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white shadow-sm"
              style={{ backgroundColor: collaborator.color }}
            >
              {collaborator.name}
            </span>
          ))}
        </span>
      ) : null}
      {content}
      {renderEditableIndicator(canEdit, isEditing)}
      {renderEditIndicator(isEditing)}
    </div>
  );
};

export const DataCell = memo(DataCellInner) as typeof DataCellInner;
