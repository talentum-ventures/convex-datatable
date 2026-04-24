import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { cn } from "../../core/cn";
import {
  filterSelectOptionsBySearch,
  findOptionByValue,
  resolveOptions
} from "../../core/select-options";
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
  row,
  value,
  onCommit,
  onCancel
}: SelectMenuEditorProps<TRow>): JSX.Element {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const searchEffectPrimedRef = useRef(false);
  const dropdownStyle = useDropdownPosition(wrapperRef, dialogRef);
  const portalRoot = typeof document === "undefined" ? null : document.body;
  const options = resolveOptions(column, row);
  const [search, setSearch] = useState("");
  const filteredOptions = useMemo(
    () => filterSelectOptionsBySearch(options, search),
    [options, search]
  );
  const [activeIndex, setActiveIndex] = useState(() => {
    const selectedIndex = options.findIndex((option) => option.value === String(value ?? ""));
    return selectedIndex >= 0 ? selectedIndex : 0;
  });

  usePortaledListboxFocus(searchRef);

  useEffect(() => {
    if (!searchEffectPrimedRef.current) {
      searchEffectPrimedRef.current = true;
      return;
    }
    setActiveIndex(0);
  }, [search]);

  useEffect(() => {
    setActiveIndex((current) => {
      if (filteredOptions.length === 0) {
        return 0;
      }
      return Math.min(current, filteredOptions.length - 1);
    });
  }, [filteredOptions.length]);

  useEffect(() => {
    const activeNode = listRef.current?.querySelector<HTMLElement>("[data-select-option-active='true']");
    activeNode?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, filteredOptions]);

  const selectedOption = findOptionByValue(options, String(value ?? ""));

  const commitIndex = (index: number): void => {
    const option = filteredOptions[index];
    if (!option) {
      onCancel();
      return;
    }
    onCommit(option.value);
  };

  const moveActive = (delta: number): void => {
    if (filteredOptions.length === 0) {
      return;
    }

    const lastIndex = filteredOptions.length - 1;
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
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
                placeholder="Search..."
                aria-label={`Search ${column.header} options`}
                className="mb-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none placeholder:text-slate-400"
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
                    setActiveIndex(Math.max(0, filteredOptions.length - 1));
                    return;
                  }

                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitIndex(activeIndex);
                  }
                }}
              />
              <div
                ref={listRef}
                role="listbox"
                tabIndex={-1}
                aria-label={`Edit ${column.header}`}
                aria-activedescendant={`${column.id}-option-${activeIndex}`}
                className="flex max-h-56 flex-col gap-1 overflow-auto rounded-lg outline-none"
              >
                {filteredOptions.map((option, index) => {
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
