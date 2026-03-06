import type {
  DataTableCellValue,
  DataTableColumn,
  DataTableReactValue,
  DataTableRowModel,
  RowSchema
} from "./types";

export type ValidationResult = {
  ok: boolean;
  message: string | null;
};

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

export function validateCell<TRow extends DataTableRowModel>(
  column: DataTableColumn<TRow>,
  row: TRow,
  value: DataTableCellValue
): ValidationResult {
  if (!column.validator) {
    return { ok: true, message: null };
  }

  if (column.kind === "text" || column.kind === "longText" || column.kind === "link" || column.kind === "select") {
    const message = column.validator(String(value ?? ""), row);
    return { ok: message === null, message };
  }

  if (column.kind === "number" || column.kind === "currency") {
    const numericValue = typeof value === "number" ? value : Number(value ?? 0);
    const message = column.validator(numericValue, row);
    return { ok: message === null, message };
  }

  if (column.kind === "multiselect") {
    const listValue = Array.isArray(value) ? value : [];
    const message = column.validator(listValue, row);
    return { ok: message === null, message };
  }

  if (column.kind === "date") {
    const typedDate = value instanceof Date ? value : String(value ?? "");
    const message = column.validator(typedDate, row);
    return { ok: message === null, message };
  }

  if (column.kind === "reactNode") {
    const message = column.validator(toReactValue(value), row);
    return { ok: message === null, message };
  }

  return { ok: true, message: null };
}

export function validateRow<TRow extends DataTableRowModel>(
  schema: RowSchema<TRow> | undefined,
  row: TRow
): ValidationResult {
  if (!schema) {
    return { ok: true, message: null };
  }

  const parsed = schema.safeParse(row);
  if (parsed.success) {
    return { ok: true, message: null };
  }

  const firstIssue = parsed.error.issues[0];
  return {
    ok: false,
    message: firstIssue ? `${firstIssue.path.join(".")}: ${firstIssue.message}` : "Invalid row"
  };
}
