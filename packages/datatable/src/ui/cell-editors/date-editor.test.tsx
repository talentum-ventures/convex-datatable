import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DataTableCellValue, DataTableColumn } from "../../core/types";
import { DateEditor } from "./date-editor";

type TestRow = {
  id: string;
  due: string;
};

const dateColumn: DataTableColumn<TestRow> = {
  id: "due",
  field: "due",
  header: "Due",
  kind: "date",
  locale: "en-US",
  isEditable: true
};

describe("DateEditor", () => {
  it("keeps the picker open and does not commit when changing months", () => {
    const onCommit = vi.fn<(value: DataTableCellValue) => void>();
    const onCancel = vi.fn();

    render(
      <DateEditor
        column={dateColumn}
        row={{ id: "row-1", due: "2026-03-05" }}
        value="2026-03-05"
        initialText="2026-03-05"
        onCommit={onCommit}
        onCancel={onCancel}
      />
    );

    expect(screen.getByRole("dialog", { name: "Edit Due" })).toBeTruthy();
    expect(screen.getByText("March 2026")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next month" }));

    expect(screen.getByRole("dialog", { name: "Edit Due" })).toBeTruthy();
    expect(screen.getByText("April 2026")).toBeTruthy();
    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("commits only after a date is clicked", () => {
    const onCommit = vi.fn<(value: DataTableCellValue) => void>();
    const onCancel = vi.fn();

    render(
      <DateEditor
        column={dateColumn}
        row={{ id: "row-1", due: "2026-03-05" }}
        value="2026-03-05"
        initialText="2026-03-05"
        onCommit={onCommit}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    fireEvent.click(screen.getByRole("button", { name: "Apr 9, 2026" }));

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenLastCalledWith("2026-04-09");
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("cancels when clicking outside the picker", () => {
    const onCommit = vi.fn<(value: DataTableCellValue) => void>();
    const onCancel = vi.fn();

    render(
      <DateEditor
        column={dateColumn}
        row={{ id: "row-1", due: "2026-03-05" }}
        value="2026-03-05"
        initialText="2026-03-05"
        onCommit={onCommit}
        onCancel={onCancel}
      />
    );

    fireEvent.mouseDown(document.body);

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
  });
});
