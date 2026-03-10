import { useState } from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
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
};

const columns: ReadonlyArray<DataTableColumn<TestRow>> = [
  {
    id: "title",
    field: "title",
    header: "Title",
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
  sourceRows: ReadonlyArray<TestRow> = []
) {
  const [, setEditingCell] = useState<EditingCellState>(null);
  const undoStack = useUndoStack<TestRow>();

  return useTableRows<TestRow>({
    sourceRows,
    getRowId: (row) => row.id,
    orderedColumns: columns,
    rowSchema,
    dataSource,
    rowsRefresh,
    rowDeleteEnabled: false,
    rowAddEnabled: true,
    undoEnabled: false,
    setEditingCell,
    undoStack
  });
}

describe("useTableRows", () => {
  it("keeps the editing row snapshot and draft value until editing ends", () => {
    const initialRow = { id: "row-1", title: "Alpha" };
    const serverUpdatedRow = { id: "row-1", title: "Server update" };
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
      sourceRows: [serverUpdatedRow]
    });

    expect(result.current.mergedRows).toEqual([initialRow]);

    act(() => {
      result.current.onCancelEdit();
    });

    rerender({
      sourceRows: [serverUpdatedRow]
    });

    expect(result.current.getEditingDraftValue("row-1", "title")).toBeNull();
    expect(result.current.mergedRows).toEqual([serverUpdatedRow]);
  });

  it("clears the editing draft snapshot after a manual commit", async () => {
    const row = { id: "row-1", title: "Alpha" };
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
        id: "row-1",
        title: "Beta"
      }
    });
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

  it("autosaves valid cell edits optimistically and persists them", async () => {
    const row = { id: "row-1", title: "Alpha" };
    const updateRows = vi.fn(async () => undefined);
    const { result } = renderHook(() =>
      useTestTableRows(createDataSource({ updateRows }), vi.fn(), undefined, [row])
    );

    await act(async () => {
      await result.current.autoSaveCellEdit({
        row,
        rowId: "row-1",
        column: titleColumn,
        value: "Beta"
      });
    });

    expect(result.current.optimisticRows).toEqual({
      "row-1": {
        id: "row-1",
        title: "Beta"
      }
    });
    expect(updateRows).toHaveBeenCalledTimes(1);
    expect(updateRows).toHaveBeenCalledWith([
      {
        rowId: "row-1",
        patch: {
          title: "Beta"
        }
      }
    ]);
  });

  it("rolls back autosave when persistence fails", async () => {
    const row = { id: "row-1", title: "Alpha" };
    const updateRows = vi.fn(async () => {
      throw new Error("offline");
    });
    const { result } = renderHook(() =>
      useTestTableRows(createDataSource({ updateRows }), vi.fn(), undefined, [row])
    );

    await act(async () => {
      await result.current.autoSaveCellEdit({
        row,
        rowId: "row-1",
        column: titleColumn,
        value: "Beta"
      });
    });

    expect(result.current.optimisticRows).toEqual({});
    expect(updateRows).toHaveBeenCalledTimes(1);
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("Failed to update row: Error: offline");
  });

  it("keeps the latest optimistic autosave when an older request fails later", async () => {
    const updateRowsResolvers: Array<{
      resolve: () => void;
      reject: (error: Error) => void;
    }> = [];
    const updateRows = vi.fn(
      async () =>
        await new Promise<void>((resolve, reject: (error: Error) => void) => {
          updateRowsResolvers.push({
            resolve,
            reject
          });
        })
    );
    const { result } = renderHook(() =>
      useTestTableRows(createDataSource({ updateRows }), vi.fn(), undefined, [{ id: "row-1", title: "Alpha" }])
    );

    let firstSave = Promise.resolve();
    let secondSave = Promise.resolve();

    await act(async () => {
      firstSave = result.current.autoSaveCellEdit({
        row: { id: "row-1", title: "Alpha" },
        rowId: "row-1",
        column: titleColumn,
        value: "Beta"
      });

      secondSave = result.current.autoSaveCellEdit({
        row: { id: "row-1", title: "Beta" },
        rowId: "row-1",
        column: titleColumn,
        value: "Gamma"
      });

      await Promise.resolve();
    });

    expect(result.current.optimisticRows).toEqual({
      "row-1": {
        id: "row-1",
        title: "Gamma"
      }
    });

    await act(async () => {
      updateRowsResolvers[0]?.reject(new Error("offline"));
      await firstSave;
    });

    expect(result.current.optimisticRows).toEqual({
      "row-1": {
        id: "row-1",
        title: "Gamma"
      }
    });

    await act(async () => {
      updateRowsResolvers[1]?.resolve();
      await secondSave;
    });

    expect(result.current.optimisticRows).toEqual({
      "row-1": {
        id: "row-1",
        title: "Gamma"
      }
    });
  });
});
