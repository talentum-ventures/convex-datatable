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
  due: string;
  meta: string;
};

const row: Row = {
  id: "1",
  status: "todo",
  amount: 123.45,
  tags: ["urgent", "ops"],
  due: "2026-03-05",
  meta: "hello"
};

function expectValidParse<TValue>(value: { ok: true; value: TValue } | { ok: false; message: string }): TValue {
  expect(value.ok).toBe(true);
  if (!value.ok) {
    throw new Error(`Expected parse to succeed, received: ${value.message}`);
  }
  return value.value;
}

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

  it("serializes dates as ISO clipboard values", () => {
    const dateColumn: DataTableColumn<Row> = {
      id: "due",
      field: "due",
      header: "Due",
      kind: "date",
      locale: "pt-BR",
      dateStyle: "medium"
    };

    expect(serializeCellForClipboard(dateColumn, row, "2026-02-02")).toBe("2026-02-02");
  });

  it("parses numeric clipboard values", () => {
    const numberColumn: DataTableColumn<Row> = {
      id: "amount",
      field: "amount",
      header: "Amount",
      kind: "number"
    };

    expect(expectValidParse(parseClipboardToCellValue(numberColumn, row, "99.5"))).toBe(99.5);
  });

  it("canonicalizes select values from labels and stored values", () => {
    const selectColumn: DataTableColumn<Row> = {
      id: "status",
      field: "status",
      header: "Status",
      kind: "select",
      options: [
        { value: "todo", label: "To do", colorClass: "bg-slate-100 text-slate-700" },
        { value: "done", label: "Done", colorClass: "bg-emerald-100 text-emerald-700" }
      ]
    };

    expect(expectValidParse(parseClipboardToCellValue(selectColumn, row, "To do"))).toBe("todo");
    expect(expectValidParse(parseClipboardToCellValue(selectColumn, row, "todo"))).toBe("todo");
    expect(expectValidParse(parseClipboardToCellValue(selectColumn, row, "  Done  "))).toBe("done");
  });

  it("canonicalizes multiselect values from labels and stored values", () => {
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

    expect(expectValidParse(parseClipboardToCellValue(multiColumn, row, "Urgent, Ops"))).toEqual([
      "urgent",
      "ops"
    ]);
    expect(expectValidParse(parseClipboardToCellValue(multiColumn, row, "urgent, ops"))).toEqual([
      "urgent",
      "ops"
    ]);
    expect(
      expectValidParse(parseClipboardToCellValue(multiColumn, row, "  Urgent , ops , Urgent  "))
    ).toEqual(["urgent", "ops"]);
  });

  it("normalizes parseable date text to ISO values", () => {
    const portugueseDateColumn: DataTableColumn<Row> = {
      id: "due",
      field: "due",
      header: "Due",
      kind: "date",
      locale: "pt-BR"
    };

    const usDateColumn: DataTableColumn<Row> = {
      id: "due",
      field: "due",
      header: "Due",
      kind: "date",
      locale: "en-US"
    };

    expect(expectValidParse(parseClipboardToCellValue(portugueseDateColumn, row, "2026-03-05"))).toBe("2026-03-05");
    expect(expectValidParse(parseClipboardToCellValue(usDateColumn, row, "3/6/26"))).toBe("2026-03-06");
    expect(expectValidParse(parseClipboardToCellValue(portugueseDateColumn, row, "2 de fev. de 2026"))).toBe("2026-02-02");
  });

  it("rejects unknown select and multiselect tokens", () => {
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
        { value: "urgent", label: "Urgent", colorClass: "bg-rose-100 text-rose-700" }
      ]
    };

    expect(parseClipboardToCellValue(selectColumn, row, "Missing option")).toEqual({
      ok: false,
      message: 'Invalid option "Missing option"'
    });
    expect(parseClipboardToCellValue(multiColumn, row, "Urgent, Missing")).toEqual({
      ok: false,
      message: 'Invalid option "Missing"'
    });
  });

  it("preserves custom parseClipboard and parseInput behavior", () => {
    const selectColumn: DataTableColumn<Row> = {
      id: "status",
      field: "status",
      header: "Status",
      kind: "select",
      options: [
        { value: "todo", label: "To do", colorClass: "bg-slate-100 text-slate-700" }
      ],
      parseClipboard: (text) => `clipboard:${text}`,
      parseInput: (input) => `input:${input}`
    };

    const textColumn: DataTableColumn<Row> = {
      id: "meta",
      field: "meta",
      header: "Meta",
      kind: "text",
      parseInput: (input) => `input:${input}`
    };

    expect(expectValidParse(parseClipboardToCellValue(selectColumn, row, "To do"))).toBe("clipboard:To do");
    expect(expectValidParse(parseClipboardToCellValue(textColumn, row, "alpha"))).toBe("input:alpha");
  });

  it("uses row-aware options when serializing and parsing select values", () => {
    const currentRow = {
      ...row,
      meta: "product"
    };
    const selectColumn: DataTableColumn<Row> = {
      id: "status",
      field: "status",
      header: "Status",
      kind: "select",
      getOptions: (sourceRow) =>
        sourceRow.meta === "product"
          ? [{ value: "todo", label: "Product todo", colorClass: "bg-slate-100 text-slate-700" }]
          : [{ value: "done", label: "Ops done", colorClass: "bg-emerald-100 text-emerald-700" }]
    };
    const multiColumn: DataTableColumn<Row> = {
      id: "tags",
      field: "tags",
      header: "Tags",
      kind: "multiselect",
      getOptions: (sourceRow) =>
        sourceRow.meta === "product"
          ? [
              { value: "urgent", label: "Product urgent", colorClass: "bg-rose-100 text-rose-700" },
              { value: "ops", label: "Product ops", colorClass: "bg-cyan-100 text-cyan-700" }
            ]
          : [{ value: "ops", label: "Ops", colorClass: "bg-cyan-100 text-cyan-700" }]
    };

    expect(serializeCellForClipboard(selectColumn, currentRow, "todo")).toBe("Product todo");
    expect(serializeCellForClipboard(multiColumn, currentRow, ["urgent", "ops"])).toBe(
      "Product urgent, Product ops"
    );
    expect(expectValidParse(parseClipboardToCellValue(selectColumn, currentRow, "Product todo"))).toBe(
      "todo"
    );
    expect(
      expectValidParse(parseClipboardToCellValue(multiColumn, currentRow, "Product urgent, Product ops"))
    ).toEqual(["urgent", "ops"]);
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

    expect(expectValidParse(parseClipboardToCellValue(reactNodeColumn, row, "alpha"))).toBe("alpha");
    expect(serializeCellForClipboard(reactNodeColumn, row, "beta")).toBe("beta");
  });
});
