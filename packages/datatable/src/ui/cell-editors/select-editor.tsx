import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { cn } from "../../core/cn";
import { findOptionByValue } from "../../core/select-options";
import type { DataTableColumn, DataTableRowModel } from "../../core/types";
import { useDropdownPosition } from "../../hooks/use-dropdown-position";
import { usePortaledListboxFocus } from "../../hooks/use-portaled-listbox-focus";
import { OptionBadge } from "../cell-renderers";
import { containsInRefs, type DefaultEditorProps } from "./shared";

export type SelectMenuEditorProps<TRow extends DataTableRowModel> = DefaultEditorProps<TRow> & {
  column: Extract<DataTableColumn<TRow>, { kind: "select" }>;
};

export function SelectMenuEditor<TRow extends DataTableRowModel>({
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
