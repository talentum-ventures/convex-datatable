import type { CellRange } from "../core/types";
import { normalizeRange } from "./range";

export function serializeTsv(values: ReadonlyArray<ReadonlyArray<string>>): string {
  return values.map((row) => row.join("\t")).join("\n");
}

export function parseTsv(input: string): ReadonlyArray<ReadonlyArray<string>> {
  const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (normalized.trim().length === 0) {
    return [];
  }

  return normalized.split("\n").map((line) => line.split("\t"));
}

export function extractRangeMatrix(
  allRows: ReadonlyArray<ReadonlyArray<string>>,
  range: CellRange
): ReadonlyArray<ReadonlyArray<string>> {
  const normalized = normalizeRange(range);
  const output: string[][] = [];

  for (let rowIndex = normalized.start.rowIndex; rowIndex <= normalized.end.rowIndex; rowIndex += 1) {
    const row = allRows[rowIndex] ?? [];
    const selected: string[] = [];

    for (
      let columnIndex = normalized.start.columnIndex;
      columnIndex <= normalized.end.columnIndex;
      columnIndex += 1
    ) {
      selected.push(row[columnIndex] ?? "");
    }

    output.push(selected);
  }

  return output;
}

export function expandPasteMatrix(
  parsed: ReadonlyArray<ReadonlyArray<string>>,
  targetRange: CellRange
): ReadonlyArray<ReadonlyArray<string>> {
  const normalized = normalizeRange(targetRange);
  const height = normalized.end.rowIndex - normalized.start.rowIndex + 1;
  const width = normalized.end.columnIndex - normalized.start.columnIndex + 1;

  if (parsed.length === 0) {
    return [];
  }

  const output: string[][] = [];

  for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
    const sourceRow = parsed[rowIndex % parsed.length] ?? [""];
    const rowValues: string[] = [];

    for (let columnIndex = 0; columnIndex < width; columnIndex += 1) {
      rowValues.push(sourceRow[columnIndex % sourceRow.length] ?? "");
    }

    output.push(rowValues);
  }

  return output;
}
