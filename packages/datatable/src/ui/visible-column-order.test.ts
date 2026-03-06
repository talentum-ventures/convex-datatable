import { describe, expect, it } from "vitest";
import type { Column, Table } from "@tanstack/react-table";
import {
  getVisibleDataColumnIdsInUiOrder,
  getVisibleLeafColumnIdsInUiOrder
} from "./visible-column-order";

type TestRow = {
  id: string;
  title: string;
  status: string;
  amount: number;
};

function toColumns(ids: ReadonlyArray<string>): Array<Column<TestRow, string>> {
  return ids.map((id) => ({ id }) as Column<TestRow, string>);
}

function createTable(args: {
  left?: ReadonlyArray<string>;
  center?: ReadonlyArray<string>;
  right?: ReadonlyArray<string>;
}): Table<TestRow> {
  const table = {
    getLeftVisibleLeafColumns: () => toColumns(args.left ?? []),
    getCenterVisibleLeafColumns: () => toColumns(args.center ?? []),
    getRightVisibleLeafColumns: () => toColumns(args.right ?? [])
  };

  return table as Table<TestRow>;
}

describe("visible column order", () => {
  it("returns the base order when no columns are pinned", () => {
    const table = createTable({
      center: ["title", "status", "amount"]
    });

    expect(getVisibleLeafColumnIdsInUiOrder(table)).toEqual(["title", "status", "amount"]);
  });

  it("moves left-pinned columns to the front in pin order", () => {
    const table = createTable({
      left: ["status", "title"],
      center: ["amount"]
    });

    expect(getVisibleLeafColumnIdsInUiOrder(table)).toEqual(["status", "title", "amount"]);
  });

  it("moves right-pinned columns to the end in pin order", () => {
    const table = createTable({
      center: ["title", "status"],
      right: ["amount", "website"]
    });

    expect(getVisibleLeafColumnIdsInUiOrder(table)).toEqual(["title", "status", "amount", "website"]);
  });

  it("excludes utility columns from the visible data order", () => {
    const table = createTable({
      left: ["__select__"],
      center: ["title", "status"],
      right: ["__actions__"]
    });

    expect(getVisibleDataColumnIdsInUiOrder(table)).toEqual(["title", "status"]);
  });
});
