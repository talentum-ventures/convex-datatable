import { describe, expect, it } from "vitest";
import { applyClientQuery, defaultFilterOperatorForColumn, filterOperatorsForColumn, isActiveFilterValue } from "./filtering";
import type { DataTableColumn } from "./types";

type TestRow = {
  id: string;
  title: string;
  status: string;
  due: string;
};

const columns: ReadonlyArray<DataTableColumn<TestRow>> = [
  {
    id: "title",
    field: "title",
    header: "Title",
    kind: "text"
  },
  {
    id: "status",
    field: "status",
    header: "Status",
    kind: "select",
    options: [
      { value: "todo", label: "To do", colorClass: "bg-slate-100 text-slate-700" },
      { value: "done", label: "Done", colorClass: "bg-emerald-100 text-emerald-700" }
    ]
  },
  {
    id: "due",
    field: "due",
    header: "Due",
    kind: "date",
    locale: "pt-BR"
  }
];

const columnById = new Map(columns.map((column) => [column.id, column] as const));

describe("filtering", () => {
  it("returns operator sets by column kind", () => {
    expect(filterOperatorsForColumn(columns[0]!)).toEqual(["contains", "startsWith", "endsWith", "eq", "neq"]);
    expect(filterOperatorsForColumn(columns[1]!)).toEqual(["in"]);
    expect(filterOperatorsForColumn(columns[2]!)).toEqual(["eq", "neq", "gt", "gte", "lt", "lte"]);
  });

  it("returns the default operator for each kind", () => {
    expect(defaultFilterOperatorForColumn(columns[0]!)).toBe("contains");
    expect(defaultFilterOperatorForColumn(columns[1]!)).toBe("in");
    expect(defaultFilterOperatorForColumn(columns[2]!)).toBe("eq");
  });

  it("recognizes active and inactive filter values", () => {
    expect(isActiveFilterValue("")).toBe(false);
    expect(isActiveFilterValue([])).toBe(false);
    expect(isActiveFilterValue(null)).toBe(false);
    expect(isActiveFilterValue("todo")).toBe(true);
    expect(isActiveFilterValue(["todo"])).toBe(true);
    expect(isActiveFilterValue(0)).toBe(true);
  });

  it("filters select columns with in semantics when the data source does not pre-filter", () => {
    const rows: ReadonlyArray<TestRow> = [
      { id: "1", title: "Build UI", status: "todo", due: "2026-03-05" },
      { id: "2", title: "Ship", status: "done", due: "2026-04-09" }
    ];

    expect(
      applyClientQuery(
        rows,
        {
          sorting: [],
          filters: [{ columnId: "status", op: "in", value: ["todo"] }]
        },
        columnById
      ).map((row) => row.id)
    ).toEqual(["1"]);
  });

  it("sorts date columns by their canonical date value", () => {
    const rows: ReadonlyArray<TestRow> = [
      { id: "1", title: "Build UI", status: "todo", due: "2026-04-09" },
      { id: "2", title: "Ship", status: "done", due: "2026-03-05" }
    ];

    expect(
      applyClientQuery(
        rows,
        {
          sorting: [{ columnId: "due", direction: "asc" }],
          filters: []
        },
        columnById
      ).map((row) => row.id)
    ).toEqual(["2", "1"]);
  });
});
