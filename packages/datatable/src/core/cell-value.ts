import type {
  DataTableCellValue,
  DataTableColumn,
  DataTableReactValue,
  DataTableRowModel,
  SelectOption
} from "./types";
import { formatColumnValue, parseDateValue, parseTextNumber } from "./formatters";
import {
  findOptionByValue,
  resolveMultiSelectTokens,
  resolveOptions,
  resolveOptionToken
} from "./select-options";

function optionLabel(options: ReadonlyArray<SelectOption>, value: string): string {
  return findOptionByValue(options, value)?.label ?? value;
}

function serializeDateValue(value: DataTableCellValue, locale?: string): string {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return parseDateValue(String(value ?? ""), locale);
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
    return optionLabel(resolveOptions(column, row), String(value ?? ""));
  }

  if (column.kind === "multiselect") {
    const values = Array.isArray(value) ? value : [];
    const options = resolveOptions(column, row);
    return values.map((entry) => optionLabel(options, entry)).join(", ");
  }

  if (column.kind === "date") {
    return serializeDateValue(value, column.locale);
  }

  if (column.kind === "reactNode") {
    return "";
  }

  return formatColumnValue(
    column,
    toFormattableValue(value),
    row
  );
}

export type CellValueParseResult =
  | {
      ok: true;
      value: DataTableCellValue;
    }
  | {
      ok: false;
      message: string;
    };

export function parseClipboardToCellValue<TRow extends DataTableRowModel>(
  column: DataTableColumn<TRow>,
  row: TRow,
  text: string
): CellValueParseResult {
  if (column.parseClipboard) {
    return {
      ok: true,
      value: column.parseClipboard(text, row)
    };
  }

  if (column.parseInput) {
    return {
      ok: true,
      value: column.parseInput(text, row)
    };
  }

  switch (column.kind) {
    case "text":
    case "longText":
    case "link":
      return {
        ok: true,
        value: text
      };
    case "select": {
      const trimmedText = text.trim();
      if (trimmedText.length === 0) {
        return {
          ok: true,
          value: ""
        };
      }

      const option = resolveOptionToken(resolveOptions(column, row), trimmedText);
      if (!option) {
        return {
          ok: false,
          message: `Invalid option "${trimmedText}"`
        };
      }

      return {
        ok: true,
        value: option.value
      };
    }
    case "number":
    case "currency":
      return {
        ok: true,
        value: parseTextNumber(text)
      };
    case "multiselect": {
      if (text.trim().length === 0) {
        return {
          ok: true,
          value: []
        };
      }

      const resolvedTokens = resolveMultiSelectTokens(resolveOptions(column, row), text);
      if (!resolvedTokens.ok) {
        return {
          ok: false,
          message: `Invalid option "${resolvedTokens.invalidToken}"`
        };
      }

      return {
        ok: true,
        value: resolvedTokens.values
      };
    }
    case "date":
      return {
        ok: true,
        value: parseDateValue(text, column.locale)
      };
    case "reactNode":
      return {
        ok: true,
        value: text
      };
  }
}
