import { describe, expect, it } from "vitest";
import { formatColumnValue, parseDateValue } from "./formatters";
import type { DataTableColumn } from "./types";

type Row = {
  id: string;
  amount: number;
  createdAt: string;
  area?: string;
  goal?: string;
  goals?: string[];
};

describe("formatters", () => {
  it("formats currency and date values", () => {
    const currencyColumn: DataTableColumn<Row> = {
      id: "amount",
      field: "amount",
      header: "Amount",
      kind: "currency",
      currency: "USD",
      locale: "en-US"
    };

    const dateColumn: DataTableColumn<Row> = {
      id: "createdAt",
      field: "createdAt",
      header: "Created",
      kind: "date",
      locale: "en-US",
      dateStyle: "short"
    };

    expect(formatColumnValue(currencyColumn, 1234.5)).toContain("1,234");
    expect(formatColumnValue(dateColumn, "2026-03-05")).toMatch(/\d{1,2}\/\d{1,2}\/\d{2}/);
  });

  it("handles invalid dates gracefully", () => {
    const dateColumn: DataTableColumn<Row> = {
      id: "createdAt",
      field: "createdAt",
      header: "Created",
      kind: "date"
    };

    expect(formatColumnValue(dateColumn, "not-a-date")).toBe("");
  });

  it("normalizes parseable date input to ISO date strings", () => {
    expect(parseDateValue("2026-03-05")).toBe("2026-03-05");
    expect(parseDateValue("2026-03-05T00:00:00.000Z")).toBe("2026-03-05");
    expect(parseDateValue("3/6/26")).toBe("2026-03-06");
    expect(parseDateValue("2 de fev. de 2026", "pt-BR")).toBe("2026-02-02");
  });

  it("formats dynamic select and multiselect values against the current row", () => {
    const currentRow: Row = {
      id: "row-1",
      amount: 0,
      createdAt: "2026-03-05",
      area: "product",
      goal: "ship"
    };
    const selectColumn: DataTableColumn<Row> = {
      id: "goal",
      field: "goal",
      header: "Goal",
      kind: "select",
      getOptions: (row) =>
        row.area === "product"
          ? [{ value: "ship", label: "Ship it", colorClass: "bg-slate-100 text-slate-700" }]
          : [{ value: "hire", label: "Hire", colorClass: "bg-emerald-100 text-emerald-700" }]
    };
    const multiSelectColumn: DataTableColumn<Row> = {
      id: "goals",
      field: "goals",
      header: "Goals",
      kind: "multiselect",
      getOptions: () => [
        { value: "ship", label: "Ship it", colorClass: "bg-slate-100 text-slate-700" },
        { value: "hire", label: "Hire", colorClass: "bg-emerald-100 text-emerald-700" }
      ]
    };

    expect(formatColumnValue(selectColumn, "ship", currentRow)).toBe("Ship it");
    expect(formatColumnValue(multiSelectColumn, ["ship", "hire"], currentRow)).toBe("Ship it, Hire");
  });
});
