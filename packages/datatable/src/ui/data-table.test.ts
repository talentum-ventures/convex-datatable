import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { CollaboratorCellCoord, DataTableColumn, DataTableDataSource } from "../core/types";
import { DataTable, canHandleGridPaste, shouldCenterHeaderContent } from "./data-table";

type TestRow = {
  id: string;
  name: string;
};

const columns: ReadonlyArray<DataTableColumn<TestRow>> = [
  {
    id: "name",
    field: "name",
    header: "Name",
    kind: "text"
  }
];

function createDataSource(rows: ReadonlyArray<TestRow>): DataTableDataSource<TestRow> {
  return {
    useRows: () => ({
      rows,
      hasMore: false,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      loadMore: () => undefined,
      refresh: () => undefined
    })
  };
}

const originalResizeObserver = globalThis.ResizeObserver;

beforeAll(() => {
  class ResizeObserverMock implements ResizeObserver {
    readonly #callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.#callback = callback;
    }

    disconnect(): void {}

    observe(): void {}

    takeRecords(): ResizeObserverEntry[] {
      void this.#callback;
      return [];
    }

    unobserve(): void {}
  }

  globalThis.ResizeObserver = ResizeObserverMock;
});

afterAll(() => {
  if (originalResizeObserver) {
    globalThis.ResizeObserver = originalResizeObserver;
    return;
  }

  Reflect.deleteProperty(globalThis, "ResizeObserver");
});

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

describe("DataTable surfaces", () => {
  it("supports a plain surface without the framed shell styles", () => {
    const { container } = render(
      createElement(DataTable<TestRow>, {
        tableId: "plain-surface",
        columns,
        getRowId: (row: TestRow) => row.id,
        dataSource: createDataSource([{ id: "row-1", name: "Alpha" }]),
        features: { virtualization: false },
        surface: "plain"
      })
    );

    const root = container.firstElementChild;
    const grid = screen.getByRole("grid");
    const shell = grid.parentElement?.parentElement;

    expect(root?.classList.contains("w-full")).toBe(true);
    expect(root?.classList.contains("bg-transparent")).toBe(true);
    expect(root?.classList.contains("p-0")).toBe(true);
    expect(root?.classList.contains("shadow-none")).toBe(true);
    expect(root?.classList.contains("border")).toBe(false);
    expect(shell?.classList.contains("bg-transparent")).toBe(true);
    expect(shell?.classList.contains("border-0")).toBe(true);
    expect(shell?.classList.contains("rounded-none")).toBe(true);
  });
});

describe("DataTable active-cell broadcasts", () => {
  it("does not re-broadcast an unchanged null active cell when the row model changes", async () => {
    const onActiveCellChange = vi.fn<(cell: CollaboratorCellCoord | null) => void>();
    const initialRows = [{ id: "row-1", name: "Alpha" }];
    const { rerender } = render(
      createElement(DataTable<TestRow>, {
        tableId: "active-cell-dedupe",
        columns,
        getRowId: (row: TestRow) => row.id,
        dataSource: createDataSource(initialRows),
        features: { virtualization: false },
        onActiveCellChange
      })
    );

    fireEvent.click(screen.getByText("Alpha"));

    await waitFor(() => {
      expect(onActiveCellChange).toHaveBeenCalledTimes(1);
    });
    expect(onActiveCellChange).toHaveBeenLastCalledWith({
      rowId: "row-1",
      columnId: "name"
    });

    rerender(
      createElement(DataTable<TestRow>, {
        tableId: "active-cell-dedupe",
        columns,
        getRowId: (row: TestRow) => row.id,
        dataSource: createDataSource([]),
        features: { virtualization: false },
        onActiveCellChange
      })
    );

    await waitFor(() => {
      expect(onActiveCellChange).toHaveBeenCalledTimes(1);
    });
  });
});
