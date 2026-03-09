import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useUndoStack, type UndoEntry } from "./use-undo-stack";

type TestRow = {
  id: string;
  title: string;
};

function makeEntry(value: string): UndoEntry<TestRow> {
  return {
    changes: [
      {
        rowId: "row-1",
        previousRow: { id: "row-1", title: `${value}-before` },
        nextRow: { id: "row-1", title: `${value}-after` }
      }
    ]
  };
}

describe("useUndoStack", () => {
  it("moves entries between undo and redo stacks", () => {
    const { result } = renderHook(() => useUndoStack<TestRow>());
    const first = makeEntry("first");
    const second = makeEntry("second");

    act(() => {
      result.current.pushUndo(first);
      result.current.pushUndo(second);
    });

    let poppedUndo: UndoEntry<TestRow> | null = null;
    let poppedRedo: UndoEntry<TestRow> | null = null;

    act(() => {
      poppedUndo = result.current.popUndo();
      poppedRedo = result.current.popRedo();
    });

    expect(poppedUndo).toEqual(second);
    expect(poppedRedo).toEqual(second);

    let thirdPop: UndoEntry<TestRow> | null = null;
    let fourthPop: UndoEntry<TestRow> | null = null;
    let emptyPop: UndoEntry<TestRow> | null = null;

    act(() => {
      thirdPop = result.current.popUndo();
      fourthPop = result.current.popUndo();
      emptyPop = result.current.popUndo();
    });

    expect(thirdPop).toEqual(second);
    expect(fourthPop).toEqual(first);
    expect(emptyPop).toBeNull();
  });

  it("clears redo history when a new undo entry is pushed", () => {
    const { result } = renderHook(() => useUndoStack<TestRow>());
    const first = makeEntry("first");
    const second = makeEntry("second");

    act(() => {
      result.current.pushUndo(first);
      result.current.popUndo();
      result.current.pushUndo(second);
    });

    let redoPop: UndoEntry<TestRow> | null = null;
    let latestUndo: UndoEntry<TestRow> | null = null;
    let earlierUndo: UndoEntry<TestRow> | null = null;

    act(() => {
      redoPop = result.current.popRedo();
      latestUndo = result.current.popUndo();
      earlierUndo = result.current.popUndo();
    });

    expect(redoPop).toBeNull();
    expect(latestUndo).toEqual(second);
    expect(earlierUndo).toBeNull();
  });

  it("caps the undo stack at fifty entries", () => {
    const { result } = renderHook(() => useUndoStack<TestRow>());

    act(() => {
      Array.from({ length: 51 }, (_, index) => {
        result.current.pushUndo(makeEntry(String(index)));
        return null;
      });
    });

    const entries: Array<UndoEntry<TestRow>> = [];

    act(() => {
      while (true) {
        const entry = result.current.popUndo();
        if (!entry) {
          break;
        }
        entries.push(entry);
      }
    });

    expect(entries).toHaveLength(50);
    expect(entries.at(-1)).toEqual(makeEntry("1"));
    expect(entries.at(0)).toEqual(makeEntry("50"));
  });

  it("discards a tracked entry from both stacks", () => {
    const { result } = renderHook(() => useUndoStack<TestRow>());
    const first = makeEntry("first");

    act(() => {
      result.current.pushUndo(first);
      result.current.popUndo();
      result.current.discard(first);
    });

    let undoPop: UndoEntry<TestRow> | null = null;
    let redoPop: UndoEntry<TestRow> | null = null;

    act(() => {
      undoPop = result.current.popUndo();
      redoPop = result.current.popRedo();
    });

    expect(undoPop).toBeNull();
    expect(redoPop).toBeNull();
  });
});
