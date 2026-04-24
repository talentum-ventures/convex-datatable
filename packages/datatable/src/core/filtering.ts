import { parseDateValue } from "./formatters";
import { compareValues, comparableSortValue } from "./sorting";
import type { DataTableCellValue, DataTableColumn, DataTableFilter, DataTableRowModel, FilterOperator } from "./types";

const TEXT_FILTER_OPERATORS: ReadonlyArray<FilterOperator> = [
  "contains",
  "startsWith",
  "endsWith",
  "eq",
  "neq"
];
const NUMBER_FILTER_OPERATORS: ReadonlyArray<FilterOperator> = ["eq", "neq", "gt", "gte", "lt", "lte"];
const DATE_FILTER_OPERATORS: ReadonlyArray<FilterOperator> = ["eq", "neq", "gt", "gte", "lt", "lte"];
const SELECT_FILTER_OPERATORS: ReadonlyArray<FilterOperator> = ["in"];
const MULTISELECT_FILTER_OPERATORS: ReadonlyArray<FilterOperator> = ["in"];
const EMPTY_FILTER_OPERATORS: ReadonlyArray<FilterOperator> = ["isEmpty", "isNotEmpty"];

export function resolveAllowEmptyFilter<TRow extends DataTableRowModel>(
  column: DataTableColumn<TRow>
): boolean {
  if (typeof column.allowEmptyFilter === "boolean") {
    return column.allowEmptyFilter;
  }

  return column.kind === "select" || column.kind === "multiselect";
}

export function filterOperatorsForColumn<TRow extends DataTableRowModel>(
  column: DataTableColumn<TRow>
): ReadonlyArray<FilterOperator> {
  let baseOperators = TEXT_FILTER_OPERATORS;
  if (column.kind === "number" || column.kind === "currency") {
    baseOperators = NUMBER_FILTER_OPERATORS;
  } else if (column.kind === "date") {
    baseOperators = DATE_FILTER_OPERATORS;
  } else if (column.kind === "select") {
    baseOperators = SELECT_FILTER_OPERATORS;
  } else if (column.kind === "multiselect") {
    baseOperators = MULTISELECT_FILTER_OPERATORS;
  }

  if (!resolveAllowEmptyFilter(column)) {
    return baseOperators;
  }

  return [...baseOperators, ...EMPTY_FILTER_OPERATORS];
}

export function defaultFilterOperatorForColumn<TRow extends DataTableRowModel>(
  column: DataTableColumn<TRow>
): FilterOperator {
  const operators = filterOperatorsForColumn(column);
  const first = operators[0];
  return first ?? "contains";
}

export function isActiveFilterValue(filter: Pick<DataTableFilter, "op" | "value">): boolean;
export function isActiveFilterValue(value: DataTableFilter["value"], op?: DataTableFilter["op"]): boolean;
export function isActiveFilterValue(
  filterOrValue: Pick<DataTableFilter, "op" | "value"> | DataTableFilter["value"],
  op?: DataTableFilter["op"]
): boolean {
  const filter =
    typeof filterOrValue === "object" &&
    filterOrValue !== null &&
    !Array.isArray(filterOrValue) &&
    "op" in filterOrValue &&
    "value" in filterOrValue
      ? filterOrValue
      : {
          op,
          value: filterOrValue
        };

  if (filter.op === "isEmpty" || filter.op === "isNotEmpty") {
    return true;
  }

  const { value } = filter;
  if (value === null) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return true;
}

export function isCellEmpty(raw: DataTableCellValue): boolean {
  if (raw === null || raw === undefined) {
    return true;
  }

  if (Array.isArray(raw)) {
    return raw.length === 0;
  }

  if (typeof raw === "string") {
    return raw.trim().length === 0;
  }

  return false;
}

export function stringifyFilterCellValue(raw: DataTableCellValue): string {
  if (Array.isArray(raw)) {
    return raw.map((entry) => String(entry)).join(",");
  }

  if (raw instanceof Date) {
    return raw.toISOString();
  }

  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
    return String(raw);
  }

  if (raw === null || raw === undefined) {
    return "";
  }

  return String(raw);
}

