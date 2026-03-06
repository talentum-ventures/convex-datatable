import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { ColumnDef, Table } from "@tanstack/react-table";
import { Check, ExternalLink, Link as LinkIcon, Pencil } from "lucide-react";
import type {
  CellCoord,
  DataTableCellValue,
  DataTableColumn,
  DataTableReactValue,
  DataTableRowModel,
  RowId,
  SelectOption
} from "../core/types";
import { cn } from "../core/cn";
import { formatColumnValue, parseDateValue, parseTextNumber } from "../core/formatters";

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
  onStartEdit: (rowId: RowId, columnId: string) => void;
  onCommit: CellCommit<TRow>;
  onCancelEdit: () => void;
  onCellSelect: (coord: CellCoord) => void;
  onRangeSelect: (coord: CellCoord) => void;
  enableEditing: boolean;
};

function findOption(options: ReadonlyArray<SelectOption>, value: string): SelectOption | null {
  for (const option of options) {
    if (option.value === value) {
      return option;
    }
  }
  return null;
}

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

function parseEditorValue<TRow extends DataTableRowModel>(
  column: DataTableColumn<TRow>,
  raw: string,
  row: TRow
): DataTableCellValue {
  if (column.parseInput) {
    return column.parseInput(raw, row);
  }

  switch (column.kind) {
    case "text":
    case "longText":
    case "link":
    case "select":
      return raw;
    case "number":
    case "currency":
      return parseTextNumber(raw);
    case "date":
      return parseDateValue(raw);
    case "multiselect":
      return raw
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    case "reactNode":
      return raw;
  }
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

type DefaultEditorProps<TRow extends DataTableRowModel> = {
  column: DataTableColumn<TRow>;
  row: TRow;
  rowId: RowId;
  value: DataTableCellValue;
  onCommit: (value: DataTableCellValue) => void;
  onCancel: () => void;
};

function DefaultEditor<TRow extends DataTableRowModel>({
  column,
  row,
  rowId,
  value,
  onCommit,
  onCancel
}: DefaultEditorProps<TRow>): JSX.Element {
  const [draft, setDraft] = useState<string>(() => {
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    if (value === null) {
      return "";
    }
    return String(value);
  });

  const commit = (): void => {
    const parsed = parseEditorValue(column, draft, row);
    onCommit(parsed);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      commit();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  };

  if (column.kind === "longText") {
    return (
      <textarea
        aria-label={`Edit ${column.header}`}
        className="h-full w-full resize-none rounded-md border border-slate-300 bg-white px-2 py-1 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-sky-500"
        autoFocus
        value={draft}
        onBlur={commit}
        onKeyDown={onKeyDown}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
      />
    );
  }

  if (column.kind === "select") {
    return (
      <select
        aria-label={`Edit ${column.header}`}
        className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-sky-500"
        autoFocus
        value={draft}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onCancel();
          }
          if (event.key === "Enter") {
            commit();
          }
        }}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
      >
        {column.options.map((option) => (
          <option key={`${rowId}-${column.id}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  const type =
    column.kind === "number" || column.kind === "currency"
      ? "number"
      : column.kind === "date"
        ? "date"
        : "text";

  return (
    <input
      aria-label={`Edit ${column.header}`}
      className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-sky-500"
      autoFocus
      type={type}
      value={draft}
      onBlur={commit}
      onKeyDown={onKeyDown}
      onChange={(event) => {
        setDraft(event.target.value);
      }}
    />
  );
}

function renderDefaultCell<TRow extends DataTableRowModel>(
  column: DataTableColumn<TRow>,
  value: DataTableCellValue
): JSX.Element {
  if (column.kind === "select") {
    const option = findOption(column.options, String(value));
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
    const values = Array.isArray(value) ? value : [];
    if (values.length === 0) {
      return <span className="text-slate-400">-</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {values.map((entry) => {
          const option = findOption(column.options, entry);
          const Icon = option?.icon;
          return (
            <span
              key={`${column.id}-${entry}`}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                option?.colorClass ?? "bg-slate-100 text-slate-700"
              )}
            >
              {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
              {option?.label ?? entry}
            </span>
          );
        })}
      </div>
    );
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
        <LinkIcon className="h-3.5 w-3.5" />
        {href}
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    );
  }

  const display = formatColumnValue(column, toFormattableValue(value));

  return (
    <span className={cn(column.kind === "text" ? "whitespace-nowrap" : "", column.kind === "longText" ? "whitespace-pre-wrap" : "")}>{display || ""}</span>
  );
}

export function useColumnDefs<TRow extends DataTableRowModel>({
  columns,
  getRowId,
  editingCell,
  activeCell,
  rangeStart,
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

  activeCellRef.current = activeCell;
  rangeStartRef.current = rangeStart;
  editingCellRef.current = editingCell;

  return useMemo(() => {
    let cachedVisibleDataIds = "";
    let cachedVisibleDataIndexById: Record<string, number> = {};

    const visibleDataIndexById = (table: Table<TRow>): Readonly<Record<string, number>> => {
      const visibleDataIds = table
        .getVisibleLeafColumns()
        .map((entry) => entry.id)
        .filter((id) => id !== "__select__" && id !== "__actions__");
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

        const customEditor = column.renderEditor as
          | ((ctx: {
              row: TRow;
              rowId: RowId;
              value: DataTableCellValue;
              commit: (nextValue: DataTableCellValue) => void;
              cancel: () => void;
            }) => ReactNode)
          | undefined;

        const customCell = column.renderCell as
          | ((ctx: {
              row: TRow;
              rowId: RowId;
              value: DataTableCellValue;
              isEditing: boolean;
            }) => ReactNode)
          | undefined;

        const content = isEditing ? (
          customEditor ? (
            <>{
              customEditor({
                row,
                rowId,
                value: column.kind === "reactNode" ? toReactValue(value) : value,
                commit: (nextValue) => {
                  onCommit({
                    row,
                    rowId,
                    column,
                    value: nextValue
                  });
                },
                cancel: onCancelEdit
              })
            }</>
          ) : (
            <DefaultEditor
              column={column}
              row={row}
              rowId={rowId}
              value={value}
              onCommit={(nextValue) => {
                onCommit({ row, rowId, column, value: nextValue });
              }}
              onCancel={onCancelEdit}
            />
          )
        ) : customCell ? (
          <>{
            customCell({
              row,
              rowId,
              value: column.kind === "reactNode" ? toReactValue(value) : value,
              isEditing
            })
          }</>
        ) : (
          renderDefaultCell(column, value)
        );

        return (
          <div
            role="gridcell"
            data-row-id={String(rowId)}
            data-row-index={currentCoord.rowIndex}
            data-column-id={column.id}
            data-column-index={currentCoord.columnIndex}
            className={cn(
              "group relative box-border h-full min-h-10 w-full min-w-0 overflow-hidden px-2 py-1 text-sm text-slate-800",
              isRangeSelected ? "bg-[var(--dt-selection-bg)]" : "",
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
