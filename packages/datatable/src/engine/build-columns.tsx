import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { ColumnDef, Table } from "@tanstack/react-table";
import { Check, ExternalLink, Link as LinkIcon, Pencil } from "lucide-react";
import type {
  CellCoord,
  CollaboratorPresence,
  DataTableCellValue,
  DataTableColumn,
  DataTableReactValue,
  DataTableRowModel,
  RowId,
  SelectOption
} from "../core/types";
import { cn } from "../core/cn";
import { formatColumnValue, parseDateValue, parseTextNumber } from "../core/formatters";
import { findOptionByValue } from "../core/select-options";
import { Input } from "../ui/primitives";
import { getVisibleDataColumnIdsInUiOrder } from "../ui/visible-column-order";

type ActiveCell = CellCoord | null;

type EditingCell = {
  rowId: RowId;
  columnId: string;
} | null;

export type CellCommit<TRow extends DataTableRowModel> = (args: {
  row: TRow;
  rowId: RowId;
  column: DataTableColumn<TRow>;
  value: DataTableCellValue;
}) => void;

export type BuildColumnsArgs<TRow extends DataTableRowModel> = {
  columns: ReadonlyArray<DataTableColumn<TRow>>;
  getRowId: (row: TRow) => RowId;
  editingCell: EditingCell;
  activeCell: ActiveCell;
  rangeStart: ActiveCell;
  collaborators: ReadonlyArray<CollaboratorPresence>;
  onStartEdit: (rowId: RowId, columnId: string) => void;
  onCommit: CellCommit<TRow>;
  onCancelEdit: () => void;
  onCellSelect: (coord: CellCoord) => void;
  onRangeSelect: (coord: CellCoord) => void;
  enableEditing: boolean;
};

function isInRange(cell: CellCoord, start: ActiveCell, end: ActiveCell): boolean {
  if (!start || !end) {
    return false;
  }

  const minRow = Math.min(start.rowIndex, end.rowIndex);
  const maxRow = Math.max(start.rowIndex, end.rowIndex);
  const minColumn = Math.min(start.columnIndex, end.columnIndex);
  const maxColumn = Math.max(start.columnIndex, end.columnIndex);

  return (
    cell.rowIndex >= minRow &&
    cell.rowIndex <= maxRow &&
    cell.columnIndex >= minColumn &&
    cell.columnIndex <= maxColumn
  );
}

function parseEditorValue<TRow extends DataTableRowModel>(
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

function toFormattableValue(
  value: DataTableCellValue
): string | number | boolean | null | Date | ReadonlyArray<string> {
  if (value instanceof Date) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }
  return String(value);
}

function toReactValue(value: DataTableCellValue): DataTableReactValue {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }
  return String(value);
}

type DefaultEditorProps<TRow extends DataTableRowModel> = {
  column: DataTableColumn<TRow>;
  row: TRow;
  value: DataTableCellValue;
  onCommit: (value: DataTableCellValue) => void;
  onCancel: () => void;
};

