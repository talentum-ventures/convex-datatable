import type { DataTableRowModel } from "../../core/types";
import { DateEditor } from "./date-editor";
import { InlineContentEditor } from "./inline-editor";
import { MultiSelectMenuEditor } from "./multiselect-editor";
import { SelectMenuEditor } from "./select-editor";
import { editorTextValue, type DefaultEditorProps } from "./shared";

export function DefaultEditor<TRow extends DataTableRowModel>({
  column,
  row,
  value,
  onCommit,
  restoredDraft,
  onDraftChange,
  onCancel
}: DefaultEditorProps<TRow>): JSX.Element {
  if (column.kind === "select") {
    return (
      <SelectMenuEditor
        column={column}
        row={row}
        value={value}
        onCommit={onCommit}
        onCancel={onCancel}
      />
    );
  }

  if (column.kind === "multiselect") {
    return (
      <MultiSelectMenuEditor
        column={column}
        row={row}
        value={value}
        onCommit={onCommit}
        onCancel={onCancel}
      />
    );
  }

  const initialText = editorTextValue(column, value);

  if (column.kind === "date") {
    return (
      <DateEditor
        column={column}
        row={row}
        value={value}
        initialText={initialText}
        onCommit={onCommit}
        onCancel={onCancel}
      />
    );
  }

  return (
    <InlineContentEditor
      column={column}
      row={row}
      value={value}
      initialText={initialText}
      onCommit={onCommit}
      onCancel={onCancel}
      {...(restoredDraft !== undefined ? { restoredDraft } : {})}
      {...(onDraftChange ? { onDraftChange } : {})}
    />
  );
}
