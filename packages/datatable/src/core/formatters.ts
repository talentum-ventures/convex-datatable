import type {
  DataTableColumn,
  DataTableRowModel,
  SelectOption
} from "./types";

function lookupOption(options: ReadonlyArray<SelectOption>, value: string): SelectOption | null {
  for (const option of options) {
    if (option.value === value) {
      return option;
    }
  }
  return null;
}

export function formatColumnValue<TRow extends DataTableRowModel>(
  column: DataTableColumn<TRow>,
  value: string | number | boolean | null | Date | ReadonlyArray<string>
): string {
  if (value === null) {
    return "";
  }

  switch (column.kind) {
    case "text":
    case "longText":
    case "link":
      return typeof value === "string" ? value : String(value);
    case "number":
      return typeof value === "number" ? String(value) : "";
    case "currency": {
      if (typeof value !== "number") {
        return "";
      }
      return new Intl.NumberFormat(column.locale, {
        style: "currency",
        currency: column.currency,
        minimumFractionDigits: column.minimumFractionDigits,
        maximumFractionDigits: column.maximumFractionDigits
      }).format(value);
    }
    case "select": {
      const textValue = typeof value === "string" ? value : "";
      const option = lookupOption(column.options, textValue);
      return option ? option.label : textValue;
    }
    case "multiselect": {
      if (!Array.isArray(value)) {
        return "";
      }
      const labels = value
        .map((entry) => {
          const option = lookupOption(column.options, entry);
          return option ? option.label : entry;
        })
        .filter((entry) => entry.length > 0);
      return labels.join(", ");
    }
    case "date": {
      const dateValue = value instanceof Date ? value : new Date(String(value));
      if (Number.isNaN(dateValue.getTime())) {
        return "";
      }
      return new Intl.DateTimeFormat(column.locale, {
        dateStyle: column.dateStyle ?? "medium",
        timeZone: column.timezone
      }).format(dateValue);
    }
    case "reactNode":
      return "";
  }
}

export function parseTextNumber(input: string): number {
  const parsed = Number.parseFloat(input);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return parsed;
}

export function parseDateValue(input: string): string {
  return input;
}
