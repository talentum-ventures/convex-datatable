import { describe, expect, it } from "vitest";
import { canHandleGridPaste } from "./data-table";

describe("grid paste ownership", () => {
  const baseArgs = {
    clipboardPaste: true,
    editing: true,
    cellSelect: true,
    editingCell: null,
    hasUpdateRows: true
  } as const;

  it("handles paste for the grid shell in selection mode", () => {
    const target = document.createElement("div");

    expect(
      canHandleGridPaste({
        ...baseArgs,
        target
      })
    ).toBe(true);
  });

  it("does not handle paste when cell selection is disabled", () => {
    const target = document.createElement("div");

    expect(
      canHandleGridPaste({
        ...baseArgs,
        cellSelect: false,
        target
      })
    ).toBe(false);
  });

  it("does not handle paste while a cell editor is active", () => {
    const target = document.createElement("div");

    expect(
      canHandleGridPaste({
        ...baseArgs,
        editingCell: {
          rowId: "row-1",
          columnId: "title"
        },
        target
      })
    ).toBe(false);
  });

  it("does not handle paste for editable targets", () => {
    const input = document.createElement("input");
    const textarea = document.createElement("textarea");
    const select = document.createElement("select");
    const contentEditable = document.createElement("div");
    const editorRoot = document.createElement("div");

    contentEditable.setAttribute("contenteditable", "true");
    editorRoot.dataset.dtEditorRoot = "true";

    expect(canHandleGridPaste({ ...baseArgs, target: input })).toBe(false);
    expect(canHandleGridPaste({ ...baseArgs, target: textarea })).toBe(false);
    expect(canHandleGridPaste({ ...baseArgs, target: select })).toBe(false);
    expect(canHandleGridPaste({ ...baseArgs, target: contentEditable })).toBe(false);
    expect(canHandleGridPaste({ ...baseArgs, target: editorRoot })).toBe(false);
  });
});
