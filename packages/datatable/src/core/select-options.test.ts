import { describe, expect, it } from "vitest";
import { getStaticOptions, resolveOptions } from "./select-options";
import type { DataTableColumn } from "./types";

type Row = {
  id: string;
  area: string;
  goal: string;
};

const row: Row = {
  id: "row-1",
  area: "product",
  goal: "ship"
};

describe("select option helpers", () => {
  it("resolves static and row-aware options", () => {
    const staticColumn: DataTableColumn<Row> = {
      id: "goal",
      field: "goal",
      header: "Goal",
      kind: "select",
      options: [
        { value: "ship", label: "Ship", colorClass: "bg-slate-100 text-slate-700" }
      ]
    };
    const dynamicColumn: DataTableColumn<Row> = {
      id: "goal",
      field: "goal",
      header: "Goal",
      kind: "select",
      getOptions: (currentRow) =>
        currentRow.area === "product"
          ? [{ value: "ship", label: "Ship", colorClass: "bg-slate-100 text-slate-700" }]
          : [{ value: "hire", label: "Hire", colorClass: "bg-emerald-100 text-emerald-700" }]
    };

    expect(resolveOptions(staticColumn, row)).toEqual(staticColumn.options);
    expect(resolveOptions(dynamicColumn, row)).toEqual([
      { value: "ship", label: "Ship", colorClass: "bg-slate-100 text-slate-700" }
    ]);
    expect(getStaticOptions(dynamicColumn)).toEqual([]);
  });
});
