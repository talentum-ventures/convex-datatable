import { describe, expect, it, vi } from "vitest";
import { CollaboratorStore } from "./collaborator-store";
import type { CollaboratorPresence } from "./types";

function collaborator(args: {
  userId: string;
  name: string;
  color: string;
  rowId: string | null;
  columnId: string | null;
}): CollaboratorPresence {
  const { userId, name, color, rowId, columnId } = args;
  return {
    userId,
    name,
    color,
    activeCell:
      rowId !== null && columnId !== null
        ? {
            rowId,
            columnId
          }
        : null
  };
}

describe("CollaboratorStore", () => {
  it("reuses the same cell array when collaborator content is unchanged", () => {
    const store = new CollaboratorStore([
      collaborator({
        userId: "user-1",
        name: "Ada",
        color: "#123456",
        rowId: "row-1",
        columnId: "status"
      })
    ]);

    const initial = store.getForCell("row-1", "status");

    store.update([
      collaborator({
        userId: "user-1",
        name: "Ada",
        color: "#123456",
        rowId: "row-1",
        columnId: "status"
      })
    ]);

    expect(store.getForCell("row-1", "status")).toBe(initial);
  });

  it("notifies listeners only when a cell's collaborator set changes", () => {
    const store = new CollaboratorStore([
      collaborator({
        userId: "user-1",
        name: "Ada",
        color: "#123456",
        rowId: "row-1",
        columnId: "status"
      })
    ]);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.update([
      collaborator({
        userId: "user-1",
        name: "Ada",
        color: "#123456",
        rowId: "row-1",
        columnId: "status"
      })
    ]);
    store.update([
      collaborator({
        userId: "user-1",
        name: "Ada",
        color: "#123456",
        rowId: "row-2",
        columnId: "status"
      })
    ]);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getForCell("row-1", "status")).toEqual([]);
    expect(store.getForCell("row-2", "status")).toEqual([
      collaborator({
        userId: "user-1",
        name: "Ada",
        color: "#123456",
        rowId: "row-2",
        columnId: "status"
      })
    ]);

    unsubscribe();
  });
});
