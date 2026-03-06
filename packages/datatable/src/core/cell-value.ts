import type {
  DataTableCellValue,
  DataTableColumn,
  DataTableReactValue,
  DataTableRowModel,
  SelectOption
} from "./types";
import { formatColumnValue, parseDateValue, parseTextNumber } from "./formatters";

function optionLabel(options: ReadonlyArray<SelectOption>, value: string): string {
  for (const option of options) {
    if (option.value === value) {
      return option.label;
    }
  }
  return value;
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

export function serializeCellForClipboard<TRow extends DataTableRowModel>(
  column: DataTableColumn<TRow>,
  row: TRow,
  value: DataTableCellValue
): string {
  if (column.serializeClipboard) {
    if (column.kind === "multiselect") {
      return column.serializeClipboard(Array.isArray(value) ? value : [], row);
    }

    if (column.kind === "number" || column.kind === "currency") {
      return column.serializeClipboard(typeof value === "number" ? value : 0, row);
    }

    if (column.kind === "date") {
      return column.serializeClipboard(
        value instanceof Date ? value : String(value ?? ""),
        row
      );
    }

    if (column.kind === "reactNode") {
      return column.serializeClipboard(toReactValue(value), row);
    }

    return column.serializeClipboard(String(value ?? ""), row);
  }

  if (column.kind === "select") {
    return optionLabel(column.options, String(value ?? ""));
  }

  if (column.kind === "multiselect") {
    const values = Array.isArray(value) ? value : [];
    return values.map((entry) => optionLabel(column.options, entry)).join(", ");
  }

  if (column.kind === "reactNode") {
    return "";
  }

  return formatColumnValue(
    column,
    toFormattableValue(value)
  );
}

export function parseClipboardToCellValue<TRow extends DataTableRowModel>(
  column: DataTableColumn<TRow>,
  row: TRow,
  text: string
): DataTableCellValue {
  if (column.parseClipboard) {
    if (column.kind === "multiselect") {
      return column.parseClipboard(text, row);
    }

    if (column.kind === "number" || column.kind === "currency") {
      return column.parseClipboard(text, row);
    }

    if (column.kind === "date") {
      return column.parseClipboard(text, row);
    }

    if (column.kind === "reactNode") {
      return column.parseClipboard(text, row);
    }

    return column.parseClipboard(text, row);
  }

  if (column.parseInput) {
    return column.parseInput(text, row);
  }

  switch (column.kind) {
    case "text":
    case "longText":
    case "link":
    case "select":
      return text;
    case "number":
    case "currency":
      return parseTextNumber(text);
    case "multiselect":
      return text
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    case "date":
      return parseDateValue(text);
    case "reactNode":
      return text;
  }
}
