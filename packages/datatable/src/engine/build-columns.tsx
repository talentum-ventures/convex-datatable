import { useMemo } from "react";
import type { ColumnDef, Table } from "@tanstack/react-table";
import type {
  CellCoord,
  DataTableCellValue,
  DataTableColumn,
  DataTableRowModel,
  RowId,
} from "../core/types";
import { getVisibleDataColumnIdsInUiOrder } from "./visible-column-order";
import { DataCell } from "../ui/data-cell";

export type CellCommit<TRow extends DataTableRowModel> = (args: {
  row: TRow;
  rowId: RowId;
  column: DataTableColumn<TRow>;
  value: DataTableCellValue;
}) => Promise<void>;

export type BuildColumnsArgs<TRow extends DataTableRowModel> = {
  columns: ReadonlyArray<DataTableColumn<TRow>>;
  getRowId: (row: TRow) => RowId;
  onStartEdit: (rowId: RowId, columnId: string) => void;
  onCommit: CellCommit<TRow>;
  getEditingDraftValue?: (rowId: RowId, columnId: string) => DataTableCellValue | null;
  onEditingDraftChange?: (rowId: RowId, columnId: string, value: DataTableCellValue) => void;
  onCancelEdit: () => void;
  onCellSelect: (coord: CellCoord) => void;
  onRangeSelect: (coord: CellCoord) => void;
  enableEditing: boolean;
};

export function useColumnDefs<TRow extends DataTableRowModel>({
  columns,
  getRowId,
  onStartEdit,
  onCommit,
  getEditingDraftValue,
  onEditingDraftChange,
  onCancelEdit,
  onCellSelect,
  onRangeSelect,
  enableEditing
}: BuildColumnsArgs<TRow>): ReadonlyArray<ColumnDef<TRow, DataTableCellValue>> {
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
          const draftValue = getEditingDraftValue?.(rowId, column.id);
          const restoredDraft = typeof draftValue === "string" ? draftValue : null;

          return (
            <DataCell
              column={column}
              row={row}
              rowId={rowId}
              value={value}
              rowIndex={context.row.index}
              columnIndex={Math.max(dynamicColumnIndex, 0)}
              enableEditing={enableEditing}
              onCommit={onCommit}
              onCancelEdit={onCancelEdit}
              onStartEdit={onStartEdit}
              onCellSelect={onCellSelect}
              onRangeSelect={onRangeSelect}
              {...(restoredDraft !== null ? { restoredDraft } : {})}
              {...(onEditingDraftChange
                ? {
                    onDraftChange: ({
                      rowId: nextRowId,
                      columnId,
                      value: nextValue
                    }: {
                      rowId: RowId;
                      columnId: string;
                      value: DataTableCellValue;
                    }) => {
                      onEditingDraftChange(nextRowId, columnId, nextValue);
                    }
                  }
                : {})}
            />
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
    getEditingDraftValue,
    getRowId,
    onCancelEdit,
    onCellSelect,
    onCommit,
    onEditingDraftChange,
    onRangeSelect,
    onStartEdit
  ]);
}
