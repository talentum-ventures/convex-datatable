import { useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import type { ColumnDef, Table } from "@tanstack/react-table";
import { Check, ExternalLink, Link as LinkIcon, Pencil } from "lucide-react";
import type {
  CellCoord,
  CollaboratorPresence,
  DataTableCellValue,
  DataTableColumn,
  DataTableReactValue,
  DataTableRowModel,
  RowId,
} from "../core/types";
import { cn } from "../core/cn";
import { formatColumnValue } from "../core/formatters";
import { findOptionByValue } from "../core/select-options";
import { DefaultEditor } from "../ui/cell-editors";
import { MultiSelectBadges } from "../ui/cell-renderers";
import { getVisibleDataColumnIdsInUiOrder } from "./visible-column-order";

type ActiveCell = CellCoord | null;

type EditingCell = {
  rowId: RowId;
  columnId: string;
} | null;

export type CellCommit<TRow extends DataTableRowModel> = (args: {
  row: TRow;
  rowId: RowId;
  column: DataTableColumn<TRow>;
  value: DataTableCellValue;
}) => void;

export type BuildColumnsArgs<TRow extends DataTableRowModel> = {
  columns: ReadonlyArray<DataTableColumn<TRow>>;
  getRowId: (row: TRow) => RowId;
  editingCell: EditingCell;
  activeCell: ActiveCell;
  rangeStart: ActiveCell;
  collaborators: ReadonlyArray<CollaboratorPresence>;
  onStartEdit: (rowId: RowId, columnId: string) => void;
  onCommit: CellCommit<TRow>;
  onCancelEdit: () => void;
  onCellSelect: (coord: CellCoord) => void;
  onRangeSelect: (coord: CellCoord) => void;
  enableEditing: boolean;
};

function isInRange(cell: CellCoord, start: ActiveCell, end: ActiveCell): boolean {
  if (!start || !end) {
    return false;
  }

  const minRow = Math.min(start.rowIndex, end.rowIndex);
  const maxRow = Math.max(start.rowIndex, end.rowIndex);
  const minColumn = Math.min(start.columnIndex, end.columnIndex);
  const maxColumn = Math.max(start.columnIndex, end.columnIndex);

  return (
    cell.rowIndex >= minRow &&
    cell.rowIndex <= maxRow &&
    cell.columnIndex >= minColumn &&
    cell.columnIndex <= maxColumn
  );
}

function toFormattableValue(
  value: DataTableCellValue
): string | number | boolean | null | Date | ReadonlyArray<string> {
  if (value instanceof Date) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }
  return String(value);
}

function toReactValue(value: DataTableCellValue): DataTableReactValue {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }
  return String(value);
}

function multiSelectValues(value: DataTableCellValue): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => String(entry));
}

type SharedCellContentArgs<TRow extends DataTableRowModel> = {
  column: DataTableColumn<TRow>;
  row: TRow;
  rowId: RowId;
  value: DataTableCellValue;
  isEditing: boolean;
};

type SharedCellEditorArgs<TRow extends DataTableRowModel> = {
  column: DataTableColumn<TRow>;
  row: TRow;
  rowId: RowId;
  value: DataTableCellValue;
  onCommit: (nextValue: DataTableCellValue) => void;
  onCancel: () => void;
};

export function renderColumnContent<TRow extends DataTableRowModel>({
  column,
  row,
  rowId,
  value,
  isEditing
}: SharedCellContentArgs<TRow>): ReactNode {
  const customCell = column.renderCell as
    | ((ctx: {
        row: TRow;
        rowId: RowId;
        value: DataTableCellValue;
        isEditing: boolean;
      }) => ReactNode)
    | undefined;

  if (customCell) {
    return (
      <>
        {customCell({
          row,
          rowId,
          value: column.kind === "reactNode" ? toReactValue(value) : value,
          isEditing
        })}
      </>
    );
  }

  return renderDefaultCell(column, value);
}

