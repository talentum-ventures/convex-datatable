import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
});
