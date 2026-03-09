import { useEffect, useRef, useState } from "react";
import { Input } from "../primitives";
import type { DataTableRowModel } from "../../core/types";
import { dateInputValue, parseEditorValue, type DefaultEditorProps } from "./shared";

export type DateEditorProps<TRow extends DataTableRowModel> = DefaultEditorProps<TRow> & {
  initialText: string;
};

export function DateEditor<TRow extends DataTableRowModel>({
  column,
  row,
  onCommit,
  onCancel,
  initialText
}: DateEditorProps<TRow>): JSX.Element {
  const pickerRef = useRef<HTMLInputElement | null>(null);
  const draftRef = useRef(initialText);
  const finalizedRef = useRef(false);
  const [pickerValue, setPickerValue] = useState(() => dateInputValue(initialText));

  useEffect(() => {
    const input = pickerRef.current;
    if (!input) {
      return;
    }

    input.focus({ preventScroll: true });
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch {
        // Some browsers require a stricter user activation window.
      }
    }
  }, []);

  const syncDraft = (nextValue: string): void => {
    draftRef.current = nextValue;
    setPickerValue(nextValue);
  };

  const commit = (nextValue = draftRef.current): void => {
    if (finalizedRef.current) {
      return;
    }

    finalizedRef.current = true;
    onCommit(parseEditorValue(column, nextValue, row));
  };

  const commitFromEventValue = (nextValue: string): void => {
    syncDraft(nextValue);
    commit(nextValue);
  };

  const cancel = (): void => {
    if (finalizedRef.current) {
      return;
    }

    finalizedRef.current = true;
    onCancel();
  };

  return (
    <div data-dt-editor-root="true" className="h-full w-full">
      <Input
        ref={pickerRef}
        type="date"
        aria-label={`Edit ${column.header}`}
        value={pickerValue}
        className="h-full min-h-8 rounded-none border-0 bg-transparent px-0 py-0 text-sm text-slate-900 shadow-none focus:ring-0"
        onInput={(event) => {
          commitFromEventValue(event.currentTarget.value);
        }}
        onChange={(event) => {
          commitFromEventValue(event.currentTarget.value);
        }}
        onBlur={(event) => {
          commit(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          event.stopPropagation();

          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
            return;
          }

          if (event.key === "Tab" || event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
      />
    </div>
  );
}