function editorTextValue<TRow extends DataTableRowModel>(
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

function setEditableText(node: HTMLDivElement, value: string): void {
  if (node.textContent === value) {
    return;
  }
  node.textContent = value;
}

function readEditableText(node: HTMLDivElement): string {
  return node.textContent?.replace(/\u00a0/g, " ") ?? "";
}

function focusEditableAtEnd(node: HTMLDivElement): void {
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

function dateInputValue(value: string): string {
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

type NodeContainerRef = {
  current: Node | null;
};

function containsInRefs(target: EventTarget | null, refs: ReadonlyArray<NodeContainerRef>): boolean {
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

function useDropdownPosition(anchorRef: NodeContainerRef): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({
    left: 0,
    top: 0,
    opacity: 0
  });

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!(anchor instanceof HTMLElement)) {
      return;
    }

    const ownerWindow = anchor.ownerDocument.defaultView;
    const grid = anchor.closest<HTMLElement>("[role='grid']");
    let frameId = 0;

    const updatePosition = (): void => {
      const nextAnchor = anchorRef.current;
      if (!(nextAnchor instanceof HTMLElement)) {
        return;
      }

      const rect = nextAnchor.getBoundingClientRect();
      setStyle({
        left: rect.left,
        top: rect.bottom + 4,
        opacity: 1
      });
    };

    const schedulePositionUpdate = (): void => {
      if (!ownerWindow) {
        updatePosition();
        return;
      }

      ownerWindow.cancelAnimationFrame(frameId);
      frameId = ownerWindow.requestAnimationFrame(updatePosition);
    };

    schedulePositionUpdate();

    grid?.addEventListener("scroll", schedulePositionUpdate, { passive: true });
    ownerWindow?.addEventListener("resize", schedulePositionUpdate);
    ownerWindow?.addEventListener("scroll", schedulePositionUpdate, true);

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => schedulePositionUpdate());
    resizeObserver?.observe(anchor);

    return () => {
      if (ownerWindow) {
        ownerWindow.cancelAnimationFrame(frameId);
        ownerWindow.removeEventListener("resize", schedulePositionUpdate);
        ownerWindow.removeEventListener("scroll", schedulePositionUpdate, true);
      }
      grid?.removeEventListener("scroll", schedulePositionUpdate);
      resizeObserver?.disconnect();
    };
  }, [anchorRef]);

  return style;
}

function focusListbox(node: HTMLDivElement | null): void {
  if (!node) {
    return;
  }

  node.focus({ preventScroll: true });
}

function usePortaledListboxFocus(listRef: { current: HTMLDivElement | null }): void {
  useLayoutEffect(() => {
    const node = listRef.current;
    if (!node) {
      return;
    }

    focusListbox(node);

    const ownerWindow = node.ownerDocument.defaultView;
    if (!ownerWindow) {
      return;
    }

    const frameId = ownerWindow.requestAnimationFrame(() => {
      focusListbox(node);
    });

    return () => {
      ownerWindow.cancelAnimationFrame(frameId);
    };
  }, [listRef]);
}

function OptionBadge({
  option,
  isSelected,
  isActive
}: {
  option: SelectOption;
  isSelected: boolean;
  isActive: boolean;
}): JSX.Element {
  const Icon = option.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        option.colorClass,
        isActive ? "ring-2 ring-slate-900/10 ring-offset-1 ring-offset-white" : "",
        isSelected ? "shadow-[inset_0_0_0_1px_rgba(15,23,42,0.12)]" : ""
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {option.label}
    </span>
  );
}

function multiSelectValues(value: DataTableCellValue): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => String(entry));
}

