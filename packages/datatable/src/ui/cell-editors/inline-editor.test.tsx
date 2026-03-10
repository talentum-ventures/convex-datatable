import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataTableCellValue, DataTableColumn } from "../../core/types";
import { InlineContentEditor } from "./inline-editor";

type TestRow = {
  id: string;
  title: string;
};

const textColumn: DataTableColumn<TestRow> = {
  id: "title",
  field: "title",
  header: "Title",
  kind: "text",
  isEditable: true
};

describe("InlineContentEditor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces autosave and emits the latest value", () => {
    const onCommit = vi.fn<(value: DataTableCellValue) => void>();
    const onAutoSave = vi.fn<(value: DataTableCellValue) => void>();
    const onCancel = vi.fn();

    render(
      <InlineContentEditor
        column={textColumn}
        row={{ id: "row-1", title: "Alpha" }}
        value="Alpha"
        initialText="Alpha"
        onCommit={onCommit}
        onAutoSave={onAutoSave}
        onCancel={onCancel}
      />
    );

    const editor = screen.getByRole("textbox", { name: "Edit Title" });

    act(() => {
      editor.textContent = "Beta";
      fireEvent.input(editor);
      editor.textContent = "Beta 2";
      fireEvent.input(editor);
      vi.advanceTimersByTime(299);
    });

    expect(onAutoSave).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(onAutoSave).toHaveBeenCalledTimes(1);
    expect(onAutoSave).toHaveBeenLastCalledWith("Beta 2");
    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("clears pending autosave when the edit is committed", () => {
    const onCommit = vi.fn<(value: DataTableCellValue) => void>();
    const onAutoSave = vi.fn<(value: DataTableCellValue) => void>();

    render(
      <InlineContentEditor
        column={textColumn}
        row={{ id: "row-1", title: "Alpha" }}
        value="Alpha"
        initialText="Alpha"
        onCommit={onCommit}
        onAutoSave={onAutoSave}
        onCancel={() => undefined}
      />
    );

    const editor = screen.getByRole("textbox", { name: "Edit Title" });

    act(() => {
      editor.textContent = "Beta";
      fireEvent.input(editor);
      fireEvent.blur(editor);
      vi.runAllTimers();
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenLastCalledWith("Beta");
    expect(onAutoSave).not.toHaveBeenCalled();
  });
});
