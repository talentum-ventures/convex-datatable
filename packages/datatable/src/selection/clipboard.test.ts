import { describe, expect, it } from "vitest";
import { expandPasteMatrix, parseTsv, serializeTsv } from "./clipboard";
import { normalizeRange, selectionDimensions } from "./range";

describe("selection helpers", () => {
  it("normalizes selection ranges", () => {
    const normalized = normalizeRange({
      start: { rowIndex: 4, columnIndex: 3 },
      end: { rowIndex: 1, columnIndex: 0 }
    });

    expect(normalized).toEqual({
      start: { rowIndex: 1, columnIndex: 0 },
      end: { rowIndex: 4, columnIndex: 3 }
    });
    expect(selectionDimensions(normalized)).toEqual({ rows: 4, columns: 4 });
  });

  it("serializes and parses TSV", () => {
    const tsv = serializeTsv([
      ["A1", "B1"],
      ["A2", "B2"]
    ]);

    expect(tsv).toBe("A1\tB1\nA2\tB2");
    expect(parseTsv(tsv)).toEqual([
      ["A1", "B1"],
      ["A2", "B2"]
    ]);
  });

  it("expands pasted matrix to target selection", () => {
    const expanded = expandPasteMatrix(
      [
        ["X", "Y"],
        ["1", "2"]
      ],
      {
        start: { rowIndex: 0, columnIndex: 0 },
        end: { rowIndex: 3, columnIndex: 2 }
      }
    );

    expect(expanded).toEqual([
      ["X", "Y", "X"],
      ["1", "2", "1"],
      ["X", "Y", "X"],
      ["1", "2", "1"]
    ]);
  });
});
