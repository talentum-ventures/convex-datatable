import { describe, expect, it } from "vitest";
import {
  fromColumnPinning,
  fromColumnSizing,
  fromColumnVisibility,
  fromTanStackFilters,
  fromTanStackSorting,
  internalToPersistedState,
  persistedStateToInternal,
  toColumnPinning,
  toColumnSizing,
  toColumnVisibility,
  toTanStackFilters,
  toTanStackSorting
} from "./state-converters";
import type { PersistedTableState } from "../core/types";

describe("state converters", () => {
  it("converts sorting both directions", () => {
    const sorting = [{ columnId: "name", direction: "desc" as const }];
    expect(fromTanStackSorting(toTanStackSorting(sorting))).toEqual(sorting);
  });

  it("round trips a text filter with non-default operator", () => {
    const filters = [{ columnId: "status", op: "startsWith" as const, value: "to" }];
    const tanstack = toTanStackFilters(filters);
    expect(fromTanStackFilters(tanstack)).toEqual(filters);
  });

  it("round trips numeric relational filters", () => {
    const filters = [{ columnId: "amount", op: "gte" as const, value: 42 }];
    expect(fromTanStackFilters(toTanStackFilters(filters))).toEqual(filters);
  });

  it("round trips in filters with array values", () => {
    const filters = [{ columnId: "status", op: "in" as const, value: ["todo", "done"] }];
    expect(fromTanStackFilters(toTanStackFilters(filters))).toEqual(filters);
  });

  it("ignores invalid encoded tanstack values", () => {
    expect(fromTanStackFilters([{ id: "status", value: "todo" }])).toEqual([]);
  });

  it("converts visibility/pinning/sizing", () => {
    expect(fromColumnVisibility(toColumnVisibility(["amount"]))).toEqual(["amount"]);
    expect(fromColumnPinning(toColumnPinning(["name"], ["status"]))).toEqual({
      left: ["name"],
      right: ["status"]
    });
    expect(fromColumnSizing(toColumnSizing({ amount: 180 }))).toEqual({ amount: 180 });
  });

  it("round trips persisted state through internal table state", () => {
    const persisted: PersistedTableState = {
      sorting: [{ columnId: "name", direction: "asc" }],
      filters: [
        { columnId: "status", op: "in", value: ["todo", "done"] },
        { columnId: "amount", op: "gte", value: 100 }
      ],
      columnOrder: ["name", "status"],
      pinLeft: ["name"],
      pinRight: [],
      hiddenColumns: ["status"],
      widths: { name: 240 }
    };

    const internal = persistedStateToInternal(persisted);
    expect(internalToPersistedState(internal)).toEqual(persisted);
  });
});
