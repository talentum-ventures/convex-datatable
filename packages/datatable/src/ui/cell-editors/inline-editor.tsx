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

export function InlineContentEditor<TRow extends DataTableRowModel>({
  column,
  row,
  onCommit,
  restoredDraft,
  onDraftChange,
  onCancel,
  initialText
}: InlineContentEditorProps<TRow>): JSX.Element {
  const initialDraftText = restoredDraft ?? initialText;
  const editorRef = useRef<HTMLDivElement | null>(null);
  const initialTextRef = useRef(initialDraftText);
  const draftRef = useRef(initialDraftText);
  const finalizedRef = useRef(false);
  const columnRef = useRef(column);
  const rowRef = useRef(row);
  const onCommitRef = useRef(onCommit);
  const onDraftChangeRef = useRef(onDraftChange);
  const onCancelRef = useRef(onCancel);

  columnRef.current = column;
  rowRef.current = row;
  onCommitRef.current = onCommit;
  onDraftChangeRef.current = onDraftChange;
  onCancelRef.current = onCancel;

  useEffect(() => {
    const node = editorRef.current;
    if (!node) {
      return;
    }

    setEditableText(node, initialTextRef.current);
    focusEditableAtEnd(node);
  }, []);

  const commit = (): void => {
    if (finalizedRef.current) {
      return;
    }

    finalizedRef.current = true;
    const parsed = parseEditorValue(columnRef.current, draftRef.current, rowRef.current);
    onCommitRef.current(parsed);
  };

  const cancel = (): void => {
    if (finalizedRef.current) {
      return;
    }

    finalizedRef.current = true;
    onCancelRef.current();
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
          onDraftChangeRef.current?.(draftRef.current);
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
