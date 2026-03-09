import { parseDateValue, parseTextNumber } from "../../core/formatters";
import type {
  DataTableCellValue,
  DataTableColumn,
  DataTableRowModel
} from "../../core/types";
import type { NodeContainerRef } from "../../hooks/use-dropdown-position";

export type DefaultEditorProps<TRow extends DataTableRowModel> = {
  column: DataTableColumn<TRow>;
  row: TRow;
  value: DataTableCellValue;
  onCommit: (value: DataTableCellValue) => void;
  onCancel: () => void;
};

export function parseEditorValue<TRow extends DataTableRowModel>(
  column: DataTableColumn<TRow>,
  raw: string,
  row: TRow
): DataTableCellValue {
  if (column.parseInput) {
    return column.parseInput(raw, row);
  }

  switch (column.kind) {
    case "text":
    case "longText":
    case "link":
    case "select":
      return raw;
    case "number":
    case "currency":
      return parseTextNumber(raw);
    case "date":
      return parseDateValue(raw, column.locale);
    case "multiselect":
      return raw
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    case "reactNode":
      return raw;
  }
}

export function editorTextValue<TRow extends DataTableRowModel>(
  column: DataTableColumn<TRow>,
  value: DataTableCellValue
): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (value === null || value === undefined) {
    return "";
  }

  if (column.kind === "date") {
    if (typeof value === "string") {
      return value;
    }
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
  }

  return String(value);
}

export function setEditableText(node: HTMLDivElement, value: string): void {
  if (node.textContent === value) {
    return;
  }
  node.textContent = value;
}

export function readEditableText(node: HTMLDivElement): string {
  return node.textContent?.replace(/\u00a0/g, " ") ?? "";
}

export function focusEditableAtEnd(node: HTMLDivElement): void {
  node.focus({ preventScroll: true });

  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function dateInputValue(value: string): string {
  const raw = value.trim();
  if (raw.length === 0) {
    return "";
  }

  const matchedIsoDate = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (matchedIsoDate?.[1]) {
    return matchedIsoDate[1];
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function multiSelectValues(value: DataTableCellValue): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => String(entry));
}

export function containsInRefs(target: EventTarget | null, refs: ReadonlyArray<NodeContainerRef>): boolean {
  if (!(target instanceof Node)) {
    return false;
  }

  for (const ref of refs) {
    if (ref.current?.contains(target)) {
      return true;
    }
  }

  return false;
}