function MultiSelectBadges({
  columnId,
  options,
  values
}: {
  columnId: string;
  options: ReadonlyArray<SelectOption>;
  values: ReadonlyArray<string>;
}): JSX.Element {
  if (values.length === 0) {
    return <span className="text-slate-400">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {values.map((entry) => {
        const option = findOptionByValue(options, entry);
        const Icon = option?.icon;
        return (
          <span
            key={`${columnId}-${entry}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              option?.colorClass ?? "bg-slate-100 text-slate-700"
            )}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            {option?.label ?? entry}
          </span>
        );
      })}
    </div>
  );
}

type InlineContentEditorProps<TRow extends DataTableRowModel> = DefaultEditorProps<TRow> & {
  initialText: string;
};

function InlineContentEditor<TRow extends DataTableRowModel>({
  column,
  row,
  onCommit,
  onCancel,
  initialText
}: InlineContentEditorProps<TRow>): JSX.Element {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const draftRef = useRef(initialText);
  const finalizedRef = useRef(false);

  useEffect(() => {
    const node = editorRef.current;
    if (!node) {
      return;
    }

    setEditableText(node, initialText);
    focusEditableAtEnd(node);
  }, [initialText]);

  const commit = (): void => {
    if (finalizedRef.current) {
      return;
    }

    finalizedRef.current = true;
    const parsed = parseEditorValue(column, draftRef.current, row);
    onCommit(parsed);
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

type SelectMenuEditorProps<TRow extends DataTableRowModel> = DefaultEditorProps<TRow> & {
  column: Extract<DataTableColumn<TRow>, { kind: "select" }>;
};

function SelectMenuEditor<TRow extends DataTableRowModel>({
  column,
  value,
  onCommit,
  onCancel
}: SelectMenuEditorProps<TRow>): JSX.Element {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const dropdownStyle = useDropdownPosition(wrapperRef);
  const portalRoot = typeof document === "undefined" ? null : document.body;
  const [activeIndex, setActiveIndex] = useState(() => {
    const selectedIndex = column.options.findIndex((option) => option.value === String(value ?? ""));
    return selectedIndex >= 0 ? selectedIndex : 0;
  });

  usePortaledListboxFocus(listRef);

  useEffect(() => {
    const activeNode = listRef.current?.querySelector<HTMLElement>("[data-select-option-active='true']");
    activeNode?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const selectedOption = findOptionByValue(column.options, String(value ?? ""));

  const commitIndex = (index: number): void => {
    const option = column.options[index];
    if (!option) {
      onCancel();
      return;
    }
    onCommit(option.value);
  };

  const moveActive = (delta: number): void => {
    if (column.options.length === 0) {
      return;
    }

    const lastIndex = column.options.length - 1;
    setActiveIndex((current) => Math.min(lastIndex, Math.max(0, current + delta)));
  };

  return (
    <div
      ref={wrapperRef}
      data-dt-editor-root="true"
      className="relative h-full w-full"
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (containsInRefs(nextTarget, [wrapperRef, dialogRef])) {
          return;
        }
        onCancel();
      }}
    >
      <div className="flex h-full w-full items-center">
        {selectedOption ? (
          <OptionBadge option={selectedOption} isSelected={true} isActive={false} />
        ) : (
          <span className="text-sm text-slate-400">Select value</span>
        )}
      </div>

      {portalRoot
        ? createPortal(
            <div
              ref={dialogRef}
              role="dialog"
              aria-label={`${column.header} editor`}
              data-dt-editor-dialog="true"
              className="fixed z-30 min-w-[220px] max-w-[320px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
              style={dropdownStyle}
            >
              <div
                ref={listRef}
                role="listbox"
                tabIndex={0}
                aria-label={`Edit ${column.header}`}
                aria-activedescendant={`${column.id}-option-${activeIndex}`}
                className="flex max-h-56 flex-col gap-1 overflow-auto rounded-lg outline-none"
                onKeyDown={(event) => {
                  event.stopPropagation();

                  if (event.key === "Escape") {
                    event.preventDefault();
                    onCancel();
                    return;
                  }

                  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                    event.preventDefault();
                    moveActive(1);
                    return;
                  }

                  if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                    event.preventDefault();
                    moveActive(-1);
                    return;
                  }

                  if (event.key === "Home") {
                    event.preventDefault();
                    setActiveIndex(0);
                    return;
                  }

                  if (event.key === "End") {
                    event.preventDefault();
                    setActiveIndex(Math.max(0, column.options.length - 1));
                    return;
                  }

                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitIndex(activeIndex);
                  }
                }}
              >
                {column.options.map((option, index) => {
                  const isSelected = option.value === String(value ?? "");
                  const isActive = index === activeIndex;

                  return (
                    <button
                      key={`${column.id}-${option.value}`}
                      id={`${column.id}-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      data-select-option-active={isActive ? "true" : "false"}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left",
                        isActive ? "bg-slate-100" : "bg-transparent hover:bg-slate-50"
                      )}
                      onMouseDown={(event) => {
                        event.preventDefault();
                      }}
                      onMouseEnter={() => {
                        setActiveIndex(index);
                      }}
                      onClick={() => {
                        commitIndex(index);
                      }}
                    >
                      <OptionBadge option={option} isSelected={isSelected} isActive={isActive} />
                      {isSelected ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>,
            portalRoot
          )
        : null}
    </div>
  );
}

type MultiSelectMenuEditorProps<TRow extends DataTableRowModel> = DefaultEditorProps<TRow> & {
  column: Extract<DataTableColumn<TRow>, { kind: "multiselect" }>;
};

function MultiSelectMenuEditor<TRow extends DataTableRowModel>({
  column,
  value,
  onCommit,
  onCancel
}: MultiSelectMenuEditorProps<TRow>): JSX.Element {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const portalRoot = typeof document === "undefined" ? null : document.body;
  const dropdownStyle = useDropdownPosition(wrapperRef);
  const finalizedRef = useRef(false);
  const [draftValues, setDraftValues] = useState(() => multiSelectValues(value));
  const [activeIndex, setActiveIndex] = useState(() => {
    const selectedValues = multiSelectValues(value);
    const selectedIndex = column.options.findIndex((option) => selectedValues.includes(option.value));
    return selectedIndex >= 0 ? selectedIndex : 0;
  });

  usePortaledListboxFocus(listRef);

  useEffect(() => {
    const activeNode = listRef.current?.querySelector<HTMLElement>("[data-select-option-active='true']");
    activeNode?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const commit = (nextValues = draftValues): void => {
    if (finalizedRef.current) {
      return;
    }

    finalizedRef.current = true;
    onCommit(nextValues);
  };

  const toggleValue = (optionValue: string): void => {
    setDraftValues((current) => {
      const isSelected = current.includes(optionValue);
      if (isSelected) {
        return current.filter((entry) => entry !== optionValue);
      }

      return [...current, optionValue];
    });
  };

  const moveActive = (delta: number): void => {
    if (column.options.length === 0) {
      return;
    }

    const lastIndex = column.options.length - 1;
    setActiveIndex((current) => Math.min(lastIndex, Math.max(0, current + delta)));
  };

  return (
    <div
      ref={wrapperRef}
      data-dt-editor-root="true"
      className="relative h-full w-full"
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (containsInRefs(nextTarget, [wrapperRef, dialogRef])) {
          return;
        }
        commit();
      }}
    >
      <div className="flex h-full w-full items-center">
        {draftValues.length > 0 ? (
          <MultiSelectBadges columnId={column.id} options={column.options} values={draftValues} />
        ) : (
          <span className="text-sm text-slate-400">Select values</span>
        )}
      </div>

      {portalRoot
        ? createPortal(
            <div
              ref={dialogRef}
              role="dialog"
              aria-label={`${column.header} editor`}
              data-dt-editor-dialog="true"
              className="fixed z-30 min-w-[220px] max-w-[320px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
              style={dropdownStyle}
            >
              <div
                ref={listRef}
                role="listbox"
                tabIndex={0}
                aria-label={`Edit ${column.header}`}
                aria-activedescendant={`${column.id}-option-${activeIndex}`}
                aria-multiselectable="true"
                className="flex max-h-56 flex-col gap-1 overflow-auto rounded-lg outline-none"
                onKeyDown={(event) => {
                  event.stopPropagation();

                  if (event.key === "Escape") {
                    event.preventDefault();
                    onCancel();
                    return;
                  }

                  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                    event.preventDefault();
                    moveActive(1);
                    return;
                  }

                  if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                    event.preventDefault();
                    moveActive(-1);
                    return;
                  }

                  if (event.key === "Home") {
                    event.preventDefault();
                    setActiveIndex(0);
                    return;
                  }

                  if (event.key === "End") {
                    event.preventDefault();
                    setActiveIndex(Math.max(0, column.options.length - 1));
                    return;
                  }

                  if (event.key === " " && !event.metaKey && !event.ctrlKey && !event.altKey) {
                    event.preventDefault();
                    const option = column.options[activeIndex];
                    if (option) {
                      toggleValue(option.value);
                    }
                    return;
                  }

                  if (event.key === "Tab" || event.key === "Enter") {
                    event.preventDefault();
                    commit();
                  }
                }}
              >
                {column.options.map((option, index) => {
                  const isSelected = draftValues.includes(option.value);
                  const isActive = index === activeIndex;

                  return (
                    <button
                      key={`${column.id}-${option.value}`}
                      id={`${column.id}-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      data-select-option-active={isActive ? "true" : "false"}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left",
                        isActive ? "bg-slate-100" : "bg-transparent hover:bg-slate-50"
                      )}
                      onMouseDown={(event) => {
                        event.preventDefault();
                      }}
                      onMouseEnter={() => {
                        setActiveIndex(index);
                      }}
                      onClick={() => {
                        toggleValue(option.value);
                        listRef.current?.focus({ preventScroll: true });
                      }}
                    >
                      <OptionBadge option={option} isSelected={isSelected} isActive={isActive} />
                      {isSelected ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>,
            portalRoot
          )
        : null}
    </div>
  );
}

type DateEditorProps<TRow extends DataTableRowModel> = DefaultEditorProps<TRow> & {
  initialText: string;
};

function DateEditor<TRow extends DataTableRowModel>({
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

  const commitFromEventValue = (nextValue: string): void => {
    syncDraft(nextValue);
    commit(nextValue);
  };

  const commit = (nextValue = draftRef.current): void => {
    if (finalizedRef.current) {
      return;
    }

    finalizedRef.current = true;
    onCommit(parseEditorValue(column, nextValue, row));
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

function DefaultEditor<TRow extends DataTableRowModel>({
  column,
  row,
  value,
  onCommit,
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
    />
  );
}

type SharedCellContentArgs<TRow extends DataTableRowModel> = {
  column: DataTableColumn<TRow>;
  row: TRow;
  rowId: RowId;
  value: DataTableCellValue;
  isEditing: boolean;
};

type SharedCellEditorArgs<TRow extends DataTableRowModel> = {
  column: DataTableColumn<TRow>;
  row: TRow;
  rowId: RowId;
  value: DataTableCellValue;
  onCommit: (nextValue: DataTableCellValue) => void;
  onCancel: () => void;
};

export function renderColumnContent<TRow extends DataTableRowModel>({
  column,
  row,
  rowId,
  value,
  isEditing
}: SharedCellContentArgs<TRow>): ReactNode {
  const customCell = column.renderCell as
    | ((ctx: {
        row: TRow;
        rowId: RowId;
        value: DataTableCellValue;
        isEditing: boolean;
      }) => ReactNode)
    | undefined;

  if (customCell) {
    return (
      <>
        {customCell({
          row,
          rowId,
          value: column.kind === "reactNode" ? toReactValue(value) : value,
          isEditing
        })}
      </>
    );
  }

  return renderDefaultCell(column, value);
}

export function renderColumnEditor<TRow extends DataTableRowModel>({
  column,
  row,
  rowId,
  value,
  onCommit,
  onCancel
}: SharedCellEditorArgs<TRow>): ReactNode {
  const customEditor = column.renderEditor as
    | ((ctx: {
        row: TRow;
        rowId: RowId;
        value: DataTableCellValue;
        commit: (nextValue: DataTableCellValue) => void;
        cancel: () => void;
      }) => ReactNode)
    | undefined;

  if (customEditor) {
    return (
      <>
        {customEditor({
          row,
          rowId,
          value: column.kind === "reactNode" ? toReactValue(value) : value,
          commit: onCommit,
          cancel: onCancel
        })}
      </>
    );
  }

  return (
    <DefaultEditor
      column={column}
      row={row}
      value={value}
      onCommit={onCommit}
      onCancel={onCancel}
    />
  );
}

function renderDefaultCell<TRow extends DataTableRowModel>(
  column: DataTableColumn<TRow>,
  value: DataTableCellValue
): JSX.Element {
  if (column.kind === "select") {
    const option = findOptionByValue(column.options, String(value));
    if (!option) {
      return <span className="text-slate-700">{String(value ?? "")}</span>;
    }
    const Icon = option.icon;
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", option.colorClass)}>
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {option.label}
      </span>
    );
  }

  if (column.kind === "multiselect") {
    return <MultiSelectBadges columnId={column.id} options={column.options} values={multiSelectValues(value)} />;
  }

  if (column.kind === "link") {
    const href = String(value ?? "");
    if (href.length === 0) {
      return <span className="text-slate-400">-</span>;
    }
    return (
      <a
        href={href}
        target={column.target ?? "_blank"}
        rel={column.rel ?? "noreferrer"}
        className="inline-flex items-center gap-1 text-sky-700 underline decoration-sky-200 underline-offset-2"
      >
        <LinkIcon className="h-3.5 w-3.5 shrink-0" />
        <span>{href}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      </a>
    );
  }

  const display = formatColumnValue(column, toFormattableValue(value));

  return (
    <span
      className={cn(
        column.kind === "text" || column.kind === "longText" ? "whitespace-pre-wrap break-words" : ""
      )}
    >
      {display || ""}
    </span>
  );
}

export function useColumnDefs<TRow extends DataTableRowModel>({
  columns,
  getRowId,
  editingCell,
  activeCell,
  rangeStart,
  collaborators,
  onStartEdit,
  onCommit,
  onCancelEdit,
  onCellSelect,
  onRangeSelect,
  enableEditing
}: BuildColumnsArgs<TRow>): ReadonlyArray<ColumnDef<TRow, DataTableCellValue>> {
  const activeCellRef = useRef<ActiveCell>(activeCell);
  const rangeStartRef = useRef<ActiveCell>(rangeStart);
  const editingCellRef = useRef<EditingCell>(editingCell);
  const collaboratorsRef = useRef<ReadonlyArray<CollaboratorPresence>>(collaborators);

  activeCellRef.current = activeCell;
  rangeStartRef.current = rangeStart;
  editingCellRef.current = editingCell;
  collaboratorsRef.current = collaborators;

  return useMemo(() => {
    let cachedVisibleDataIds = "";
    let cachedVisibleDataIndexById: Record<string, number> = {};

    const visibleDataIndexById = (table: Table<TRow>): Readonly<Record<string, number>> => {
      const visibleDataIds = getVisibleDataColumnIdsInUiOrder(table);
      const nextSignature = visibleDataIds.join("|");

      if (nextSignature === cachedVisibleDataIds) {
        return cachedVisibleDataIndexById;
      }

      const nextMap: Record<string, number> = {};
      for (let index = 0; index < visibleDataIds.length; index += 1) {
        const id = visibleDataIds[index];
        if (!id) {
          continue;
        }
        nextMap[id] = index;
      }

      cachedVisibleDataIds = nextSignature;
      cachedVisibleDataIndexById = nextMap;
      return cachedVisibleDataIndexById;
    };

    return columns.map((column): ColumnDef<TRow, DataTableCellValue> => {
      const definition: ColumnDef<TRow, DataTableCellValue> = {
        id: column.id,
        header: column.header,
        accessorFn: (row) => {
          if (column.accessor) {
            return column.accessor(row);
          }
          return row[column.field];
        },
        enableResizing: column.isResizable ?? true,
        enableSorting: column.isSortable ?? true,
        enableHiding: column.isHideable ?? true,
        cell: (context) => {
        const row = context.row.original;
        const rowId = getRowId(row);
        const value = context.getValue();
        const dynamicColumnIndex = visibleDataIndexById(context.table)[column.id] ?? 0;
        const currentCoord: CellCoord = {
          rowIndex: context.row.index,
          columnIndex: dynamicColumnIndex >= 0 ? dynamicColumnIndex : 0
        };
        const currentActiveCell = activeCellRef.current;
        const currentRangeStart = rangeStartRef.current;
        const currentEditingCell = editingCellRef.current;
        const isSelected =
          currentActiveCell?.rowIndex === currentCoord.rowIndex &&
          currentActiveCell?.columnIndex === currentCoord.columnIndex;
        const isRangeSelected = isInRange(currentCoord, currentRangeStart, currentActiveCell);
        const isEditing =
          currentEditingCell?.rowId === rowId && currentEditingCell?.columnId === column.id;
        const canEdit = enableEditing && (column.isEditable ?? false);
        const collaboratorsInCell = collaboratorsRef.current.filter(
          (collaborator) =>
            collaborator.activeCell?.rowId === rowId && collaborator.activeCell?.columnId === column.id
        );

        const content = isEditing ? (
          renderColumnEditor({
            column,
            row,
            rowId,
            value,
            onCommit: (nextValue) => {
              onCommit({ row, rowId, column, value: nextValue });
            },
            onCancel: onCancelEdit
          })
        ) : (
          renderColumnContent({
            column,
            row,
            rowId,
            value,
            isEditing
          })
        );

        return (
          <div
            role="gridcell"
            data-row-id={String(rowId)}
            data-row-index={currentCoord.rowIndex}
            data-column-id={column.id}
            data-column-index={currentCoord.columnIndex}
            data-has-collaborators={collaboratorsInCell.length > 0 ? "true" : "false"}
            className={cn(
              "group relative box-border h-full min-h-10 w-full min-w-0 px-2 py-1 text-sm text-slate-800",
              isEditing && (column.kind === "select" || column.kind === "multiselect" || column.kind === "date")
                ? "z-20 overflow-visible"
                : "overflow-hidden",
              isEditing ? "bg-white" : isRangeSelected ? "bg-[var(--dt-selection-bg)]" : "",
              isSelected ? "outline outline-2 outline-[var(--dt-active-cell-ring)] outline-offset-[-2px]" : ""
            )}
            onClick={(event) => {
              if (event.shiftKey) {
                onRangeSelect(currentCoord);
                return;
              }
              onCellSelect(currentCoord);
            }}
            onDoubleClick={() => {
              if (canEdit) {
                onStartEdit(rowId, column.id);
              }
            }}
          >
            {collaboratorsInCell.map((collaborator, index) => (
              <span
                key={`${collaborator.userId}-outline`}
                aria-hidden="true"
                data-dt-collaborator-outline={collaborator.userId}
                className="pointer-events-none absolute rounded-[3px]"
                style={
                  {
                    "--dt-collaborator-outline": collaborator.color,
                    inset: `${index * 3}px`,
                    boxShadow: "inset 0 0 0 2px var(--dt-collaborator-outline)"
                  } as CSSProperties & { "--dt-collaborator-outline": string }
                }
              />
            ))}
            {collaboratorsInCell.length > 0 ? (
              <span className="pointer-events-none absolute right-1 top-0 z-10 flex -translate-y-1/2 flex-col items-end gap-1">
                {collaboratorsInCell.map((collaborator) => (
                  <span
                    key={`${collaborator.userId}-label`}
                    data-dt-collaborator-label={collaborator.userId}
                    className="max-w-[10rem] truncate rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white shadow-sm"
                    style={{ backgroundColor: collaborator.color }}
                  >
                    {collaborator.name}
                  </span>
                ))}
              </span>
            ) : null}
            {content}
            {canEdit && !isEditing ? (
              <span className="pointer-events-none absolute right-1 top-1 hidden rounded bg-slate-100 p-0.5 text-slate-500 group-hover:block">
                <Pencil className="h-3 w-3" />
              </span>
            ) : null}
            {isEditing ? (
              <span className="pointer-events-none absolute right-1 top-1 rounded bg-emerald-100 p-0.5 text-emerald-700">
                <Check className="h-3 w-3" />
              </span>
            ) : null}
          </div>
        );
        }
      };

      if (column.width !== undefined) {
        definition.size = column.width;
      }
      if (column.minWidth !== undefined) {
        definition.minSize = column.minWidth;
      }
      if (column.maxWidth !== undefined) {
        definition.maxSize = column.maxWidth;
      }

      return definition;
    });
  }, [
    columns,
    enableEditing,
    getRowId,
    onCancelEdit,
    onCellSelect,
    onCommit,
    onRangeSelect,
    onStartEdit
  ]);
}
