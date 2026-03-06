import type { DataTableOnError, PersistedTableState } from "../core/types";
import { emptyPersistedState } from "./query-codec";

export function readPersistedState(
  key: string,
  onError: DataTableOnError | undefined
): PersistedTableState {
  if (typeof window === "undefined") {
    return emptyPersistedState();
  }

  const value = window.localStorage.getItem(key);
  if (!value) {
    return emptyPersistedState();
  }

  try {
    const parsed = JSON.parse(value) as {
      sorting?: PersistedTableState["sorting"];
      filters?: PersistedTableState["filters"];
      columnOrder?: PersistedTableState["columnOrder"];
      pinLeft?: PersistedTableState["pinLeft"];
      pinRight?: PersistedTableState["pinRight"];
      hiddenColumns?: PersistedTableState["hiddenColumns"];
      widths?: PersistedTableState["widths"];
    };

    return {
      sorting: parsed.sorting ?? [],
      filters: parsed.filters ?? [],
      columnOrder: parsed.columnOrder ?? [],
      pinLeft: parsed.pinLeft ?? [],
      pinRight: parsed.pinRight ?? [],
      hiddenColumns: parsed.hiddenColumns ?? [],
      widths: parsed.widths ?? {}
    };
  } catch (error) {
    if (onError) {
      onError(`Failed to parse table state from localStorage: ${String(error)}`);
    }
    return emptyPersistedState();
  }
}

export function writePersistedState(
  key: string,
  state: PersistedTableState,
  onError: DataTableOnError | undefined
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    if (onError) {
      onError("Failed to persist table state to localStorage");
    }
  }
}
