import type { DataTableFilter, DataTableQueryState } from "@rolha/datatable";
import { applyServerQuery, filterRow } from "./demo-query";

type DemoQueryRow = {
  id: string;
  title: string;
  status: string;
  tags: ReadonlyArray<string>;
};

const tagsFilter: DataTableFilter = {
  columnId: "tags",
  op: "in",
  value: ["ops"]
};

describe("demo query helpers", () => {
  it("matches multiselect rows when the selected value is one of several tags", () => {
    const row: DemoQueryRow = {
      id: "1",
      title: "Urgent Ops",
      status: "todo",
      tags: ["urgent", "ops"]
    };

    expect(filterRow(row, tagsFilter)).toBe(true);
  });

  it("matches multiselect rows when any selected value is present", () => {
    const row: DemoQueryRow = {
      id: "1",
      title: "Urgent Ops",
      status: "todo",
      tags: ["urgent", "ops"]
    };

    expect(
      filterRow(row, {
        columnId: "tags",
        op: "in",
        value: ["qa", "ops"]
      })
    ).toBe(true);
  });

  it("does not match multiselect rows when none of the selected values are present", () => {
    const row: DemoQueryRow = {
      id: "1",
      title: "Urgent Backend",
      status: "todo",
      tags: ["urgent", "backend"]
    };

    expect(filterRow(row, tagsFilter)).toBe(false);
  });

  it("preserves scalar select membership checks", () => {
    const row: DemoQueryRow = {
      id: "1",
      title: "Todo Task",
      status: "todo",
      tags: []
    };

    expect(
      filterRow(row, {
        columnId: "status",
        op: "in",
        value: ["todo"]
      })
    ).toBe(true);
  });

  it("returns ops-only and mixed-tag rows when filtering by ops", () => {
    const rows: ReadonlyArray<DemoQueryRow> = [
      { id: "1", title: "Ops only", status: "todo", tags: ["ops"] },
      { id: "2", title: "Urgent Ops", status: "done", tags: ["urgent", "ops"] },
      { id: "3", title: "Backend only", status: "todo", tags: ["backend"] }
    ];
    const state: DataTableQueryState = {
      sorting: [],
      filters: [tagsFilter],
      pageSize: 50,
      cursor: null
    };

    expect(applyServerQuery(rows, state).map((row) => row.id)).toEqual(["1", "2"]);
  });
});
