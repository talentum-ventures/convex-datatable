import { useState } from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useUndoStack } from "./use-undo-stack";
import { useTableRows } from "./use-table-rows";
import type {
  DataTableColumn,
  DataTableDataSource,
  DataTableRowModel,
  EditingCellState,
  RowSchema
} from "../core/types";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    message: vi.fn(),
    success: vi.fn()
  }
}));

type TestRow = DataTableRowModel & {
  id: string;
  title: string;
  status?: string;
};

const columns: ReadonlyArray<DataTableColumn<TestRow>> = [
  {
    id: "title",
    field: "title",
    header: "Title",
    kind: "text",
    isEditable: true
  },
  {
    id: "status",
    field: "status",
    header: "Status",
    kind: "text",
    isEditable: true
  }
];
const titleColumn = columns[0];

if (!titleColumn) {
  throw new Error("Expected the title test column to exist");
}

function createDataSource(
  options: {
    createRow?: NonNullable<DataTableDataSource<TestRow>["createRow"]>;
    updateRows?: NonNullable<DataTableDataSource<TestRow>["updateRows"]>;
  }
): DataTableDataSource<TestRow> {
  return {
    useRows: () => ({
      rows: [],
      hasMore: false,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      loadMore: () => undefined,
      refresh: () => undefined
    }),
    ...(options.createRow ? { createRow: options.createRow } : {}),
    ...(options.updateRows ? { updateRows: options.updateRows } : {})
  };
}

function useTestTableRows(
  dataSource: DataTableDataSource<TestRow>,
  rowsRefresh: () => void,
  rowSchema?: RowSchema<TestRow>,
  sourceRows: ReadonlyArray<TestRow> = [],
  defaultDraftRow?: Partial<TestRow>,
  undoEnabled = false
) {
  const [, setEditingCell] = useState<EditingCellState>(null);
  const undoStack = useUndoStack<TestRow>();

  return {
    ...useTableRows<TestRow>({
      sourceRows,
      getRowId: (row) => row.id,
      orderedColumns: columns,
      rowSchema,
      dataSource,
      rowsRefresh,
      rowDeleteEnabled: false,
      rowAddEnabled: true,
      ...(defaultDraftRow ? { defaultDraftRow } : {}),
      undoEnabled,
      setEditingCell,
      undoStack
    }),
    undoStack
  };
}

