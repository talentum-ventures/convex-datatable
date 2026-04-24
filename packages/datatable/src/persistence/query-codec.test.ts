import { describe, expect, it } from "vitest";
import {
  decodePersistedStateFromUrl,
  encodePersistedStateToUrl,
  mergePersistedState,
  storageKey
} from "./query-codec";
import type { PersistedTableState } from "../core/types";

const fixtureState: PersistedTableState = {
  sorting: [{ columnId: "name", direction: "asc" }],
  filters: [{ columnId: "status", op: "in", value: ["todo", "done"] }],
  columnOrder: ["name", "status", "amount"],
  pinLeft: ["name"],
  pinRight: ["amount"],
  hiddenColumns: ["amount"],
  widths: {
    name: 220,
    status: 140
  }
};

describe("query codec", () => {
  it("round-trips persisted state to URL", () => {
    const params = encodePersistedStateToUrl("orders", fixtureState, new URLSearchParams());
    const decoded = decodePersistedStateFromUrl("orders", params, undefined);

    expect(decoded).toEqual(fixtureState);
  });

  it("round-trips empty filters to URL", () => {
    const state: PersistedTableState = {
      ...fixtureState,
      filters: [{ columnId: "status", op: "isEmpty", value: null }]
    };
    const params = encodePersistedStateToUrl("orders", state, new URLSearchParams());

    expect(decodePersistedStateFromUrl("orders", params, undefined)).toEqual(state);
  });

  it("merges with URL precedence", () => {
    const merged = mergePersistedState(
      {
        ...fixtureState,
        sorting: [{ columnId: "status", direction: "desc" }],
        widths: {}
      },
      {
        ...fixtureState,
        sorting: [{ columnId: "name", direction: "asc" }],
        widths: { amount: 190 }
      }
    );

    expect(merged.sorting).toEqual([{ columnId: "status", direction: "desc" }]);
    expect(merged.widths).toEqual({ amount: 190 });
  });

  it("creates page scoped storage key", () => {
    expect(storageKey("/dashboard/projects", "table-a")).toBe(
      "rolha-grid:/dashboard/projects:table-a:state:v1"
    );
  });

  it("ignores invalid URL entries and reports errors", () => {
    const errors: string[] = [];
    const params = new URLSearchParams();
    params.append("dt_orders_sort", "bad-entry");
    params.append("dt_orders_filter", "status.invalidOp.value");
    params.append("dt_orders_width", "name.not-a-number");

    const decoded = decodePersistedStateFromUrl("orders", params, (message) => {
      errors.push(message);
    });

    expect(decoded.sorting).toEqual([]);
    expect(decoded.filters).toEqual([]);
    expect(decoded.widths).toEqual({});
    expect(errors.length).toBeGreaterThan(0);
  });
});
