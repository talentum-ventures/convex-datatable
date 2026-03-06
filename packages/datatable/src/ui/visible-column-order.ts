import type { RowData, Table } from "@tanstack/react-table";

const NON_DATA_COLUMN_IDS = new Set(["__select__", "__actions__"]);

export function getVisibleLeafColumnIdsInUiOrder<TRow extends RowData>(
  table: Table<TRow>
): ReadonlyArray<string> {
  return [
    ...table.getLeftVisibleLeafColumns(),
    ...table.getCenterVisibleLeafColumns(),
    ...table.getRightVisibleLeafColumns()
  ].map((column) => column.id);
}

export function getVisibleDataColumnIdsInUiOrder<TRow extends RowData>(
  table: Table<TRow>
): ReadonlyArray<string> {
  return getVisibleLeafColumnIdsInUiOrder(table).filter((columnId) => !NON_DATA_COLUMN_IDS.has(columnId));
}