export function renderColumnEditor<TRow extends DataTableRowModel>({
  column,
  row,
  rowId,
  value,
  onCommit,
  onCancel
}: SharedCellEditorArgs<TRow>): ReactNode {
  const customEditor = column.renderEditor as
    | ((ctx: {
        row: TRow;
        rowId: RowId;
        value: DataTableCellValue;
        commit: (nextValue: DataTableCellValue) => void;
        cancel: () => void;
      }) => ReactNode)
    | undefined;

  if (customEditor) {
    return (
      <>
        {customEditor({
          row,
          rowId,
          value: column.kind === "reactNode" ? toReactValue(value) : value,
          commit: onCommit,
          cancel: onCancel
        })}
      </>
    );
  }

  return (
    <DefaultEditor
      column={column}
      row={row}
      value={value}
      onCommit={onCommit}
      onCancel={onCancel}
    />
  );
}

function renderDefaultCell<TRow extends DataTableRowModel>(
  column: DataTableColumn<TRow>,
  value: DataTableCellValue
): JSX.Element {
  if (column.kind === "select") {
    const option = findOptionByValue(column.options, String(value));
    if (!option) {
      return <span className="text-slate-700">{String(value ?? "")}</span>;
    }
    const Icon = option.icon;
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", option.colorClass)}>
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {option.label}
      </span>
    );
  }

  if (column.kind === "multiselect") {
    return <MultiSelectBadges columnId={column.id} options={column.options} values={multiSelectValues(value)} />;
  }

  if (column.kind === "link") {
    const href = String(value ?? "");
    if (href.length === 0) {
      return <span className="text-slate-400">-</span>;
    }
    return (
      <a
        href={href}
        target={column.target ?? "_blank"}
        rel={column.rel ?? "noreferrer"}
        className="inline-flex items-center gap-1 text-sky-700 underline decoration-sky-200 underline-offset-2"
      >
        <LinkIcon className="h-3.5 w-3.5 shrink-0" />
        <span>{href}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      </a>
    );
  }

  const display = formatColumnValue(column, toFormattableValue(value));

  return (
    <span
      className={cn(
        column.kind === "text" || column.kind === "longText" ? "whitespace-pre-wrap break-words" : ""
      )}
    >
      {display || ""}
    </span>
  );
}

