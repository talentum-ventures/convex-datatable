import type { ReactNode } from "react";
import { Check, ExternalLink, Link as LinkIcon, Pencil } from "lucide-react";
import { cn } from "../core/cn";
import { formatColumnValue } from "../core/formatters";
import { findOptionByValue } from "../core/select-options";
import type {
  DataTableCellValue,
  DataTableColumn,
  DataTableReactValue,
  DataTableRowModel,
  RowId
} from "../core/types";
import { DefaultEditor } from "../ui/cell-editors";
import { MultiSelectBadges } from "../ui/cell-renderers";

export type SharedCellContentArgs<TRow extends DataTableRowModel> = {
  column: DataTableColumn<TRow>;
  row: TRow;
  rowId: RowId;
  value: DataTableCellValue;
  isEditing: boolean;
};

export type SharedCellEditorArgs<TRow extends DataTableRowModel> = {
  column: DataTableColumn<TRow>;
  row: TRow;
  rowId: RowId;
  value: DataTableCellValue;
  onCommit: (nextValue: DataTableCellValue) => void;
  onAutoSave?: (nextValue: DataTableCellValue) => void;
  restoredDraft?: string | null;
  onDraftChange?: (nextValue: DataTableCellValue) => void;
  onCancel: () => void;
};

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
  onAutoSave,
  restoredDraft,
  onDraftChange,
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
      {...(restoredDraft !== undefined ? { restoredDraft } : {})}
      {...(onDraftChange ? { onDraftChange } : {})}
      {...(onAutoSave ? { onAutoSave } : {})}
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

export function renderEditIndicator(isEditing: boolean): ReactNode {
  if (isEditing) {
    return (
      <span className="pointer-events-none absolute right-1 top-1 rounded bg-emerald-100 p-0.5 text-emerald-700">
        <Check className="h-3 w-3" />
      </span>
    );
  }

  return null;
}

export function renderEditableIndicator(canEdit: boolean, isEditing: boolean): ReactNode {
  if (!canEdit || isEditing) {
    return null;
  }

  return (
    <span className="pointer-events-none absolute right-1 top-1 hidden rounded bg-slate-100 p-0.5 text-slate-500 group-hover:block">
      <Pencil className="h-3 w-3" />
    </span>
  );
}
