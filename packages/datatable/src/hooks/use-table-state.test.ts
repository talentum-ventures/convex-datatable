import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useTableState } from "./use-table-state";

describe("useTableState", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("preserves hydrated column order during initial seeding", async () => {
    window.history.replaceState(null, "", "/?dt_orders_order=status,name,amount");

    const { result } = renderHook(() =>
      useTableState({
        tableId: "orders",
        dataColumnIds: ["name", "status", "amount"],
        includeSelectColumn: false,
        includeActionsColumn: false,
        onError: undefined
      })
    );

    await waitFor(() => {
      expect(result.current.normalizedColumnOrder).toEqual(["status", "name", "amount"]);
    });

    expect(result.current.reactTableState.columnOrder).toEqual(["status", "name", "amount"]);
  });
});
