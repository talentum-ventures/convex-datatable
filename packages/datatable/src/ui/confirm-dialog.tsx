import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "./primitives";

export type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function deleteConfirmationCopy(
  rowCount: number,
  canUndo: boolean
): {
  title: string;
  description: string;
} {
  const isMany = rowCount > 1;
  const subject = isMany ? "These rows will be removed from the table." : "This row will be removed from the table.";
  const consequence = canUndo
    ? "You can undo this from the notification after deleting."
    : "This cannot be undone.";

  return {
    title: isMany ? `Delete ${rowCount} rows?` : "Delete row?",
    description: `${subject} ${consequence}`
  };
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel
}: ConfirmDialogProps): JSX.Element | null {
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const portalRoot = typeof document === "undefined" ? null : document.body;

  useLayoutEffect(() => {
    cancelRef.current?.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCancel();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [onCancel]);

  if (!portalRoot) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      data-dt-confirm-dialog="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dt-confirm-title"
        aria-describedby="dt-confirm-description"
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
      >
        <h2 id="dt-confirm-title" className="text-base font-semibold text-slate-900">
          {title}
        </h2>
        <p id="dt-confirm-description" className="mt-2 text-sm text-slate-600">
          {description}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            ref={cancelRef}
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    portalRoot
  );
}
