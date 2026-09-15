import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import type {
  DataTableDeleteRequest,
  DataTableRowModel
} from "@talentum-ventures/convex-datatable";

const DELETE_TOAST_MS = 4000;

export type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
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
          <button
            ref={cancelRef}
            type="button"
            className="inline-flex h-8 items-center justify-center rounded-md bg-slate-100 px-3 text-sm font-medium text-slate-800 hover:bg-slate-200"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center justify-center rounded-md bg-rose-600 px-3 text-sm font-medium text-white hover:bg-rose-700"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    portalRoot
  );
}

export function useDeleteRowsConfirmation<TRow extends DataTableRowModel>(
  canUndo: boolean
): {
  onDeleteRows: (request: DataTableDeleteRequest<TRow>) => void;
  dialog: JSX.Element | null;
} {
  const [pending, setPending] = useState<DataTableDeleteRequest<TRow> | null>(null);

  const onDeleteRows = useCallback((request: DataTableDeleteRequest<TRow>) => {
    setPending(request);
  }, []);

  const handleCancel = useCallback(() => {
    setPending(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!pending) {
      return;
    }

    const request = pending;
    setPending(null);
    void request
      .commit()
      .then(({ undo }) => {
        toast.message(`${request.rows.length} row${request.rows.length > 1 ? "s" : ""} deleted`, {
          duration: DELETE_TOAST_MS,
          action: undo
            ? {
                label: "Undo",
                onClick: () => {
                  void undo().catch((error) => {
                    toast.error(`Failed to restore rows: ${String(error)}`);
                  });
                }
              }
            : undefined
        });
      })
      .catch((error) => {
        toast.error(`Failed to delete rows: ${String(error)}`);
      });
  }, [pending]);

  const copy = deleteConfirmationCopy(pending?.rows.length ?? 0, canUndo);
  const dialog = pending ? (
    <ConfirmDialog
      title={copy.title}
      description={copy.description}
      confirmLabel="Delete"
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { onDeleteRows, dialog };
}
