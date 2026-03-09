import { describe, expect, it } from "vitest";
import { applyClientQuery, canHandleGridPaste, shouldCenterHeaderContent } from "./data-table";
import type { DataTableColumn } from "../core/types";

describe("grid paste ownership", () => {
  const baseArgs = {
    clipboardPaste: true,
    editing: true,
    cellSelect: true,
    editingCell: null,
    hasUpdateRows: true
  } as const;

  it("handles paste for the grid shell in selection mode", () => {
    const target = document.createElement("div");

    expect(
      canHandleGridPaste({
        ...baseArgs,
        target
      })
    ).toBe(true);
  });

  it("does not handle paste when cell selection is disabled", () => {
    const target = document.createElement("div");

    expect(
      canHandleGridPaste({
        ...baseArgs,
        cellSelect: false,
        target
      })
    ).toBe(false);
  });

  it("does not handle paste while a cell editor is active", () => {
    const target = document.createElement("div");

    expect(
      canHandleGridPaste({
        ...baseArgs,
        editingCell: {
          rowId: "row-1",
          columnId: "title"
        },
        target
      })
    ).toBe(false);
  });

  it("does not handle paste for editable targets", () => {
    const input = document.createElement("input");
    const textarea = document.createElement("textarea");
    const select = document.createElement("select");
    const contentEditable = document.createElement("div");
    const editorRoot = document.createElement("div");

    contentEditable.setAttribute("contenteditable", "true");
    editorRoot.dataset.dtEditorRoot = "true";

    expect(canHandleGridPaste({ ...baseArgs, target: input })).toBe(false);
    expect(canHandleGridPaste({ ...baseArgs, target: textarea })).toBe(false);
    expect(canHandleGridPaste({ ...baseArgs, target: select })).toBe(false);
    expect(canHandleGridPaste({ ...baseArgs, target: contentEditable })).toBe(false);
    expect(canHandleGridPaste({ ...baseArgs, target: editorRoot })).toBe(false);
  });
});

describe("header content alignment", () => {
  it("centers the select column header content", () => {
    expect(shouldCenterHeaderContent("__select__")).toBe(true);
  });

  it("keeps standard columns on the default header layout", () => {
    expect(shouldCenterHeaderContent("name")).toBe(false);
    expect(shouldCenterHeaderContent("__actions__")).toBe(false);
  });
});

describe("client query fallback", () => {
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
