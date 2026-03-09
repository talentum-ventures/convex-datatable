import { useMemo } from "react";
import type { ColumnDef, Table } from "@tanstack/react-table";
import type {
  CellCoord,
  CollaboratorPresence,
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
}) => void;

export type BuildColumnsArgs<TRow extends DataTableRowModel> = {
  columns: ReadonlyArray<DataTableColumn<TRow>>;
  getRowId: (row: TRow) => RowId;
  collaborators: ReadonlyArray<CollaboratorPresence>;
  onStartEdit: (rowId: RowId, columnId: string) => void;
  onCommit: CellCommit<TRow>;
  onCancelEdit: () => void;
  onCellSelect: (coord: CellCoord) => void;
  onRangeSelect: (coord: CellCoord) => void;
  enableEditing: boolean;
};

export function useColumnDefs<TRow extends DataTableRowModel>({
  columns,
  getRowId,
  collaborators,
  onStartEdit,
  onCommit,
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

          return (
            <DataCell
              column={column}
              row={row}
              rowId={rowId}
              value={value}
              rowIndex={context.row.index}
              columnIndex={dynamicColumnIndex >= 0 ? dynamicColumnIndex : 0}
              collaborators={collaborators}
              enableEditing={enableEditing}
              onCommit={onCommit}
              onCancelEdit={onCancelEdit}
              onStartEdit={onStartEdit}
              onCellSelect={onCellSelect}
              onRangeSelect={onRangeSelect}
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
    collaborators,
    enableEditing,
    getRowId,
    onCancelEdit,
    onCellSelect,
    onCommit,
    onRangeSelect,
    onStartEdit
  ]);
}
