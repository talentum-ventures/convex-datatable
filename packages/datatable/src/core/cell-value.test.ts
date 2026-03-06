import { describe, expect, it } from "vitest";
import {
  parseClipboardToCellValue,
  serializeCellForClipboard
} from "./cell-value";
import type { DataTableColumn } from "./types";

type Row = {
  id: string;
  status: string;
  amount: number;
  tags: string[];
  meta: string;
};

const row: Row = {
  id: "1",
  status: "todo",
  amount: 123.45,
  tags: ["urgent", "ops"],
  meta: "hello"
};

describe("cell value clipboard helpers", () => {
  it("serializes select and multiselect labels", () => {
    const selectColumn: DataTableColumn<Row> = {
      id: "status",
      field: "status",
      header: "Status",
      kind: "select",
      options: [
        { value: "todo", label: "To do", colorClass: "bg-slate-100 text-slate-700" }
      ]
    };

    const multiColumn: DataTableColumn<Row> = {
      id: "tags",
      field: "tags",
      header: "Tags",
      kind: "multiselect",
      options: [
        { value: "urgent", label: "Urgent", colorClass: "bg-rose-100 text-rose-700" },
        { value: "ops", label: "Ops", colorClass: "bg-cyan-100 text-cyan-700" }
      ]
    };

    expect(serializeCellForClipboard(selectColumn, row, "todo")).toBe("To do");
    expect(serializeCellForClipboard(multiColumn, row, ["urgent", "ops"])).toBe(
      "Urgent, Ops"
    );
  });

  it("parses numeric and multiselect clipboard values", () => {
    const numberColumn: DataTableColumn<Row> = {
      id: "amount",
      field: "amount",
      header: "Amount",
      kind: "number"
    };

    const multiColumn: DataTableColumn<Row> = {
      id: "tags",
      field: "tags",
      header: "Tags",
      kind: "multiselect",
      options: [
        { value: "urgent", label: "Urgent", colorClass: "bg-rose-100 text-rose-700" }
      ]
    };

    expect(parseClipboardToCellValue(numberColumn, row, "99.5")).toBe(99.5);
    expect(parseClipboardToCellValue(multiColumn, row, "urgent, qa")).toEqual([
      "urgent",
      "qa"
    ]);
  });

  it("supports reactNode custom parse/serialize", () => {
    const reactNodeColumn: DataTableColumn<Row> = {
      id: "meta",
      field: "meta",
      header: "Meta",
      kind: "reactNode",
      parseInput: (input) => input,
      parseClipboard: (text) => text,
      serializeClipboard: (value) => String(value),
      renderCell: ({ value }) => value,
      renderEditor: ({ value, commit }) => {
        commit(value);
        return value;
      }
    };

    expect(parseClipboardToCellValue(reactNodeColumn, row, "alpha")).toBe("alpha");
    expect(serializeCellForClipboard(reactNodeColumn, row, "beta")).toBe("beta");
  });
});