export function numericFilterValue(raw: DataTableCellValue | DataTableFilter["value"]): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }

  if (typeof raw === "string" && raw.trim().length > 0) {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (raw instanceof Date) {
    return raw.getTime();
  }

  return null;
}

export function dateFilterValue(
  raw: DataTableCellValue | DataTableFilter["value"],
  locale: string | undefined
): string | null {
  if (raw instanceof Date) {
    return raw.toISOString().slice(0, 10);
  }

  if (typeof raw !== "string") {
    return null;
  }

  const parsed = parseDateValue(raw, locale);
  return parsed.length > 0 ? parsed : null;
}

export function rowMatchesFilter<TRow extends DataTableRowModel>(
  row: TRow,
  filter: DataTableFilter,
  column: DataTableColumn<TRow> | undefined
): boolean {
  const raw = row[filter.columnId as keyof TRow];
  const text = stringifyFilterCellValue(raw);

  if (filter.op === "isEmpty") {
    return isCellEmpty(raw);
  }

  if (filter.op === "isNotEmpty") {
    return !isCellEmpty(raw);
  }

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
    if (column?.kind === "date") {
      const left = dateFilterValue(raw, column.locale);
      const right = dateFilterValue(filter.value, column.locale);
      return left !== null && right !== null && left === right;
    }

    return text === String(filter.value ?? "");
  }

  if (filter.op === "neq") {
    if (column?.kind === "date") {
      const left = dateFilterValue(raw, column.locale);
      const right = dateFilterValue(filter.value, column.locale);
      return left !== null && right !== null && left !== right;
    }

    return text !== String(filter.value ?? "");
  }

  if (filter.op === "in") {
    const filterValues = filter.value;
    if (!Array.isArray(filterValues)) {
      return false;
    }

    if (Array.isArray(raw)) {
      const rowValues = raw.map((entry) => String(entry));
      return rowValues.some((value) => filterValues.includes(value));
    }

    return filterValues.includes(text);
  }

  if (filter.op === "gt" || filter.op === "gte" || filter.op === "lt" || filter.op === "lte") {
    if (column?.kind === "date") {
      const left = dateFilterValue(raw, column.locale);
      const right = dateFilterValue(filter.value, column.locale);
      if (left === null || right === null) {
        return false;
      }

      if (filter.op === "gt") {
        return left > right;
      }
      if (filter.op === "gte") {
        return left >= right;
      }
      if (filter.op === "lt") {
        return left < right;
      }
      return left <= right;
    }

    const left = numericFilterValue(raw);
    const right = numericFilterValue(filter.value);
    if (left === null || right === null) {
      return false;
    }

    if (filter.op === "gt") {
      return left > right;
    }
    if (filter.op === "gte") {
      return left >= right;
    }
    if (filter.op === "lt") {
      return left < right;
    }
    return left <= right;
  }

  return true;
}

export function applyClientQuery<TRow extends DataTableRowModel>(
  rows: ReadonlyArray<TRow>,
  state: {
    sorting: ReadonlyArray<{ columnId: string; direction: "asc" | "desc" }>;
    filters: ReadonlyArray<DataTableFilter>;
  },
  columnById: ReadonlyMap<string, DataTableColumn<TRow>>
): ReadonlyArray<TRow> {
  let output = [...rows];

  for (const filter of state.filters) {
    output = output.filter((row) => rowMatchesFilter(row, filter, columnById.get(filter.columnId)));
  }

  const sortEntry = state.sorting[0];
  if (!sortEntry) {
    return output;
  }

  output.sort((left, right) => {
    const leftValue = left[sortEntry.columnId as keyof TRow];
    const rightValue = right[sortEntry.columnId as keyof TRow];
    const result = compareValues(comparableSortValue(leftValue), comparableSortValue(rightValue));
    return sortEntry.direction === "asc" ? result : -result;
  });

  return output;
}
