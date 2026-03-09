import { describe, expect, it } from "vitest";
import { formatColumnValue, parseDateValue } from "./formatters";
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

  it("normalizes parseable date input to ISO date strings", () => {
    expect(parseDateValue("2026-03-05")).toBe("2026-03-05");
    expect(parseDateValue("2026-03-05T00:00:00.000Z")).toBe("2026-03-05");
    expect(parseDateValue("3/6/26")).toBe("2026-03-06");
    expect(parseDateValue("2 de fev. de 2026", "pt-BR")).toBe("2026-02-02");
  });
});
