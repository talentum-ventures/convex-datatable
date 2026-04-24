import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, EyeOff, Pin, PinOff } from "lucide-react";
import type { FilterOperator, DataTableColumn, DataTableRowModel } from "../core/types";
import { filterOperatorsForColumn, resolveAllowEmptyFilter } from "../core/filtering";
import { getStaticOptions } from "../core/select-options";
import type { ColumnMenuAnchor } from "../hooks/use-table-columns";
import { useHeaderMenuPosition } from "../hooks/use-header-menu-position";
import { Button, Checkbox, Input } from "./primitives";

export type ColumnMenuProps<TRow extends DataTableRowModel> = {
  column: DataTableColumn<TRow>;
  trigger: HTMLElement;
  sortState: false | "asc" | "desc";
  canSort: boolean;
  canHide: boolean;
  canPin: boolean;
  canFilter: boolean;
  isPinned: boolean;
  anchor: ColumnMenuAnchor;
  activeFilterOperator: FilterOperator;
  textFilterValue: string;
  selectedFilterValues: ReadonlyArray<string>;
  onSort: (direction: "asc" | "desc") => void;
  onPin: (side: "left" | "right" | "none") => void;
  onHide: () => void;
  onClearFilter: () => void;
  onSetFilterOperator: (operator: FilterOperator) => void;
  onSetFilterTextValue: (value: string) => void;
  onToggleFilterValue: (value: string, enabled: boolean) => void;
};

function operatorLabel(operator: FilterOperator): string {
  if (operator === "isEmpty") {
    return "Is empty";
  }
  if (operator === "isNotEmpty") {
    return "Is not empty";
  }
  return operator;
}

export function ColumnMenu<TRow extends DataTableRowModel>({
  column,
  trigger,
  sortState,
  canSort,
  canHide,
  canPin,
  canFilter,
  isPinned,
  anchor,
  activeFilterOperator,
  textFilterValue,
  selectedFilterValues,
  onSort,
  onPin,
  onHide,
  onClearFilter,
  onSetFilterOperator,
  onSetFilterTextValue,
  onToggleFilterValue
}: ColumnMenuProps<TRow>): JSX.Element {
  const filterOperators = filterOperatorsForColumn(column);
  const allowEmptyFilter = resolveAllowEmptyFilter(column);
  const staticOptions =
    column.kind === "select" || column.kind === "multiselect"
      ? getStaticOptions(column)
      : [];
  const showOptionFilters =
    (column.kind === "select" || column.kind === "multiselect") &&
    staticOptions.length > 0;
  const isEmptyOperator = activeFilterOperator === "isEmpty";
  const isNotEmptyOperator = activeFilterOperator === "isNotEmpty";
  const hidesFilterInputs = isEmptyOperator || isNotEmptyOperator;
  const menuRef = useRef<HTMLDivElement | null>(null);
  const style = useHeaderMenuPosition(trigger, anchor);

  let menuActionGridColumns = "grid-cols-1";
  if (isPinned && canPin && canHide) {
    menuActionGridColumns = "grid-cols-2";
  } else if (canPin && canHide) {
    menuActionGridColumns = "grid-cols-3";
  } else if (canPin) {
    menuActionGridColumns = "grid-cols-2";
  }

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) {
      return;
    }

    const focusTarget =
      menu.querySelector<HTMLElement>("[data-dt-column-menu-text-filter='true']") ??
      menu.querySelector<HTMLElement>("[data-dt-column-menu-filter-select='true']") ??
      menu.querySelector<HTMLElement>("[data-dt-column-menu-filter-checkbox='true']") ??
      menu.querySelector<HTMLElement>("button");
    focusTarget?.focus({ preventScroll: true });
  }, []);

  return createPortal(
    <div
      ref={menuRef}
      role="dialog"
      aria-label={`${column.header} options`}
      data-dt-column-menu-root="true"
      className="z-40 rounded-md border border-slate-200 bg-white p-2 shadow-xl"
      style={style}
    >
      <div className="mb-2 border-b border-slate-200 pb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {column.header}
        </p>
      </div>

      {canSort ? (
        <div className="mb-2 grid grid-cols-2 gap-1 border-b border-slate-200 pb-2">
          <Button
            variant={sortState === "asc" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => {
              onSort("asc");
            }}
          >
            <ChevronUp className="h-3.5 w-3.5" />
            Sort asc
          </Button>
          <Button
            variant={sortState === "desc" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => {
              onSort("desc");
            }}
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Sort desc
          </Button>
        </div>
      ) : null}

      {(canHide || canPin) ? (
        <div className="mb-2 space-y-2 border-b border-slate-200 pb-2">
          <div className={`grid gap-1 ${menuActionGridColumns}`}>
            {canPin && !isPinned ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onPin("left");
                  }}
                >
                  <Pin className="h-3.5 w-3.5" />
                  Left
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onPin("right");
                  }}
                >
                  <Pin className="h-3.5 w-3.5" />
                  Right
                </Button>
              </>
            ) : null}
            {canPin && isPinned ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onPin("none");
                }}
              >
                <PinOff className="h-3.5 w-3.5" />
                Unpin
              </Button>
            ) : null}
            {canHide ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onHide}
              >
                <EyeOff className="h-3.5 w-3.5" />
                Hide
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {canFilter ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Filter
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilter}
            >
              Clear
            </Button>
          </div>

          {filterOperators.length > 1 ? (
            <select
              data-dt-column-menu-filter-select="true"
              value={activeFilterOperator}
              onChange={(event) => {
                onSetFilterOperator(event.target.value as FilterOperator);
              }}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-sky-500"
            >
              {filterOperators.map((operator) => (
                <option key={`${column.id}-${operator}`} value={operator}>
                  {operatorLabel(operator)}
                </option>
              ))}
            </select>
          ) : (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-600">
              Operator: {filterOperators[0] ? operatorLabel(filterOperators[0]) : ""}
            </div>
          )}

          {hidesFilterInputs ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
              {isEmptyOperator ? "Matches empty cells." : "Matches non-empty cells."}
            </div>
          ) : null}

          {showOptionFilters && !hidesFilterInputs ? (
            <div className="max-h-36 space-y-1 overflow-auto rounded-md border border-slate-200 p-2">
              {allowEmptyFilter ? (
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <Checkbox
                    data-dt-column-menu-filter-checkbox="true"
                    checked={isEmptyOperator}
                    onChange={(event) => {
                      if (event.target.checked) {
                        onSetFilterOperator("isEmpty");
                        return;
                      }
                      onClearFilter();
                    }}
                  />
                  (Empty)
                </label>
              ) : null}
              {staticOptions.map((option) => (
                <label
                  key={`${column.id}-${option.value}`}
                  className="flex items-center gap-2 text-xs text-slate-700"
                >
                  <Checkbox
                    data-dt-column-menu-filter-checkbox="true"
                    checked={selectedFilterValues.includes(option.value)}
                    onChange={(event) => {
                      onToggleFilterValue(option.value, event.target.checked);
                    }}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          ) : null}

          {column.kind !== "select" && column.kind !== "multiselect" && !hidesFilterInputs ? (
            <Input
              data-dt-column-menu-text-filter="true"
              type={
                column.kind === "number" || column.kind === "currency"
                  ? "number"
                  : column.kind === "date"
                    ? "date"
                    : "text"
              }
              value={textFilterValue}
              onChange={(event) => {
                onSetFilterTextValue(event.target.value);
              }}
              placeholder="Filter value"
              className="h-9 text-sm"
            />
          ) : null}
        </div>
      ) : null}
    </div>,
    trigger.ownerDocument.body
  );
}
