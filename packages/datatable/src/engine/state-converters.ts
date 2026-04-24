import type {
  ColumnFiltersState,
  ColumnPinningState,
  ColumnSizingState,
  SortingState,
  VisibilityState
} from "@tanstack/react-table";
import type { DataTableFilter, DataTableSort, PersistedTableState } from "../core/types";

const FILTER_PREFIX = "dtf1:";

export function toTanStackSorting(sorting: ReadonlyArray<DataTableSort>): SortingState {
  return sorting.map((entry) => ({ id: entry.columnId, desc: entry.direction === "desc" }));
}

export function fromTanStackSorting(sorting: SortingState): ReadonlyArray<DataTableSort> {
  return sorting.map((entry) => ({
    columnId: entry.id,
    direction: entry.desc ? "desc" : "asc"
  }));
}

function stringifyFilterValue(value: DataTableFilter["value"]): string {
  if (value === null) {
    return "n:null";
  }
  if (typeof value === "number") {
    return `n:${value}`;
  }
  if (typeof value === "boolean") {
    return `b:${value ? "1" : "0"}`;
  }
  if (Array.isArray(value)) {
    return `a:${value.map((entry) => encodeURIComponent(entry)).join("~")}`;
  }
  return `s:${encodeURIComponent(String(value))}`;
}

function parseNumber(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFilterValue(value: string): DataTableFilter["value"] | null {
  const separatorIndex = value.indexOf(":");
  if (separatorIndex < 0) {
    return decodeURIComponent(value);
  }

  const prefix = value.slice(0, separatorIndex);
  const content = value.slice(separatorIndex + 1);

  if (prefix === "n") {
    if (content === "null") {
      return null;
    }
    const numeric = parseNumber(content);
    return numeric === null ? null : numeric;
  }

  if (prefix === "b") {
    return content === "1";
  }

  if (prefix === "a") {
    if (content.length === 0) {
      return [];
    }
    return content.split("~").map((entry) => decodeURIComponent(entry));
  }

  if (prefix === "s") {
    return decodeURIComponent(content);
  }

  return decodeURIComponent(value);
}

function isFilterOperator(value: string): value is DataTableFilter["op"] {
  return (
    value === "eq" ||
    value === "neq" ||
    value === "contains" ||
    value === "startsWith" ||
    value === "endsWith" ||
    value === "gt" ||
    value === "gte" ||
    value === "lt" ||
    value === "lte" ||
    value === "in" ||
    value === "isEmpty" ||
    value === "isNotEmpty"
  );
}

function encodeFilterEntry(filter: DataTableFilter): string {
  return `${FILTER_PREFIX}${filter.op}.${stringifyFilterValue(filter.value)}`;
}

function decodeFilterEntry(
  encodedValue: string
): { op: DataTableFilter["op"]; value: DataTableFilter["value"] } | null {
  if (!encodedValue.startsWith(FILTER_PREFIX)) {
    return null;
  }

  const payload = encodedValue.slice(FILTER_PREFIX.length);
  const separator = payload.indexOf(".");
  if (separator < 0) {
    return null;
  }

  const opRaw = payload.slice(0, separator);
  const serializedValue = payload.slice(separator + 1);
  if (!isFilterOperator(opRaw)) {
    return null;
  }

  const value = parseFilterValue(serializedValue);
  if (value === null && serializedValue !== "n:null") {
    return null;
  }

  return {
    op: opRaw,
    value
  };
}

export function toTanStackFilters(filters: ReadonlyArray<DataTableFilter>): ColumnFiltersState {
  return filters.map((entry) => ({ id: entry.columnId, value: encodeFilterEntry(entry) }));
}

export function fromTanStackFilters(filters: ColumnFiltersState): ReadonlyArray<DataTableFilter> {
  const output: DataTableFilter[] = [];
  for (const entry of filters) {
    const decoded = decodeFilterEntry(String(entry.value));
    if (!decoded) {
      continue;
    }
    output.push({
      columnId: entry.id,
      op: decoded.op,
      value: decoded.value
    });
  }
  return output;
}

export function toColumnVisibility(hiddenColumns: ReadonlyArray<string>): VisibilityState {
  const result: VisibilityState = {};
  for (const columnId of hiddenColumns) {
    result[columnId] = false;
  }
  return result;
}

export function fromColumnVisibility(visibility: VisibilityState): ReadonlyArray<string> {
  return Object.entries(visibility)
    .filter(([, isVisible]) => isVisible === false)
    .map(([columnId]) => columnId);
}

export function toColumnSizing(widths: Readonly<Record<string, number>>): ColumnSizingState {
  return { ...widths };
}

export function fromColumnSizing(sizing: ColumnSizingState): Readonly<Record<string, number>> {
  return { ...sizing };
}

export function toColumnPinning(
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>
): ColumnPinningState {
  return {
    left: [...left],
    right: [...right]
  };
}

export function fromColumnPinning(pinning: ColumnPinningState): {
  left: ReadonlyArray<string>;
  right: ReadonlyArray<string>;
} {
  return {
    left: pinning.left ?? [],
    right: pinning.right ?? []
  };
}

export function persistedStateToInternal(state: PersistedTableState): {
  sorting: SortingState;
  filters: ColumnFiltersState;
  columnOrder: string[];
  columnVisibility: VisibilityState;
  columnPinning: ColumnPinningState;
  columnSizing: ColumnSizingState;
} {
  return {
    sorting: toTanStackSorting(state.sorting),
    filters: toTanStackFilters(state.filters),
    columnOrder: [...state.columnOrder],
    columnVisibility: toColumnVisibility(state.hiddenColumns),
    columnPinning: toColumnPinning(state.pinLeft, state.pinRight),
    columnSizing: toColumnSizing(state.widths)
  };
}

export function internalToPersistedState(input: {
  sorting: SortingState;
  filters: ColumnFiltersState;
  columnOrder: string[];
  columnVisibility: VisibilityState;
  columnPinning: ColumnPinningState;
  columnSizing: ColumnSizingState;
}): PersistedTableState {
  const pinning = fromColumnPinning(input.columnPinning);

  return {
    sorting: fromTanStackSorting(input.sorting),
    filters: fromTanStackFilters(input.filters),
    columnOrder: [...input.columnOrder],
    pinLeft: pinning.left,
    pinRight: pinning.right,
    hiddenColumns: fromColumnVisibility(input.columnVisibility),
    widths: fromColumnSizing(input.columnSizing)
  };
}
