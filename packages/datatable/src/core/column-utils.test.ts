import { describe, expect, it } from "vitest";
import { diffRows, setColumnValue } from "./column-utils";

type TestRow = {
  id: string;
  name: string;
  amount: number;
  tags: ReadonlyArray<string>;
};

describe("column-utils", () => {
  it("builds a field-level patch for single cell edits", () => {
    const row: TestRow = {
      id: "row-1",
      name: "Alpha",
      amount: 10,
      tags: ["ops"]
    };

    const result = setColumnValue(
      row,
      row.id,
      {
        id: "name",
        field: "name",
        header: "Name",
        kind: "text"
      },
      "Beta"
    );

    expect(result.nextRow).toEqual({
      ...row,
      name: "Beta"
    });
    expect(result.patch).toEqual({
      rowId: "row-1",
      patch: {
        name: "Beta"
      }
    });
  });

  it("builds a minimal diff between row snapshots", () => {
    const previousRow: TestRow = {
      id: "row-1",
      name: "Alpha",
      amount: 10,
      tags: ["ops"]
    };
    const nextRow: TestRow = {
      ...previousRow,
      amount: 15,
      tags: ["ops", "priority"]
    };

    expect(diffRows(previousRow, nextRow)).toEqual({
      amount: 15,
      tags: ["ops", "priority"]
    });
  });
});
