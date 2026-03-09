import type { DataTableCellValue } from "./types";

export function comparableSortValue(raw: DataTableCellValue): string | number | boolean | null {
  if (raw instanceof Date) {
    return raw.getTime();
  }

  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
    return raw;
  }

  if (raw === null || raw === undefined) {
    return null;
  }

  if (Array.isArray(raw)) {
    return raw.map((entry) => String(entry)).join(",");
  }

  return String(raw);
}

export function compareValues(left: string | number | boolean | null, right: string | number | boolean | null): number {
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
