import { describe, expect, it } from "vitest";
import { formatColumnValue } from "./formatters";
import type { DataTableColumn } from "./types";

type Row = {
  id: string;
  amount: number;
  createdAt: string;
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
});
