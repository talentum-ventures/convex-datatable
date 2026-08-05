import { useMemo, useRef } from "react";
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
  getEditingDraftCaretOffset?: (rowId: RowId, columnId: string) => number | null;
  onEditingDraftChange?: (
    rowId: RowId,
    columnId: string,
    value: DataTableCellValue,
    caretOffset?: number
  ) => void;
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
  getEditingDraftCaretOffset,
  onEditingDraftChange,
  onCancelEdit,
  onCellSelect,
  onRangeSelect,
  enableEditing
}: BuildColumnsArgs<TRow>): ReadonlyArray<ColumnDef<TRow, DataTableCellValue>> {
  const getRowIdRef = useRef(getRowId);
  const onStartEditRef = useRef(onStartEdit);
  const onCommitRef = useRef(onCommit);
  const getEditingDraftValueRef = useRef(getEditingDraftValue);
  const getEditingDraftCaretOffsetRef = useRef(getEditingDraftCaretOffset);
  const onEditingDraftChangeRef = useRef(onEditingDraftChange);
  const onCancelEditRef = useRef(onCancelEdit);
  const onCellSelectRef = useRef(onCellSelect);
  const onRangeSelectRef = useRef(onRangeSelect);

  getRowIdRef.current = getRowId;
  onStartEditRef.current = onStartEdit;
  onCommitRef.current = onCommit;
  getEditingDraftValueRef.current = getEditingDraftValue;
  getEditingDraftCaretOffsetRef.current = getEditingDraftCaretOffset;
  onEditingDraftChangeRef.current = onEditingDraftChange;
  onCancelEditRef.current = onCancelEdit;
  onCellSelectRef.current = onCellSelect;
  onRangeSelectRef.current = onRangeSelect;

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
          const rowId = getRowIdRef.current(row);
          const value = context.getValue();
          const dynamicColumnIndex = visibleDataIndexById(context.table)[column.id] ?? 0;
          const draftValue = getEditingDraftValueRef.current?.(rowId, column.id);
          const restoredDraft = typeof draftValue === "string" ? draftValue : null;
          const restoredCaretOffset =
            getEditingDraftCaretOffsetRef.current?.(rowId, column.id) ?? null;

          return (
            <DataCell
              column={column}
              row={row}
              rowId={rowId}
              value={value}
              rowIndex={context.row.index}
              columnIndex={Math.max(dynamicColumnIndex, 0)}
              enableEditing={enableEditing}
              onCommit={onCommitRef.current}
              onCancelEdit={onCancelEditRef.current}
              onStartEdit={onStartEditRef.current}
              onCellSelect={onCellSelectRef.current}
              onRangeSelect={onRangeSelectRef.current}
              {...(restoredDraft !== null ? { restoredDraft } : {})}
              {...(restoredDraft !== null ? { restoredCaretOffset } : {})}
              {...(onEditingDraftChangeRef.current
                ? {
                    onDraftChange: ({
                      rowId: nextRowId,
                      columnId,
                      value: nextValue,
                      caretOffset
                    }: {
                      rowId: RowId;
                      columnId: string;
                      value: DataTableCellValue;
                      caretOffset?: number;
                    }) => {
                      onEditingDraftChangeRef.current?.(
                        nextRowId,
                        columnId,
                        nextValue,
                        caretOffset
                      );
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
  }, [columns, enableEditing]);
}
