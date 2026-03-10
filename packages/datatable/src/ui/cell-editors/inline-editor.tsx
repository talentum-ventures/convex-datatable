import { useEffect, useRef } from "react";
import { cn } from "../../core/cn";
import type { DataTableRowModel } from "../../core/types";
import {
  focusEditableAtEnd,
  parseEditorValue,
  readEditableText,
  setEditableText,
  type DefaultEditorProps
} from "./shared";

export type InlineContentEditorProps<TRow extends DataTableRowModel> = DefaultEditorProps<TRow> & {
  initialText: string;
};

const AUTO_SAVE_DEBOUNCE_MS = 300;

export function InlineContentEditor<TRow extends DataTableRowModel>({
  column,
  row,
  onCommit,
  onAutoSave,
  onCancel,
  initialText
}: InlineContentEditorProps<TRow>): JSX.Element {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const initialTextRef = useRef(initialText);
  const draftRef = useRef(initialText);
  const finalizedRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const node = editorRef.current;
    if (!node) {
      return;
    }

    setEditableText(node, initialTextRef.current);
    focusEditableAtEnd(node);
  }, []);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current !== null) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const commit = (): void => {
    if (finalizedRef.current) {
      return;
    }

    if (autoSaveTimerRef.current !== null) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    finalizedRef.current = true;
    const parsed = parseEditorValue(column, draftRef.current, row);
    onCommit(parsed);
  };

  const cancel = (): void => {
    if (finalizedRef.current) {
      return;
    }

    if (autoSaveTimerRef.current !== null) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    finalizedRef.current = true;
    onCancel();
  };

  return (
    <div data-dt-editor-root="true" className="h-full w-full">
      <div
        ref={editorRef}
        role="textbox"
        aria-label={`Edit ${column.header}`}
        aria-multiline={column.kind === "longText"}
        contentEditable
        suppressContentEditableWarning
        spellCheck={column.kind === "text" || column.kind === "longText"}
        className={cn(
          "h-full min-h-8 w-full cursor-text whitespace-pre-wrap break-words bg-transparent text-sm text-slate-900 outline-none",
          column.kind === "text" || column.kind === "number" || column.kind === "currency" || column.kind === "link"
            ? "whitespace-nowrap"
            : ""
        )}
        onInput={(event) => {
          draftRef.current = readEditableText(event.currentTarget);

          if (!onAutoSave || finalizedRef.current) {
            return;
          }

          if (autoSaveTimerRef.current !== null) {
            clearTimeout(autoSaveTimerRef.current);
          }

          autoSaveTimerRef.current = setTimeout(() => {
            autoSaveTimerRef.current = null;
            if (finalizedRef.current) {
              return;
            }

            const parsed = parseEditorValue(column, draftRef.current, row);
            onAutoSave(parsed);
          }, AUTO_SAVE_DEBOUNCE_MS);
        }}
        onBlur={() => {
          commit();
        }}
        onKeyDown={(event) => {
          event.stopPropagation();

          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
            return;
          }

          if (event.key === "Tab") {
            event.preventDefault();
            commit();
            return;
          }

          if (event.key === "Enter" && (column.kind !== "longText" || !event.shiftKey)) {
            event.preventDefault();
            commit();
          }
        }}
      />
    </div>
  );
}