export function useColumnDefs<TRow extends DataTableRowModel>({
  columns,
  getRowId,
  editingCell,
  activeCell,
  rangeStart,
  collaborators,
  onStartEdit,
  onCommit,
  onCancelEdit,
  onCellSelect,
  onRangeSelect,
  enableEditing
}: BuildColumnsArgs<TRow>): ReadonlyArray<ColumnDef<TRow, DataTableCellValue>> {
  const activeCellRef = useRef<ActiveCell>(activeCell);
  const rangeStartRef = useRef<ActiveCell>(rangeStart);
  const editingCellRef = useRef<EditingCell>(editingCell);
  const collaboratorsRef = useRef<ReadonlyArray<CollaboratorPresence>>(collaborators);

  activeCellRef.current = activeCell;
  rangeStartRef.current = rangeStart;
  editingCellRef.current = editingCell;
  collaboratorsRef.current = collaborators;

  return useMemo(() => {
    let cachedVisibleDataIds = "";
    let cachedVisibleDataIndexById: Record<string, number> = {};

    const visibleDataIndexById = (table: Table<TRow>): Readonly<Record<string, number>> => {
      const visibleDataIds = getVisibleDataColumnIdsInUiOrder(table);
      const nextSignature = visibleDataIds.join("|");

      if (nextSignature === cachedVisibleDataIds) {
        return cachedVisibleDataIndexById;
      }

      const nextMap: Record<string, number> = {};
      for (let index = 0; index < visibleDataIds.length; index += 1) {
        const id = visibleDataIds[index];
        if (!id) {
          continue;
        }
        nextMap[id] = index;
      }

      cachedVisibleDataIds = nextSignature;
      cachedVisibleDataIndexById = nextMap;
      return cachedVisibleDataIndexById;
    };

    return columns.map((column): ColumnDef<TRow, DataTableCellValue> => {
      const definition: ColumnDef<TRow, DataTableCellValue> = {
        id: column.id,
        header: column.header,
        accessorFn: (row) => {
          if (column.accessor) {
            return column.accessor(row);
          }
          return row[column.field];
        },
        enableResizing: column.isResizable ?? true,
        enableSorting: column.isSortable ?? true,
        enableHiding: column.isHideable ?? true,
        cell: (context) => {
        const row = context.row.original;
        const rowId = getRowId(row);
        const value = context.getValue();
        const dynamicColumnIndex = visibleDataIndexById(context.table)[column.id] ?? 0;
        const currentCoord: CellCoord = {
          rowIndex: context.row.index,
          columnIndex: dynamicColumnIndex >= 0 ? dynamicColumnIndex : 0
        };
        const currentActiveCell = activeCellRef.current;
        const currentRangeStart = rangeStartRef.current;
        const currentEditingCell = editingCellRef.current;
        const isSelected =
          currentActiveCell?.rowIndex === currentCoord.rowIndex &&
          currentActiveCell?.columnIndex === currentCoord.columnIndex;
        const isRangeSelected = isInRange(currentCoord, currentRangeStart, currentActiveCell);
        const isEditing =
          currentEditingCell?.rowId === rowId && currentEditingCell?.columnId === column.id;
        const canEdit = enableEditing && (column.isEditable ?? false);
        const collaboratorsInCell = collaboratorsRef.current.filter(
          (collaborator) =>
            collaborator.activeCell?.rowId === rowId && collaborator.activeCell?.columnId === column.id
        );

        const content = isEditing ? (
          renderColumnEditor({
            column,
            row,
            rowId,
            value,
            onCommit: (nextValue) => {
              onCommit({ row, rowId, column, value: nextValue });
            },
            onCancel: onCancelEdit
          })
        ) : (
          renderColumnContent({
            column,
            row,
            rowId,
            value,
            isEditing
          })
        );

        return (
          <div
            role="gridcell"
            data-row-id={String(rowId)}
            data-row-index={currentCoord.rowIndex}
            data-column-id={column.id}
            data-column-index={currentCoord.columnIndex}
            data-has-collaborators={collaboratorsInCell.length > 0 ? "true" : "false"}
            className={cn(
              "group relative box-border h-full min-h-10 w-full min-w-0 px-2 py-1 text-sm text-slate-800",
              isEditing && (column.kind === "select" || column.kind === "multiselect" || column.kind === "date")
                ? "z-20 overflow-visible"
                : "overflow-hidden",
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
            {collaboratorsInCell.length > 0 ? (
              <span className="pointer-events-none absolute right-1 top-0 z-10 flex -translate-y-1/2 flex-col items-end gap-1">
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
            {canEdit && !isEditing ? (
              <span className="pointer-events-none absolute right-1 top-1 hidden rounded bg-slate-100 p-0.5 text-slate-500 group-hover:block">
                <Pencil className="h-3 w-3" />
              </span>
            ) : null}
            {isEditing ? (
              <span className="pointer-events-none absolute right-1 top-1 rounded bg-emerald-100 p-0.5 text-emerald-700">
                <Check className="h-3 w-3" />
              </span>
            ) : null}
          </div>
        );
        }
      };

      if (column.width !== undefined) {
        definition.size = column.width;
      }
      if (column.minWidth !== undefined) {
        definition.minSize = column.minWidth;
      }
      if (column.maxWidth !== undefined) {
        definition.maxSize = column.maxWidth;
      }

      return definition;
    });
  }, [
    columns,
    enableEditing,
    getRowId,
    onCancelEdit,
    onCellSelect,
    onCommit,
    onRangeSelect,
    onStartEdit
  ]);
}
