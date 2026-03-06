import type {
  ColumnId,
  DataTableFilter,
  DataTableFilterValue,
  DataTableOnError,
  DataTableSort,
  PersistedTableState
} from "../core/types";
import { EMPTY_PERSISTED_STATE } from "../core/defaults";

function key(tableId: string, suffix: string): string {
  return `dt_${tableId}_${suffix}`;
}

function parseNumber(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function encodeFilterValue(value: DataTableFilterValue): string {
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
  if (typeof value === "string") {
    return `s:${encodeURIComponent(value)}`;
  }
  return "s:";
}

function decodeFilterValue(value: string): DataTableFilterValue | null {
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

function encodeSorting(sorting: ReadonlyArray<DataTableSort>): ReadonlyArray<string> {
  return sorting.map((entry) => `${entry.columnId}.${entry.direction}`);
}

function decodeSorting(
  rawEntries: ReadonlyArray<string>,
  onError: DataTableOnError | undefined
): ReadonlyArray<DataTableSort> {
  const result: DataTableSort[] = [];

  for (const raw of rawEntries) {
    const [columnId, direction] = raw.split(".");
    if (!columnId || (direction !== "asc" && direction !== "desc")) {
      if (onError) {
        onError(`Ignoring invalid sort entry: ${raw}`);
      }
      continue;
    }
    result.push({ columnId, direction });
  }

  return result;
}

function encodeFilters(filters: ReadonlyArray<DataTableFilter>): ReadonlyArray<string> {
  return filters.map(
    (entry) => `${entry.columnId}.${entry.op}.${encodeFilterValue(entry.value)}`
  );
}

function decodeFilters(
  rawEntries: ReadonlyArray<string>,
  onError: DataTableOnError | undefined
): ReadonlyArray<DataTableFilter> {
  const result: DataTableFilter[] = [];

  for (const raw of rawEntries) {
    const firstDot = raw.indexOf(".");
    const secondDot = raw.indexOf(".", firstDot + 1);

    if (firstDot < 0 || secondDot < 0) {
      if (onError) {
        onError(`Ignoring invalid filter entry: ${raw}`);
      }
      continue;
    }

    const columnId = raw.slice(0, firstDot);
    const op = raw.slice(firstDot + 1, secondDot);
    const serializedValue = raw.slice(secondDot + 1);

    if (columnId.length === 0) {
      continue;
    }

    if (
      op !== "eq" &&
      op !== "neq" &&
      op !== "contains" &&
      op !== "startsWith" &&
      op !== "endsWith" &&
      op !== "gt" &&
      op !== "gte" &&
      op !== "lt" &&
      op !== "lte" &&
      op !== "in"
    ) {
      if (onError) {
        onError(`Ignoring invalid filter operator: ${op}`);
      }
      continue;
    }

    const value = decodeFilterValue(serializedValue);
    if (value === null && serializedValue !== "n:null") {
      if (onError) {
        onError(`Ignoring invalid filter value: ${serializedValue}`);
      }
      continue;
    }

    result.push({
      columnId,
      op,
      value
    });
  }

  return result;
}

function encodeList(value: ReadonlyArray<ColumnId>): string {
  return value.join(",");
}

function decodeList(value: string): ReadonlyArray<ColumnId> {
  if (value.length === 0) {
    return [];
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function encodeWidths(widths: Readonly<Record<ColumnId, number>>): ReadonlyArray<string> {
  return Object.entries(widths).map(([columnId, width]) => `${columnId}.${width}`);
}

function decodeWidths(
  rawEntries: ReadonlyArray<string>,
  onError: DataTableOnError | undefined
): Readonly<Record<ColumnId, number>> {
  const result: Record<ColumnId, number> = {};

  for (const raw of rawEntries) {
    const separator = raw.indexOf(".");
    if (separator < 0) {
      if (onError) {
        onError(`Ignoring invalid width entry: ${raw}`);
      }
      continue;
    }

    const columnId = raw.slice(0, separator);
    const widthRaw = raw.slice(separator + 1);
    const width = parseNumber(widthRaw);

    if (!columnId || width === null || width <= 0) {
      if (onError) {
        onError(`Ignoring invalid width entry: ${raw}`);
      }
      continue;
    }

    result[columnId] = width;
  }

  return result;
}

export function encodePersistedStateToUrl(
  tableId: string,
  state: PersistedTableState,
  current: URLSearchParams
): URLSearchParams {
  const next = new URLSearchParams(current.toString());

  next.delete(key(tableId, "sort"));
  for (const sortEntry of encodeSorting(state.sorting)) {
    next.append(key(tableId, "sort"), sortEntry);
  }

  next.delete(key(tableId, "filter"));
  for (const filterEntry of encodeFilters(state.filters)) {
    next.append(key(tableId, "filter"), filterEntry);
  }

  next.set(key(tableId, "order"), encodeList(state.columnOrder));
  next.set(key(tableId, "pin_left"), encodeList(state.pinLeft));
  next.set(key(tableId, "pin_right"), encodeList(state.pinRight));
  next.set(key(tableId, "hidden"), encodeList(state.hiddenColumns));

  next.delete(key(tableId, "width"));
  for (const widthEntry of encodeWidths(state.widths)) {
    next.append(key(tableId, "width"), widthEntry);
  }

  return next;
}

export function decodePersistedStateFromUrl(
  tableId: string,
  params: URLSearchParams,
  onError: DataTableOnError | undefined
): PersistedTableState {
  return {
    sorting: decodeSorting(params.getAll(key(tableId, "sort")), onError),
    filters: decodeFilters(params.getAll(key(tableId, "filter")), onError),
    columnOrder: decodeList(params.get(key(tableId, "order")) ?? ""),
    pinLeft: decodeList(params.get(key(tableId, "pin_left")) ?? ""),
    pinRight: decodeList(params.get(key(tableId, "pin_right")) ?? ""),
    hiddenColumns: decodeList(params.get(key(tableId, "hidden")) ?? ""),
    widths: decodeWidths(params.getAll(key(tableId, "width")), onError)
  };
}

export function mergePersistedState(
  fromUrl: PersistedTableState,
  fromStorage: PersistedTableState
): PersistedTableState {
  return {
    sorting: fromUrl.sorting.length > 0 ? fromUrl.sorting : fromStorage.sorting,
    filters: fromUrl.filters.length > 0 ? fromUrl.filters : fromStorage.filters,
    columnOrder:
      fromUrl.columnOrder.length > 0 ? fromUrl.columnOrder : fromStorage.columnOrder,
    pinLeft: fromUrl.pinLeft.length > 0 ? fromUrl.pinLeft : fromStorage.pinLeft,
    pinRight: fromUrl.pinRight.length > 0 ? fromUrl.pinRight : fromStorage.pinRight,
    hiddenColumns:
      fromUrl.hiddenColumns.length > 0 ? fromUrl.hiddenColumns : fromStorage.hiddenColumns,
    widths:
      Object.keys(fromUrl.widths).length > 0 ? fromUrl.widths : fromStorage.widths
  };
}

export function storageKey(pathname: string, tableId: string): string {
  return `rolha-grid:${pathname}:${tableId}:state:v1`;
}

export function emptyPersistedState(): PersistedTableState {
  return {
    ...EMPTY_PERSISTED_STATE,
    widths: { ...EMPTY_PERSISTED_STATE.widths }
  };
}
