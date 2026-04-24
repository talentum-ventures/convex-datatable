import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement, useMemo, useState } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type {
  CollaboratorCellCoord,
  DataTableColumn,
  DataTableDataSource,
  DataTableProps
} from "../core/types";
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

type ToolbarRow = {
  id: string;
  name: string;
  amount: number;
};

const toolbarColumns: ReadonlyArray<DataTableColumn<ToolbarRow>> = [
  {
    id: "name",
    field: "name",
    header: "Name",
    kind: "text"
  },
  {
    id: "amount",
    field: "amount",
    header: "Amount",
    kind: "number"
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

function createMutableDataSource(rows: ReadonlyArray<TestRow>): DataTableDataSource<TestRow> {
  return {
    ...createDataSource(rows),
    createRow: async (draft) => ({
      id: String(draft.id ?? "draft-row"),
      name: String(draft.name ?? "")
    })
  };
}

function ToolbarHarness({
  renderToolbar
}: {
  renderToolbar?: DataTableProps<ToolbarRow>["renderToolbar"];
}): JSX.Element {
  const [rows, setRows] = useState<ReadonlyArray<ToolbarRow>>([
    { id: "row-1", name: "Alpha", amount: 10 },
    { id: "row-2", name: "Beta", amount: 20 }
  ]);

  const dataSource = useMemo<DataTableDataSource<ToolbarRow>>(
    () => ({
      useRows: () => ({
        rows,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        loadMore: () => undefined,
        refresh: () => undefined
      }),
      deleteRows: async (rowIds) => {
        setRows((current) => current.filter((row) => !rowIds.includes(row.id)));
      },
      createRow: async (draft) => {
        const nextRow: ToolbarRow = {
          id: `row-${rows.length + 1}`,
          name: String(draft.name ?? ""),
          amount: Number(draft.amount ?? 0)
        };
        setRows((current) => [...current, nextRow]);
        return nextRow;
      }
    }),
    [rows]
  );

  return createElement(DataTable<ToolbarRow>, {
    tableId: "toolbar-harness",
    columns: toolbarColumns,
    getRowId: (row: ToolbarRow) => row.id,
    dataSource,
    features: {
      rowAdd: true,
      rowDelete: true,
      columnVisibility: true,
      virtualization: false
    },
    ...(renderToolbar ? { renderToolbar } : {})
  });
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
    const shell = grid.parentElement;

    expect(root?.classList.contains("w-full")).toBe(true);
    expect(root?.classList.contains("flex")).toBe(true);
    expect(root?.classList.contains("flex-col")).toBe(true);
    expect(root?.classList.contains("h-full")).toBe(true);
    expect(root?.classList.contains("min-h-0")).toBe(true);
    expect(root?.classList.contains("bg-transparent")).toBe(true);
    expect(root?.classList.contains("p-0")).toBe(true);
    expect(root?.classList.contains("shadow-none")).toBe(true);
    expect(root?.classList.contains("border")).toBe(false);
    expect(shell?.classList.contains("bg-transparent")).toBe(true);
    expect(shell?.classList.contains("border-0")).toBe(true);
    expect(shell?.classList.contains("rounded-none")).toBe(true);
    expect(shell?.classList.contains("flex")).toBe(true);
    expect(shell?.classList.contains("flex-1")).toBe(true);
    expect(shell?.classList.contains("flex-col")).toBe(true);
    expect(shell?.classList.contains("min-h-0")).toBe(true);
    expect(grid.classList.contains("w-full")).toBe(true);
    expect(grid.classList.contains("h-full")).toBe(true);
    expect(grid.classList.contains("min-h-0")).toBe(true);
    expect(grid.classList.contains("max-h-[560px]")).toBe(false);
  });

  it("keeps row resize handles inside table cells", () => {
    render(
      createElement(DataTable<TestRow>, {
        tableId: "row-resize-markup",
        columns,
        getRowId: (row: TestRow) => row.id,
        dataSource: createDataSource([{ id: "row-1", name: "Alpha" }]),
        features: { virtualization: false }
      })
    );

    const resizeHandle = screen.getByRole("button", { name: "Resize row row-1" });

    expect(resizeHandle.parentElement?.tagName).toBe("TD");
  });
});

