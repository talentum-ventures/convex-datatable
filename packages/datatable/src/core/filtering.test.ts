import { describe, expect, it } from "vitest";
import {
  applyClientQuery,
  defaultFilterOperatorForColumn,
  filterOperatorsForColumn,
  isActiveFilterValue,
  resolveAllowEmptyFilter,
  rowMatchesFilter
} from "./filtering";
import type { DataTableColumn } from "./types";

type TestRow = {
  id: string;
  title: string;
  status: string;
  due: string;
  amount: number;
  tags: ReadonlyArray<string>;
  archived: boolean;
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
    id: "tags",
    field: "tags",
    header: "Tags",
    kind: "multiselect",
    options: [
      { value: "ops", label: "Ops", colorClass: "bg-sky-100 text-sky-700" },
      { value: "backend", label: "Backend", colorClass: "bg-slate-100 text-slate-700" }
    ]
  },
  {
    id: "amount",
    field: "amount",
    header: "Amount",
    kind: "number"
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
  it("resolves allowEmptyFilter defaults by column kind and respects overrides", () => {
    expect(resolveAllowEmptyFilter(columns[0]!)).toBe(false);
    expect(resolveAllowEmptyFilter(columns[1]!)).toBe(true);
    expect(resolveAllowEmptyFilter(columns[2]!)).toBe(true);
    expect(resolveAllowEmptyFilter(columns[4]!)).toBe(false);

    const textColumn: DataTableColumn<TestRow> = {
      id: "title-empty",
      field: "title",
      header: "Title with empty filter",
      kind: "text",
      allowEmptyFilter: true
    };
    const selectColumn: DataTableColumn<TestRow> = {
      id: "status-no-empty",
      field: "status",
      header: "Status without empty filter",
      kind: "select",
      allowEmptyFilter: false,
      options: [{ value: "todo", label: "To do", colorClass: "bg-slate-100 text-slate-700" }]
    };

    expect(resolveAllowEmptyFilter(textColumn)).toBe(true);
    expect(resolveAllowEmptyFilter(selectColumn)).toBe(false);
  });

  it("returns operator sets by column kind", () => {
    expect(filterOperatorsForColumn(columns[0]!)).toEqual(["contains", "startsWith", "endsWith", "eq", "neq"]);
    expect(filterOperatorsForColumn(columns[1]!)).toEqual(["in", "isEmpty", "isNotEmpty"]);
    expect(filterOperatorsForColumn(columns[2]!)).toEqual(["in", "isEmpty", "isNotEmpty"]);
    expect(filterOperatorsForColumn(columns[3]!)).toEqual(["eq", "neq", "gt", "gte", "lt", "lte"]);
    expect(filterOperatorsForColumn(columns[4]!)).toEqual(["eq", "neq", "gt", "gte", "lt", "lte"]);
  });

  it("returns the default operator for each kind", () => {
    expect(defaultFilterOperatorForColumn(columns[0]!)).toBe("contains");
    expect(defaultFilterOperatorForColumn(columns[1]!)).toBe("in");
    expect(defaultFilterOperatorForColumn(columns[4]!)).toBe("eq");
  });

  it("recognizes active and inactive filter values", () => {
    expect(isActiveFilterValue({ op: "eq", value: "" })).toBe(false);
    expect(isActiveFilterValue({ op: "in", value: [] })).toBe(false);
    expect(isActiveFilterValue({ op: "eq", value: null })).toBe(false);
    expect(isActiveFilterValue({ op: "eq", value: "todo" })).toBe(true);
    expect(isActiveFilterValue({ op: "in", value: ["todo"] })).toBe(true);
    expect(isActiveFilterValue({ op: "eq", value: 0 })).toBe(true);
    expect(isActiveFilterValue({ op: "isEmpty", value: null })).toBe(true);
    expect(isActiveFilterValue({ op: "isNotEmpty", value: null })).toBe(true);
  });

  it("filters select columns with in semantics when the data source does not pre-filter", () => {
    const rows: ReadonlyArray<TestRow> = [
      { id: "1", title: "Build UI", status: "todo", tags: ["ops"], amount: 10, archived: false, due: "2026-03-05" },
      { id: "2", title: "Ship", status: "done", tags: ["backend"], amount: 20, archived: true, due: "2026-04-09" }
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

  it("matches empty and non-empty filters across strings, arrays, numbers, and booleans", () => {
    const emptyRow: TestRow = {
      id: "1",
      title: "   ",
      status: "",
      tags: [],
      amount: 0,
      archived: false,
      due: ""
    };
    const filledRow: TestRow = {
      id: "2",
      title: "Build UI",
      status: "todo",
      tags: ["ops"],
      amount: 10,
      archived: true,
      due: "2026-03-05"
    };

    expect(rowMatchesFilter(emptyRow, { columnId: "title", op: "isEmpty", value: null }, columnById.get("title"))).toBe(true);
    expect(rowMatchesFilter(filledRow, { columnId: "title", op: "isNotEmpty", value: null }, columnById.get("title"))).toBe(true);
    expect(rowMatchesFilter(emptyRow, { columnId: "tags", op: "isEmpty", value: null }, columnById.get("tags"))).toBe(true);
    expect(rowMatchesFilter(filledRow, { columnId: "tags", op: "isNotEmpty", value: null }, columnById.get("tags"))).toBe(true);
    expect(rowMatchesFilter(emptyRow, { columnId: "amount", op: "isEmpty", value: null }, columnById.get("amount"))).toBe(false);
    expect(rowMatchesFilter(emptyRow, { columnId: "archived", op: "isEmpty", value: null }, undefined)).toBe(false);
  });

  it("filters rows with empty operators when the data source does not pre-filter", () => {
    const rows: ReadonlyArray<TestRow> = [
      { id: "1", title: "", status: "", tags: [], amount: 0, archived: false, due: "" },
      { id: "2", title: "Build UI", status: "todo", tags: ["ops"], amount: 10, archived: true, due: "2026-03-05" },
      { id: "3", title: "Ship", status: "done", tags: ["backend"], amount: 20, archived: true, due: "2026-04-09" }
    ];

    expect(
      applyClientQuery(
        rows,
        {
          sorting: [],
          filters: [{ columnId: "status", op: "isEmpty", value: null }]
        },
        columnById
      ).map((row) => row.id)
    ).toEqual(["1"]);

    expect(
      applyClientQuery(
        rows,
        {
          sorting: [],
          filters: [{ columnId: "tags", op: "isNotEmpty", value: null }]
        },
        columnById
      ).map((row) => row.id)
    ).toEqual(["2", "3"]);
  });

  it("sorts date columns by their canonical date value", () => {
    const rows: ReadonlyArray<TestRow> = [
      { id: "1", title: "Build UI", status: "todo", tags: ["ops"], amount: 10, archived: false, due: "2026-04-09" },
      { id: "2", title: "Ship", status: "done", tags: ["backend"], amount: 20, archived: true, due: "2026-03-05" }
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
