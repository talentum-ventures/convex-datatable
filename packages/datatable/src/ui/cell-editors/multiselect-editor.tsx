import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { cn } from "../../core/cn";
import type { DataTableColumn, DataTableRowModel } from "../../core/types";
import { useDropdownPosition } from "../../hooks/use-dropdown-position";
import { usePortaledListboxFocus } from "../../hooks/use-portaled-listbox-focus";
import { MultiSelectBadges, OptionBadge } from "../cell-renderers";
import { containsInRefs, multiSelectValues, type DefaultEditorProps } from "./shared";

export type MultiSelectMenuEditorProps<TRow extends DataTableRowModel> = DefaultEditorProps<TRow> & {
  column: Extract<DataTableColumn<TRow>, { kind: "multiselect" }>;
};

export function MultiSelectMenuEditor<TRow extends DataTableRowModel>({
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
