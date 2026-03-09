import type {
  DataTableCellValue,
  DataTableFilter,
  DataTableQueryState,
  DataTableRowModel
} from "@rolha/datatable";

function compareValues(left: string | number | boolean | null, right: string | number | boolean | null): number {
  if (left === right) {
    return 0;
  }

  if (left === null) {
    return -1;
  }

  if (right === null) {
    return 1;
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right));
}

function stringifyCellValue(raw: DataTableCellValue): string {
  if (Array.isArray(raw)) {
    return raw.join(",");
  }

  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
    return String(raw);
  }

  if (raw === null || typeof raw === "undefined") {
    return "";
  }

  return String(raw);
}

function comparableValue(raw: DataTableCellValue): string | number | boolean | null {
  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
    return raw;
  }

  if (raw === null || typeof raw === "undefined") {
    return null;
  }

  return String(raw);
}

export function filterRow<TRow extends DataTableRowModel>(row: TRow, filter: DataTableFilter): boolean {
  const raw = row[filter.columnId as keyof TRow];
  const text = stringifyCellValue(raw);

  if (filter.op === "contains") {
    return text.toLowerCase().includes(String(filter.value ?? "").toLowerCase());
  }

  if (filter.op === "startsWith") {
    return text.toLowerCase().startsWith(String(filter.value ?? "").toLowerCase());
  }

  if (filter.op === "endsWith") {
    return text.toLowerCase().endsWith(String(filter.value ?? "").toLowerCase());
  }

  if (filter.op === "eq") {
    return text === String(filter.value ?? "");
  }

  if (filter.op === "neq") {
    return text !== String(filter.value ?? "");
  }

  if (filter.op === "in") {
    if (!Array.isArray(filter.value)) {
      return false;
    }

    if (Array.isArray(raw)) {
      const rowValues = raw.map((entry) => String(entry));
      return rowValues.some((value) => filter.value.includes(value));
    }

    return filter.value.includes(text);
  }

  if (filter.op === "gt" || filter.op === "gte" || filter.op === "lt" || filter.op === "lte") {
    const numericRaw = Number(text);
    const numericFilter = Number(filter.value);
    if (Number.isNaN(numericRaw) || Number.isNaN(numericFilter)) {
      return false;
    }

    if (filter.op === "gt") {
      return numericRaw > numericFilter;
    }
    if (filter.op === "gte") {
      return numericRaw >= numericFilter;
    }
    if (filter.op === "lt") {
      return numericRaw < numericFilter;
    }
    return numericRaw <= numericFilter;
  }

  return true;
}

export function applyServerQuery<TRow extends DataTableRowModel>(
  rows: ReadonlyArray<TRow>,
  state: DataTableQueryState
): ReadonlyArray<TRow> {
  let output = [...rows];

  for (const filter of state.filters) {
    output = output.filter((row) => filterRow(row, filter));
  }

  const sortEntry = state.sorting[0];
  if (!sortEntry) {
    return output;
  }

  output.sort((left, right) => {
    const leftValue = left[sortEntry.columnId as keyof TRow];
    const rightValue = right[sortEntry.columnId as keyof TRow];
    const result = compareValues(comparableValue(leftValue), comparableValue(rightValue));
    return sortEntry.direction === "asc" ? result : -result;
  });

  return output;
}
