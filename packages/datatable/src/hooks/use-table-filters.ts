import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction
} from "react";
import type { ColumnFiltersState } from "@tanstack/react-table";
import {
  defaultFilterOperatorForColumn,
  filterOperatorsForColumn,
  isActiveFilterValue
} from "../core/filtering";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableRowModel,
  FilterOperator
} from "../core/types";
import {
  fromTanStackFilters,
  toTanStackFilters
} from "../engine/state-converters";

export type UseTableFiltersArgs = {
  columnFilters: ColumnFiltersState;
  setColumnFilters: Dispatch<SetStateAction<ColumnFiltersState>>;
};

export type UseTableFiltersResult<TRow extends DataTableRowModel> = {
  filterByColumnId: ReadonlyMap<string, DataTableFilter>;
  selectedFilterOperator: (column: DataTableColumn<TRow>) => FilterOperator;
  setColumnFilterOperator: (column: DataTableColumn<TRow>, operator: FilterOperator) => void;
  selectColumnFilterTextValue: (column: DataTableColumn<TRow>) => string;
  setColumnFilterTextValue: (column: DataTableColumn<TRow>, rawValue: string) => void;
  selectColumnFilterValues: (column: DataTableColumn<TRow>) => ReadonlyArray<string>;
  toggleColumnFilterInValue: (column: DataTableColumn<TRow>, value: string, enabled: boolean) => void;
  clearColumnFilter: (columnId: string) => void;
};

export function useTableFilters<TRow extends DataTableRowModel>({
  columnFilters,
  setColumnFilters
}: UseTableFiltersArgs): UseTableFiltersResult<TRow> {
  const [filterOperatorDrafts, setFilterOperatorDrafts] = useState<Readonly<Record<string, FilterOperator>>>({});

  const decodedFilters = useMemo(() => fromTanStackFilters(columnFilters), [columnFilters]);

  const filterByColumnId = useMemo(() => {
    const map = new Map<string, DataTableFilter>();
    for (const filter of decodedFilters) {
      map.set(filter.columnId, filter);
    }
    return map;
  }, [decodedFilters]);

  const setColumnFilter = useCallback((columnId: string, nextFilter: DataTableFilter | null) => {
    setColumnFilters((current) => {
      const next = fromTanStackFilters(current).filter((entry) => entry.columnId !== columnId);
      if (nextFilter && isActiveFilterValue(nextFilter.value)) {
        next.push(nextFilter);
      }
      return toTanStackFilters(next);
    });
  }, [setColumnFilters]);

  const selectedFilterOperator = useCallback(
    (column: DataTableColumn<TRow>): FilterOperator => {
      const allowed = filterOperatorsForColumn(column);
      const activeOperator = filterByColumnId.get(column.id)?.op;
      if (activeOperator && allowed.includes(activeOperator)) {
        return activeOperator;
      }

      const draftOperator = filterOperatorDrafts[column.id];
      if (draftOperator && allowed.includes(draftOperator)) {
        return draftOperator;
      }

      return defaultFilterOperatorForColumn(column);
    },
    [filterByColumnId, filterOperatorDrafts]
  );

  const setColumnFilterOperator = useCallback(
    (column: DataTableColumn<TRow>, operator: FilterOperator): void => {
      setFilterOperatorDrafts((current) => ({
        ...current,
        [column.id]: operator
      }));

      const activeFilter = filterByColumnId.get(column.id);
      if (!activeFilter) {
        return;
      }

      let nextValue = activeFilter.value;
      if (operator === "in" && !Array.isArray(nextValue)) {
        const seed = String(nextValue ?? "").trim();
        nextValue = seed.length > 0 ? [seed] : [];
      }
      if (operator !== "in" && Array.isArray(nextValue)) {
        nextValue = nextValue[0] ?? "";
      }

      setColumnFilter(column.id, {
        columnId: column.id,
        op: operator,
        value: nextValue
      });
    },
    [filterByColumnId, setColumnFilter]
  );

  const selectColumnFilterTextValue = useCallback(
    (column: DataTableColumn<TRow>): string => {
      const filter = filterByColumnId.get(column.id);
      if (!filter || Array.isArray(filter.value)) {
        return "";
      }
      if (filter.value === null) {
        return "";
      }
      return String(filter.value);
    },
    [filterByColumnId]
  );

  const setColumnFilterTextValue = useCallback(
    (column: DataTableColumn<TRow>, rawValue: string): void => {
      const operator = selectedFilterOperator(column);
      if (rawValue.trim().length === 0) {
        setColumnFilter(column.id, null);
        return;
      }

      if (column.kind === "number" || column.kind === "currency") {
        const parsed = Number(rawValue);
        if (Number.isNaN(parsed)) {
          setColumnFilter(column.id, null);
          return;
        }
        setColumnFilter(column.id, {
          columnId: column.id,
          op: operator,
          value: parsed
        });
        return;
      }

      setColumnFilter(column.id, {
        columnId: column.id,
        op: operator,
        value: rawValue
      });
    },
    [selectedFilterOperator, setColumnFilter]
  );

  const selectColumnFilterValues = useCallback(
    (column: DataTableColumn<TRow>): ReadonlyArray<string> => {
      const filter = filterByColumnId.get(column.id);
      if (!filter) {
        return [];
      }
      if (Array.isArray(filter.value)) {
        return filter.value;
      }
      if (typeof filter.value === "string" && filter.value.trim().length > 0) {
        return [filter.value];
      }
      return [];
    },
    [filterByColumnId]
  );

  const toggleColumnFilterInValue = useCallback(
    (column: DataTableColumn<TRow>, value: string, enabled: boolean): void => {
      const currentValues = [...selectColumnFilterValues(column)];
      const withoutCurrent = currentValues.filter((entry) => entry !== value);
      const nextValues = enabled ? [...withoutCurrent, value] : withoutCurrent;

      setFilterOperatorDrafts((current) => ({
        ...current,
        [column.id]: "in"
      }));

      if (nextValues.length === 0) {
        setColumnFilter(column.id, null);
        return;
      }

      setColumnFilter(column.id, {
        columnId: column.id,
        op: "in",
        value: nextValues
      });
    },
    [selectColumnFilterValues, setColumnFilter]
  );

  const clearColumnFilter = useCallback(
    (columnId: string): void => {
      setColumnFilter(columnId, null);
    },
    [setColumnFilter]
  );

  return {
    filterByColumnId,
    selectedFilterOperator,
    setColumnFilterOperator,
    selectColumnFilterTextValue,
    setColumnFilterTextValue,
    selectColumnFilterValues,
    toggleColumnFilterInValue,
    clearColumnFilter
  };
}