describe("useTableRows", () => {
  it("keeps the editing draft while applying remote updates to other fields", () => {
    const initialRow = { id: "row-1", title: "Alpha", status: "open" };
    const serverUpdatedOtherField = { id: "row-1", title: "Alpha", status: "done" };
    const { result, rerender } = renderHook(
      ({ sourceRows }: { sourceRows: ReadonlyArray<TestRow> }) =>
        useTestTableRows(createDataSource({}), vi.fn(), undefined, sourceRows),
      {
        initialProps: {
          sourceRows: [initialRow]
        }
      }
    );

    act(() => {
      result.current.onStartEdit("row-1", "title");
      result.current.onEditingDraftChange("row-1", "title", "Alpha draft");
    });

    expect(result.current.getEditingDraftValue("row-1", "title")).toBe("Alpha draft");

    rerender({
      sourceRows: [serverUpdatedOtherField]
    });

    expect(result.current.getEditingDraftValue("row-1", "title")).toBe("Alpha draft");
    expect(result.current.mergedRows).toEqual([
      {
        id: "row-1",
        title: "Alpha draft",
        status: "done"
      }
    ]);

    act(() => {
      result.current.onCancelEdit();
    });

    rerender({
      sourceRows: [serverUpdatedOtherField]
    });

    expect(result.current.getEditingDraftValue("row-1", "title")).toBeNull();
    expect(result.current.mergedRows).toEqual([serverUpdatedOtherField]);
  });

  it("keeps the local draft when the same cell updates remotely mid-edit", () => {
    const initialRow = { id: "row-1", title: "Alpha", status: "open" };
    const serverUpdatedSameCell = { id: "row-1", title: "Server update", status: "open" };
    const { result, rerender } = renderHook(
      ({ sourceRows }: { sourceRows: ReadonlyArray<TestRow> }) =>
        useTestTableRows(createDataSource({}), vi.fn(), undefined, sourceRows),
      {
        initialProps: {
          sourceRows: [initialRow]
        }
      }
    );

    act(() => {
      result.current.onStartEdit("row-1", "title");
      result.current.onEditingDraftChange("row-1", "title", "Alpha draft");
    });

    rerender({
      sourceRows: [serverUpdatedSameCell]
    });

    expect(result.current.getEditingDraftValue("row-1", "title")).toBe("Alpha draft");
    expect(result.current.mergedRows[0]?.title).toBe("Alpha draft");
  });

  it("clears the editing draft snapshot after a manual commit and stores a field patch", async () => {
    const row = { id: "row-1", title: "Alpha", status: "open" };
    const updateRows = vi.fn(async () => undefined);
    const { result } = renderHook(() =>
      useTestTableRows(createDataSource({ updateRows }), vi.fn(), undefined, [row])
    );

    act(() => {
      result.current.onStartEdit("row-1", "title");
      result.current.onEditingDraftChange("row-1", "title", "Alpha draft");
    });

    await act(async () => {
      await result.current.commitCellEdit({
        row,
        rowId: "row-1",
        column: titleColumn,
        value: "Beta"
      });
    });

    expect(result.current.getEditingDraftValue("row-1", "title")).toBeNull();
    expect(result.current.optimisticRows).toEqual({
      "row-1": {
        title: "Beta"
      }
    });
    expect(result.current.mergedRows).toEqual([
      {
        id: "row-1",
        title: "Beta",
        status: "open"
      }
    ]);
  });

  it("records undo against the pre-edit snapshot when commit receives an overlaid draft row", async () => {
    const row = { id: "row-1", title: "Alpha", status: "open" };
    const updateRows = vi.fn(async () => undefined);
    const { result } = renderHook(() =>
      useTestTableRows(createDataSource({ updateRows }), vi.fn(), undefined, [row], undefined, true)
    );

    act(() => {
      result.current.onStartEdit("row-1", "title");
      result.current.onEditingDraftChange("row-1", "title", "Beta");
    });

    const overlaidRow = result.current.mergedRows[0];
    expect(overlaidRow).toEqual({
      id: "row-1",
      title: "Beta",
      status: "open"
    });
    if (!overlaidRow) {
      throw new Error("Expected overlaid merged row");
    }

    await act(async () => {
      await result.current.commitCellEdit({
        row: overlaidRow,
        rowId: "row-1",
        column: titleColumn,
        value: "Beta"
      });
    });

    const undoEntry = result.current.undoStack.popUndo();
    expect(undoEntry).toEqual({
      changes: [
        {
          rowId: "row-1",
          previousRow: row,
          nextRow: {
            id: "row-1",
            title: "Beta",
            status: "open"
          }
        }
      ]
    });
  });

  it("drops optimistic patches once the source row catches up so later remote fields appear", async () => {
    const row = { id: "row-1", title: "Alpha", status: "open" };
    const updateRows = vi.fn(async () => undefined);
    const { result, rerender } = renderHook(
      ({ sourceRows }: { sourceRows: ReadonlyArray<TestRow> }) =>
        useTestTableRows(createDataSource({ updateRows }), vi.fn(), undefined, sourceRows),
      {
        initialProps: {
          sourceRows: [row]
        }
      }
    );

    await act(async () => {
      await result.current.commitCellEdit({
        row,
        rowId: "row-1",
        column: titleColumn,
        value: "Beta"
      });
    });

    expect(result.current.optimisticRows["row-1"]).toEqual({ title: "Beta" });

    rerender({
      sourceRows: [{ id: "row-1", title: "Beta", status: "open" }]
    });

    expect(result.current.optimisticRows).toEqual({});

    rerender({
      sourceRows: [{ id: "row-1", title: "Beta", status: "done" }]
    });

    expect(result.current.mergedRows).toEqual([
      {
        id: "row-1",
        title: "Beta",
        status: "done"
      }
    ]);
  });

  it("commits the draft row even when the row schema requires server-generated fields", async () => {
    const rowsRefresh = vi.fn();
    const createRow = vi.fn(async (draft: Partial<TestRow>) => ({
      id: "row-1",
      title: String(draft.title ?? "")
    }));
    const rowSchema: RowSchema<TestRow> = {
      safeParse: (value) =>
        typeof value.id === "string" && value.id.length > 0 && typeof value.title === "string"
          ? { success: true, data: value }
          : {
              success: false,
              error: {
                issues: [
                  {
                    path: ["id"],
                    message: "id is required"
                  }
                ]
              }
            }
    };
    const { result } = renderHook(() =>
      useTestTableRows(createDataSource({ createRow }), rowsRefresh, rowSchema)
    );

    act(() => {
      result.current.commitDraftCell(titleColumn, "Inline draft");
    });

    await act(async () => {
      await result.current.commitDraftRow();
    });

    expect(createRow).toHaveBeenCalledWith({
      title: "Inline draft"
    });
    expect(result.current.draftRow).toEqual({});
    expect(result.current.draftEditingColumnId).toBeNull();
    expect(rowsRefresh).toHaveBeenCalledTimes(1);
  });

  it("discards the draft row values", () => {
    const { result } = renderHook(() =>
      useTestTableRows(
        createDataSource({
          createRow: async (draft) => ({
            id: "row-1",
            title: String(draft.title ?? "")
          })
        }),
        vi.fn()
      )
    );

    act(() => {
      result.current.commitDraftCell(titleColumn, "Pending row");
      result.current.setDraftEditingColumnId("title");
    });

    act(() => {
      result.current.clearDraftRow();
    });

    expect(result.current.draftRow).toEqual({});
    expect(result.current.draftEditingColumnId).toBeNull();
  });

  it("initializes and resets the draft row from default values", async () => {
    const rowsRefresh = vi.fn();
    const createRow = vi.fn(async (draft: Partial<TestRow>) => ({
      id: "row-1",
      title: String(draft.title ?? "")
    }));
    const { result } = renderHook(() =>
      useTestTableRows(createDataSource({ createRow }), rowsRefresh, undefined, [], {
        title: "Prefilled title"
      })
    );

    expect(result.current.draftRow).toEqual({
      title: "Prefilled title"
    });

    act(() => {
      result.current.commitDraftCell(titleColumn, "Edited title");
    });

    await act(async () => {
      await result.current.commitDraftRow();
    });

    expect(createRow).toHaveBeenCalledWith({
      title: "Edited title"
    });
    expect(result.current.draftRow).toEqual({
      title: "Prefilled title"
    });
    expect(rowsRefresh).toHaveBeenCalledTimes(1);
  });

  it("merges late-arriving default draft values without overwriting touched fields", () => {
    const { result, rerender } = renderHook(
      ({ defaultDraftRow }: { defaultDraftRow?: Partial<TestRow> }) =>
        useTestTableRows(createDataSource({}), vi.fn(), undefined, [], defaultDraftRow),
      {
        initialProps: {}
      }
    );

    expect(result.current.draftRow).toEqual({});

    act(() => {
      result.current.commitDraftCell(titleColumn, "Custom title");
    });

    rerender({
      defaultDraftRow: {
        title: "Late default"
      }
    });

    expect(result.current.draftRow).toEqual({
      title: "Custom title"
    });
    expect(result.current.hasTouchedDraftRow).toBe(true);
  });
});
