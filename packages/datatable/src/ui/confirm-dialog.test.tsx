import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog, deleteConfirmationCopy } from "./confirm-dialog";

describe("deleteConfirmationCopy", () => {
  it("describes a single delete that can be undone", () => {
    expect(deleteConfirmationCopy(1, true)).toEqual({
      title: "Delete row?",
      description:
        "This row will be removed from the table. You can undo this from the notification after deleting."
    });
  });

  it("describes a bulk delete that cannot be undone", () => {
    expect(deleteConfirmationCopy(3, false)).toEqual({
      title: "Delete 3 rows?",
      description: "These rows will be removed from the table. This cannot be undone."
    });
  });
});

describe("ConfirmDialog", () => {
  it("confirms or cancels from the dialog actions", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        title="Delete row?"
        description="This row will be removed from the table. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    const dialog = screen.getByRole("alertdialog", { name: "Delete row?" });
    expect(dialog).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
