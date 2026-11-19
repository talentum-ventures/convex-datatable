import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DataTableCellValue, DataTableColumn } from "../../core/types.js";
import { InlineContentEditor } from "./inline-editor.js";

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
  it("does not commit while typing and commits on blur", () => {
    const onCommit = vi.fn<(value: DataTableCellValue) => void>();
    const onCancel = vi.fn();

    render(
      <InlineContentEditor
        column={textColumn}
        row={{ id: "row-1", title: "Alpha" }}
        value="Alpha"
        initialText="Alpha"
        onCommit={onCommit}
        onCancel={onCancel}
      />
    );

    const editor = screen.getByRole("textbox", { name: "Edit Title" });

    act(() => {
      editor.textContent = "Beta";
      fireEvent.input(editor);
    });

    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();

    act(() => {
      fireEvent.blur(editor);
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenLastCalledWith("Beta");
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("restores caret offset when remounting with a draft", () => {
    const onCommit = vi.fn<(value: DataTableCellValue) => void>();
    const onCancel = vi.fn();
    const onDraftChange = vi.fn<(value: DataTableCellValue, caretOffset?: number) => void>();

    const { unmount } = render(
      <InlineContentEditor
        column={textColumn}
        row={{ id: "row-1", title: "Alpha" }}
        value="Alpha"
        initialText="Alpha"
        restoredDraft="Alphabet"
        restoredCaretOffset={4}
        onCommit={onCommit}
        onCancel={onCancel}
        onDraftChange={onDraftChange}
      />
    );

    const editor = screen.getByRole("textbox", { name: "Edit Title" });
    expect(editor.textContent).toBe("Alphabet");

    const selection = window.getSelection();
    expect(selection).not.toBeNull();
    expect(selection?.getRangeAt(0).startOffset).toBe(4);

    unmount();
  });
  it("wraps text columns and keeps single-line kinds confined to the cell", () => {
    const { unmount } = render(
      <InlineContentEditor
        column={textColumn}
        row={{ id: "row-1", title: "Alpha" }}
        value="Alpha"
        initialText="Alpha"
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const textEditor = screen.getByRole("textbox", { name: "Edit Title" });
    expect(textEditor.className).toContain("whitespace-pre-wrap");
    expect(textEditor.className).toContain("break-words");
    expect(textEditor.className).not.toContain("whitespace-nowrap");
    unmount();

    const numberColumn: DataTableColumn<TestRow> = {
      id: "title",
      field: "title",
      header: "Amount",
      kind: "number",
      isEditable: true
    };

    render(
      <InlineContentEditor
        column={numberColumn}
        row={{ id: "row-1", title: "1" }}
        value={1}
        initialText="1"
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const numberEditor = screen.getByRole("textbox", { name: "Edit Amount" });
    expect(numberEditor.className).toContain("whitespace-nowrap");
    expect(numberEditor.className).toContain("overflow-hidden");
  });
});
