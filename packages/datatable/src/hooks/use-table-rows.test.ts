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
  createRow: NonNullable<DataTableDataSource<TestRow>["createRow"]>
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
    createRow
  };
}

function useTestTableRows(
  dataSource: DataTableDataSource<TestRow>,
  rowsRefresh: () => void,
  rowSchema?: RowSchema<TestRow>
) {
  const [, setEditingCell] = useState<EditingCellState>(null);
  const undoStack = useUndoStack<TestRow>();

  return useTableRows<TestRow>({
    sourceRows: [],
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
      useTestTableRows(createDataSource(createRow), rowsRefresh, rowSchema)
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
        createDataSource(async (draft) => ({
          id: "row-1",
          title: String(draft.title ?? "")
        })),
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
});