describe("DataTable draft row placement", () => {
  it("sticks the draft row to the bottom of the viewport by default", () => {
    const { container } = render(
      createElement(DataTable<TestRow>, {
        tableId: "sticky-draft-default",
        columns,
        getRowId: (row: TestRow) => row.id,
        dataSource: createMutableDataSource([{ id: "row-1", name: "Alpha" }]),
        features: { rowAdd: true, virtualization: false }
      })
    );

    expect(container.querySelector("tfoot tr[data-row-id='__draft__']")).not.toBeNull();
    expect(container.querySelector("tbody tr[data-row-id='__draft__']")).toBeNull();
  });

  it("renders the draft row in the scrollable body when stickyDraftRow is disabled", () => {
    const { container } = render(
      createElement(DataTable<TestRow>, {
        tableId: "sticky-draft-disabled",
        columns,
        getRowId: (row: TestRow) => row.id,
        dataSource: createMutableDataSource([{ id: "row-1", name: "Alpha" }]),
        features: { rowAdd: true, stickyDraftRow: false, virtualization: false }
      })
    );

    expect(container.querySelector("tfoot tr[data-row-id='__draft__']")).toBeNull();
    expect(container.querySelector("tbody tr[data-row-id='__draft__']")).not.toBeNull();
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

describe("DataTable column menus", () => {
  it("keeps the header menu in document.body so filters can be cleared after zero results", async () => {
    render(
      createElement(DataTable<TestRow>, {
        tableId: "column-menu-empty-results",
        columns,
        getRowId: (row: TestRow) => row.id,
        dataSource: createDataSource([{ id: "row-1", name: "Alpha" }]),
        features: { virtualization: false }
      })
    );

    const trigger = screen.getByRole("button", { name: "Open column menu" });
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog", { name: "Name options" });
    expect(dialog.parentElement).toBe(document.body);
    expect(screen.getByRole("grid").contains(dialog)).toBe(false);

    fireEvent.change(screen.getByPlaceholderText("Filter value"), {
      target: { value: "Missing" }
    });

    await waitFor(() => {
      expect(screen.queryByText("Alpha")).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    await waitFor(() => {
      expect(screen.queryByText("Alpha")).not.toBeNull();
    });
  });

  it("shows a clear-all button in the header when filters hide every row", async () => {
    render(
      createElement(DataTable<TestRow>, {
        tableId: "header-clear-all-filters",
        columns,
        getRowId: (row: TestRow) => row.id,
        dataSource: createDataSource([{ id: "row-1", name: "Alpha" }]),
        features: { virtualization: false }
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Open column menu" }));
    fireEvent.change(await screen.findByPlaceholderText("Filter value"), {
      target: { value: "Missing" }
    });

    await waitFor(() => {
      expect(screen.queryByText("Alpha")).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear all filters" }));

    await waitFor(() => {
      expect(screen.queryByText("Alpha")).not.toBeNull();
    });
  });

  it("closes the portaled menu on Escape and restores focus to the trigger", async () => {
    render(
      createElement(DataTable<TestRow>, {
        tableId: "column-menu-escape",
        columns,
        getRowId: (row: TestRow) => row.id,
        dataSource: createDataSource([{ id: "row-1", name: "Alpha" }]),
        features: { virtualization: false }
      })
    );

    const trigger = screen.getByRole("button", { name: "Open column menu" });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByPlaceholderText("Filter value"));
    });

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Name options" })).toBeNull();
    });
    expect(document.activeElement).toBe(trigger);
  });
});

describe("DataTable toolbar rendering", () => {
  it("passes declarative toolbar state to renderToolbar and lets custom actions control the table", async () => {
    render(
      createElement(ToolbarHarness, {
        renderToolbar: (state) =>
          createElement(
            "div",
            null,
            createElement("output", { "data-testid": "selected-count" }, String(state.selectedRowCount)),
            createElement("output", { "data-testid": "hidden-count" }, String(state.hiddenColumns.length)),
            createElement(
              "button",
              {
                type: "button",
                onClick: () => {
                  state.deleteSelected();
                }
              },
              "Delete from custom toolbar"
            ),
            ...state.hiddenColumns.map((column) =>
              createElement(
                "button",
                {
                  key: column.id,
                  type: "button",
                  onClick: () => {
                    state.showColumn(column.id);
                  }
                },
                `Show ${column.header}`
              )
            )
          )
      })
    );

    expect(screen.getByTestId("selected-count").textContent).toBe("0");
    expect(screen.getByTestId("hidden-count").textContent).toBe("0");

    fireEvent.click(screen.getByLabelText("Select row row-1"));

    await waitFor(() => {
      expect(screen.getByTestId("selected-count").textContent).toBe("1");
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Open column menu" })[1] ?? screen.getByRole("button", { name: "Open column menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide" }));

    await waitFor(() => {
      expect(screen.getByTestId("hidden-count").textContent).toBe("1");
    });

    fireEvent.click(screen.getByRole("button", { name: "Show Amount" }));

    await waitFor(() => {
      expect(screen.queryByRole("columnheader", { name: /Amount/i })).not.toBeNull();
      expect(screen.getByTestId("hidden-count").textContent).toBe("0");
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete from custom toolbar" }));

    await waitFor(() => {
      expect(screen.queryByText("Alpha")).toBeNull();
    });
  });

  it("hides the toolbar area when renderToolbar returns null", () => {
    render(
      createElement(ToolbarHarness, {
        renderToolbar: () => null
      })
    );

    expect(screen.queryByText("Copy")).toBeNull();
    expect(screen.queryByText("Add row")).toBeNull();
  });
});
